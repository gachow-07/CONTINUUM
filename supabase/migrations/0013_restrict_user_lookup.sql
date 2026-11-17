-- Invitations use send_project_invitation, which verifies ownership. The old
-- unrestricted account lookup is unused and exposes user identities to any
-- signed-in account, including users who do not share a project.
revoke execute on function public.find_user_by_email(text) from public, anon, authenticated;
