-- A project can choose a privately stored GLB file for its hub viewer.
alter table public.projects add column if not exists viewer_model_file_id uuid references public.files(id) on delete set null;

-- Ensure a model reference cannot point at a different project's file, even if
-- a client writes to projects without going through the application action.
create or replace function public.check_project_viewer_model() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.viewer_model_file_id is not null and not exists (
    select 1 from public.files where id = new.viewer_model_file_id
      and project_id = new.id and lower(name) like '%.glb'
  ) then
    raise exception 'Viewer model must be a GLB file belonging to this project';
  end if;
  return new;
end;
$$;
create trigger check_project_viewer_model before insert or update of viewer_model_file_id on public.projects
for each row execute function public.check_project_viewer_model();
