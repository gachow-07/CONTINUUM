-- New links must remain inside their project, even when written through the API.
-- NOT VALID preserves existing rows for a separate, explicit data audit; it does
-- not exempt new inserts or updates. Do not validate until mismatches are fixed.
do $$
declare t text; link record;
begin
  foreach t in array array['subsystems','design_revisions','files','design_decisions','research_sources','reviews','review_comments','project_members','ai_conversations','model_parts'] loop
    execute format('create unique index if not exists %I on public.%I (id, project_id)', t || '_id_project_integrity_idx', t);
  end loop;
  for link in select * from (values
    ('research_sources','subsystem_id','subsystems'),
    ('design_revisions','subsystem_id','subsystems'),
    ('files','subsystem_id','subsystems'), ('files','revision_id','design_revisions'),
    ('design_decisions','subsystem_id','subsystems'),
    ('decision_evidence','decision_id','design_decisions'), ('decision_evidence','research_id','research_sources'), ('decision_evidence','revision_id','design_revisions'), ('decision_evidence','file_id','files'),
    ('project_notes','subsystem_id','subsystems'),
    ('reviews','subsystem_id','subsystems'), ('reviews','decision_id','design_decisions'), ('reviews','revision_id','design_revisions'), ('reviews','file_id','files'), ('reviews','reviewer_member_id','project_members'),
    ('review_comments','review_id','reviews'), ('review_comments','parent_id','review_comments'), ('review_comments','file_id','files'), ('review_comments','decision_id','design_decisions'), ('review_comments','influenced_revision_id','design_revisions'),
    ('ai_messages','conversation_id','ai_conversations'),
    ('model_parts','parent_id','model_parts'), ('model_parts','subsystem_id','subsystems'),
    ('glb_component_links','file_id','files'), ('glb_component_links','subsystem_id','subsystems')
  ) as l(child, col, parent) loop
    execute format('alter table public.%I add constraint %I foreign key (%I, project_id) references public.%I (id, project_id) deferrable initially immediate not valid', link.child, left('same_project_' || link.child || '_' || link.col, 63), link.col, link.parent);
  end loop;
end $$;

-- File metadata must not be used to attach an object from another project.
alter table public.files add constraint files_project_storage_path check (storage_path like project_id::text || '/%') not valid;
alter table public.research_sources add constraint research_project_storage_path check (file_path is null or file_path like project_id::text || '/%') not valid;
alter table public.projects add constraint project_cover_storage_path check (cover_path is null or cover_path like id::text || '/%') not valid;

-- Conversation rows are private to their creator; their messages must be too.
drop policy if exists ai_messages_select on public.ai_messages;
drop policy if exists ai_messages_insert on public.ai_messages;
drop policy if exists ai_messages_update on public.ai_messages;
drop policy if exists ai_messages_delete on public.ai_messages;
create policy ai_messages_select on public.ai_messages for select to authenticated using (
  exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.project_id = ai_messages.project_id and c.user_id = auth.uid())
);
create policy ai_messages_insert on public.ai_messages for insert to authenticated with check (
  public.can_write_project(project_id) and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.project_id = ai_messages.project_id and c.user_id = auth.uid())
);
create policy ai_messages_update on public.ai_messages for update to authenticated using (
  public.can_write_project(project_id) and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.project_id = ai_messages.project_id and c.user_id = auth.uid())
) with check (
  public.can_write_project(project_id) and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.project_id = ai_messages.project_id and c.user_id = auth.uid())
);
create policy ai_messages_delete on public.ai_messages for delete to authenticated using (
  public.can_write_project(project_id) and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.project_id = ai_messages.project_id and c.user_id = auth.uid())
);
