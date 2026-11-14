-- Map imported GLB meshes to project components without modifying the source model.
create table public.glb_component_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  subsystem_id uuid not null references public.subsystems(id) on delete cascade,
  part_key text not null check (length(part_key) between 1 and 512),
  unique (file_id, part_key)
);
alter table public.glb_component_links enable row level security;
create policy glb_links_read on public.glb_component_links for select to authenticated using (public.is_project_member(project_id));
create policy glb_links_insert on public.glb_component_links for insert to authenticated with check (public.can_write_project(project_id));
create policy glb_links_update on public.glb_component_links for update to authenticated using (public.can_write_project(project_id)) with check (public.can_write_project(project_id));
create policy glb_links_delete on public.glb_component_links for delete to authenticated using (public.can_write_project(project_id));

create function public.check_glb_component_link() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.files where id = new.file_id and project_id = new.project_id and lower(name) like '%.glb')
    or not exists (select 1 from public.subsystems where id = new.subsystem_id and project_id = new.project_id) then
    raise exception 'Model and component must belong to the same project';
  end if;
  return new;
end;
$$;
create trigger check_glb_component_link before insert or update on public.glb_component_links
for each row execute function public.check_glb_component_link();
