import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, readFileSync, readdirSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, sep, basename} from 'node:path';
import {pathToFileURL} from 'node:url';

// Invented observations only; loopback transport, never provider or engine calls.
const load = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
const at = (path: string) => load(pathToFileURL(join(process.cwd(), path)).href);
async function modules() {
  const [p, d, j, c, f] = await Promise.all([
    'scripts/liteapi-search-coverage-plan-v1.mjs',
    'scripts/liteapi-search-coverage-diagnostics-v1.mjs',
    'scripts/liteapi-search-coverage-journal-v1.mjs',
    'scripts/liteapi-search-coverage-capture-v1.mjs',
    'tests/engine-v3/fixtures/liteApiCoverageSyntheticV1.mjs',
  ].map(at));
  return {p, d, j, c, f};
}
function armPlan(p: any, config: any, limits = {city: 200, ids: 20, catalog: 100, selected: 20}) {
  config.version = p.COVERAGE_ARM_LIMITS_VERSION;
  delete config.controls.ratesLimit;
  Object.assign(config.controls, {cityRatesLimit: limits.city, idRatesLimit: limits.ids,
    catalogLimit: limits.catalog, maximumSelectedIds: limits.selected});
}
async function example(options: any = {}) {
  const m = await modules();
  const x = m.f.coverageFixture({directory: 'C:/invented-not-created', ...options,
    mutatePlan: (config: any) => {armPlan(m.p, config, options.limits); options.change?.(config);}});
  return {...m, ...x};
}
function clean(root: string) {
  assert(resolve(root).startsWith(resolve(tmpdir()) + sep));
  assert.match(basename(root), /^StayOpti-D0064-Arms-/);
  rmSync(root, {recursive: true, force: true});
}
const snapshot = (root: string): any => existsSync(root) ? readdirSync(root, {withFileTypes: true})
  .map(e => [e.name, e.isDirectory() ? snapshot(join(root, e.name)) : readFileSync(join(root, e.name)).toString('base64')]) : [];
async function runtime(options: any = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'StayOpti-D0064-Arms-'));
  const registryRoot = join(temp, 'registry');
  const x = await example({...options, directory: registryRoot});
  const checkpoint = {head: 'a'.repeat(40), branch: x.p.BRANCH, inventorySha256: 'b'.repeat(64)};
  const input = {root: join(registryRoot, 'cases', x.config.caseId), registryRoot,
    caseId: x.config.caseId, mode: 'SYNTHETIC_ONLY', bindingSha256: x.p.hash({config: x.config, checkpoint}),
    authorizationSha256: x.p.hash({synthetic: true, checkpoint}), protector: x.f.syntheticProtector};
  const journal = x.j.createCoverageJournal(input);
  return {...x, temp, input, journal, checkpoint,
    run: (verifyBeforeSend = () => {}) => x.c.runCoverageAcquisition({config: x.config, checkpoint,
      journal, simulation: x.simulation, verifyBeforeSend})};
}

test('AR01 explicit arm version leaves legacy authorization inputs and requests unchanged', async () => {
  const {p, f} = await modules();
  assert.equal(p.COVERAGE_VERSION, 'stayopti.liteapi-search-coverage@1.1');
  assert.equal(p.COVERAGE_ARM_LIMITS_VERSION, 'stayopti.liteapi-search-coverage@1.2');
  const old = f.coverageFixture({directory: 'C:/invented-not-created'});
  const before = JSON.stringify(old.config);
  assert.equal(p.validateCoveragePlan(old.config, {synthetic: true}).pending.length, 0);
  for (const kind of ['CITY_RATES', 'ID_RATES']) assert.equal(p.coverageRequest(kind, old.selection, old.config).body.limit, 20);
  assert.equal(JSON.stringify(old.config), before);
  assert.equal(p.coverageRequest('CITY_RATES').body.limit, 20);
  const current = structuredClone(old.config); armPlan(p, current);
  const inventory = {expectedHead: 'a'.repeat(40)};
  assert.notEqual(p.coverageAuthorization(current, inventory), p.coverageAuthorization(old.config, inventory));
});

for (const limits of [
  {city: 200, ids: 20, catalog: 100, selected: 20},
  {city: 1, ids: 20, catalog: 25, selected: 20},
  {city: 77, ids: 7, catalog: 12, selected: 7},
  {city: 2, ids: 1, catalog: 1, selected: 1},
  {city: 200, ids: 20, catalog: 1, selected: 20},
]) test(`AR02 valid separate windows city${limits.city}/id${limits.ids}/catalog${limits.catalog}`, async () => {
  const x = await example({count: limits.catalog, limits});
  assert.equal(x.p.validateCoveragePlan(x.config, {synthetic: true}).pending.length, 0);
  assert.equal(x.p.coverageRequest('CATALOG', null, x.config).query.limit, limits.catalog);
  assert.equal(x.p.ratesBody(x.config, 'CITY_RATES').limit, limits.city);
  assert.equal(x.p.ratesBody(x.config, 'ID_RATES').limit, limits.ids);
  assert.equal(x.p.coverageRequest('CITY_RATES', x.selection, x.config).body.limit, limits.city);
  assert.equal(x.selection.selectedIds.length, Math.min(limits.selected, limits.catalog));
  assert.equal(x.selection.derivedRequest.body.limit, limits.ids);
  assert.deepEqual(x.selection.derivedRequest.body.hotelIds, x.selection.selectedIds);
  assert.equal(x.selection.derivedRequest.body.offset, 0);
  assert.equal(x.config.controls.limits.total, 3);
});

