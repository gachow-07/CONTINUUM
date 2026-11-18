-- Team membership is separate from project membership. Existing organizations
-- remain personal workspaces, preserving existing project sharing.
alter table public.organizations add column kind text not null default 'personal' check (kind in ('personal','team'));

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create unique index organization_one_owner on public.organization_members(organization_id) where role = 'owner';
create index organization_members_user on public.organization_members(user_id);
insert into public.organization_members(organization_id,user_id,role)
  select id,owner_id,'owner' from public.organizations;

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  role text not null check (role in ('admin','member')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index organization_one_pending_invite on public.organization_invitations(organization_id,invitee_id) where status = 'pending';

create function public.is_organization_member(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from organization_members where organization_id=oid and user_id=auth.uid())
$$;
create function public.is_organization_admin(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from organization_members where organization_id=oid and user_id=auth.uid() and role in ('owner','admin'))
$$;
create function public.add_organization_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into organization_members(organization_id,user_id,role) values(new.id,new.owner_id,'owner');
  return new;
end $$;
create trigger organization_add_owner after insert on public.organizations for each row execute function public.add_organization_owner();

alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
create policy organization_members_read on public.organization_members for select to authenticated
  using (user_id=auth.uid() or public.is_organization_admin(organization_id));
create policy organization_invitations_read on public.organization_invitations for select to authenticated
  using (invitee_id=auth.uid() or public.is_organization_admin(organization_id));
grant select on public.organization_members, public.organization_invitations to authenticated;
revoke insert,update,delete on public.organization_members, public.organization_invitations from public,anon,authenticated;

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select to authenticated using (public.is_organization_member(id));
revoke update on public.organizations from public,anon,authenticated;
revoke update (id,owner_id,created_at,kind) on public.organizations from public,anon,authenticated;
grant update(name) on public.organizations to authenticated;

-- Team projects require both memberships. No organization role by itself
-- grants access to a project's model, files, or knowledge.
create or replace function public.is_project_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members m join projects p on p.id=m.project_id
    left join organizations o on o.id=p.org_id
    where m.project_id=pid and m.user_id=auth.uid()
      and (o.kind is distinct from 'team' or public.is_organization_member(p.org_id)))
$$;
create or replace function public.can_write_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members m join projects p on p.id=m.project_id
    left join organizations o on o.id=p.org_id
    where m.project_id=pid and m.user_id=auth.uid() and m.role in ('owner','editor')
      and (o.kind is distinct from 'team' or public.is_organization_member(p.org_id)))
$$;
create or replace function public.is_project_owner(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members m join projects p on p.id=m.project_id
    left join organizations o on o.id=p.org_id
    where m.project_id=pid and m.user_id=auth.uid() and m.role='owner'
      and (o.kind is distinct from 'team' or public.is_organization_member(p.org_id)))
$$;
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using (public.is_project_member(id) or (owner_id=auth.uid() and (org_id is null or public.is_organization_member(org_id))));
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (owner_id=auth.uid() and (org_id is null or public.is_organization_member(org_id)));
-- Protect ownership even when this migration is tested independently of PR #42.
revoke update on public.projects from public,anon,authenticated;
revoke update (id,owner_id,org_id,is_sample,created_at,updated_at) on public.projects from public,anon,authenticated;
grant update(name,description,category,status,cover_path,archived,viewer_model_file_id) on public.projects to authenticated;

create function public.check_team_project_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare oid uuid; project_kind text;
begin
  select p.org_id,o.kind into oid,project_kind from projects p left join organizations o on o.id=p.org_id where p.id=new.project_id;
  if new.user_id is not null and project_kind='team' then
    perform pg_advisory_xact_lock(hashtextextended(oid::text,0));
    if not exists(select 1 from organization_members om where om.organization_id=oid and om.user_id=new.user_id) then
      raise exception 'This person must join the team workspace before joining the project';
    end if;
  end if;
  return new;
end $$;
create trigger check_team_project_member before insert or update of user_id,project_id on public.project_members
for each row execute function public.check_team_project_member();

-- Existing project owners may not promote members to owner through a raw API
-- update; ownership transfers use the checked, atomic function below.
create function public.protect_project_owner_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op='DELETE' then
    if current_user in ('authenticated','anon') and old.role='owner' then raise exception 'Project owners cannot remove themselves'; end if;
    return old;
  end if;
  if current_user in ('authenticated','anon') and (old.role='owner' or new.role='owner') and old.role is distinct from new.role then
    raise exception 'Project ownership must be transferred through the ownership workflow';
  end if;
  return new;
