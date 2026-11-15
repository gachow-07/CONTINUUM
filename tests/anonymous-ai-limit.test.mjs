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
async function consume() { return (await db.query('select public.consume_anonymous_ai_use() as result')).rows[0].result; }
await as(first);
let firstUses = [await consume(), await consume(), await consume(), await consume()];
assert.deepEqual(firstUses.map((x) => x.status), ['allowed', 'allowed', 'allowed', 'user_limit']);
assert.deepEqual(firstUses.slice(0, 3).map((x) => x.user_remaining), [2, 1, 0]);
assert.deepEqual(firstUses.slice(0, 3).map((x) => x.global_remaining), [99, 98, 97]);
await assert.rejects(db.query('select * from public.anonymous_ai_usage'));
await as(second);
const simultaneous = await Promise.all([consume(), consume(), consume(), consume(), consume()]);
assert.equal(simultaneous.filter((x) => x.status === 'allowed').length, 3);
assert.equal(simultaneous.filter((x) => x.status === 'user_limit').length, 2);
await db.exec("reset role; insert into auth.users values ('00000000-0000-0000-0000-000000000003'); update public.anonymous_ai_global_usage set used = 99 where singleton;");
await as('00000000-0000-0000-0000-000000000003');
const last = await Promise.all([consume(), consume(), consume()]);
assert.equal(last.filter((x) => x.status === 'allowed' && x.global_remaining === 0).length, 1);
assert.equal(last.filter((x) => x.status === 'global_limit').length, 2);
await assert.rejects(db.query('select * from public.anonymous_ai_global_usage'));
await as(first, false);
await assert.rejects(consume());
await db.close();
console.log('PASS: personal and global quotas, independent users, concurrent requests, and direct table access');
