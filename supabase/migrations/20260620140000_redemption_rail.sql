-- Redemption rail (Z6): real reward (guest-list/discount) that LOCKS ON PING (check-in), not on intent.
-- Intent ("Idem") earns nothing; the physical check-in is what unlocks. No-show = no reward, no punishment.
-- Extends existing rewards / reward_redemptions; unlock driven by a trigger on venue_checkins (we do NOT
-- touch process_secure_checkin). Door verification gated to the venue owner.

-- ── nightlife "night" helper: a check-in at 02:00 belongs to the previous day's night ──────────
create or replace function public.nightlife_date(p_ts timestamptz default now())
returns date language sql immutable as $$
  select ((p_ts at time zone 'Europe/Belgrade') - interval '6 hours')::date;
$$;

-- ── rewards: add venue/guest-list dimension ───────────────────────────────────────────────────
alter table public.rewards add column if not exists venue_id      uuid references public.venues(id);
alter table public.rewards add column if not exists reward_type   text not null default 'generic'; -- generic | guest_list | discount
alter table public.rewards add column if not exists night         date;
alter table public.rewards add column if not exists stock         int;          -- null = unlimited
alter table public.rewards add column if not exists claimed_count int not null default 0;
alter table public.rewards add column if not exists unlock_method text not null default 'afc';      -- afc | auto | activity

-- ── reward_redemptions: add code + lifecycle (claimed → unlocked → redeemed | expired) ─────────
alter table public.reward_redemptions add column if not exists code         text;
alter table public.reward_redemptions add column if not exists venue_id     uuid;     -- denormalized for door queries
alter table public.reward_redemptions add column if not exists night        date;
alter table public.reward_redemptions add column if not exists unlocked_at  timestamptz;
alter table public.reward_redemptions add column if not exists redeemed_at  timestamptz;
alter table public.reward_redemptions add column if not exists expires_at   timestamptz;
-- status already exists (text). Values used: 'claimed','unlocked','redeemed','expired'.
create unique index if not exists uq_redemption_code on public.reward_redemptions(code) where code is not null;

-- ── venue_intent ("Idem") — signal only, 0 points ─────────────────────────────────────────────
create table if not exists public.venue_intent (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  venue_id   uuid not null references public.venues(id),
  night      date not null default public.nightlife_date(),
  fulfilled  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, venue_id, night)
);
create index if not exists idx_intent_venue_night on public.venue_intent(venue_id, night);
alter table public.venue_intent enable row level security;
drop policy if exists intent_select_own on public.venue_intent;
drop policy if exists intent_all_present on public.venue_intent;
create policy intent_select_present on public.venue_intent for select using (true); -- who's-going is social/visible
create policy intent_write_own      on public.venue_intent for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── signal_intent(): najava, NO points ────────────────────────────────────────────────────────
create or replace function public.signal_intent(p_venue uuid, p_night date default public.nightlife_date())
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  insert into public.venue_intent (user_id, venue_id, night)
  values (v_user, p_venue, p_night)
  on conflict (user_id, venue_id, night) do nothing;
  return json_build_object('ok', true, 'venue', p_venue, 'night', p_night);
end; $$;
grant execute on function public.signal_intent(uuid, date) to authenticated;

-- ── redeem_reward(): extended. Venue rewards land as 'claimed' (need ping); generic stay immediate ──
create or replace function public.redeem_reward(p_reward_id uuid)
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_user    uuid := auth.uid();
  v_cost    int;
  v_locked  boolean;
  v_active  boolean;
  v_title   text;
  v_venue   uuid;
  v_type    text;
  v_night   date;
  v_stock   int;
  v_claimed int;
  v_balance int;
  v_newbal  int;
  v_code    text;
  v_status  text;
  v_expires timestamptz;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select cost_xp, is_locked, is_active, title, venue_id, reward_type, night, stock, claimed_count
    into v_cost, v_locked, v_active, v_title, v_venue, v_type, v_night, v_stock, v_claimed
  from public.rewards where id = p_reward_id;
  if v_cost is null then raise exception 'Reward not found'; end if;
  if v_locked or not v_active then raise exception 'Reward unavailable'; end if;
  if v_stock is not null and v_claimed >= v_stock then raise exception 'Out of stock'; end if;

  select coalesce(spendable_xp,0) into v_balance from public.profiles where user_id = v_user;
  if v_balance < v_cost then raise exception 'Not enough AFC'; end if;

  -- spend (append-only ledger stays source of truth)
  v_newbal := v_balance - v_cost;
  update public.profiles set spendable_xp = v_newbal where user_id = v_user;
  if v_cost > 0 then
    insert into public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
    values (v_user, -v_cost, 'reward_claim', 'reward', p_reward_id, v_newbal);
  end if;

  v_code    := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  -- Venue-tied reward → must be earned by showing up (ping). Generic → redeemed immediately.
  v_status  := case when v_venue is not null then 'claimed' else 'redeemed' end;
  v_expires := case when v_night is not null then (v_night + interval '1 day 8 hours') else null end;

  insert into public.reward_redemptions (user_id, reward_id, cost_xp, status, code, venue_id, night, expires_at, redeemed_at)
  values (v_user, p_reward_id, v_cost, v_status, v_code, v_venue, v_night, v_expires,
          case when v_status = 'redeemed' then now() else null end);

  update public.rewards set claimed_count = claimed_count + 1 where id = p_reward_id;

  return json_build_object(
    'redeemed', v_status = 'redeemed',
    'status', v_status,
    'needs_checkin', v_venue is not null,
    'code', v_code,
    'balance', v_newbal,
    'title', v_title
  );