end $$;
create trigger protect_project_owner_role before update of role or delete on public.project_members
for each row execute function public.protect_project_owner_role();

create function public.create_team_organization(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'A registered account is required'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'Enter a team name'; end if;
  insert into organizations(name,owner_id,kind) values(trim(p_name),auth.uid(),'team') returning id into oid;
  update profiles set org_id=oid where id=auth.uid();
  return oid;
end $$;

create function public.switch_organization(p_organization uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_organization_member(p_organization) then raise exception 'Workspace is not available'; end if;
  update profiles set org_id=p_organization where id=auth.uid();
end $$;

create function public.send_organization_invitation(p_organization uuid,p_email text,p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid; em text;
begin
  if auth.uid() is null or not public.is_organization_admin(p_organization) then raise exception 'Only team administrators can invite people'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_organization::text,0));
  if not public.is_organization_admin(p_organization) then raise exception 'Only team administrators can invite people'; end if;
  if not exists(select 1 from organizations where id=p_organization and kind='team') then raise exception 'Team workspace not found'; end if;
  if p_role not in ('admin','member') or p_role is null then raise exception 'Invalid team role'; end if;
  if p_role='admin' and not exists(select 1 from organization_members where organization_id=p_organization and user_id=auth.uid() and role='owner') then raise exception 'Only the team owner can invite administrators'; end if;
  select id,email into uid,em from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null limit 1;
  if uid is null then raise exception 'No verified CONTINUUM account uses that email yet'; end if;
  if exists(select 1 from organization_members where organization_id=p_organization and user_id=uid) then raise exception 'That person is already a team member'; end if;
  insert into organization_invitations(organization_id,inviter_id,invitee_id,invitee_email,role)
    values(p_organization,auth.uid(),uid,em,p_role);
exception when unique_violation then raise exception 'That person already has a pending invitation';
end $$;

create function public.list_my_organization_invitations()
returns table (id uuid, organization_id uuid, organization_name text, inviter_name text, role text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id,i.organization_id,o.name,coalesce(nullif(p.full_name,''),p.email,'Team administrator'),i.role,i.created_at
  from organization_invitations i join organizations o on o.id=i.organization_id
  left join profiles p on p.id=i.inviter_id
  where i.invitee_id=auth.uid() and i.status='pending' order by i.created_at desc
$$;

create function public.respond_organization_invitation(p_id uuid,p_accept boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv organization_invitations%rowtype;
begin
  if auth.uid() is null or p_accept is null then raise exception 'Invalid invitation response'; end if;
  select * into inv from organization_invitations where id=p_id and invitee_id=auth.uid() and status='pending';
  if inv.id is null then raise exception 'Invitation is no longer available'; end if;
  perform pg_advisory_xact_lock(hashtextextended(inv.organization_id::text,0));
  select * into inv from organization_invitations where id=p_id and invitee_id=auth.uid() and status='pending' for update;
  if inv.id is null then raise exception 'Invitation is no longer available'; end if;
  if p_accept then
    insert into organization_members(organization_id,user_id,role) values(inv.organization_id,auth.uid(),inv.role) on conflict (organization_id,user_id) do nothing;
  end if;
  update organization_invitations set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=inv.id;
  return inv.organization_id;
end $$;

create function public.cancel_organization_invitation(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare inv organization_invitations%rowtype;
begin
  select * into inv from organization_invitations where id=p_id and status='pending' for update;
  if inv.id is null or not public.is_organization_admin(inv.organization_id) then raise exception 'Invitation is no longer available'; end if;
  update organization_invitations set status='cancelled',responded_at=now() where id=p_id;
end $$;

create function public.list_organization_members(p_organization uuid)
returns table (user_id uuid, full_name text, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_organization_admin(p_organization) then raise exception 'Only team administrators can view the roster'; end if;
  return query select om.user_id,coalesce(nullif(p.full_name,''),p.email,'Team member'),p.email,om.role,om.created_at
    from organization_members om join profiles p on p.id=om.user_id where om.organization_id=p_organization order by om.created_at;
end $$;

create function public.update_organization_member(p_organization uuid,p_user uuid,p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare m organization_members%rowtype; actor text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_organization::text,0));
  select role into actor from organization_members where organization_id=p_organization and user_id=auth.uid();
  if actor is null or actor not in ('owner','admin') then raise exception 'Only team administrators can manage members'; end if;
  if p_role not in ('admin','member') or p_role is null then raise exception 'Invalid team role'; end if;
  select * into m from organization_members where organization_id=p_organization and user_id=p_user for update;
  if m.id is null or m.role='owner' then raise exception 'The team owner cannot be changed here'; end if;
  if actor <> 'owner' and (m.role='admin' or p_role='admin') then raise exception 'Only the team owner can manage administrators'; end if;
  update organization_members set role=p_role where id=m.id;
end $$;

create function public.remove_organization_member(p_organization uuid,p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m organization_members%rowtype; actor text; fallback uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_organization::text,0));
  select role into actor from organization_members where organization_id=p_organization and user_id=auth.uid();
  if actor is null or actor not in ('owner','admin') then raise exception 'Only team administrators can remove members'; end if;
  select * into m from organization_members where organization_id=p_organization and user_id=p_user for update;
  if m.id is null or m.role='owner' then raise exception 'The team owner cannot be removed'; end if;
  if m.role='admin' and actor<>'owner' then raise exception 'Only the team owner can remove administrators'; end if;
  if exists(select 1 from projects where org_id=p_organization and owner_id=p_user) then
    raise exception 'Transfer this person’s project ownership before removing them';
  end if;
  delete from project_members where user_id=p_user and project_id in (select id from projects where org_id=p_organization);
  update project_invitations set status='cancelled',responded_at=now() where invitee_id=p_user and status='pending' and project_id in (select id from projects where org_id=p_organization);
  delete from organization_members where id=m.id;
  select organization_id into fallback from organization_members where user_id=p_user order by (role='owner') desc,created_at limit 1;
  update profiles set org_id=fallback where id=p_user and org_id=p_organization;
end $$;

create function public.transfer_organization_ownership(p_organization uuid,p_new_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_organization::text,0));
  perform 1 from organizations where id=p_organization and owner_id=auth.uid() and kind='team' for update;
  if not found then raise exception 'Only the team owner can transfer ownership'; end if;
  if p_new_owner=auth.uid() or not exists(select 1 from organization_members where organization_id=p_organization and user_id=p_new_owner) then raise exception 'Choose another existing team member'; end if;
  update organization_members set role='admin' where organization_id=p_organization and user_id=auth.uid();
  update organization_members set role='owner' where organization_id=p_organization and user_id=p_new_owner;
  update organizations set owner_id=p_new_owner where id=p_organization;
end $$;

create function public.transfer_project_ownership(p_project uuid,p_new_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare oid uuid; project_kind text;
begin
  select p.org_id,o.kind into oid,project_kind from projects p left join organizations o on o.id=p.org_id where p.id=p_project;
  if project_kind='team' then perform pg_advisory_xact_lock(hashtextextended(oid::text,0)); end if;
  perform 1 from projects where id=p_project and owner_id=auth.uid() for update;
  if not found or not public.is_project_owner(p_project) then raise exception 'Only the project owner can transfer ownership'; end if;
  if p_new_owner=auth.uid() or not exists(select 1 from project_members where project_id=p_project and user_id=p_new_owner and role='editor') then raise exception 'Choose another project editor'; end if;
  update project_members set role='editor' where project_id=p_project and user_id=auth.uid() and role='owner';
  update project_members set role='owner' where project_id=p_project and user_id=p_new_owner;
  update projects set owner_id=p_new_owner where id=p_project;
end $$;

revoke all on function public.create_team_organization(text),public.switch_organization(uuid),public.send_organization_invitation(uuid,text,text),public.list_my_organization_invitations(),public.respond_organization_invitation(uuid,boolean),public.cancel_organization_invitation(uuid),public.list_organization_members(uuid),public.update_organization_member(uuid,uuid,text),public.remove_organization_member(uuid,uuid),public.transfer_organization_ownership(uuid,uuid),public.transfer_project_ownership(uuid,uuid) from public,anon;
grant execute on function public.create_team_organization(text),public.switch_organization(uuid),public.send_organization_invitation(uuid,text,text),public.list_my_organization_invitations(),public.respond_organization_invitation(uuid,boolean),public.cancel_organization_invitation(uuid),public.list_organization_members(uuid),public.update_organization_member(uuid,uuid,text),public.remove_organization_member(uuid,uuid),public.transfer_organization_ownership(uuid,uuid),public.transfer_project_ownership(uuid,uuid) to authenticated;
