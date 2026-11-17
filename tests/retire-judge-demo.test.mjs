import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/0012_retire_judge_demo.sql', import.meta.url), 'utf8');

test('retiring the judge demo disables creation without deleting existing data', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table public.judge_demo_config (singleton boolean primary key, enabled boolean);
      insert into public.judge_demo_config values (true, true);
      create table public.judge_demo_sessions (id int primary key);
      insert into public.judge_demo_sessions values (1);
      create function public.create_judge_demo() returns int language sql as 'select 42';
      grant execute on function public.create_judge_demo() to anon, authenticated;`);
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await db.query('select enabled from public.judge_demo_config')).rows[0].enabled, false);
    assert.equal((await db.query('select count(*)::int as count from public.judge_demo_sessions')).rows[0].count, 1);
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await db.query(`select has_function_privilege('${role}', 'public.create_judge_demo()', 'EXECUTE') as allowed`)).rows[0].allowed, false);
    }
  } finally { await db.close(); }
});

test('retirement also succeeds when the judge migration was never applied', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    await db.exec(migration);
  } finally { await db.close(); }
});