const invalid: [string, (config: any) => void][] = [
  ['city201', c => c.controls.cityRatesLimit = 201],
  ['id21', c => c.controls.idRatesLimit = 21],
  ['catalog101', c => c.controls.catalogLimit = 101],
  ['selected21', c => c.controls.maximumSelectedIds = 21],
  ['city0', c => c.controls.cityRatesLimit = 0],
  ['idFraction', c => c.controls.idRatesLimit = 1.5],
  ['cityString', c => c.controls.cityRatesLimit = '200'],
  ['selectionExceedsIDWindow', c => c.controls.idRatesLimit = 19],
  ['legacyFieldInNew', c => c.controls.ratesLimit = 20],
  ['implicitVersionUpgrade', c => delete c.version],
  ['futureVersion', c => c.version = 'stayopti.liteapi-search-coverage@9'],
  ['transferSubLimits', c => {c.controls.limits.CATALOG = 0; c.controls.limits.CITY_RATES = 2;}],
];
for (const [name, mutate] of invalid) test('AR03 rejects invalid versioned plan ' + name, async () => {
  const x = await example(); const changed = structuredClone(x.config); mutate(changed);
  assert.throws(() => x.p.validateCoveragePlan(changed, {synthetic: true}), /LITEAPI_COVERAGE_/);
  assert.throws(() => x.p.coverageRequest('CITY_RATES', x.selection, changed), /LITEAPI_COVERAGE_/);
});

test('AR04 wrong-arm limit, ID substitution and oversized selection fail before transport', async () => {
  const x = await example({count: 30});
  for (const [kind, limit] of [['CITY_RATES', 20], ['ID_RATES', 200]] as const) {
    const request = x.p.coverageRequest(kind, x.selection, x.config); request.body.limit = limit;
    assert.throws(() => x.p.validateCoverageRequest(request, x.selection, x.config), /REQUEST_OUTSIDE_SEALED_PLAN/);
  }
  const request = x.p.coverageRequest('ID_RATES', x.selection, x.config);
  request.body.hotelIds[0] = 'INVENTED_NOT_SELECTED';
  assert.throws(() => x.p.validateCoverageRequest(request, x.selection, x.config), /REQUEST_OUTSIDE_SEALED_PLAN/);
  assert.throws(() => x.p.coverageRequest('ID_RATES', {selectedIds: Array.from({length: 21}, (_, i) => 'invented-' + i)}, x.config), /SELECTED_IDS_REQUIRED/);
});

test('AR05 another invented destination/party/currency uses the same mechanism without defaults leaking', async () => {
  const x = await example({count: 11, limits: {city: 63, ids: 9, catalog: 11, selected: 9}, change: (c: any) => {
    c.caseId = 'SYNTHETIC_ARM_PLAN_OSLO_2099';
    Object.assign(c.scenario, {destination: 'Invented Northern City', countryCode: 'NO',
      checkin: '2099-04-03', checkout: '2099-04-08', nights: 5, adults: 1, childAges: [],
      currency: 'NOK', guestNationality: 'SE', budget: 12345});
    c.controls.seed = 'INVENTED_NORTHERN_SAMPLE';
  }});
  for (const kind of ['CITY_RATES', 'ID_RATES']) {
    const q = x.p.coverageRequest(kind, x.selection, x.config);
    assert.deepEqual(q.body.occupancies, [{adults: 1, children: []}]);
    assert.equal(q.body.currency, 'NOK'); assert.equal(q.body.guestNationality, 'SE');
    assert.equal(q.body.checkin, '2099-04-03'); assert.equal(q.body.checkout, '2099-04-08');
    assert.equal(q.body.limit, kind === 'CITY_RATES' ? 63 : 9);
  }
  assert.equal(x.selection.selectedIds.length, 9);
  assert.equal(x.p.coverageRequest('CATALOG', null, x.config).query.cityName, 'Invented Northern City');
});

test('AR06 representation-only catalog differences preserve selection, not authenticated bytes', async () => {
  const x = await example({count: 40});
  const changed = structuredClone(x.catalog);
  changed.data.reverse();
  for (const row of changed.data) {row.name = 'Other invented label'; row.country = ' it '; row.city = ' BOLOGNA '; row.metadata = {unused: 1};}
  const bytes = Buffer.from(JSON.stringify(changed));
  const s = x.d.selectCoverageCatalog(bytes, x.p.sha(bytes), x.config);
  assert.deepEqual(s.selectedIds, x.selection.selectedIds);
  assert.equal(s.poolFingerprint, x.selection.poolFingerprint);
  assert.notEqual(s.catalogSha256, x.selection.catalogSha256);
  assert.throws(() => x.d.selectCoverageCatalog(bytes, x.selection.catalogSha256, x.config), /ORIGINAL_HASH/);
  const other = structuredClone(x.config); other.controls.cityRatesLimit = 199;
  assert.notEqual(x.d.selectCoverageCatalog(bytes, x.p.sha(bytes), other).planFingerprint, s.planFingerprint);
});

