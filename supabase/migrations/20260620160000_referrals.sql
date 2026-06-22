-- Share-to-earn (crew referral). Invite a friend → when THEY check in (ping, Z6) → you earn AFC.
-- Reward fires on the friend's real check-in, not on signup → filters junk, measures true k-factor.

-- referral code + who referred me
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by  uuid;
create unique index if not exists uq_profiles_referral_code on public.profiles(referral_code) where referral_code is not null;
-- backfill codes for existing users
update public.profiles set referral_code = upper(substr(md5(user_id::text), 1, 6)) where referral_code is null;

create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null,
  referee_id   uuid not null unique,                 -- a user can be referred only once
  code         text not null,
  status       text not null default 'pending',      -- pending | converted
  converted_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
alter table public.referrals enable row level security;
drop policy if exists referrals_select_mine on public.referrals;
create policy referrals_select_mine on public.referrals for select
  using (referrer_id = auth.uid() or referee_id = auth.uid());

-- reward amount (tunable without a deploy)
insert into public.app_settings(key, value) values ('referral_reward_afc', '200')
  on conflict (key) do nothing;

-- ── get_my_referral(): my code + stats for the invite card ────────────────────────────────────
create or replace function public.get_my_referral()
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_user uuid := auth.uid(); v_code text; v_inv int; v_conv int; v_bonus int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select referral_code into v_code from public.profiles where user_id = v_user;
  if v_code is null then
    v_code := upper(substr(md5(v_user::text || clock_timestamp()::text), 1, 6));
    update public.profiles set referral_code = v_code where user_id = v_user;
  end if;
  select count(*) , count(*) filter (where status='converted')
    into v_inv, v_conv from public.referrals where referrer_id = v_user;
  select coalesce(value::int, 200) into v_bonus from public.app_settings where key = 'referral_reward_afc';
  return json_build_object('code', v_code, 'invited', v_inv, 'converted', v_conv, 'afc_per_convert', coalesce(v_bonus,200));
end; $$;
grant execute on function public.get_my_referral() to authenticated;

-- ── apply_referral(): a new user registers who invited them (pending until they check in) ──────
create or replace function public.apply_referral(p_code text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_user uuid := auth.uid(); v_referrer uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.referrals where referee_id = v_user) then
    raise exception 'Već si iskoristio pozivni kod';
  end if;
  select user_id into v_referrer from public.profiles where referral_code = upper(p_code);
  if v_referrer is null then raise exception 'Kod ne postoji'; end if;
  if v_referrer = v_user then raise exception 'Ne možeš pozvati sam sebe'; end if;

  insert into public.referrals (referrer_id, referee_id, code) values (v_referrer, v_user, upper(p_code));
  update public.profiles set referred_by = v_referrer where user_id = v_user;
  return json_build_object('ok', true);
end; $$;
grant execute on function public.apply_referral(text) to authenticated;

-- ── extend the check-in trigger: also CONVERT a pending referral and reward the referrer ───────
create or replace function public.on_checkin_unlock()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_referrer uuid; v_bonus int; v_newbal int;
begin
  -- 1) unlock this user's claimed venue rewards (ping earns them)
  update public.reward_redemptions
     set status = 'unlocked', unlocked_at = now()
   where user_id = new.user_id and venue_id = new.venue_id and status = 'claimed';

  -- 2) close any open intent for this venue
  update public.venue_intent
     set fulfilled = true
   where user_id = new.user_id and venue_id = new.venue_id and fulfilled = false;

  -- 3) convert a pending referral (friend actually showed up) and reward the referrer once
  update public.referrals
     set status = 'converted', converted_at = now()
   where referee_id = new.user_id and status = 'pending'
   returning referrer_id into v_referrer;
  if found then
    select coalesce(value::int, 200) into v_bonus from public.app_settings where key = 'referral_reward_afc';
    update public.profiles set spendable_xp = coalesce(spendable_xp, 0) + coalesce(v_bonus, 200)
      where user_id = v_referrer returning spendable_xp into v_newbal;
    insert into public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
      values (v_referrer, coalesce(v_bonus, 200), 'referral_convert', 'user', new.user_id, v_newbal);
  end if;

  return new;
end; $$;
-- trigger already exists (trg_checkin_unlock); CREATE OR REPLACE of the function is enough.
