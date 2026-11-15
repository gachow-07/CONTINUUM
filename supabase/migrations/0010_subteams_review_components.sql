-- Existing subsystems remain the project's subteams. Their IDs and records are unchanged.
create table public.project_components (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subsystem_id uuid not null references public.subsystems(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create index project_components_subteam on public.project_components(project_id, subsystem_id);
alter table public.project_components enable row level security;
create policy project_components_read on public.project_components for select to authenticated using (public.is_project_member(project_id));
create policy project_components_create on public.project_components for insert to authenticated with check (public.can_write_project(project_id));
create policy project_components_update on public.project_components for update to authenticated using (public.can_write_project(project_id)) with check (public.can_write_project(project_id));
create policy project_components_delete on public.project_components for delete to authenticated using (public.can_write_project(project_id));
create function public.check_project_component_subteam() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.subsystems where id = new.subsystem_id and project_id = new.project_id) then
    raise exception 'Component and subteam must belong to the same project';
  end if;
  return new;
end $$;
create trigger check_project_component_subteam before insert or update on public.project_components for each row execute function public.check_project_component_subteam();

-- A review can reference one created component, native model part, or assigned GLB mesh.
-- The name snapshot keeps old reviews understandable if a part is renamed or removed.
alter table public.reviews
  add column component_id uuid references public.project_components(id) on delete set null,
  add column model_part_id uuid references public.model_parts(id) on delete set null,
  add column glb_link_id uuid references public.glb_component_links(id) on delete set null,
  add column component_name text check (component_name is null or char_length(component_name) <= 512),
  add constraint reviews_one_component_kind check (num_nonnulls(component_id,model_part_id,glb_link_id) <= 1);

create function public.check_review_component() returns trigger language plpgsql set search_path = public as $$
begin
  -- Clearing or deleting a subteam detaches the target, but retains its name snapshot.
  if tg_op = 'UPDATE' and old.subsystem_id is not null and new.subsystem_id is null then
    new.component_id := null; new.model_part_id := null; new.glb_link_id := null;
  end if;
  if new.component_id is not null and not exists (select 1 from public.project_components where id = new.component_id and project_id = new.project_id and subsystem_id = new.subsystem_id) then
    raise exception 'Component must belong to the selected subteam and project';
  end if;
  if new.glb_link_id is not null and not exists (select 1 from public.glb_component_links where id = new.glb_link_id and project_id = new.project_id and subsystem_id = new.subsystem_id) then
    raise exception 'Model part must belong to the selected subteam and project';
  end if;
  if new.model_part_id is not null and not exists (
    with recursive ancestors as (
      select id, parent_id, subsystem_id, project_id, 0 as depth from public.model_parts where id = new.model_part_id and project_id = new.project_id and kind <> 'group'
      union all select p.id, p.parent_id, p.subsystem_id, p.project_id, a.depth + 1 from public.model_parts p join ancestors a on p.id = a.parent_id and p.project_id = a.project_id where a.depth < 200
    ) select 1 from (select subsystem_id from ancestors where subsystem_id is not null order by depth limit 1) effective where effective.subsystem_id = new.subsystem_id
  ) then raise exception 'Model part must belong to the selected subteam and project'; end if;
  if new.component_id is not null then
    select name into new.component_name from public.project_components where id = new.component_id;
  elsif new.model_part_id is not null then
    select name into new.component_name from public.model_parts where id = new.model_part_id;
  elsif new.glb_link_id is not null and (new.component_name is null or length(trim(new.component_name)) = 0) then
    raise exception 'A model part name is required';
  end if;
  return new;
end $$;
create trigger check_review_component before insert or update of project_id, subsystem_id, component_id, model_part_id, glb_link_id on public.reviews for each row execute function public.check_review_component();
