-- Paid AI request guard shared by every Vercel instance.
-- Limits: 4 requests/user/minute, 20 requests/user/day, 60 requests total/day.
-- The global ceiling protects the demo account even if several accounts are abused.

create table if not exists public.ai_request_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null check (route in ('chat', 'decision-assist', 'generate-doc', 'summarize')),
  created_at timestamptz not null default now()
);

create index if not exists ai_request_events_user_created_idx
  on public.ai_request_events (user_id, created_at desc);
create index if not exists ai_request_events_created_idx
  on public.ai_request_events (created_at desc);

alter table public.ai_request_events enable row level security;
revoke all on table public.ai_request_events from anon, authenticated;

create or replace function public.claim_ai_request(p_route text)
returns table (allowed boolean, retry_after_seconds integer, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_minute integer;
  v_user_day integer;
  v_global_day integer;
begin
  if v_user_id is null or p_route not in ('chat', 'decision-assist', 'generate-doc', 'summarize') then
    return query select false, 60, 0;
    return;
  end if;

  -- Serialize claims so simultaneous serverless requests cannot pass the limits together.
  perform pg_catalog.pg_advisory_xact_lock(730041);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  delete from public.ai_request_events where created_at < pg_catalog.now() - interval '2 days';

  select count(*) into v_user_minute
  from public.ai_request_events
  where user_id = v_user_id and created_at >= pg_catalog.now() - interval '1 minute';

  if v_user_minute >= 4 then
    return query select false, 60, 0;
    return;
  end if;

  select count(*) into v_user_day
  from public.ai_request_events
  where user_id = v_user_id and created_at >= pg_catalog.date_trunc('day', pg_catalog.now());

  if v_user_day >= 20 then
    return query select false, 86400, 0;
    return;
  end if;

  select count(*) into v_global_day
  from public.ai_request_events
  where created_at >= pg_catalog.date_trunc('day', pg_catalog.now());

  if v_global_day >= 60 then
    return query select false, 86400, 0;
    return;
  end if;

  insert into public.ai_request_events (user_id, route) values (v_user_id, p_route);
  return query select true, 0, least(19 - v_user_day, 59 - v_global_day);
end;
$$;

revoke all on function public.claim_ai_request(text) from public;
grant execute on function public.claim_ai_request(text) to authenticated;

comment on function public.claim_ai_request(text) is
  'Atomically claims a paid AI request under per-user and global safety limits.';

