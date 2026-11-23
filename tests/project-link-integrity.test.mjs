import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('project-linked records cannot cross projects', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      grant usage on schema auth, storage to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated, anon;
      grant execute on function storage.foldername(text) to authenticated, anon;`);
    let schema = await readFile(new URL('../supabase/migrations/0001_schema.sql', import.meta.url), 'utf8');
    schema = schema.replace('create extension if not exists "pgcrypto";', '');
    await db.exec(schema);
    for (const f of ['0002_model.sql','0003_markers.sql','0005_disable_project_deletion.sql','0006_project_viewer_model.sql','0007_glb_component_links.sql','0008_project_invitations.sql','0009_lock_profile_identity.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
    }
    await db.exec('grant usage on schema public to anon, authenticated; grant select,insert,update,delete on all tables in schema public to authenticated; grant select on all tables in schema public to anon; revoke delete on public.projects from authenticated; revoke update on public.profiles from authenticated; grant update (full_name,role_title) on public.profiles to authenticated;');
    for (const path of (process.env.PRIOR_MIGRATIONS ?? '').split(':').filter(Boolean)) await db.exec(await readFile(path, 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/0016_project_link_integrity.sql', import.meta.url), 'utf8'));
    const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002';
    const pa='10000000-0000-0000-0000-000000000001', pb='10000000-0000-0000-0000-000000000002';
    const ca='20000000-0000-0000-0000-000000000001', cb='20000000-0000-0000-0000-000000000002';
    const fa='30000000-0000-0000-0000-000000000001', fb='30000000-0000-0000-0000-000000000002';
    const conv='40000000-0000-0000-0000-000000000002';
    await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ($1,'a@example.com',now(),'{}'),($2,'b@example.com',now(),'{}')",[a,b]);
    await db.query("insert into projects(id,owner_id,name) values ($1,$2,'A'),($3,$4,'B')",[pa,a,pb,b]);
    await db.query("insert into subsystems(id,project_id,name) values ($1,$2,'A component'),($3,$4,'B component')",[ca,pa,cb,pb]);
    await db.query("insert into files(id,project_id,name,storage_path) values ($1,$2,'A.glb',$3),($4,$5,'B.glb',$6)",[fa,pa,`${pa}/a.glb`,fb,pb,`${pb}/b.glb`]);
    await db.query("insert into ai_conversations(id,project_id,user_id) values($1,$2,$3)",[conv,pb,b]);
    await db.query("insert into ai_messages(project_id,conversation_id,role,content) values($1,$2,'user','private')",[pb,conv]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
    await db.query("insert into research_sources(project_id,subsystem_id,type,title) values($1,$2,'note','valid')",[pa,ca]);
    await assert.rejects(db.query("insert into research_sources(project_id,subsystem_id,type,title) values($1,$2,'note','cross')",[pa,cb]));
    await assert.rejects(db.query("insert into files(project_id,name,storage_path) values($1,'cross',$2)",[pa,`${pb}/b.glb`]));
    await assert.rejects(db.query("insert into research_sources(project_id,type,title,file_path) values($1,'pdf','cross',$2)",[pa,`${pb}/b.pdf`]));
    await assert.rejects(db.query("insert into glb_component_links(project_id,file_id,subsystem_id,part_key) values($1,$2,$3,'part')",[pa,fb,ca]));
    await assert.rejects(db.query("insert into model_parts(id,project_id,subsystem_id,name,kind) values(gen_random_uuid(),$1,$2,'cross','box')",[pa,cb]));
    await assert.rejects(db.query("insert into ai_messages(project_id,conversation_id,role,content) values($1,$2,'user','cross')",[pa,conv]));
    await db.exec('reset role');
    await db.query("insert into project_members(project_id,user_id,display_name,role) values($1,$2,'shared','editor')",[pb,a]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
    assert.equal((await db.query('select * from ai_messages where conversation_id=$1',[conv])).rows.length,0,'shared members cannot read another user conversation');
    await assert.rejects(db.query("insert into ai_messages(project_id,conversation_id,role,content) values($1,$2,'user','cross')",[pb,conv]));
    await assert.rejects(db.query("insert into research_sources(project_id,subsystem_id,type,title) values($1,$2,'note','cross')",[pa,cb]), /foreign key/,'links cannot cross projects even when the user can access both');
    const parts = [{id:'50000000-0000-0000-0000-000000000001',name:'parent',kind:'group'}, {id:'50000000-0000-0000-0000-000000000002',parent_id:'50000000-0000-0000-0000-000000000001',name:'child',kind:'box'}];
    assert.equal((await db.query('select public.replace_model($1,$2::jsonb) as n',[pa,JSON.stringify(parts)])).rows[0].n,2,'replacing an assembly with parent and child parts still works');
    await db.exec('reset role');
    await db.query('delete from subsystems where id=$1',[ca]);
    assert.equal((await db.query("select subsystem_id from research_sources where title='valid'")).rows[0].subsystem_id,null,'existing set null deletion remains valid');
  } finally { await db.close(); }
});
