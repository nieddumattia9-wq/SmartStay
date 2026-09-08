import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Native ESM boundary, identical to the local runner; no provider or real custody.
const load = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
const moduleUrl = pathToFileURL(resolve('scripts/prospective-assisted-durable-demo.mjs')).href;
test('prospective disk seal is acknowledged before observation; reopening twice is refused', async () => {
  const d = await load(moduleUrl); const root = mkdtempSync(join(tmpdir(), 'StayOpti-Synthetic-Review-order-'));
  try {
    assert.throws(() => d.openSyntheticObservation(root, 'a'.repeat(64)));
    const seal = d.sealSyntheticScenario(root, { synthetic: true }, { count: 5 });
    const observation = d.openSyntheticObservation(root, seal.sha256);
    assert.equal(d.verifySyntheticSequence(root).sealHash, seal.sha256);
    assert.equal(observation.noExternalObservation, true);
    assert.throws(() => d.openSyntheticObservation(root, seal.sha256), /OVERWRITE/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('altered seal or acknowledgment cannot admit an observation', async () => {
  const d = await load(moduleUrl); const root = mkdtempSync(join(tmpdir(), 'StayOpti-Synthetic-Review-tamper-'));
  try {
    const seal = d.sealSyntheticScenario(root, { synthetic: true }, { count: 8 });
    writeFileSync(seal.path, '{}');
    assert.throws(() => d.openSyntheticObservation(root, seal.sha256), /MISMATCH/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('durable ledger rejects duplicate ordinal and survives reload without overwrite', async () => {
  const d = await load(moduleUrl); const root = mkdtempSync(join(tmpdir(), 'StayOpti-Synthetic-Review-ledger-'));
  const state = { revision: 0, events: [] as object[] };
  const transition = (_: unknown, event: object) => ({ revision: 1, events: [event] });
  try {
    d.appendSyntheticEvent(root, state, { synthetic: true, choice: 'TIE' }, transition);
    const before = readFileSync(join(root, 'events', '000001.json'));
    assert.equal(d.loadSyntheticEvents(root).length, 1);
    assert.throws(() => d.appendSyntheticEvent(root, state, { synthetic: true }, transition), /OVERWRITE/);
    assert.deepEqual(readFileSync(join(root, 'events', '000001.json')), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('synthetic store never accepts a repository or arbitrary private custody root', async () => {
  const d = await load(moduleUrl);
  assert.throws(() => d.assertSyntheticDemoRoot(process.cwd()), /ROOT_REQUIRED/);
  assert.throws(() => d.assertSyntheticDemoRoot(tmpdir()), /ROOT_REQUIRED/);
});
test('cached compiled bytes are checked before loading; changed or additional files fail closed', async () => {
  const d = await load(moduleUrl); const root = mkdtempSync(join(tmpdir(), 'StayOpti-Synthetic-Review-compiled-'));
  try {
    const path=join(root,'domain.js'); writeFileSync(path,'module.exports = {};');
    const inventory=d.syntheticTreeInventory(root); d.verifySyntheticCompiledTree(root,inventory);
    writeFileSync(path,'module.exports = {altered:true};');
    assert.throws(()=>d.verifySyntheticCompiledTree(root,inventory),/COMPILED_BYTES_CHANGED/);
    writeFileSync(path,'module.exports = {};'); writeFileSync(join(root,'unexpected.js'),'');
    assert.throws(()=>d.verifySyntheticCompiledTree(root,inventory),/COMPILED_BYTES_CHANGED/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
