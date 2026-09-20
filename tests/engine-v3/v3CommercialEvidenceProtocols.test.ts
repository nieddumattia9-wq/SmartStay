import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { commercialPacket, resealCommercialPacket, editCommercialRecord } from './fixtures/commercialProtocolsSyntheticV3';
import { prepareSyntheticCommercialEvidenceV3, commercialPacketManifestV3 } from '../../src/engine-v3/evaluation/syntheticCommercialProtocolsV3';
import { createBoundCommercialEvidenceV3 } from '../../src/engine-v3/evaluation/boundCommercialEvidenceV3';
import { commercialInstantV3 } from '../../src/engine-v3/contract/commercialEvidenceV3';
import { createBoundPublicRateEvidenceV3, deriveBoundPublicRateConsistencyV3, deriveLegacyBoundPublicRateConsistencyV3, deriveIndependentShadowSafetySignalsV3, runIndependentDecisionShadowV3 } from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import { createRealCaseBlindReviewBundleV3 } from '../../src/engine-v3/evaluation/realCaseBlindReviewV3';

test('CE01 historical literal counterexample stays exact and dispatch preserves it',async()=>{
 const {control:c}=await commercialPacket();
 const make=(evidenceType:string,r=0,p=0,g=0)=>createBoundPublicRateEvidenceV3({evidenceType:evidenceType as 'rates-prebook-get-prebook',decisionFingerprint:c.decision.replay.decisionFingerprint,hotelSelectionToken:c.comparable.selectedSolutionToken!,currency:'EUR',ratesTotal:c.offer.price+r,prebookTotal:c.offer.price+p,retrievedPrebookTotal:c.offer.price+g});
 for(const [evidence,want] of [[make('rates-prebook-get-prebook'),'verified'],[make('search-quote-verification'),'failed'],[undefined,'unverified'],[make('rates-prebook-get-prebook',0,1,1),'failed'],[make('rates-prebook-get-prebook',0,0,1),'failed']] as const){
  assert.equal(deriveLegacyBoundPublicRateConsistencyV3({...c,evidence}),want);
  assert.equal(deriveBoundPublicRateConsistencyV3({...c,evidence}),want);
 }
});
test('CE02 two authenticated protocols reach actual independent shadow consumer with equivalent facts',async()=>{
 const outputs=[];
 for(const profile of ['synthetic-session@1','synthetic-attested-quote@1'] as const){
  const {control:c,packet}=await commercialPacket(profile),before=JSON.stringify(packet),prepared=await prepareSyntheticCommercialEvidenceV3(packet);
  assert.equal(prepared.assessment.status,'SUPPORTED_AT_OBSERVATION',prepared.assessment.reasons.join('|'));
  assert.equal(prepared.assessment.verificationCount,1);assert.equal(prepared.assessment.retrievalCount,profile==='synthetic-session@1'?1:0);
  assert.equal(prepared.assessment.engineInvocations,0);assert.equal(prepared.assessment.policyInvocations,0);assert.equal(prepared.assessment.goldenAdmission,false);
  const evidence=createBoundCommercialEvidenceV3({...c,prepared});
  assert.equal(deriveBoundPublicRateConsistencyV3({...c,evidence}),'verified');
  const safety=deriveIndependentShadowSafetySignalsV3({...c,publicRateEvidence:evidence,deterministicReplayMatches:true});
  assert.equal(safety.publicRateConsistency,'verified');
  const shadow=runIndependentDecisionShadowV3({mode:'shadow',comparisonToken:'synthetic-ce02',segment:{destination:'urban',leadTime:'medium',duration:'short-stay',coverage:'high',profile:'balanced'},searchInput:c.runtime.searchInput,publicV2Result:c.runtime.result,publicRateEvidence:evidence});
  assert.equal(shadow.v3Executed,true);assert.ok(shadow.shadowObservation);assert.equal(shadow.publicServingEngine,'v2');
  assert.equal(JSON.stringify(packet),before);
  outputs.push({prepared,shadow,safety});
 }
 assert.equal(outputs[0].prepared.assessment.semanticFingerprint,outputs[1].prepared.assessment.semanticFingerprint);
 assert.notEqual(outputs[0].prepared.assessment.provenanceFingerprint,outputs[1].prepared.assessment.provenanceFingerprint);
 assert.deepEqual(outputs[0].safety,outputs[1].safety);assert.deepEqual(outputs[0].shadow,outputs[1].shadow);
});
test('CE03 preparation cannot mint real blind/Golden source or trust copied caller flags',async()=>{
 const {control:c,packet}=await commercialPacket(),prepared=await prepareSyntheticCommercialEvidenceV3(packet),evidence=createBoundCommercialEvidenceV3({...c,prepared});
 assert.throws(()=>createBoundCommercialEvidenceV3({...c,prepared:structuredClone(prepared)}),/AUTHENTICATED_PREPARATION/);
 assert.equal(deriveBoundPublicRateConsistencyV3({...c,evidence:structuredClone(evidence)}),'failed');
 assert.throws(()=>createRealCaseBlindReviewBundleV3([{caseId:'synthetic-only',caseType:'baseline',segment:{destination:'urban',leadTime:'medium',duration:'short-stay',coverage:'high'},frontendInput:c.input,publicRateEvidence:evidence}]),/evaluation-only/);
});
for(const [name,mutate,reason] of [
 ['missing verification',(p:any)=>{p.records=p.records.slice(0,1);},'COMMERCIAL_VERIFICATION_MISSING'],
 ['retrieval alone',(p:any)=>{p.records[1].operation='READ_SESSION';},'COMMERCIAL_VERIFICATION_MISSING'],
 ['unknown cost',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{delete d.price.mandatoryCoverage;}),'VERIFIED_COMPLETE_COST'],
 ['unknown bookability',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.status='available';}),'VERIFIED_BOOKABILITY'],
 ['response error',(p:any)=>editCommercialRecord(p,1,(b)=>{b.error={code:'synthetic-error'};}),'SEMANTIC_ERROR'],
 ['nested error',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.errors=['synthetic-error'];}),'SEMANTIC_ERROR'],
 ['adverse fact',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.adverse=['Extra mandatory charge not quantified'];}),'CONTRARY'],
 ['increase',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.price.amount+=1;}),'PRICE_INCREASE'],
 ['retrieval changed',(p:any)=>editCommercialRecord(p,2,(_b,d)=>{d.price.amount+=1;}),'RETRIEVAL_CONFLICT'],
 ['terms changed',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.terms.cancellation.refundable=false;}),'TERMS_CHANGED'],
 ['unavailable',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.status='unavailable';}),'AVAILABILITY_UNAVAILABLE'],
 ['currency',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.price.currency='USD';}),'CURRENCY_MISMATCH'],
 ['expired',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.validUntil='2099-08-01T10:01:30Z';}),'EXPLICIT_EXPIRY'],
 ['session identity',(p:any)=>editCommercialRecord(p,2,(_b,d)=>{d.sessionId='another';}),'RETRIEVAL_BINDING'],
 ['retrieval renews expiry',(p:any)=>editCommercialRecord(p,2,(_b,d)=>{d.validUntil='2099-08-02T10:00:00Z';}),'RETRIEVAL_CONFLICT'],
 ['compulsory unknown',(p:any)=>editCommercialRecord(p,1,(_b,d)=>{d.price.components=[{id:'tax',kind:'MANDATORY',amount:null,currency:'EUR',basis:'TOTAL_STAY_ALL_GUESTS',inclusion:'EXCLUDED',payable:'AT_PROPERTY'}];}),'VERIFIED_COMPLETE_COST'],
] as const){test('CE negative: '+name,async()=>{
 const {control:c,packet}=await commercialPacket();mutate(packet);await resealCommercialPacket(packet);
 const prepared=await prepareSyntheticCommercialEvidenceV3(packet);assert.notEqual(prepared.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.match(prepared.assessment.reasons.join('|'),new RegExp(reason));
 assert.throws(()=>createBoundCommercialEvidenceV3({...c,prepared}),/BINDING_REJECTED/);assert.equal(prepared.assessment.policyInvocations,0);
});}
for(const field of ['propertyId','offerId','offerVersion','roomId','checkIn','checkOut','adults','childAges','units','currency'] as const)test('CE scope exact: '+field,async()=>{
 const {packet}=await commercialPacket();editCommercialRecord(packet,1,(_b,d)=>{d.scope[field]=field==='adults'||field==='units'?3:field==='childAges'?[6,11]:field==='checkIn'?'2099-09-11':field==='checkOut'?'2099-09-15':field==='currency'?'USD':'different-opaque-identity';});await resealCommercialPacket(packet);
 await assert.rejects(prepareSyntheticCommercialEvidenceV3(packet),/SCOPE_MISMATCH/);
});
test('CE exact bytes authenticated before parsing; changed scope/manifest, unsupported origin/profile fail',async()=>{
 for(const change of ['bytes','manifest','origin','profile']){
  const {packet}=await commercialPacket();
  if(change==='bytes'){packet.records[2].body='{broken';const {manifestSha256:_h,...p}=packet;packet.manifestSha256=await commercialPacketManifestV3(p);}
  if(change==='manifest')packet.expectedScope.units=2;
  if(change==='origin')Object.assign(packet,{origin:'PROVIDER_AUTHENTICATED'});
  if(change==='profile')Object.assign(packet,{profile:'unknown@2'});
  await assert.rejects(prepareSyntheticCommercialEvidenceV3(packet),/HASH_MISMATCH|PROFILE_UNSUPPORTED/);
 }
});
test('CE missing provider expiry remains UNKNOWN; internal TTL never certifies it',async()=>{
 const {packet}=await commercialPacket();packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,d)=>{delete d.validUntil;d.cacheExpiresAt='2099-08-01T10:10:00Z';}));await resealCommercialPacket(packet);
 const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.equal(p.assessment.freshness,'UNKNOWN');assert.equal(p.assessment.providerValidUntil,null);
});
test('CE excluded mandatory costs aggregated; optional/deposit not added, all retained',async()=>{
 const {packet}=await commercialPacket();packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,d)=>{d.price.amount-=10;d.price.components=[{id:'tax',amount:10,currency:'EUR',kind:'MANDATORY',category:'TAX',inclusion:'EXCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'AT_PROPERTY'},{id:'optional',amount:30,currency:'EUR',kind:'OPTIONAL',inclusion:'EXCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'NOW'},{id:'deposit',amount:100,currency:'EUR',kind:'REFUNDABLE_DEPOSIT',inclusion:'EXCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'AT_PROPERTY'}];}));await resealCommercialPacket(packet);
 const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION',p.assessment.reasons.join('|'));assert.equal(p.assessment.observedTotal,JSON.parse(packet.records[0].body).data.price.amount+10);assert.equal(p.evidence.events[1].components.length,3);
});
test('CE original formatting and unrelated metadata do not change semantics, but hashes differ',async()=>{
 const {packet}=await commercialPacket(),a=await prepareSyntheticCommercialEvidenceV3(packet);
 for(const r of packet.records){const b=JSON.parse(r.body);b.presentation={unrelated:true};r.body=JSON.stringify(b,null,2);}await resealCommercialPacket(packet);
 const b=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(a.assessment.semanticFingerprint,b.assessment.semanticFingerprint);assert.notEqual(a.assessment.provenanceFingerprint,b.assessment.provenanceFingerprint);
});
test('CE invalid explicit instants reject without invented timezone or rollover',()=>{
 for(const x of ['2099-02-30T10:00:00Z','2099-13-01T10:00:00Z','2099-01-01T25:00:00Z','2099-01-01T10:00:00','unknown'])assert.equal(commercialInstantV3(x),null);
 assert.equal(commercialInstantV3('2099-01-01T10:00:00Z'),commercialInstantV3('2099-01-01T11:00:00+01:00'));
});
test('CE pure preparation module has no engine, provider, custody or policy import',()=>{
 const source=fs.readFileSync('src/engine-v3/evaluation/syntheticCommercialProtocolsV3.ts','utf8');
 assert.doesNotMatch(source,/from ['"].*(?:orchestrator|policy|custody|governor|adapter\/v2)/);assert.doesNotMatch(source,/\bfetch\s*\(|\bprocess\.env/);
});
test('CE historical validator body byte-equivalent (LF) to published A01 checkpoint',()=>{
 const source=fs.readFileSync('src/engine-v3/orchestrator/independentDecisionEngineV3.ts','utf8'),start=source.indexOf('export function deriveLegacyBoundPublicRateConsistencyV3');
 const body=source.slice(source.indexOf('): StayPublicRatesConsistencyV3 {',start),source.indexOf('\nfunction selectedRecommendationIsSafe',start)).replace(/\r\n/g,'\n');
 assert.equal(createHash('sha256').update(body).digest('hex'),'a09ca79bf4aa1877861cd4e9d5214f9074562d5efbe7752b5c80eda8779495d9');
});
for(const profile of ['synthetic-session@1','synthetic-attested-quote@1'] as const){
 for(const scenario of ['terms','occupancy','missing-money','expired','negative','component-currency','small-price-boundary'] as const)test(`CE both supported ingresses ${profile} ${scenario}`,async()=>{
  const {control:c,packet}=await commercialPacket(profile);
  editCommercialRecord(packet,1,(_b,d)=>{
   const money=d.price??d.money;
   if(scenario==='terms')d.terms.restrictions=['Not valid for this traveler'];
   if(scenario==='occupancy')d.scope.childAges=[8];
   if(scenario==='missing-money')delete money.mandatoryCoverage;
   if(scenario==='expired')d.validUntil='2099-08-01T10:01:15Z';
   if(scenario==='negative'){if(d.status)d.status='unavailable';else d.verdict='unavailable';}
   if(scenario==='component-currency')money.components=[{id:'tax',kind:'MANDATORY',category:'TAX',amount:10,minor:1000,currency:'USD',basis:'TOTAL_STAY_ALL_GUESTS',inclusion:'EXCLUDED',payable:'AT_PROPERTY'}];
   if(scenario==='small-price-boundary'){if(d.price)d.price.amount+=.01;else d.money.minor+=1;}
  });
  await resealCommercialPacket(packet);
  if(scenario==='occupancy'){await assert.rejects(prepareSyntheticCommercialEvidenceV3(packet),/SCOPE_MISMATCH/);return;}
  const p=await prepareSyntheticCommercialEvidenceV3(packet);
  if(scenario==='small-price-boundary'){
   assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION',p.assessment.reasons.join('|'));
   assert.equal(deriveBoundPublicRateConsistencyV3({...c,evidence:createBoundCommercialEvidenceV3({...c,prepared:p})}),'verified');
  }else {assert.notEqual(p.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.throws(()=>createBoundCommercialEvidenceV3({...c,prepared:p}),/REJECTED/);}
 });
}
test('CE ages kept in common facts; count-only historical decision cannot silently bind them',async()=>{
 const {control:c,packet}=await commercialPacket();packet.expectedScope.childAges=[6,11];
 packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,d)=>{d.scope.childAges=[6,11];}));await resealCommercialPacket(packet);
 const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.deepEqual(p.evidence.scope.childAges,[6,11]);
 assert.throws(()=>createBoundCommercialEvidenceV3({...c,prepared:p}),/CHILD_AGE_BINDING_UNREPRESENTABLE/);
});
test('CE different decision/selected offer rejected even with identical money',async()=>{
 const {control:c,packet}=await commercialPacket(),p=await prepareSyntheticCommercialEvidenceV3(packet),evidence=createBoundCommercialEvidenceV3({...c,prepared:p});
 const d=structuredClone(c.decision);d.replay.decisionFingerprint='different';assert.equal(deriveBoundPublicRateConsistencyV3({...c,decision:d,evidence}),'failed');
 packet.expectedScope.offerId='same-price-other-rate';packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,v)=>{v.scope.offerId='same-price-other-rate';}));await resealCommercialPacket(packet);
 const other=await prepareSyntheticCommercialEvidenceV3(packet);
 assert.throws(()=>createBoundCommercialEvidenceV3({...c,prepared:other}),/DECISION_OFFER_MISMATCH/);
});
test('CE equivalent explicit expiry offsets, no retrieval verification-count inflation',async()=>{
 const {packet}=await commercialPacket();editCommercialRecord(packet,2,(_b,d)=>{d.validUntil='2099-08-01T11:10:00+01:00';});await resealCommercialPacket(packet);
 const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.equal(p.assessment.verificationCount,1);assert.equal(p.assessment.retrievalCount,1);
});
test('CE no favorable-record selection: a further contrary verified event blocks',async()=>{
 const {packet}=await commercialPacket();const extra=structuredClone(packet.records[1]);extra.id='record-contrary';extra.capturedAt='2099-08-01T10:02:00Z';packet.records.push(extra);
 editCommercialRecord(packet,3,(_b,d)=>{d.status='unavailable';});await resealCommercialPacket(packet);
 const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'CONFLICTING');assert.equal(p.assessment.verificationCount,2);assert.match(p.assessment.reasons.join('|'),/UNAVAILABLE/);
});
test('CE equivalent fiscal components across protocols preserve meaning, not local IDs/order',async()=>{
 const results=[];
 for(const profile of ['synthetic-session@1','synthetic-attested-quote@1'] as const){
  const {packet}=await commercialPacket(profile),minor=profile==='synthetic-attested-quote@1';
  packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,d)=>{
   const price=d.price??d.money;if(minor)price.minor-=1200;else price.amount-=12;
   price.components=[{id:minor?'levy-b':'local-tax-a',...(minor?{minor:1000}:{amount:10}),currency:'EUR',kind:'MANDATORY',category:'TAX',inclusion:'EXCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'AT_PROPERTY'},
    {id:minor?'fee-b':'fee-a',...(minor?{minor:200}:{amount:2}),currency:'EUR',kind:'MANDATORY',category:'FEE',inclusion:'EXCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'NOW'}];if(minor)price.components.reverse();
  }));await resealCommercialPacket(packet);const p=await prepareSyntheticCommercialEvidenceV3(packet);
  assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.equal(p.assessment.snapshot!.cost.taxes.excludedAmount,10);assert.equal(p.assessment.snapshot!.cost.fees.amount,2);results.push(p);
 }
 assert.equal(results[0].assessment.semanticFingerprint,results[1].assessment.semanticFingerprint);assert.notEqual(results[0].assessment.provenanceFingerprint,results[1].assessment.provenanceFingerprint);
});
test('CE unchanged total cannot hide new deposit/extra conditions or component payment changes',async()=>{
 for(const index of [1,2]){
  const {control:c,packet}=await commercialPacket();editCommercialRecord(packet,index,(_b,d)=>{d.price.components.push({id:'new-deposit',amount:100,currency:'EUR',kind:'REFUNDABLE_DEPOSIT',category:'OTHER',inclusion:'EXCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'AT_PROPERTY'});});await resealCommercialPacket(packet);
  const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'CONFLICTING');assert.equal(p.assessment.verifiedTotal,c.offer.price);assert.match(p.assessment.reasons.join('|'),/COMPONENTS_CHANGED|RETRIEVAL_CONFLICT/);
 }
});
test('CE cancellation instant equivalence reaches actual decision binding, not just pure validation',async()=>{
 const {control:c,packet}=await commercialPacket('synthetic-attested-quote@1','2099-09-01T12:00:00Z');
 editCommercialRecord(packet,1,(_b,d)=>{d.terms.cancellation.until='2099-09-01T13:00:00+01:00';});await resealCommercialPacket(packet);
 const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.equal(deriveBoundPublicRateConsistencyV3({...c,evidence:createBoundCommercialEvidenceV3({...c,prepared:p})}),'verified');
 editCommercialRecord(packet,1,(_b,d)=>{d.terms.cancellation.until='2099-09-01T14:00:00+01:00';});await resealCommercialPacket(packet);
 const changed=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(changed.assessment.status,'CONFLICTING');
});
test('CE decision binding also checks known fiscal components, not only matching total',async()=>{
 const {control:c,packet}=await commercialPacket();packet.records.forEach((_,i)=>editCommercialRecord(packet,i,(_b,d)=>{d.price.components[0].amount+=5;}));await resealCommercialPacket(packet);
 const p=await prepareSyntheticCommercialEvidenceV3(packet);assert.equal(p.assessment.status,'SUPPORTED_AT_OBSERVATION');assert.equal(p.assessment.observedTotal,c.offer.price);
 assert.throws(()=>createBoundCommercialEvidenceV3({...c,prepared:p}),/DECISION_COST_COMPONENT_MISMATCH/);
});
