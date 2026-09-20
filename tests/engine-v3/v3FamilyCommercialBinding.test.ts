import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSearchPartySource, interpretChildAges, resolveSearchParty } from '../../src/utils/searchParty';
import { createRoomsPayload } from '../../src/utils/searchRoomAssignments';
import { normalizeStoredSearchMeta } from '../../src/utils/searchMeta';
import { familyDecision, familyPacket, familySearch } from './fixtures/familyCommercialSyntheticV3';
import { commercialPacket, editCommercialRecord, resealCommercialPacket } from './fixtures/commercialProtocolsSyntheticV3';
import { prepareSyntheticCommercialEvidenceV3 } from '../../src/engine-v3/evaluation/syntheticCommercialProtocolsV3';
import { createBoundCommercialEvidenceV3, verifyBoundCommercialEvidenceV3 } from '../../src/engine-v3/evaluation/boundCommercialEvidenceV3';
import { deriveBoundPublicRateConsistencyV3, runIndependentDecisionShadowV3 } from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import { createDecisionFingerprintV3, verifyDecisionReplayV3 } from '../../src/engine-v3/replay/decisionReplayV3';
import { validateStayOptiDecisionV3 } from '../../src/engine-v3/contract/stayOptiDecisionV3';

for (const profile of ['synthetic-session@1', 'synthetic-attested-quote@1'] as const) test('FC complete actual search/restore/V2/V3/binding/shadow/replay ' + profile, async () => {
  const { control: c, packet } = await familyPacket(profile), original = JSON.stringify(packet);
  assert.deepEqual(c.sentRooms, [{ adults: 2, children: 2, childAges: [6, 11] }]);
  assert.deepEqual(c.meta, c.restored);
  assert.deepEqual(c.runtime.searchInput.searchParty, c.meta.searchParty);
  assert.deepEqual(c.decision.context.party?.ageInformation, { state: 'KNOWN', ages: [6, 11] });
  const prepared = await prepareSyntheticCommercialEvidenceV3(packet);
  assert.equal(prepared.assessment.status, 'SUPPORTED_AT_OBSERVATION');
  const evidence = createBoundCommercialEvidenceV3({ ...c, prepared });
  assert.equal(deriveBoundPublicRateConsistencyV3({ ...c, evidence }), 'verified');
  const shadow = runIndependentDecisionShadowV3({ mode: 'shadow', comparisonToken: 'synthetic-family', segment: { destination: 'urban', leadTime: 'medium', duration: 'short-stay', coverage: 'high', profile: 'balanced' }, searchInput: c.runtime.searchInput, publicV2Result: c.runtime.result, publicRateEvidence: evidence });
  assert.equal(shadow.v3Executed, true); assert.ok(shadow.shadowObservation); assert.equal(shadow.publicServingEngine, 'v2');
  // Real shadow safety must consume the evidence, not merely run the engine.
  assert.equal(shadow.shadowObservation.recordType, 'shadow-comparison');
  if (shadow.shadowObservation.recordType !== 'shadow-comparison') assert.fail('shadow failed');
  assert.equal(shadow.shadowObservation.safety.publicRateConsistency, 'verified');
  assert.equal(shadow.shadowObservation.safety.deterministicReplay, 'pass');
  assert.equal(JSON.stringify(packet), original);
  assert.equal(prepared.assessment.policyInvocations, 0);
});
test('FC single-room permutations are semantically equivalent end to end; originals distinct', async () => {
  const a = await familyPacket(), b = await familyPacket('synthetic-session@1', [11, 6]);
  assert.notDeepEqual(a.control.meta.searchParty, b.control.meta.searchParty);
  assert.equal(verifyDecisionReplayV3(a.control.decision, b.control.decision).matches, true);
  const p = await prepareSyntheticCommercialEvidenceV3(a.packet), q = await prepareSyntheticCommercialEvidenceV3(b.packet);
  assert.equal(p.assessment.semanticFingerprint, q.assessment.semanticFingerprint); assert.notEqual(p.assessment.provenanceFingerprint, q.assessment.provenanceFingerprint);
  assert.doesNotThrow(() => createBoundCommercialEvidenceV3({ ...a.control, prepared: q }));
  editCommercialRecord(b.packet, 1, (_b, d) => { d.scope.childAges = [6, 11]; }); await resealCommercialPacket(b.packet);
  assert.equal((await prepareSyntheticCommercialEvidenceV3(b.packet)).assessment.status, 'SUPPORTED_AT_OBSERVATION');
});
for (const ages of [[4, 8], [6, 6], []]) test('FC count and multiplicity ' + JSON.stringify(ages), async () => {
  const { control: c, packet } = await familyPacket('synthetic-attested-quote@1', ages), prepared = await prepareSyntheticCommercialEvidenceV3(packet);
  assert.deepEqual(c.decision.context.party?.ageInformation.ages, ages); assert.doesNotThrow(() => createBoundCommercialEvidenceV3({ ...c, prepared }));
  assert.notEqual(c.decision.replay.inputFingerprint, familyDecision().decision.replay.inputFingerprint);
});
for (const [ages, state] of [[null, 'UNKNOWN'], [[], 'PARTIAL'], [[6], 'PARTIAL'], [[6, null], 'PARTIAL'], [[6, 11, 12], 'INVALID'], [[6, -1], 'INVALID'], [[6, 2.5], 'INVALID'], [[6, '11'], 'INVALID'], ['6,11', 'INVALID']] as const) test('FC incomplete/invalid source remains blocked ' + JSON.stringify(ages), async () => {
  const c = familyDecision([6, 11], 1, createSearchPartySource(ages));
  assert.equal(c.decision.context.party?.ageInformation.state, state);
  const { packet } = await familyPacket(), p = await prepareSyntheticCommercialEvidenceV3(packet);
  assert.throws(() => createBoundCommercialEvidenceV3({ ...c, prepared: p }), /SEARCH_PARTY_INCOMPLETE/);
  assert.deepEqual(c.runtime.searchInput.searchParty?.childAges, ages);
});
test('FC missing ages cannot be reconstructed from room allocation or commercial response', async () => {
  const c = familyDecision([6, 11], 1, createSearchPartySource(null, [{ adults: 2, children: 2, childAges: [6, 11] }]));
  assert.equal(c.decision.context.party?.ageInformation.state, 'UNKNOWN'); assert.equal(c.decision.context.party?.assignmentState, 'INVALID');
  const { packet } = await familyPacket(); assert.throws(() => createBoundCommercialEvidenceV3({ ...c, prepared: undefined as never }), /AUTHENTICATED/);
  const prepared = await prepareSyntheticCommercialEvidenceV3(packet); assert.throws(() => createBoundCommercialEvidenceV3({ ...c, prepared }), /INCOMPLETE/);
});
test('FC replacing valid ages at same count cannot bind a different search', async () => {
  const { packet } = await familyPacket(), prepared = await prepareSyntheticCommercialEvidenceV3(packet), other = familyDecision([4, 8]);
  assert.throws(() => createBoundCommercialEvidenceV3({ ...other, prepared }), /CHILD_AGES_MISMATCH/);
  const original = familyDecision(); assert.notEqual(original.decision.replay.decisionFingerprint, other.decision.replay.decisionFingerprint);
  assert.deepEqual(original.runtime.result.recommendationRoles, other.runtime.result.recommendationRoles);
});
test('FC tampering after decision/binding fails, even with counts unchanged', async () => {
  const { control: c, packet } = await familyPacket(), prepared = await prepareSyntheticCommercialEvidenceV3(packet), evidence = createBoundCommercialEvidenceV3({ ...c, prepared });
  const decision = structuredClone(c.decision); decision.context.party!.ageInformation.ages = [4, 8];
  assert.equal(validateStayOptiDecisionV3(decision).valid, false);
  assert.equal(verifyBoundCommercialEvidenceV3({ ...c, decision, evidence }), 'failed');
  assert.throws(() => createBoundCommercialEvidenceV3({ ...c, decision, prepared }), /DECISION_INVALID/);
  const changed = familyDecision([4, 8]); assert.equal(verifyBoundCommercialEvidenceV3({ ...changed, evidence }), 'failed');
  assert.equal(createDecisionFingerprintV3(c.decision), c.decision.replay.decisionFingerprint);
});
test('FC multiple rooms retain assignment; same global ages do not identify the same search', async () => {
  const a = familyDecision([6, 11], 2), b = familyDecision([11, 6], 2);
  assert.deepEqual(a.sentRooms, [{ adults: 1, children: 1, childAges: [6] }, { adults: 1, children: 1, childAges: [11] }]);
  assert.notEqual(a.decision.replay.inputFingerprint, b.decision.replay.inputFingerprint);
  const { packet } = await familyPacket('synthetic-session@1', [6, 11], 2), prepared = await prepareSyntheticCommercialEvidenceV3(packet);
  assert.throws(() => createBoundCommercialEvidenceV3({ ...a, prepared }), /ROOM_ASSIGNMENT_UNREPRESENTABLE/);
});
test('FC inconsistent allocation is not corrected or flattened', () => {
  const source = createSearchPartySource([6, 11], [{ adults: 2, children: 2, childAges: [4, 8] }]);
  const c = familyDecision([6, 11], 1, source); assert.equal(c.decision.context.party?.assignmentState, 'INVALID'); assert.deepEqual(c.runtime.searchInput.searchParty, source);
});
test('FC old metadata and old decisions keep count-only identity and replay', async () => {
  const { control: c, packet } = await commercialPacket(); assert.equal('party' in c.decision.context, false);
  const old = familySearch().meta; delete old.searchParty;
  assert.equal('searchParty' in normalizeStoredSearchMeta(old)!, false);
  const prepared = await prepareSyntheticCommercialEvidenceV3(packet); assert.doesNotThrow(() => createBoundCommercialEvidenceV3({ ...c, prepared }));
  const next = structuredClone(c.decision); next.context.children = 2;
  packet.expectedScope.childAges = [6, 11]; packet.records.forEach((_, i) => editCommercialRecord(packet, i, (_b, d) => { d.scope.childAges = [6, 11]; })); await resealCommercialPacket(packet);
  const family = await prepareSyntheticCommercialEvidenceV3(packet); assert.throws(() => createBoundCommercialEvidenceV3({ ...c, decision: next, prepared: family }), /CHILD_AGE_BINDING_UNREPRESENTABLE/);
});
test('FC legacy commercial order semantics require explicit version change', async () => {
  const { packet } = await familyPacket(); packet.version = 'synthetic-commercial-packet@1'; editCommercialRecord(packet, 1, (_b, d) => { d.scope.childAges = [11, 6]; }); await resealCommercialPacket(packet);
  await assert.rejects(prepareSyntheticCommercialEvidenceV3(packet), /SCOPE_MISMATCH/);
});
test('FC age bands remain ingress-specific, not a new global classification', () => {
  assert.equal(interpretChildAges([17], 1).state, 'KNOWN');
  assert.throws(() => createRoomsPayload({ adults: 2, children: 1, childAges: [13], rooms: 1 }), /INVALID/);
  assert.throws(() => createRoomsPayload({ adults: 2, children: 2, childAges: [6, null], rooms: 1 }), /INVALID/);
  assert.equal(resolveSearchParty(createSearchPartySource(null), { adults: 2, children: 0, rooms: 1 }).ageInformation.state, 'KNOWN');
});
test('FC actual UI producer and Results reranking observe the party extension', () => {
  const trip = fs.readFileSync('src/components/TripOptimizer/TripOptimizer.tsx', 'utf8'), results = fs.readFileSync('src/pages/Results/Results.tsx', 'utf8');
  assert.match(trip, /rooms:\s*createRoomsPayload\(\s*guests/); assert.match(trip, /childAges: guests.childAges/); assert.match(trip, /roomAssignments: searchPayload.rooms/);
  assert.match(results, /searchParty: searchMeta\?\.searchParty/); assert.match(results, /searchMeta\?\.searchParty,/);
});
test('FC stale commercial binding is rejected by actual shadow after search ages change', async () => {
  const { control: c, packet } = await familyPacket(), prepared = await prepareSyntheticCommercialEvidenceV3(packet), evidence = createBoundCommercialEvidenceV3({ ...c, prepared });
  const other = familyDecision([4, 8]);
  const shadow = runIndependentDecisionShadowV3({ mode: 'shadow', comparisonToken: 'synthetic-stale-family', segment: { destination: 'urban', leadTime: 'medium', duration: 'short-stay', coverage: 'high', profile: 'balanced' }, searchInput: other.runtime.searchInput, publicV2Result: other.runtime.result, publicRateEvidence: evidence });
  assert.equal(shadow.shadowObservation?.recordType, 'shadow-comparison');
  if (shadow.shadowObservation?.recordType !== 'shadow-comparison') assert.fail('must measure safety');
  assert.equal(shadow.shadowObservation.safety.publicRateConsistency, 'failed');
});
test('FC mutated prepared evidence and caller-minted sources cannot certify commercial facts', async () => {
  const { control: c, packet } = await familyPacket(), before = JSON.stringify(packet), prepared = await prepareSyntheticCommercialEvidenceV3(packet);
  assert.throws(() => { prepared.evidence.scope.childAges[0] = 4; }, TypeError);
  assert.throws(() => createBoundCommercialEvidenceV3({ ...c, prepared: structuredClone(prepared) }), /AUTHENTICATED/);
  packet.records[1].body = packet.records[1].body.replace('[6,11]', '[4,8]');
  await assert.rejects(prepareSyntheticCommercialEvidenceV3(packet), /HASH_MISMATCH/);
  assert.notEqual(JSON.stringify(packet), before); assert.deepEqual(prepared.evidence.scope.childAges, [6, 11]);
});
for (const ages of [[6, 6], [4, 8]]) test('FC scoped commercial substitution after search ' + ages.join(','), async () => {
  const { packet } = await familyPacket(); editCommercialRecord(packet, 1, (_b, d) => { d.scope.childAges = ages; }); await resealCommercialPacket(packet);
  await assert.rejects(prepareSyntheticCommercialEvidenceV3(packet), /SCOPE_MISMATCH/);
});
test('FC new decision refuses implicit use of legacy commercial version even when facts match', async () => {
  const { control: c, packet } = await familyPacket(); packet.version = 'synthetic-commercial-packet@1'; await resealCommercialPacket(packet);
  const prepared = await prepareSyntheticCommercialEvidenceV3(packet); assert.throws(() => createBoundCommercialEvidenceV3({ ...c, prepared }), /FAMILY_COMMERCIAL_VERSION_REQUIRED/);
});
test('FC partial and malformed ages survive metadata persistence without filtering', () => {
  const meta = familySearch().meta; meta.searchParty = createSearchPartySource([6, '11', null]);
  const restored = normalizeStoredSearchMeta(JSON.parse(JSON.stringify(meta)))!;
  assert.deepEqual(restored.searchParty, meta.searchParty);
  assert.equal(resolveSearchParty(restored.searchParty!, restored).ageInformation.state, 'INVALID');
});
test('FC unsupported source version fails closed without automatic upgrade', () => {
  const c = familyDecision([6, 11], 1, { ...createSearchPartySource([6, 11]), version: 'unsupported' as never });
  assert.equal(c.decision.context.party?.ageInformation.state, 'INVALID');
});
test('FC canonical document key order is immaterial; malformed room record is invalid', () => {
  const c = familyDecision(), d = structuredClone(c.decision);
  d.context.party!.assignments = d.context.party!.assignments!.map(r => ({ ages: r.ages, children: r.children, adults: r.adults, ordinal: r.ordinal }));
  assert.equal(validateStayOptiDecisionV3(d).valid, true);
  assert.equal(createDecisionFingerprintV3(d), c.decision.replay.decisionFingerprint);
  d.context.party!.assignments = [null as never];
  assert.equal(validateStayOptiDecisionV3(d).valid, false);
});
