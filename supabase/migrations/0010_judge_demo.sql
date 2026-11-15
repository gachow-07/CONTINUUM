-- Judge workspaces are private copies owned by anonymous Supabase users.
-- An administrator must approve a template before the entry point is enabled.
create table public.judge_demo_config (
  singleton boolean primary key default true check (singleton),
  template_project_id uuid not null references public.projects(id),
  enabled boolean not null default false
);
create table public.judge_demo_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.judge_demo_config enable row level security;
alter table public.judge_demo_sessions enable row level security;
-- No client has direct access to the configuration or session table.
revoke all on public.judge_demo_config, public.judge_demo_sessions from anon, authenticated;

create or replace function public.create_judge_demo()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); source_id uuid; dest_id uuid; source_file public.files%rowtype;
  dest_file uuid; row_item record; new_id uuid;
  subs jsonb := '{}'::jsonb; sources jsonb := '{}'::jsonb; decisions jsonb := '{}'::jsonb; revisions jsonb := '{}'::jsonb;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false then
    raise exception 'A judge session is required';
  end if;
  -- Concurrent retries for one anonymous account must not create multiple copies.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select project_id into dest_id from public.judge_demo_sessions where user_id = uid;
  if dest_id is not null then
    select viewer_model_file_id into dest_file from public.projects where id = dest_id;
    return jsonb_build_object('project_id', dest_id, 'file_id', dest_file, 'storage_path', dest_id::text || '/judge-demo/aero.glb');
  end if;
  select template_project_id into source_id from public.judge_demo_config where singleton and enabled;
  if source_id is null then raise exception 'Judge demo is not configured'; end if;
  select f.* into source_file from public.projects p join public.files f on f.id = p.viewer_model_file_id and f.project_id = p.id
    where p.id = source_id and lower(f.name) = 'f26-aer-0000-501.glb';
  if source_file.id is null then raise exception 'The approved Aero model is not available'; end if;
  -- Fail closed if the configured model does not match the packaged demo asset.
  if source_file.size <> 2374144 then raise exception 'The approved Aero model does not match the packaged demo asset'; end if;
  insert into public.projects(owner_id, name, description, category, status, is_sample)
    select uid, name, description, category, 'active', true from public.projects where id = source_id returning id into dest_id;
  for row_item in select * from public.subsystems where project_id = source_id order by position loop
    insert into public.subsystems(project_id, name, description, position, marker_position, is_sample)
      values (dest_id, row_item.name, row_item.description, row_item.position, row_item.marker_position, true) returning id into new_id;
    subs := subs || jsonb_build_object(row_item.id::text, new_id);
  end loop;
  for row_item in select * from public.research_sources where project_id = source_id loop
    insert into public.research_sources(project_id, subsystem_id, type, title, url, site_name, description, content_text, tags, why_important, ai_summary, is_sample, created_by)
      values (dest_id, (subs->>row_item.subsystem_id::text)::uuid, row_item.type, row_item.title, row_item.url, row_item.site_name, row_item.description, row_item.content_text, row_item.tags, row_item.why_important, row_item.ai_summary, true, uid) returning id into new_id;
    sources := sources || jsonb_build_object(row_item.id::text, new_id);
  end loop;
  for row_item in select * from public.design_revisions where project_id = source_id loop
    insert into public.design_revisions(project_id, subsystem_id, rev_label, title, kind, description, reason, author_name, occurred_on, is_sample)
      values (dest_id, (subs->>row_item.subsystem_id::text)::uuid, row_item.rev_label, row_item.title, row_item.kind, row_item.description, row_item.reason, 'Demo team', row_item.occurred_on, true) returning id into new_id;
    revisions := revisions || jsonb_build_object(row_item.id::text, new_id);
  end loop;
  for row_item in select * from public.design_decisions where project_id = source_id loop
    insert into public.design_decisions(project_id, subsystem_id, title, problem, selected_solution, alternatives, reasoning, status, author_name, decided_on, ai_summary, is_sample)
      values (dest_id, (subs->>row_item.subsystem_id::text)::uuid, row_item.title, row_item.problem, row_item.selected_solution, row_item.alternatives, row_item.reasoning, row_item.status, 'Demo team', row_item.decided_on, row_item.ai_summary, true) returning id into new_id;
    decisions := decisions || jsonb_build_object(row_item.id::text, new_id);
  end loop;
  insert into public.decision_evidence(project_id, decision_id, kind, research_id, revision_id, note)
    select dest_id, (decisions->>e.decision_id::text)::uuid, e.kind, (sources->>e.research_id::text)::uuid, (revisions->>e.revision_id::text)::uuid, e.note
    from public.decision_evidence e where e.project_id = source_id and (e.kind = 'research' and sources ? e.research_id::text or e.kind = 'revision' and revisions ? e.revision_id::text or e.kind = 'simulation' and e.note <> '' and e.file_id is null);
  insert into public.project_notes(project_id, subsystem_id, kind, title, body, status, author_name, is_sample)
    select dest_id, (subs->>n.subsystem_id::text)::uuid, n.kind, n.title, n.body, n.status, 'Demo team', true from public.project_notes n where n.project_id = source_id;
  insert into public.files(project_id, name, storage_path, mime, size, category, description, is_sample, uploaded_by)
    values (dest_id, source_file.name, dest_id::text || '/judge-demo/aero.glb', 'model/gltf-binary', source_file.size, 'cad', 'Illustrative demo model', true, uid) returning id into dest_file;
  update public.projects set viewer_model_file_id = dest_file where id = dest_id;
  insert into public.glb_component_links(project_id, file_id, subsystem_id, part_key)
    select dest_id, dest_file, (subs->>l.subsystem_id::text)::uuid, l.part_key from public.glb_component_links l
    where l.project_id = source_id and l.file_id = source_file.id and subs ? l.subsystem_id::text;
  insert into public.judge_demo_sessions(user_id, project_id) values (uid, dest_id);
  return jsonb_build_object('project_id', dest_id, 'file_id', dest_file, 'storage_path', dest_id::text || '/judge-demo/aero.glb');
end $$;
revoke all on function public.create_judge_demo() from public, anon;
grant execute on function public.create_judge_demo() to authenticated;
