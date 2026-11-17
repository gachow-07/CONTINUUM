-- Retire the hackathon entry point without deleting accounts or project data.
-- Some environments never applied 0010, so this migration must work in both.
do $$
begin
  if to_regclass('public.judge_demo_config') is not null then
    update public.judge_demo_config set enabled = false where enabled;
  end if;
  if to_regprocedure('public.create_judge_demo()') is not null then
    revoke execute on function public.create_judge_demo() from public, anon, authenticated;
  end if;
end $$;
