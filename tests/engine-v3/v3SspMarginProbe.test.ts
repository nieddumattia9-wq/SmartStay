import test from 'node:test';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const mod=(p:string)=>load(pathToFileURL(resolve(p)).href);
const fixtures=()=>mod('tests/engine-v3/fixtures/sspProbeSyntheticV1.mjs');
const probe=()=>mod('scripts/liteapi-ssp-probe-v1.mjs');
const simulation=()=>mod('scripts/simulate-liteapi-ssp-probe-v1.mjs');
type Wire=any; // Invented original wire mutations, not facts trusted by the core.

test('MP01 baseline preserved: MAX11 still has one search, no margin, and stops below SSP',async()=>{
 const old=await mod('scripts/liteapi-comparison-plan-v1.mjs'),c=await mod('scripts/liteapi-comparison-capture-v1.mjs');
 const f=(await fixtures()).sspProbeFixture();
 assert.equal(old.CAPS.SEARCH,1);assert.ok(!('margin' in old.comparisonRequest(f.plan.comparisonPlan,'SEARCH').body));
 const stop=c.comparisonPrebookStop(f.plan.comparisonPlan,f.first,{hotelId:f.plan.hotelId,offerId:f.prepared.target.offerId},null);
 assert.ok(stop.reasons.includes('OBSERVED_PUBLIC_PRICE_BELOW_SSP'));
});
test('MP02 percentage is derived, not a quote; originals and exact new token retained',async()=>{
 const f=(await fixtures()).sspProbeFixture(),p=await probe(),before=JSON.stringify([f.first,f.second,f.third]);
 assert.equal(f.prepared.calculation.submittedMargin,15);assert.equal(f.prepared.calculation.baseMinorUnits,'100000');
 assert.match(f.prepared.calculation.basis,/NOT_PROVIDER_NET/);assert.equal(f.prepared.calculation.guaranteedTarget,false);
 assert.equal(f.assessed.status,'EXACT_SSP_RETURNED_NOT_PREBOOK_VERIFIED');
 assert.notEqual(f.assessed.newOfferId,f.assessed.oldOfferId);assert.equal(f.assessed.prebookRequest.body.offerId,f.assessed.newOfferId);
 const out=p.assessSspPrebook(f.plan,f.first,f.second,f.third);
 assert.equal(out.status,'EXACT_SSP_OBSERVED_AND_PREBOOK_PRICE_MATCHED',JSON.stringify(out.reasons));
 assert.equal(out.completeCost,1150);assert.equal(out.checkoutCertified,false);assert.equal(out.fullA02Admission,false);
 assert.equal(JSON.stringify([f.first,f.second,f.third]),before);
});
test('MP03 ratios differ: one margin is not a per-offer SSP setting',async()=>{
 const m=await fixtures(),a=m.sspProbeFixture(),b=m.sspProbeFixture({ssp:1200});
 assert.equal(a.prepared.calculation.submittedMargin,15);assert.equal(b.prepared.calculation.submittedMargin,20);
 const mismatch=m.sspProbeFixture({ssp:1200,returned:1150});assert.equal(mismatch.assessed.status,'STOP');
 assert.ok(mismatch.assessed.reasons.includes('OBSERVED_PUBLIC_PRICE_BELOW_SSP'));
});
test('MP04 exact arithmetic preserves candidate rounding, never rounds provider price to target',async()=>{
 const m=await fixtures(),f=m.sspProbeFixture({retail:0.04,commission:0.01,ssp:0.04});
 assert.equal(f.prepared.calculation.submittedMargin,33.333333);
 assert.notEqual(f.prepared.calculation.predictedMinusTargetMinorUnits.numerator,'0');
 for(const returned of [1149.99,1150.01]){const x=m.sspProbeFixture({returned});assert.equal(x.assessed.status,'STOP');assert.ok(x.assessed.reasons.includes('RETURNED_PRICE_NOT_EXACT_SSP'));}
});
const invalidDiscovery:Array<[string,(x:Wire)=>void]>=[
 ['missing SSP',x=>delete x.data[0].roomTypes[0].suggestedSellingPrice],
 ['missing commission',x=>delete x.data[0].roomTypes[0].rates[0].commission],
 ['commission currency',x=>{x.data[0].roomTypes[0].rates[0].commission.currency='USD';}],
 ['SSP currency',x=>{x.data[0].roomTypes[0].suggestedSellingPrice.currency='USD';}],
 ['non-positive derived base',x=>{x.data[0].roomTypes[0].rates[0].commission.amount=1100;}],
 ['conflicting SSP',x=>{x.data[0].roomTypes[0].rates[0].retailRate.suggestedSellingPrice={amount:1300,currency:'EUR'};}],
 ['offer/rate retail conflict',x=>{x.data[0].roomTypes[0].offerRetailRate.amount=1090;}],
 ['missing room mapping',x=>delete x.data[0].roomTypes[0].rates[0].mappedRoomId],
 ['provider error',x=>{x.error={message:'invented error'};}],
 ['wrong family',x=>{x.data[0].roomTypes[0].rates[0].childrenAges=[4,8];}],
];
for(const [name,discovery]of invalidDiscovery)test('MP05 discovery stop: '+name,async()=>{
 const f=(await fixtures()).sspProbeFixture({discovery});assert.equal(f.prepared.status,'STOP');assert.ok(!f.prepared.request);
});
const changedRequote:Array<[string,(x:Wire)=>void,RegExp]>=[
 ['new SSP',x=>{x.data[0].roomTypes[0].suggestedSellingPrice.amount=1160;},/NEW_SSP/],
 ['new cancellation',x=>{x.data[0].roomTypes[0].rates[0].cancellationPolicies.refundableTag='RFN';},/CONDITIONS/],
 ['new meal',x=>{x.data[0].roomTypes[0].rates[0].boardName='Breakfast';},/CONDITIONS/],
 ['wrong room',x=>{x.data[0].roomTypes[0].rates[0].mappedRoomId='other';},/MATCH/],
 ['ambiguous match',x=>{const o=structuredClone(x.data[0].roomTypes[0]);o.offerId+='other';x.data[0].roomTypes.push(o);},/AMBIGUOUS/],
 ['unavailable',x=>{x.data[0].roomTypes[0].available=false;},/MATCH/],
];
for(const [name,requote,reason]of changedRequote)test('MP06 no prebook on changed/ambiguous observation: '+name,async()=>{
 const f=(await fixtures()).sspProbeFixture({requote});assert.equal(f.assessed.status,'STOP');assert.match(f.assessed.reasons.join('|'),reason);assert.equal(f.assessed.prebookRequest??null,null);
});
const changedPrebook:Array<[string,(x:Wire)=>void,RegExp]>=[
 ['old offer token',x=>{x.data.offerId='opaque-first-offer+/=';},/OFFER_ID/],
 ['wrong rate',x=>{x.data.roomTypes[0].rates[0].rateId='unknown-rate';},/RATE_ID/],
 ['price',x=>{x.data.price=1151;},/PAYABLE/],
 ['new retail',x=>{x.data.price=1151;x.data.roomTypes[0].rates[0].retailRate.total[0].amount=1151;},/PRICE_OR_SSP/],
 ['conditions',x=>{x.data.roomTypes[0].rates[0].remarks='Mandatory service charge';},/CONDITIONS/],
 ['wrong dates',x=>{x.data.checkout='2099-10-18';},/CHECKOUT/],
 ['wrong occupants',x=>{x.data.roomTypes[0].rates[0].adultCount=4;},/OCCUPANCY/],
 ['application error',x=>{x.data.error={code:'invented-error'};},/PROVIDER_ERROR/],
];
for(const [name,prebook,reason]of changedPrebook)test('MP07 prebook cannot transfer its proof: '+name,async()=>{
 const f=(await fixtures()).sspProbeFixture({prebook}),out=(await probe()).assessSspPrebook(f.plan,f.first,f.second,f.third);
 assert.equal(out.status,'STOP');assert.match(out.reasons.join('|'),reason);
});
test('MP08 equal valid cancellation instants accepted; ambiguous times not invented',async()=>{
 const m=await fixtures(),add=(x:Wire,t:string)=>{x.data[0].roomTypes[0].rates[0].cancellationPolicies.cancelPolicyInfos=[{cancelTime:t,amount:10,currency:'EUR'}];};
 const f=m.sspProbeFixture({discovery:(x:Wire)=>add(x,'2099-10-09T12:00:00Z'),requote:(x:Wire)=>add(x,'2099-10-09T13:00:00+01:00')});
 assert.equal(f.assessed.status,'EXACT_SSP_RETURNED_NOT_PREBOOK_VERIFIED');
 const g=m.sspProbeFixture({discovery:(x:Wire)=>add(x,'2099-10-09T12:00:00'),requote:(x:Wire)=>add(x,'2099-10-09T12:00:00')});assert.equal(g.assessed.status,'STOP');
});
test('MP09 equality of price does not prove missing taxes or create a total',async()=>{
 const f=(await fixtures()).sspProbeFixture({discovery:(x:Wire)=>delete x.data[0].roomTypes[0].rates[0].retailRate.taxesAndFees}),out=(await probe()).assessSspPrebook(f.plan,f.first,f.second,f.third);
 assert.equal(out.status,'EXACT_SSP_OBSERVED_AND_PREBOOK_PRICE_MATCHED');assert.equal(out.completeCost,null);assert.ok(out.remainingFiscalIssues.includes('TAX_COVERAGE_UNDOCUMENTED_OMITTED'));assert.equal(out.fullA02Admission,false);
});
test('MP10 irrelevant metadata and different invented geography/currency do not change arithmetic',async()=>{
 const m=await fixtures(),f=m.sspProbeFixture({plan:(p:Wire)=>{p.comparisonPlan.scenario.city='Invented coastal test';p.comparisonPlan.scenario.country='GB';p.comparisonPlan.scenario.currency='GBP';},requote:(x:Wire)=>{x.diagnosticTrace='unrelated';}});
 assert.equal(f.prepared.calculation.submittedMargin,15);assert.equal(f.assessed.status,'EXACT_SSP_RETURNED_NOT_PREBOOK_VERIFIED');
});
test('MP11 original bytes/request must match; caller cannot change prepared margin',async()=>{
 const f=(await fixtures()).sspProbeFixture(),p=await probe();f.second.intent.body.margin=20;
 assert.throws(()=>p.assessSspRequote(f.plan,f.first,f.second),/REQUEST_MISMATCH/);
 f.first.response.body.sha256='0'.repeat(64);assert.throws(()=>p.prepareSspRequote(f.plan,f.first),/INTEGRITY/);
});
test('MP12 loopback -> reserved journal -> authenticated originals -> pure price qualification; no engine',async()=>{
 const f=(await fixtures()).sspProbeFixture(),s=await simulation(),r=await s.simulateSspProbe(f);
 assert.equal(r.status,'COMPLETED',r.failure);assert.equal(r.assessment.status,'EXACT_SSP_OBSERVED_AND_PREBOOK_PRICE_MATCHED');
 assert.equal(r.attempts,3);assert.deepEqual(r.counts,{DISCOVERY:1,REQUOTE:1,PREBOOK:1});assert.equal(r.localHttpRequests,3);assert.equal(r.providerRequests,0);assert.equal(r.engineInvocations,0);
 const read=s.readSyntheticSspProbe(r.locator);assert.equal(read.records[2].request.body.offerId,f.assessed.newOfferId);assert.equal(read.journal.requests[2].reservedAt<=read.journal.requests[2].completedAt,true);
 await assert.rejects(()=>s.simulateSspProbe(f),/CASE_ALREADY_EXISTS/);
 const path=resolve(r.locator.root,'events','000002.json'),raw=readFileSync(path);writeFileSync(path,Buffer.concat([raw,Buffer.from('x')]));assert.throws(()=>s.readSyntheticSspProbe(r.locator),/JSON_INVALID/);
});
test('MP13 new observation above SSP stops at two requests; no adjustment loop',async()=>{
 const f=(await fixtures()).sspProbeFixture({returned:1150.01}),r=await (await simulation()).simulateSspProbe(f);
 assert.equal(r.attempts,2);assert.equal(r.assessment.status,'STOP');assert.equal(r.counts.PREBOOK,0);
});
test('MP14 timeout consumes attempt, redirect never followed, no LIVE mode',async()=>{
 const m=await fixtures(),s=await simulation();
 for(const change of [{timeout:true},{status:302,headers:{location:'https://invalid.example/'}}]){
  const f=m.sspProbeFixture();Object.assign(f.responses[0],change);const r=await s.simulateSspProbe({...f,timeoutMs:60});assert.equal(r.status,'ABORTED');assert.equal(r.attempts,1);assert.equal(r.localHttpRequests,1);
 }
 const f=m.sspProbeFixture();f.plan.origin='LITEAPI_PRODUCTION';await assert.rejects(()=>s.simulateSspProbe(f),/PLAN_UNSUPPORTED/);
});
test('MP15 fixed selection does not switch offers to obtain a valid base',async()=>{
 const m=await fixtures(),p=await probe(),f=m.sspProbeFixture();
 const body=JSON.parse(Buffer.from(f.first.response.body.base64,'base64').toString('utf8'));
 const other=structuredClone(body.data[0].roomTypes[0]);other.offerId+='other';body.data[0].roomTypes.push(other);
 const r=m.probeRecord(f.first.intent,body),a=p.prepareSspRequote(f.plan,r);
 delete body.data[0].roomTypes.find((x:Wire)=>x.offerId===a.target.offerId).rates[0].commission;
 const stop=p.prepareSspRequote(f.plan,m.probeRecord(f.first.intent,body));assert.equal(stop.status,'STOP');assert.equal(stop.target.offerId,a.target.offerId);
 body.data[0].roomTypes.reverse();const reverse=p.prepareSspRequote(f.plan,m.probeRecord(f.first.intent,body));assert.equal(reverse.status,'STOP');assert.equal(reverse.target.offerId,a.target.offerId);
});
test('MP16 durable caps, sequence, one-shot restart and checkpoint alteration',async()=>{
 const m=await fixtures(),s=await simulation(),u=await mod('scripts/liteapi-comparison-plan-v1.mjs'),f=m.sspProbeFixture(),context={plan:f.plan};
 const input={root:resolve(f.registryRoot,'cases',f.plan.caseId),registryRoot:resolve(f.registryRoot),caseId:f.plan.caseId,mode:'SYNTHETIC_ONLY',
  context,bindingSha256:u.hash(context),authorizationSha256:u.hash(['OFFLINE_ONLY',context]),protector:f.protector};
 const j=s.sspProbeJournal.create(input);
 const reserve=(r:Wire)=>j.reserve({kind:r.kind,hotelId:r.hotelId,offerId:r.offerId??null,requestBytes:Buffer.from(u.canonical(r)),checkpointSha256:input.bindingSha256});
 assert.throws(()=>reserve(f.second.intent),/SEQUENCE/);
 assert.throws(()=>s.sspProbeJournal.create(input),/CASE_ALREADY_EXISTS/);
 reserve(f.first.intent);assert.throws(()=>reserve(f.first.intent),/CONCURRENCY/);
 j.complete({ordinal:1,state:'SUCCEEDED',statusCode:200,responseBytes:Buffer.from(u.canonical(f.first))});j.sealSelection(f.prepared);
 assert.throws(()=>reserve(f.first.intent),/CAP_EXCEEDED|SEQUENCE/);
 for(const [ordinal,r]of [[2,f.second],[3,f.third]] as Array<[number,Wire]>){reserve(r.intent);j.complete({ordinal,state:'SUCCEEDED',statusCode:200,responseBytes:Buffer.from(u.canonical(r))});}
 assert.throws(()=>reserve(f.third.intent),/CAP_EXCEEDED/);
 assert.throws(()=>s.sspProbeJournal.verify({...input,bindingSha256:'0'.repeat(64)}),/CHECKPOINT/);
 j.finish({status:'COMPLETED'});assert.equal(s.sspProbeJournal.verify(input).attemptsReserved,3);
});
test('MP17 interrupt consumes reserved request; no recreation; genuine DPAPI synthetic journal',async()=>{
 const m=await fixtures(),s=await simulation(),u=await mod('scripts/liteapi-comparison-plan-v1.mjs'),f=m.sspProbeFixture(),context={plan:f.plan};
 const input={root:resolve(f.registryRoot,'cases',f.plan.caseId),registryRoot:resolve(f.registryRoot),caseId:f.plan.caseId,mode:'SYNTHETIC_ONLY',
  context,bindingSha256:u.hash(context),authorizationSha256:u.hash(['OFFLINE_ONLY',context]),...(process.platform==='win32'?{}:{protector:f.protector})};
 const j=s.sspProbeJournal.create(input);
 j.reserve({kind:'DISCOVERY',hotelId:null,requestBytes:Buffer.from(u.canonical(f.first.intent)),checkpointSha256:input.bindingSha256});
 const interrupted=j.snapshot();assert.equal(interrupted.status,'INCOMPLETE_ONE_SHOT');assert.equal(interrupted.restartAllowed,false);
 assert.throws(()=>s.sspProbeJournal.create(input),/CASE_ALREADY_EXISTS/);
 j.finish({status:'ABORTED'});const final=s.sspProbeJournal.verify(input);assert.equal(final.attemptsReserved,1);assert.equal(final.requests[0].errorClass,'INTERRUPTED_NO_RESPONSE');
 if(process.platform==='win32')assert.equal(final.keyProtection,'WINDOWS_CURRENT_USER_DPAPI');
});
test('MP18 explicit expired/uninterpretable evidence is not revived; missing expiry remains missing',async()=>{
 const m=await fixtures();
 for(const expiresAt of ['2099-09-01T11:59:59Z','ambiguous date']){
  const f=m.sspProbeFixture({requote:(x:Wire)=>{x.data[0].roomTypes[0].expiresAt=expiresAt;}});
  assert.equal(f.assessed.status,'STOP');assert.match(f.assessed.reasons.join('|'),/EXPIRED|UNINTERPRETABLE/);
 }
 const f=m.sspProbeFixture();assert.equal(f.assessed.facts.timing.providerValidUntil,null);assert.equal(f.assessed.facts.timing.internalTtl,null);
});
test('MP19 component list is preserved, not certified exhaustive; no SSP plus retail or double tax sum',async()=>{
 const f=(await fixtures()).sspProbeFixture({discovery:(x:Wire)=>{x.data[0].roomTypes[0].rates[0].retailRate.taxesAndFees=[
  {amount:60,currency:'EUR',included:true,mandatory:true,basis:'TOTAL_STAY'},
  {amount:30,currency:'EUR',included:false,mandatory:true,basis:'TOTAL_STAY'}];}}),out=(await probe()).assessSspPrebook(f.plan,f.first,f.second,f.third);
 assert.equal(out.status,'EXACT_SSP_OBSERVED_AND_PREBOOK_PRICE_MATCHED');assert.equal(out.completeCost,null);
 assert.ok(out.remainingFiscalIssues.includes('COMPONENT_LIST_EXHAUSTIVENESS_NOT_ATTESTED'));assert.equal(out.facts.retail.amount,1150);assert.equal(out.facts.fiscal.payAtProperty.length,1);
});
