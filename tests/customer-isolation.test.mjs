import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('actual project and storage policies isolate unshared users', async () => {
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
    const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002', shared='00000000-0000-0000-0000-000000000003';
    const pa='10000000-0000-0000-0000-000000000001', pb='10000000-0000-0000-0000-000000000002', doc='20000000-0000-0000-0000-000000000002';
    await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ($1,'a@example.com',now(),'{}'),($2,'b@example.com',now(),'{}'),($3,'shared@example.com',now(),'{}')`,[a,b,shared]);
    await db.query('insert into projects(id,owner_id,name) values ($1,$2,$3),($4,$5,$6)',[pa,a,'Company A project',pb,b,'Company B secret project']);
    await db.query('insert into project_members(project_id,user_id,display_name,role) values ($1,$2,$3,$4)',[pb,shared,'Invited viewer','viewer']);
    await db.query('insert into research_sources(id,project_id,type,title,why_important) values($1,$2,$3,$4,$5)',[doc,pb,'note','secret research','secret design']);
    await db.query('insert into design_decisions(project_id,title,reasoning) values($1,$2,$3)',[pb,'Secret decision','Secret rationale']);
    await db.query('insert into project_notes(project_id,kind,title,body) values($1,$2,$3,$4)',[pb,'lesson','Secret lesson','Secret details']);
    await db.query('insert into files(project_id,name,storage_path) values($1,$2,$3)',[pb,'secret.glb',`${pb}/b.glb`]);
    const conversation='30000000-0000-0000-0000-000000000002';
    await db.query('insert into ai_conversations(id,project_id,user_id,title) values($1,$2,$3,$4)',[conversation,pb,b,'Secret conversation']);
    await db.query('insert into ai_messages(project_id,conversation_id,role,content) values($1,$2,$3,$4)',[pb,conversation,'user','Secret AI question']);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2),($1,$3)',['project-files',`${pa}/a.glb`,`${pb}/b.glb`]);
    const as = async id => { await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
    await as(a);
    assert.deepEqual((await db.query('select name from projects order by name')).rows.map(r=>r.name),['Company A project']);
    assert.equal((await db.query('select * from projects where id=$1',[pb])).rows.length,0,'direct project lookup');
    assert.equal((await db.query("select * from research_sources where title ilike '%secret%'")).rows.length,0,'search');
    assert.equal((await db.query('select * from research_sources where id=$1',[doc])).rows.length,0,'direct research lookup');
    assert.equal((await db.query('select * from public.find_user_by_email($1)',['b@example.com'])).rows.length,1,'known limitation: a signed-in user can look up another registered email');
    for (const table of ['design_decisions','project_notes','files','ai_conversations','ai_messages']) {
      assert.equal((await db.query(`select * from ${table} where project_id=$1`,[pb])).rows.length,0,`unshared ${table}`);
    }
    assert.equal((await db.query('select * from storage.objects where name=$1',[`${pb}/b.glb`])).rows.length,0,'storage download authorization');
    assert.equal((await db.query('update projects set name=$1 where id=$2 returning id',['tampered',pb])).rows.length,0,'project update');
    assert.equal((await db.query('update research_sources set title=$1 where id=$2 returning id',['tampered',doc])).rows.length,0,'research update');
    await assert.rejects(db.query('insert into research_sources(project_id,type,title) values($1,$2,$3)',[pb,'note','unauthorized']));
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['project-files',`${pb}/attack.glb`]));
    await assert.rejects(db.query('select public.replace_model($1,$2::jsonb)',[pb,'[]']));
    await assert.rejects(db.query('insert into ai_conversations(project_id,user_id,title) values($1,$2,$3)',[pb,a,'Unauthorized AI conversation']));
    await assert.rejects(db.query('insert into ai_messages(project_id,conversation_id,role,content) values($1,$2,$3,$4)',[pb,conversation,'user','Unauthorized question']));
    await assert.rejects(db.query('insert into project_members(project_id,user_id,display_name,role) values($1,$2,$3,$4)',[pb,a,'Bypass','editor']));
    await db.exec('reset role');
    await db.exec(await readFile(new URL('../supabase/migrations/0013_restrict_user_lookup.sql', import.meta.url), 'utf8'));
    await as(a);
    await assert.rejects(db.query('select * from public.find_user_by_email($1)',['b@example.com']), /permission denied/);
    await as(b);
    await db.query('select public.send_project_invitation($1,$2,$3)',[pb,'a@example.com','viewer']);
    await as(a);
    assert.equal((await db.query('select * from public.list_my_project_invitations()')).rows.length,1,'owner can still invite an account after lookup is restricted');
    await db.exec('reset role');
    await db.exec(await readFile(new URL('../supabase/migrations/0014_viewers_are_read_only.sql', import.meta.url), 'utf8'));
    const review = '40000000-0000-0000-0000-000000000001';
    const editor = '00000000-0000-0000-0000-000000000004';
    await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ($1,'editor@example.com',now(),'{}')`, [editor]);
    await db.query('insert into project_members(project_id,user_id,display_name,role) values ($1,$2,$3,$4)', [pb,editor,'Editor','editor']);
    await as(b);
    await db.query('insert into reviews(id,project_id,title) values($1,$2,$3)', [review,pb,'Review']);
    await db.query('insert into review_comments(project_id,review_id,body) values($1,$2,$3)', [pb,review,'Owner comment']);
    await as(editor);
    await db.query('insert into review_comments(project_id,review_id,body) values($1,$2,$3)', [pb,review,'Editor comment']);
    assert.equal((await db.query('update reviews set status=$1 where id=$2 returning id',['in_review',review])).rows.length,1,'editor can update review');
    await assert.rejects(db.query('select public.send_project_invitation($1,$2,$3)',[pb,'shared@example.com','viewer']), /Only the project owner/);
    await assert.rejects(db.query('update projects set owner_id=$1 where id=$2',[editor,pb]), /owner|ownership|permission/i, 'editor cannot take ownership');
    await assert.rejects(db.query('update projects set org_id=$1 where id=$2',[pa,pb]), /permission/i, 'editor cannot move a project between organizations');
    assert.equal((await db.query('update projects set description=$1 where id=$2 returning id',['Editor changes',pb])).rows.length,1,'editor can update project content');
    await as(shared);
    assert.equal((await db.query('select * from projects where id=$1',[pb])).rows.length,1,'explicitly shared viewer can read');
    assert.equal((await db.query('select * from storage.objects where name=$1',[`${pb}/b.glb`])).rows.length,1,'shared viewer can read file');
    assert.equal((await db.query('update research_sources set title=$1 where id=$2 returning id',['tampered',doc])).rows.length,0,'viewer cannot edit research');
    assert.equal((await db.query('select * from review_comments where review_id=$1',[review])).rows.length,2,'viewer can read comments');
    assert.equal((await db.query('update reviews set status=$1 where id=$2 returning id',['approved',review])).rows.length,0,'viewer cannot approve a review');
    assert.equal((await db.query('update review_comments set body=$1 where review_id=$2 returning id',['changed',review])).rows.length,0,'viewer cannot edit comments');
    for (const [sql, args] of [
      ['insert into reviews(project_id,title) values($1,$2)',[pb,'Viewer review']],
      ['insert into review_comments(project_id,review_id,body) values($1,$2,$3)',[pb,review,'Viewer comment']],
      ['insert into project_activity(project_id,kind,summary) values($1,$2,$3)',[pb,'review','Fake activity']],
      ['insert into ai_conversations(project_id,user_id,title) values($1,$2,$3)',[pb,shared,'Viewer conversation']],
      ['insert into ai_messages(project_id,conversation_id,role,content) values($1,$2,$3,$4)',[pb,conversation,'user','Viewer message']],
    ]) await assert.rejects(db.query(sql,args));
    await db.exec('reset role');
    await db.query('delete from project_members where project_id=$1 and user_id=$2',[pb,shared]);
    await as(shared);
    assert.equal((await db.query('select * from projects where id=$1',[pb])).rows.length,0,'revoked viewer can no longer read');
    assert.equal((await db.query('select * from storage.objects where name=$1',[`${pb}/b.glb`])).rows.length,0,'revoked viewer cannot request new file access');
    await db.exec('reset role; set role anon');
    assert.equal((await db.query('select * from projects')).rows.length,0,'anonymous has no project rows');
    assert.equal((await db.query('select * from storage.objects')).rows.length,0,'anonymous has no file rows');
  } finally { await db.close(); }
});
