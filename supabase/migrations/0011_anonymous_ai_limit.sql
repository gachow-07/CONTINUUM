-- Individual and shared quotas cover all anonymous AI requests.
create table public.anonymous_ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  used smallint not null default 0 check (used between 0 and 3)
);
create table public.anonymous_ai_global_usage (
  singleton boolean primary key default true check (singleton),
  used smallint not null default 0 check (used between 0 and 100)
);
insert into public.anonymous_ai_global_usage(singleton, used) values (true, 0);
alter table public.anonymous_ai_usage enable row level security;
alter table public.anonymous_ai_global_usage enable row level security;
revoke all on public.anonymous_ai_usage, public.anonymous_ai_global_usage from anon, authenticated;

-- One row lock makes checking and incrementing both limits atomic, even when
-- many anonymous sessions call different AI endpoints at the same time.
create or replace function public.consume_anonymous_ai_use()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare personal smallint; total smallint;
begin
  if auth.uid() is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Anonymous session required';
  end if;
  select used into total from public.anonymous_ai_global_usage where singleton = true for update;
  if total is null then raise exception 'Anonymous AI quota is not configured'; end if;
  if total >= 100 then return jsonb_build_object('status', 'global_limit'); end if;
  insert into public.anonymous_ai_usage (user_id, used) values (auth.uid(), 1)
  on conflict (user_id) do update set used = public.anonymous_ai_usage.used + 1
    where public.anonymous_ai_usage.used < 3
  returning used into personal;
  if personal is null then return jsonb_build_object('status', 'user_limit'); end if;
  update public.anonymous_ai_global_usage set used = used + 1 where singleton = true returning used into total;
  return jsonb_build_object('status', 'allowed', 'user_remaining', 3 - personal, 'global_remaining', 100 - total);
end $$;
revoke all on function public.consume_anonymous_ai_use() from public, anon;
grant execute on function public.consume_anonymous_ai_use() to authenticated;
