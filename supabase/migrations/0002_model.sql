-- 3D workspace: the parametric assembly shown at the centre of each project.
-- Parts are primitives (box / cylinder / sphere) or groups, with a transform and a material.
-- This is a mesh/primitive model, not a B-rep CAD kernel.

create table public.model_parts (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.model_parts(id) on delete cascade,
  subsystem_id uuid references public.subsystems(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null check (kind in ('group','box','cylinder','sphere')),
  params jsonb not null default '{}',              -- box: {w,h,d}  cylinder: {r,h}  sphere: {r}   (millimetres)
  position jsonb not null default '[0,0,0]',       -- millimetres, relative to parent
  rotation jsonb not null default '[0,0,0]',       -- degrees (XYZ), relative to parent
  material jsonb not null default '{}',            -- {color, metalness, roughness, opacity}
  visible boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.model_parts (project_id, sort);

alter table public.model_parts enable row level security;
create policy model_parts_select on public.model_parts for select to authenticated using (public.is_project_member(project_id));
create policy model_parts_insert on public.model_parts for insert to authenticated with check (public.can_write_project(project_id));
create policy model_parts_update on public.model_parts for update to authenticated using (public.can_write_project(project_id));
create policy model_parts_delete on public.model_parts for delete to authenticated using (public.can_write_project(project_id));

-- Atomically replaces a project's assembly. Runs as the caller (SECURITY INVOKER), so RLS applies.
-- All rows go in with one INSERT, so the parent_id foreign key is checked after the whole statement.
create or replace function public.replace_model(p_project uuid, p_parts jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  if not public.can_write_project(p_project) then
    raise exception 'You do not have permission to edit this project''s model';
  end if;
  delete from model_parts where project_id = p_project;
  insert into model_parts (id, project_id, parent_id, subsystem_id, name, kind, params, position, rotation, material, visible, sort)
  select (e->>'id')::uuid, p_project, nullif(e->>'parent_id','')::uuid, nullif(e->>'subsystem_id','')::uuid,
         e->>'name', e->>'kind', coalesce(e->'params','{}'), coalesce(e->'position','[0,0,0]'), coalesce(e->'rotation','[0,0,0]'),
         coalesce(e->'material','{}'), coalesce((e->>'visible')::boolean, true), (ord - 1)::int
  from jsonb_array_elements(p_parts) with ordinality as t(e, ord);
  get diagnostics n = row_count;
  return n;
end $$;