end; $$;

-- ── trigger: PING unlocks. On check-in, flip this user's claimed venue rewards → unlocked, close intent ──
create or replace function public.on_checkin_unlock()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  update public.reward_redemptions
     set status = 'unlocked', unlocked_at = now()
   where user_id = new.user_id and venue_id = new.venue_id and status = 'claimed';

  update public.venue_intent
     set fulfilled = true
   where user_id = new.user_id and venue_id = new.venue_id and fulfilled = false;

  return new;
end; $$;
drop trigger if exists trg_checkin_unlock on public.venue_checkins;
create trigger trg_checkin_unlock after insert on public.venue_checkins
  for each row execute function public.on_checkin_unlock();

-- ── verify_redemption(): venue staff confirms at the door. Only 'unlocked' (pinged) can be redeemed ──
create or replace function public.verify_redemption(p_code text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_user  uuid := auth.uid();
  v_rec   record;
  v_owner boolean;
  v_name  text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select rr.*, r.title as reward_title into v_rec
  from public.reward_redemptions rr
  join public.rewards r on r.id = rr.reward_id
  where rr.code = upper(p_code);
  if v_rec.id is null then raise exception 'Invalid code'; end if;

  -- auth: venue owner, or (beta fallback) any club_venue account
  select (claimed_by = v_user) into v_owner from public.venues where id = v_rec.venue_id;
  if not coalesce(v_owner, false)
     and not exists (select 1 from public.profiles where user_id = v_user and account_type = 'club_venue') then
    raise exception 'Not authorized to verify for this venue';
  end if;

  if v_rec.status = 'claimed' then raise exception 'Guest has not checked in yet'; end if;  -- no-show guard
  if v_rec.status = 'redeemed' then raise exception 'Already used'; end if;
  if v_rec.status = 'expired' then raise exception 'Expired'; end if;

  update public.reward_redemptions set status = 'redeemed', redeemed_at = now() where id = v_rec.id;
  select display_name into v_name from public.profiles where user_id = v_rec.user_id;

  return json_build_object('ok', true, 'title', v_rec.reward_title, 'guest', coalesce(v_name, 'Guest'));
end; $$;
grant execute on function public.verify_redemption(text) to authenticated;

-- ── get_venue_guestlist(): the door screen for venue staff ────────────────────────────────────
create or replace function public.get_venue_guestlist(p_venue uuid, p_night date default public.nightlife_date())
returns table(redemption_id uuid, code text, status text, guest_name text, reward_title text, unlocked boolean)
language plpgsql security definer set search_path to 'public' as $$
declare v_user uuid := auth.uid(); v_owner boolean;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select (claimed_by = v_user) into v_owner from public.venues where id = p_venue;
  if not coalesce(v_owner, false)
     and not exists (select 1 from public.profiles where user_id = v_user and account_type = 'club_venue') then
    raise exception 'Not authorized';
  end if;

  return query
  select rr.id, rr.code, rr.status, coalesce(p.display_name,'Guest'), r.title, rr.status = 'unlocked'
  from public.reward_redemptions rr
  join public.rewards r on r.id = rr.reward_id
  left join public.profiles p on p.user_id = rr.user_id
  where rr.venue_id = p_venue and (rr.night = p_night or rr.night is null)
    and rr.status in ('claimed','unlocked','redeemed')
  order by (rr.status='unlocked') desc, rr.created_at;
end; $$;
grant execute on function public.get_venue_guestlist(uuid, date) to authenticated;

-- ── get_my_redemptions(): user's own passes/codes for the RewardsHub ──────────────────────────
create or replace function public.get_my_redemptions()
returns table(id uuid, code text, status text, night date, created_at timestamptz,
              title text, icon text, reward_type text, venue_name text, venue_emoji text)
language plpgsql security definer set search_path to 'public' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  return query
  select rr.id, rr.code, rr.status, rr.night, rr.created_at,
         r.title, r.icon, r.reward_type, v.name, v.emoji
  from public.reward_redemptions rr
  join public.rewards r on r.id = rr.reward_id
  left join public.venues v on v.id = rr.venue_id
  where rr.user_id = v_user
  order by rr.created_at desc;
end; $$;
grant execute on function public.get_my_redemptions() to authenticated;

-- ── get_my_venue(): resolve the calling club account's venue uuid (for the door screen) ────────
create or replace function public.get_my_venue()
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_user uuid := auth.uid(); v_id uuid; v_name text;
begin
  if v_user is null then return null; end if;
  select id into v_id from public.venues where claimed_by = v_user limit 1;
  if v_id is not null then return v_id; end if;
  select venue_name into v_name from public.profiles where user_id = v_user;
  if v_name is not null then select id into v_id from public.venues where lower(name)=lower(v_name) limit 1; end if;
  return v_id;
end; $$;
grant execute on function public.get_my_venue() to authenticated;
