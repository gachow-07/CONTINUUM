-- Membership is granted only after the account owner accepts an invitation.
create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  role text not null check (role in ('editor','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index one_pending_project_invite on public.project_invitations(project_id, invitee_id) where status = 'pending';
create index project_invites_recipient on public.project_invitations(invitee_id, status, created_at desc);
alter table public.project_invitations enable row level security;
create policy invitations_read on public.project_invitations for select to authenticated
  using (invitee_id = auth.uid() or public.is_project_owner(project_id));
-- No direct insert/update/delete policies: all state transitions use the functions below.

-- Owners may still add unlinked, name-only placeholders. Real accounts must accept.
drop policy if exists members_insert on public.project_members;
create policy members_insert on public.project_members for insert to authenticated
  with check (public.is_project_owner(project_id) and user_id is null and role in ('editor','viewer'));

-- A direct update must not be used to turn a placeholder into an account or move membership.
create function public.protect_project_member_identity() returns trigger language plpgsql set search_path = public as $$
begin
  if new.user_id is distinct from old.user_id or new.project_id is distinct from old.project_id then
    raise exception 'A project member identity cannot be changed';
  end if;
  return new;
end $$;
create trigger protect_project_member_identity before update on public.project_members
  for each row execute function public.protect_project_member_identity();

create function public.send_project_invitation(p_project_id uuid, p_email text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare target public.profiles%rowtype;
begin
  if auth.uid() is null or not public.is_project_owner(p_project_id) then raise exception 'Only the project owner can invite people'; end if;
  if p_role not in ('editor','viewer') or p_role is null then raise exception 'Invalid role'; end if;
  select * into target from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if target.id is null then raise exception 'No CONTINUUM account uses that email yet. Ask them to sign up first.'; end if;
  if exists (select 1 from public.project_members where project_id = p_project_id and user_id = target.id) then raise exception 'That person is already on the project.'; end if;
  if exists (select 1 from public.project_invitations where project_id = p_project_id and invitee_id = target.id and status = 'pending') then raise exception 'That person already has a pending invitation.'; end if;
  insert into public.project_invitations(project_id, inviter_id, invitee_id, invitee_email, role)
  values (p_project_id, auth.uid(), target.id, target.email, p_role);
exception when unique_violation then raise exception 'That person already has a pending invitation.';
end $$;

create function public.list_my_project_invitations() returns table (
  id uuid, project_id uuid, project_name text, inviter_name text, role text, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select i.id, i.project_id, p.name, coalesce(nullif(pr.full_name, ''), pr.email, 'Project owner'), i.role, i.created_at
  from public.project_invitations i join public.projects p on p.id = i.project_id
  left join public.profiles pr on pr.id = i.inviter_id
  where i.invitee_id = auth.uid() and i.status = 'pending' order by i.created_at desc
$$;

create function public.respond_project_invitation(p_id uuid, p_accept boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.project_invitations%rowtype; profile public.profiles%rowtype;
begin
  if auth.uid() is null or p_accept is null then raise exception 'Invalid invitation response'; end if;
  select * into inv from public.project_invitations where id = p_id and invitee_id = auth.uid() and status = 'pending' for update;
  if inv.id is null then raise exception 'Invitation is no longer available'; end if;
  if p_accept then
    select * into profile from public.profiles where id = auth.uid();
    insert into public.project_members(project_id, user_id, display_name, email, role)
      values (inv.project_id, auth.uid(), coalesce(nullif(profile.full_name, ''), profile.email, 'Team member'), profile.email, inv.role)
      on conflict (project_id, user_id) do nothing;
  end if;
  update public.project_invitations set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = inv.id;
  return inv.project_id;
end $$;

create function public.cancel_project_invitation(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare inv public.project_invitations%rowtype;
begin
  select * into inv from public.project_invitations where id = p_id and status = 'pending' for update;
  if inv.id is null or auth.uid() is null or not public.is_project_owner(inv.project_id) then raise exception 'Invitation is no longer available'; end if;
  update public.project_invitations set status = 'cancelled', responded_at = now() where id = inv.id;
end $$;
revoke all on function public.send_project_invitation(uuid,text,text), public.list_my_project_invitations(), public.respond_project_invitation(uuid,boolean), public.cancel_project_invitation(uuid) from public, anon;
grant execute on function public.send_project_invitation(uuid,text,text), public.list_my_project_invitations(), public.respond_project_invitation(uuid,boolean), public.cancel_project_invitation(uuid) to authenticated;