for (const count of [0, 1, 40]) test(`AR07 actual new-version loopback ${count} IDs seals both requests and remains one-shot MAX3`, async () => {
  const x = await runtime({count});
  try {
    const source = JSON.stringify(x.simulation), result = await x.run();
    assert.equal(result.status, 'COMPLETE', result.failureClass);
    assert.equal(result.actualAttempts, count ? 3 : 2);
    assert.equal(result.localHttpRequests, result.actualAttempts);
    assert.equal(result.providerHttpRequests, 0); assert.equal(result.engineInvocations, 0); assert.equal(result.policyInvocations, 0);
    assert.equal(JSON.stringify(x.simulation), source);
    const verified = x.j.verifyCoverageJournal(x.input);
    const seal = verified.events.find((e: any) => e.type === 'SEAL');
    for (const event of verified.events.filter((e: any) => e.type === 'RESERVE' && e.data.kind !== 'CATALOG')) assert(seal.sequence < event.sequence);
    const originals = x.c.readCoverageOriginals(x.input);
    assert.equal(originals.selection.selectedIds.length, Math.min(count, 20));
    assert.equal(originals.selection.derivedRequest?.body.limit ?? null, count ? 20 : null);
    assert.equal(originals.records[1].request.body.limit, 200);
    if (count) assert.equal(originals.records[2].request.body.limit, 20);
    if (!count) assert.equal(result.idRatesStatus, 'SKIPPED_NO_VERIFIED_IDS');
    if (count === 1) assert.equal(result.catalog.limitation, 'ONE_ID_LIMITED_DIAGNOSTIC');
    const saved = snapshot(x.input.registryRoot);
    assert.throws(() => x.j.createCoverageJournal(x.input), /CASE_ALREADY_EXISTS/);
    assert.deepEqual(snapshot(x.input.registryRoot), saved);
  } finally {clean(x.temp);}
});

test('AR08 new version preserves R2 2001/204 equivalence without asserting inventory exhaustion', async () => {
  const x = await runtime();
  try {
    x.simulation.responses[1].response = {error: {code: '2001', message: 'Invented documented no availability'}};
    x.simulation.responses[2].status = 204;
    const r = await x.run();
    assert.equal(r.status, 'COMPLETE'); assert.equal(r.actualAttempts, 3);
    assert.equal(r.arms.CITY_RATES.classification, 'DOCUMENTED_NO_RESULTS');
    assert.equal(r.arms.ID_RATES.classification, 'DOCUMENTED_NO_RESULTS');
    assert.equal(r.arms.CITY_RATES.noResultsBasis, 'LITEAPI_RATES_ERROR_CODE_2001');
    assert.equal(r.arms.ID_RATES.noResultsBasis, 'HTTP_204');
    assert.equal(r.comparison.countsComparable, true); assert.equal(r.comparison.providerInventoryExhausted, null);
  } finally {clean(x.temp);}
});

for (const variant of ['UNKNOWN', 'CONFLICT']) test('AR09 new version preserves ' + variant + ' rather than inventing zero offers', async () => {
  const x = await runtime();
  try {
    x.simulation.responses[1].response = variant === 'UNKNOWN' ? {data: null} :
      {data: [x.hotel(x.selection.selectedIds[0])], error: {code: 2001}};
    const r = await x.run();
    assert.equal(r.status, 'ABORTED'); assert.equal(r.actualAttempts, 2);
    assert.equal(r.idRatesStatus, 'NOT_STARTED'); assert.equal(r.arms.CITY_RATES.countsComparable, false);
    assert.equal(r.arms.CITY_RATES.classification, variant === 'UNKNOWN' ? 'UNKNOWN_FORMAT' : 'PROVIDER_ERROR');
    if (variant === 'UNKNOWN') assert.equal(r.arms.CITY_RATES.rawOffers, null);
    assert.equal(r.comparison.overlap, null); assert.equal(r.engineInvocations, 0); assert.equal(r.policyInvocations, 0);
  } finally {clean(x.temp);}
});

test('AR10 modifying either limit after catalog aborts before Rates and does not refund the attempt', async () => {
  const x = await runtime();
  try {
    const result = await x.run(() => {if (x.journal.snapshot().selection) x.config.controls.cityRatesLimit = 199;});
    assert.equal(result.status, 'ABORTED'); assert.equal(result.actualAttempts, 1);
    assert.equal(result.localHttpRequests, 1); assert.equal(result.idRatesStatus, 'NOT_STARTED');
    assert.equal(x.j.verifyCoverageJournal(x.input).restartAllowed, false);
    assert.throws(() => x.j.createCoverageJournal(x.input), /CASE_ALREADY_EXISTS/);
  } finally {clean(x.temp);}
});
