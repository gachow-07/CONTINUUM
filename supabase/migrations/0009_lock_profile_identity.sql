-- Authenticated users may edit display information, but not identity or workspace ownership.
revoke update on public.profiles from public, anon, authenticated;
revoke update (id, email, org_id, created_at) on public.profiles from public, anon, authenticated;
grant update (full_name, role_title) on public.profiles to authenticated;
