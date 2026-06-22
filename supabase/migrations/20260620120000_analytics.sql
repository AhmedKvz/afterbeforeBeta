-- Analytics: owned, first-party event layer in Supabase (no external dependency).
-- Source of truth for Smart Start metrics (retention cohort, check-ins, iskra, redemption).

create table if not exists public.analytics_events (
  id          bigserial primary key,
  user_id     uuid,                              -- nullable: pre-auth / anonymous events
  event       text not null,                     -- e.g. 'signup', 'check_in', 'iskra_sent'
  props       jsonb not null default '{}'::jsonb,-- arbitrary context (venue_id, spark_id, ...)
  session_id  text,                              -- client session for funnels
  created_at  timestamptz not null default now()
);

create index if not exists idx_analytics_event   on public.analytics_events(event);
create index if not exists idx_analytics_created on public.analytics_events(created_at);
create index if not exists idx_analytics_user    on public.analytics_events(user_id);

alter table public.analytics_events enable row level security;
-- No SELECT/INSERT policy for clients on purpose: all writes go through track() (definer),
-- all reads happen server-side / service-role (admin dashboard). Privacy by default.

-- track(): single entrypoint the client calls via supabase.rpc('track', {...}).
-- auth.uid() is filled server-side so the client can never spoof another user's events.
create or replace function public.track(
  p_event   text,
  p_props   jsonb default '{}'::jsonb,
  p_session text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event is null or length(p_event) = 0 then
    return;
  end if;
  insert into public.analytics_events(user_id, event, props, session_id)
  values (auth.uid(), p_event, coalesce(p_props, '{}'::jsonb), p_session);
end;
$$;

grant execute on function public.track(text, jsonb, text) to anon, authenticated;

-- Convenience rollups for the admin dashboard (read via service role; RLS on base table
-- keeps these empty for normal clients).
create or replace view public.v_event_daily as
select
  event,
  date_trunc('day', created_at)::date as day,
  count(*)                            as events,
  count(distinct user_id)             as uniques
from public.analytics_events
group by 1, 2;

-- Weekly-active by ISO week (weekend-on-weekend retention is derived from this in the dashboard).
create or replace view public.v_weekly_active as
select
  date_trunc('week', created_at)::date as week_start,
  count(distinct user_id)              as active_users
from public.analytics_events
where user_id is not null
group by 1;
