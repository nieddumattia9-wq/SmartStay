import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalExplicitInstant, orderExplicitInstants, compareExplicitInstants } from '../../server/shared/explicit-instant';
import { commercialPacket, editCommercialRecord, resealCommercialPacket } from './fixtures/commercialProtocolsSyntheticV3';
import { prepareSyntheticCommercialEvidenceV3 } from '../../src/engine-v3/evaluation/syntheticCommercialProtocolsV3';
import { createBoundCommercialEvidenceV3 } from '../../src/engine-v3/evaluation/boundCommercialEvidenceV3';
import { deriveBoundPublicRateConsistencyV3 } from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';

async function expiry(value:string|null,profile:'synthetic-session@1'|'synthetic-attested-quote@1'='synthetic-session@1',evaluatedAt?:string) {
 const fixture=await commercialPacket(profile);
 if(evaluatedAt)fixture.packet.evaluatedAt=evaluatedAt;
 fixture.packet.records.forEach((_,i)=>editCommercialRecord(fixture.packet,i,(_b,d)=>{d.validUntil=value;}));
 await resealCommercialPacket(fixture.packet);
 const original=JSON.stringify(fixture.packet),prepared=await prepareSyntheticCommercialEvidenceV3(fixture.packet);
 assert.equal(JSON.stringify(fixture.packet),original);assert.equal(prepared.assessment.engineInvocations,0);assert.equal(prepared.assessment.policyInvocations,0);
 return {...fixture,prepared};
}
function binding(r:Awaited<ReturnType<typeof expiry>>) {
 return deriveBoundPublicRateConsistencyV3({...r.control,evidence:createBoundCommercialEvidenceV3({...r.control,prepared:r.prepared})});
}
for(const profile of ['synthetic-session@1','synthetic-attested-quote@1'] as const){
 test('CET same fractional expiry reaches preparation and binding: '+profile,async()=>{
  const a=await expiry('2099-08-01T10:10:00.123Z',profile);
  for(const value of ['2099-08-01T10:10:00.123000Z','2099-08-01T11:10:00.123000+01:00']){
   const b=await expiry(value,profile);
   assert.equal(a.prepared.assessment.status,'SUPPORTED_AT_OBSERVATION');
   assert.equal(b.prepared.assessment.status,'SUPPORTED_AT_OBSERVATION',JSON.stringify(b.prepared.assessment));
   assert.equal(b.prepared.assessment.semanticFingerprint,a.prepared.assessment.semanticFingerprint);
   assert.notEqual(b.prepared.assessment.provenanceFingerprint,a.prepared.assessment.provenanceFingerprint);
   assert.equal(binding(a),'verified');assert.equal(binding(b),'verified');
   assert.equal(b.prepared.evidence.events[1].providerValidUntil,value);
  }
 });
 for(const value of ['2099-08-01T10:10:00-00:00','2099-02-30T10:10:00Z','2099-08-01T10:10:00'])test('CET uninterpretable is not expired: '+profile+' '+value,async()=>{
  const r=await expiry(value,profile);
  assert.equal(r.prepared.assessment.status,'INVALID');assert.equal(r.prepared.assessment.freshness,'UNKNOWN');
  assert.match(r.prepared.assessment.reasons.join('|'),/PROVIDER_EXPIRY_UNINTERPRETABLE/);
  assert.doesNotMatch(r.prepared.assessment.reasons.join('|'),/PROVIDER_EXPLICIT_EXPIRY/);
  assert.throws(()=>binding(r),/BINDING_REJECTED/);
 });
 test('CET submillisecond expiry is ordered exactly, including equality: '+profile,async()=>{
  for(const [fraction,status] of [['123456788','EXPIRED'],['123456789','SUPPORTED_AT_OBSERVATION'],['123456790','SUPPORTED_AT_OBSERVATION']] as const){
   const r=await expiry('2099-08-01T10:02:00.'+fraction+'Z',profile,'2099-08-01T10:02:00.123456789Z');
   assert.equal(r.prepared.assessment.status,status,r.prepared.assessment.reasons.join('|'));
   if(status==='EXPIRED'){assert.equal(r.prepared.assessment.freshness,'EXPIRED');assert.match(r.prepared.assessment.reasons.join('|'),/PROVIDER_EXPLICIT_EXPIRY/);assert.throws(()=>binding(r),/BINDING_REJECTED/);}
   else assert.equal(binding(r),'verified');
  }
 });
}
test('CET genuinely expired before observation is expired, not an invalid timestamp',async()=>{
 const r=await expiry('2099-08-01T09:59:59.999999999Z');assert.equal(r.prepared.assessment.status,'EXPIRED');assert.match(r.prepared.assessment.reasons.join('|'),/PROVIDER_EXPLICIT_EXPIRY/);
});
test('CET equivalent retrieval expiry is allowed, meaningful fraction difference is conflict',async()=>{
 const {control,packet}=await commercialPacket();
 for(const suffix of ['123000','123001']){
  packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,d)=>{d.validUntil='2099-08-01T10:10:00.'+(i===2?suffix:'123')+'Z';}));await resealCommercialPacket(packet);
  const prepared=await prepareSyntheticCommercialEvidenceV3(packet);
  if(suffix==='123000')assert.equal(binding({control,packet,prepared}),'verified');
  else {assert.equal(prepared.assessment.status,'CONFLICTING');assert.match(prepared.assessment.reasons.join('|'),/RETRIEVAL_CONFLICT/);assert.throws(()=>binding({control,packet,prepared}),/BINDING_REJECTED/);}
 }
});
test('CET exact cancellation equivalence and real difference reach the decision binding',async()=>{
 const {control,packet}=await commercialPacket('synthetic-attested-quote@1','2099-09-01T12:00:00.123456789Z');
 for(const [value,accepted] of [['2099-09-01T13:00:00.123456789000+01:00',true],['2099-09-01T12:00:00.123456790Z',false]] as const){
  // Both protocol events agree: only the decision binding can detect the second mismatch.
  packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,d)=>{d.terms.cancellation.until=value;}));await resealCommercialPacket(packet);
  const prepared=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(prepared.assessment.status,'SUPPORTED_AT_OBSERVATION');
  if(accepted)assert.equal(binding({control,packet,prepared}),'verified');
  else assert.throws(()=>binding({control,packet,prepared}),/DECISION_CONDITIONS_MISMATCH/);
 }
});
test('CET submillisecond verification, observation and retrieval ordering are not rounded',async()=>{
 const {packet}=await commercialPacket();packet.evaluatedAt='2099-08-01T10:02:00.000000002Z';
 packet.records[1].capturedAt='2099-08-01T10:02:00.000000001Z';packet.records[2].capturedAt='2099-08-01T10:02:00.000000002Z';
 editCommercialRecord(packet,1,(_b,d)=>{d.verifiedAt='2099-08-01T10:02:00.000000001Z';});
 await resealCommercialPacket(packet);assert.equal((await prepareSyntheticCommercialEvidenceV3(packet)).assessment.status,'SUPPORTED_AT_OBSERVATION');
 editCommercialRecord(packet,1,(_b,d)=>{d.verifiedAt='2099-08-01T10:02:00.000000002Z';});await resealCommercialPacket(packet);
 assert.match((await prepareSyntheticCommercialEvidenceV3(packet)).assessment.reasons.join('|'),/PROVIDER_VERIFICATION_TIME_INVALID/);
 editCommercialRecord(packet,1,(_b,d)=>{d.verifiedAt='2099-08-01T10:02:00.000000001Z';});packet.records[2].capturedAt='2099-08-01T10:02:00.000000000Z';await resealCommercialPacket(packet);
 assert.match((await prepareSyntheticCommercialEvidenceV3(packet)).assessment.reasons.join('|'),/OBSERVATION_TIME_INVALID|RETRIEVAL_BINDING_INVALID/);
});
test('CET missing provider expiry is still unknown, not the internal TTL',async()=>{
 const r=await expiry(null);assert.equal(r.prepared.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.equal(r.prepared.assessment.freshness,'UNKNOWN');assert.equal(binding(r),'verified');
});
test('CET shared JavaScript consumer is the exact build of the common typed source',()=>{
 const ts=require(require.resolve('typescript',{paths:[process.cwd()]})) as typeof import('typescript');
 const output=ts.transpileModule(fs.readFileSync('server/shared/explicit-instant.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,newLine:ts.NewLineKind.LineFeed}}).outputText;
 assert.equal(fs.readFileSync('server/shared/explicit-instant.mjs','utf8').replace(/\r\n/g,'\n'),output);
});
test('CET common ordering preserves arbitrarily long fractions and R06 equivalence',()=>{
 for(const fraction of ['0','123','000000001','12345678901234567890123456789']){
  const a='2099-12-31T23:59:59.'+fraction+'Z',b='2100-01-01T00:59:59.'+fraction+'000+01:00';
  assert.equal(compareExplicitInstants(a,b).status,'SAME_INSTANT');assert.equal(orderExplicitInstants(a,b),0);assert.equal(canonicalExplicitInstant(a),canonicalExplicitInstant(b));
  const later='2099-12-31T23:59:59.'+fraction+'1Z';
  assert.equal(orderExplicitInstants(a,later),-1);assert.equal(orderExplicitInstants(later,a),1);assert.notEqual(canonicalExplicitInstant(a),canonicalExplicitInstant(later));
 }
 for(const invalid of ['2099-08-01T10:00:00-00:00','2099-08-01T10:00:00','2099-02-30T10:00:00Z']){
  assert.equal(canonicalExplicitInstant(invalid),null);assert.equal(orderExplicitInstants(invalid,invalid),null);assert.equal(compareExplicitInstants(invalid,invalid).status,'INSUFFICIENT_INFORMATION');
 }
});
test('CET exact meaningful expiry differences keep different semantic fingerprints',async()=>{
 const a=await expiry('2099-08-01T10:10:00.0000000000000000000000001Z'),b=await expiry('2099-08-01T10:10:00.0000000000000000000000002Z');
 assert.equal(binding(a),'verified');assert.equal(binding(b),'verified');assert.notEqual(a.prepared.assessment.semanticFingerprint,b.prepared.assessment.semanticFingerprint);
});
