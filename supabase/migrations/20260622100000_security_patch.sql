-- Security patch: referral race condition + per-user reward claim cap
-- Findings from code review (2026-06-22)

-- ── 1. get_my_referral(): add row lock to prevent concurrent code generation ──────────────────
drop function if exists public.get_my_referral();
create or replace function public.get_my_referral()
returns jsonb language plpgsql security definer as $$
declare
  v_user  uuid := auth.uid();
  v_code  text;
  v_inv   int;
  v_conv  int;
  v_afc   int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  -- Lock the row to prevent concurrent code generation race condition
  select referral_code into v_code
  from public.profiles
  where user_id = v_user
  for update;

  if v_code is null then
    -- Generate unique code; retry on collision (unique index on referral_code)
    loop
      v_code := upper(substr(md5(v_user::text || clock_timestamp()::text || random()::text), 1, 6));
      begin
        update public.profiles set referral_code = v_code where user_id = v_user;
        exit; -- success
      exception when unique_violation then
        -- collision: try again
      end;
    end loop;
  end if;

  select count(*)        into v_inv  from public.referrals where referrer_id = v_user;
  select count(*)        into v_conv from public.referrals where referrer_id = v_user and status = 'converted';
  select coalesce((select value::int from public.app_settings where key = 'referral_reward_afc'), 200) into v_afc;

  return jsonb_build_object(
    'code',            v_code,
    'invited',         v_inv,
    'converted',       v_conv,
    'afc_per_convert', v_afc
  );
end;
$$;

-- ── 2. redeem_reward(): add per-user claim cap (1 per reward per user) ───────────────────────
drop function if exists public.redeem_reward(uuid);
create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_user    uuid := auth.uid();
  v_reward  record;
  v_balance int;
  v_stock   int;
  v_claimed int;
  v_code    text;
  v_status  text;
  v_venue   uuid;
  v_night   date;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select * into v_reward from public.rewards where id = p_reward_id;
  if not found then raise exception 'Reward not found'; end if;

  -- Per-user cap: one claim per reward per user
  if exists (
    select 1 from public.reward_redemptions
    where user_id = v_user and reward_id = p_reward_id
      and status != 'expired'
  ) then
    raise exception 'Već si iskoristio ovu nagradu';
  end if;

  -- Balance check
  select spendable_xp into v_balance from public.profiles where user_id = v_user;
  if coalesce(v_balance, 0) < v_reward.cost_xp then
    raise exception 'Nedovoljno AFC poena';
  end if;

  -- Stock check (with row lock to prevent race)
  select claimed_count, stock into v_claimed, v_stock
  from public.rewards where id = p_reward_id for update;

  if v_stock is not null and v_claimed >= v_stock then
    raise exception 'Nagrada je rasprodana';
  end if;

  -- Deduct balance
  update public.profiles set spendable_xp = spendable_xp - v_reward.cost_xp where user_id = v_user;

  -- Determine venue and night
  v_venue := v_reward.venue_id;
  v_night := public.nightlife_date();
  v_code  := upper(substr(md5(v_user::text || p_reward_id::text || clock_timestamp()::text), 1, 8));
  v_status := case when v_venue is not null then 'claimed' else 'redeemed' end;

  insert into public.reward_redemptions
    (user_id, reward_id, cost_xp, status, code, venue_id, night, expires_at, redeemed_at)
  values (
    v_user, p_reward_id, v_reward.cost_xp, v_status, v_code, v_venue, v_night,
    case when v_venue is not null then (v_night + interval '1 day' + interval '6 hours') else null end,
    case when v_status = 'redeemed' then now() else null end
  );

  update public.rewards set claimed_count = claimed_count + 1 where id = p_reward_id;

  return jsonb_build_object(
    'status', v_status,
    'code',   v_code,
    'venue',  v_venue
  );
end;
$$;

grant execute on function public.redeem_reward(uuid) to authenticated;

-- ── 3. verify_redemption(): add verified_by audit column ─────────────────────────────────────
alter table public.reward_redemptions
  add column if not exists verified_by uuid references auth.users(id);

drop function if exists public.verify_redemption(text);
create or replace function public.verify_redemption(p_code text)
returns jsonb language plpgsql security definer as $$
declare
  v_user  uuid := auth.uid();
  v_rec   record;
  v_owner boolean;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select rr.*, r.title as reward_title, p.display_name as guest_name
  into v_rec
  from public.reward_redemptions rr
  join public.rewards r on r.id = rr.reward_id
  join public.profiles p on p.user_id = rr.user_id
  where rr.code = upper(p_code);

  if not found then raise exception 'Kod nije pronađen'; end if;
  if v_rec.status = 'redeemed' then raise exception 'Kod je već iskorišćen'; end if;
  if v_rec.status = 'claimed'  then raise exception 'Gost se još nije čekirovao'; end if;
  if v_rec.status != 'unlocked' then raise exception 'Kod nije validan'; end if;
  if v_rec.expires_at is not null and v_rec.expires_at < now() then
    raise exception 'Kod je istekao';
  end if;

  -- Verify caller owns this venue or is any club_venue
  if v_rec.venue_id is not null then
    select (claimed_by = v_user) into v_owner from public.venues where id = v_rec.venue_id;
    if not coalesce(v_owner, false)
       and not exists (
         select 1 from public.profiles where user_id = v_user and account_type = 'club_venue'
       )
    then
      raise exception 'Nisi ovlašćen za ovaj venue';
    end if;
  end if;

  update public.reward_redemptions
  set status = 'redeemed', redeemed_at = now(), verified_by = v_user
  where id = v_rec.id;

  return jsonb_build_object(
    'guest',  v_rec.guest_name,
    'reward', v_rec.reward_title,
    'night',  v_rec.night
  );
end;
$$;

grant execute on function public.verify_redemption(text) to authenticated;
