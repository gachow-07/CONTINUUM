-- A single persistent counter covers every AI endpoint for each anonymous user.
create table public.anonymous_ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  used smallint not null default 0 check (used between 0 and 3)
);
alter table public.anonymous_ai_usage enable row level security;
revoke all on public.anonymous_ai_usage from anon, authenticated;

-- The atomic upsert prevents concurrent requests from exceeding the cap.
create or replace function public.consume_anonymous_ai_use()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare consumed smallint;
begin
  if auth.uid() is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Anonymous session required';
  end if;
  insert into public.anonymous_ai_usage (user_id, used) values (auth.uid(), 1)
  on conflict (user_id) do update set used = public.anonymous_ai_usage.used + 1
    where public.anonymous_ai_usage.used < 3
  returning used into consumed;
  return case when consumed is null then -1 else 3 - consumed end;
end $$;
revoke all on function public.consume_anonymous_ai_use() from public, anon;
grant execute on function public.consume_anonymous_ai_use() to authenticated;
