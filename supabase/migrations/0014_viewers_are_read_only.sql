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
