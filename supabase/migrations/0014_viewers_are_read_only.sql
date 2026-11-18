-- Viewers may read shared project data but cannot create or change project
-- records, including reviews, comments, activity, or saved AI conversations.
do $$ declare t text; begin
  foreach t in array array['reviews', 'review_comments', 'ai_messages', 'project_activity'] loop
    execute format('drop policy if exists %1$s_insert on public.%1$I', t);
    execute format('drop policy if exists %1$s_update on public.%1$I', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.can_write_project(project_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (public.can_write_project(project_id)) with check (public.can_write_project(project_id))', t);
  end loop;
end $$;

drop policy if exists conv_insert on public.ai_conversations;
create policy conv_insert on public.ai_conversations for insert to authenticated
  with check (user_id = auth.uid() and public.can_write_project(project_id));
drop policy if exists conv_delete on public.ai_conversations;
create policy conv_delete on public.ai_conversations for delete to authenticated
  using (user_id = auth.uid() and public.can_write_project(project_id));

-- Project editors can update content but cannot silently take ownership or
-- move the project to another organization by bypassing the UI. Ownership
-- transfer needs a separate, explicitly authorized workflow.
revoke update on public.projects from public, anon, authenticated;
revoke update (id, owner_id, org_id, is_sample, created_at, updated_at) on public.projects from public, anon, authenticated;
grant update (name, description, category, status, cover_path, archived, viewer_model_file_id) on public.projects to authenticated;
