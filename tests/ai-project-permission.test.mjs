import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../lib/ai/project-permission.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const commonjs = { exports: {} };
vm.runInNewContext(compiled, { module: commonjs, exports: commonjs.exports, require: () => ({}), Response });
const { requireProjectWriter } = commonjs.exports;

test('AI permission allows editors and owners but fails closed for viewers and errors', async () => {
  const makeClient = (data, error = null) => ({ rpc: async (fn, args) => {
    assert.equal(fn, 'can_write_project');
    assert.equal(args.pid, 'project-id');
    return { data, error };
  } });
  assert.equal(await requireProjectWriter(makeClient(true), 'project-id'), null);
  assert.equal((await requireProjectWriter(makeClient(false), 'project-id')).status, 403);
  assert.equal((await requireProjectWriter(makeClient(null, new Error('unavailable')), 'project-id')).status, 403);
});
