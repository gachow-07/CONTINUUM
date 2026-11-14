-- Projects are retained and archived instead of being deleted through the app.
-- Migration 0004 is reserved by the AI safety work currently awaiting merge.

drop policy if exists projects_delete on public.projects;

-- RLS policies are the primary authorization boundary, and this grant removal
-- provides a second guard against accidental reintroduction of client deletion.
revoke delete on table public.projects from anon, authenticated;

comment on table public.projects is
  'Projects are archived through the application. Permanent deletion is an administrative operation outside the user-facing app.';
