import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, openSync, closeSync, fsyncSync, writeSync, renameSync, lstatSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

// Synthetic-only workflow persistence, NOT a replacement for D-0037 custody.
export const demoSha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const demoJson = value => `${JSON.stringify(value, null, 2)}\n`;
export function syntheticTreeInventory(root) {
  const files = [];
  const visit = path => {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name); const stat = lstatSync(full);
      if (stat.isSymbolicLink()) throw Error('DEMO_LINK_REJECTED');
      if (stat.isDirectory()) visit(full);
      else if (stat.isFile()) files.push({ path: relative(root, full).split(sep).join('/'), sha256: demoSha256(readFileSync(full)) });
      else throw Error('DEMO_SPECIAL_FILE_REJECTED');
    }
  };
  visit(root); return files;
}
export function verifySyntheticCompiledTree(root, expected) {
  if (!Array.isArray(expected) || expected.length === 0 || JSON.stringify(syntheticTreeInventory(root)) !== JSON.stringify(expected)) throw Error('DEMO_COMPILED_BYTES_CHANGED');
}
export function assertSyntheticDemoRoot(root) {
  const full = resolve(root); const rel = relative(resolve(tmpdir()), full);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || !full.includes('StayOpti-Synthetic-Review-')) throw Error('DEMO_SYNTHETIC_TEMP_ROOT_REQUIRED');
  for (let p = full;; p = dirname(p)) {
    if (existsSync(p) && lstatSync(p).isSymbolicLink()) throw Error('DEMO_LINK_REJECTED');
    if (dirname(p) === p) break;
  }
  return full;
}
export function writeDemoExclusive(path, value) {
  if (existsSync(path)) throw Error('DEMO_OVERWRITE_REJECTED');
  const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : demoJson(value);
  const temporary = `${path}.${randomUUID()}.pending`;
  const fd = openSync(temporary, 'wx');
  try { writeSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  // One owning process; readers never accept a pending write as a committed event.
  if (existsSync(path)) throw Error('DEMO_OVERWRITE_REJECTED');
  renameSync(temporary, path);
  return demoSha256(readFileSync(path));
}
export function sealSyntheticScenario(root, scenario, selection) {
  assertSyntheticDemoRoot(root); mkdirSync(root, { recursive: true });
  if (readdirSync(root).length !== 0) throw Error('DEMO_NEW_CASE_REQUIRED');
  const seal = { version: 'stayopti.synthetic.prospective-seal@1', synthetic: true,
    scenario, selection, persistedAt: new Date().toISOString(),
    clockAssurance: 'LOCAL_PROCESS_ONLY_NOT_INDEPENDENT_TIME_CERTIFICATION' };
  const path = join(root, 'prospective-seal.json');
  const sha256 = writeDemoExclusive(path, seal);
  // This acknowledgment is produced only after fsync + reread of the seal.
  const acknowledgment = { version: 'stayopti.synthetic.seal-ack@1', sealSha256: sha256,
    acknowledgedAt: new Date().toISOString(), sealFileReread: true, observationOpened: false };
  const acknowledgmentHash = writeDemoExclusive(join(root, 'seal-ack.json'), acknowledgment);
  return { path, sha256, acknowledgmentHash };
}
export function openSyntheticObservation(root, expectedSealSha256) {
  assertSyntheticDemoRoot(root);
  const sealPath = join(root, 'prospective-seal.json');
  const acknowledgment = JSON.parse(readFileSync(join(root, 'seal-ack.json'), 'utf8'));
  if (demoSha256(readFileSync(sealPath)) !== expectedSealSha256 || acknowledgment.sealSha256 !== expectedSealSha256 || acknowledgment.sealFileReread !== true) throw Error('DEMO_SEAL_ACK_MISMATCH');
  const value = { version: 'stayopti.synthetic.observation-open@1', sealSha256: expectedSealSha256,
    sealAcknowledgmentSha256: demoSha256(readFileSync(join(root, 'seal-ack.json'))),
    openedAt: new Date().toISOString(), synthetic: true, noExternalObservation: true };
  const sha256 = writeDemoExclusive(join(root, 'observation-open.json'), value);
  return { ...value, sha256 };
}
export function verifySyntheticSequence(root) {
  assertSyntheticDemoRoot(root);
  const seal = JSON.parse(readFileSync(join(root, 'prospective-seal.json'), 'utf8'));
  const ack = JSON.parse(readFileSync(join(root, 'seal-ack.json'), 'utf8'));
  const observation = JSON.parse(readFileSync(join(root, 'observation-open.json'), 'utf8'));
  const sealHash = demoSha256(readFileSync(join(root, 'prospective-seal.json')));
  if (seal.synthetic !== true || ack.sealFileReread !== true || ack.sealSha256 !== sealHash || observation.sealSha256 !== sealHash || observation.sealAcknowledgmentSha256 !== demoSha256(readFileSync(join(root, 'seal-ack.json'))) || Date.parse(ack.acknowledgedAt) < Date.parse(seal.persistedAt) || Date.parse(observation.openedAt) < Date.parse(ack.acknowledgedAt)) throw Error('DEMO_SEQUENCE_INVALID');
  return { seal, ack, observation, sealHash };
}
export function appendSyntheticEvent(root, state, event, transition) {
  const eventRoot = join(assertSyntheticDemoRoot(root), 'events');
  mkdirSync(eventRoot, { recursive: true });
  if (readdirSync(eventRoot).some(p => p.endsWith('.pending'))) throw Error('DEMO_INTERRUPTED_WRITE_REQUIRES_INSPECTION');
  const next = transition(state, event);
  const eventRecord = next.events[next.events.length - 1];
  writeDemoExclusive(join(eventRoot, `${String(next.revision).padStart(6, '0')}.json`), eventRecord);
  return next;
}
export function loadSyntheticEvents(root) {
  const path = join(assertSyntheticDemoRoot(root), 'events');
  if (!existsSync(path)) return [];
  const names = readdirSync(path).sort();
  if (names.some((n, index) => n !== `${String(index + 1).padStart(6, '0')}.json`)) throw Error('DEMO_EVENT_SEQUENCE_BROKEN');
  return names.map(n => JSON.parse(readFileSync(join(path, n), 'utf8')));
}
