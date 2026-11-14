-- Project Memory — core schema, row-level security and storage policies.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on a fresh project.

create extension if not exists "pgcrypto";

-- ───────────────────────── Identity ─────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role_title text,
  org_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Create a profile + personal workspace when a user signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare oid uuid; nm text;
begin
  nm := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  insert into public.organizations(name, owner_id) values (nm || '''s Workspace', new.id) returning id into oid;
  insert into public.profiles(id, email, full_name, org_id) values (new.id, new.email, nm, oid);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Projects ─────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  category text not null default 'General',
  status text not null default 'active' check (status in ('planning','active','on_hold','completed')),
  cover_path text,
  archived boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,   -- null = non-account teammate (e.g. sample data)
  display_name text not null,
  email text,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ───────────────────────── Access helpers ─────────────────────────
create or replace function public.is_project_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid())
$$;
create or replace function public.can_write_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid() and role in ('owner','editor'))
$$;
create or replace function public.is_project_owner(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid() and role = 'owner')
$$;

-- Owner automatically becomes a project member.
create or replace function public.add_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text; em text;
begin
  select coalesce(full_name, email), email into nm, em from profiles where id = new.owner_id;
  insert into project_members(project_id, user_id, display_name, email, role)
  values (new.id, new.owner_id, coalesce(nm, 'Owner'), em, 'owner');
  return new;
end $$;
create trigger projects_add_owner after insert on public.projects
  for each row execute function public.add_owner_member();

-- Look up a registered user by email, for adding teammates.
create or replace function public.find_user_by_email(p_email text)
returns table (id uuid, full_name text, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.email from profiles p
  where lower(p.email) = lower(p_email) and auth.uid() is not null limit 1
$$;

-- ───────────────────────── Knowledge entities ─────────────────────────
create table public.subsystems (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  position int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subsystem_id uuid references public.subsystems(id) on delete set null,
  type text not null check (type in ('url','pdf','paper','article','image','note')),
  title text not null,
  url text,
  site_name text,
  description text not null default '',
  content_text text,                       -- extracted PDF text or note body
  file_path text,                          -- storage path (pdf / image)
  tags text[] not null default '{}',
  why_important text not null default '',
  ai_summary text,
  is_sample boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.design_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subsystem_id uuid references public.subsystems(id) on delete set null,
  rev_label text not null,
  title text not null,
  kind text not null default 'design_change'
    check (kind in ('initial','research','design_change','simulation','feedback','final')),
  description text not null default '',    -- what changed
  reason text not null default '',         -- why it changed
  author_name text not null default 'Unknown',
  author_id uuid references auth.users(id) on delete set null,
  occurred_on date not null default current_date,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subsystem_id uuid references public.subsystems(id) on delete set null,
  revision_id uuid references public.design_revisions(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime text,
  size bigint not null default 0,
  category text not null default 'other'
    check (category in ('cad','cad_screenshot','calculation','fea','cfd','document','image','other')),
  description text not null default '',
  extracted_text text,
  is_sample boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.design_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subsystem_id uuid references public.subsystems(id) on delete set null,
  title text not null,
  problem text not null default '',
  selected_solution text not null default '',
  alternatives jsonb not null default '[]',   -- [{ "name": "...", "reason_rejected": "..." }]
  reasoning text not null default '',
  status text not null default 'proposed' check (status in ('proposed','accepted','rejected','superseded')),
  author_name text not null default 'Unknown',
  author_id uuid references auth.users(id) on delete set null,
  decided_on date not null default current_date,
  ai_summary text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Links a decision to the evidence behind it (research, revisions, files, simulation notes).
create table public.decision_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  decision_id uuid not null references public.design_decisions(id) on delete cascade,
  kind text not null check (kind in ('research','revision','file','simulation')),
  research_id uuid references public.research_sources(id) on delete cascade,
  revision_id uuid references public.design_revisions(id) on delete cascade,
  file_id uuid references public.files(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (
    (kind = 'research' and research_id is not null) or
    (kind = 'revision' and revision_id is not null) or
    (kind in ('file','simulation') and file_id is not null) or
    (kind = 'simulation' and note <> '')
  )
);

-- Lessons learned, unresolved issues, next steps and background notes (feeds handoff + AI).
create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subsystem_id uuid references public.subsystems(id) on delete set null,
  kind text not null check (kind in ('background','lesson','issue','next_step')),
  title text not null,
  body text not null default '',
  status text not null default 'open' check (status in ('open','resolved')),
  author_name text not null default 'Unknown',
  author_id uuid references auth.users(id) on delete set null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Reviews ─────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subsystem_id uuid references public.subsystems(id) on delete set null,
  decision_id uuid references public.design_decisions(id) on delete set null,
  revision_id uuid references public.design_revisions(id) on delete set null,
  file_id uuid references public.files(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'pending'
    check (status in ('pending','in_review','changes_requested','approved','resolved')),
  reviewer_member_id uuid references public.project_members(id) on delete set null,
  reviewer_name text,
  requested_by uuid references auth.users(id) on delete set null,
  requester_name text not null default 'Unknown',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  parent_id uuid references public.review_comments(id) on delete cascade,
  kind text not null default 'comment' check (kind in ('comment','question','response')),
  body text not null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Unknown',
  file_id uuid references public.files(id) on delete set null,
  decision_id uuid references public.design_decisions(id) on delete set null,
  influenced_revision_id uuid references public.design_revisions(id) on delete set null,
  resolved boolean not null default false,
  resolved_by text,
  resolved_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── AI + documentation + activity ─────────────────────────
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  segments jsonb,                 -- structured assistant answer (facts / interpretation / gaps + citations)
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  doc_type text not null,
  title text not null,
  sections jsonb not null default '[]',   -- [{key,title,content,status,sources:[]}]
  params jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Someone',
  kind text not null,   -- research | file | decision | review | document | revision | project | subsystem | note
  summary text not null,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index on public.project_members (user_id);
create index on public.subsystems (project_id);
create index on public.research_sources (project_id, created_at desc);
create index on public.design_revisions (project_id, occurred_on desc);
create index on public.files (project_id, created_at desc);
create index on public.design_decisions (project_id);
create index on public.decision_evidence (decision_id);
create index on public.project_notes (project_id);
create index on public.reviews (project_id);
create index on public.review_comments (review_id);
create index on public.ai_messages (conversation_id, created_at);
create index on public.project_activity (project_id, created_at desc);

-- Keep projects.updated_at fresh when child records change.
create or replace function public.touch_project() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := coalesce(new.project_id, old.project_id);
  update projects set updated_at = now() where id = pid;
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['subsystems','research_sources','design_revisions','files','design_decisions',
                           'project_notes','reviews','review_comments','generated_documents'] loop
    execute format('create trigger touch_%1$s after insert or update on public.%1$s for each row execute function public.touch_project()', t);
  end loop;
end $$;

-- ───────────────────────── Row-level security ─────────────────────────
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy org_select on public.organizations for select to authenticated
  using (owner_id = auth.uid() or id in (select org_id from public.profiles where id = auth.uid()));
create policy org_update on public.organizations for update to authenticated using (owner_id = auth.uid());

create policy profile_select on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.project_members a join public.project_members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profile_update on public.profiles for update to authenticated using (id = auth.uid());

create policy projects_select on public.projects for select to authenticated
  using (owner_id = auth.uid() or public.is_project_member(id));
create policy projects_insert on public.projects for insert to authenticated with check (owner_id = auth.uid());
create policy projects_update on public.projects for update to authenticated using (public.can_write_project(id));
create policy projects_delete on public.projects for delete to authenticated using (public.is_project_owner(id));

create policy members_select on public.project_members for select to authenticated using (public.is_project_member(project_id));
create policy members_insert on public.project_members for insert to authenticated with check (public.is_project_owner(project_id));
create policy members_update on public.project_members for update to authenticated using (public.is_project_owner(project_id));
create policy members_delete on public.project_members for delete to authenticated using (public.is_project_owner(project_id));

-- Tables where owners/editors write and any member reads.
do $$ declare t text; begin
  foreach t in array array['subsystems','research_sources','design_revisions','files','design_decisions',
                           'decision_evidence','project_notes','generated_documents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (public.is_project_member(project_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.can_write_project(project_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (public.can_write_project(project_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using (public.can_write_project(project_id))', t);
  end loop;
end $$;

-- Collaboration tables: every member may participate (reviewers can be read-only members).
do $$ declare t text; begin
  foreach t in array array['reviews','review_comments','ai_messages','project_activity'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (public.is_project_member(project_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.is_project_member(project_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (public.is_project_member(project_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using (public.can_write_project(project_id))', t);
  end loop;
end $$;

alter table public.ai_conversations enable row level security;
create policy conv_select on public.ai_conversations for select to authenticated
  using (user_id = auth.uid() and public.is_project_member(project_id));
create policy conv_insert on public.ai_conversations for insert to authenticated
  with check (user_id = auth.uid() and public.is_project_member(project_id));
create policy conv_delete on public.ai_conversations for delete to authenticated using (user_id = auth.uid());

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)
on conflict (id) do nothing;

-- Object paths are "<project_id>/<...>" so access follows project membership.
create policy "project files read" on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and public.is_project_member(((storage.foldername(name))[1])::uuid));
create policy "project files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and public.can_write_project(((storage.foldername(name))[1])::uuid));
create policy "project files update" on storage.objects for update to authenticated
  using (bucket_id = 'project-files' and public.can_write_project(((storage.foldername(name))[1])::uuid));
create policy "project files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and public.can_write_project(((storage.foldername(name))[1])::uuid));
