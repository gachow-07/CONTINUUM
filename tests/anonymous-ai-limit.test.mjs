import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const first = '00000000-0000-0000-0000-000000000001';
const second = '00000000-0000-0000-0000-000000000002';
await db.exec(`create role anon; create role authenticated; create schema auth;
  create table auth.users(id uuid primary key);
  insert into auth.users values ('${first}'), ('${second}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('is_anonymous', current_setting('request.jwt.anonymous', true)::boolean) $$;
  grant usage on schema auth to authenticated;`);
const migration = process.env.AI_LIMIT_MIGRATION ?? new URL('../supabase/migrations/0011_anonymous_ai_limit.sql', import.meta.url);
await db.exec(await readFile(migration, 'utf8'));
async function as(user, anonymous = true) {
  await db.exec(`set role authenticated; select set_config('request.jwt.sub','${user}',false); select set_config('request.jwt.anonymous','${anonymous}',false);`);
}
async function consume() { return (await db.query('select public.consume_anonymous_ai_use() as remaining')).rows[0].remaining; }
await as(first);
assert.deepEqual([await consume(), await consume(), await consume(), await consume()], [2, 1, 0, -1]);
await assert.rejects(db.query('select * from public.anonymous_ai_usage'));
await as(second);
const simultaneous = await Promise.all([consume(), consume(), consume(), consume(), consume()]);
assert.deepEqual(simultaneous.sort((a, b) => a - b), [-1, -1, 0, 1, 2]);
await as(first, false);
await assert.rejects(consume());
await db.close();
console.log('PASS: three uses, blocking, independent users, concurrent requests, and direct table access');
