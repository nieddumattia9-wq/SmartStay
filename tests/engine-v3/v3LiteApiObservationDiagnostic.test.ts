import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {computeObservedOfferDiagnosticV3} from '../../src/engine-v3/evaluation/observedOfferDiagnosticV3';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
async function setup(options:any={}){
 const f=await at('tests/engine-v3/fixtures/liteApiObservationSyntheticV1.mjs');
 const m=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
 const request=await f.providerCapture(options);let actual=0;
 return {f,m,request,prepare:()=>m.prepareLiteApiObservationDiagnostic(request),
  run:()=>m.executeLiteApiObservationDiagnostic(request,(input:any)=>{actual++;return computeObservedOfferDiagnosticV3(input);}),calls:()=>actual};
}
const selected=(p:any)=>p.data.roomTypes[0].rates[0];
const commercial=(q:any)=>['PREBOOK','PREBOOK_GET'].includes(q.kind);
const decisions=(r:any)=>r.output.candidates.map((c:any)=>({dimensions:c.policy.dimensions,cost:c.policy.totalCost,integrity:c.policy.offerIntegrity}));

test('LP01 simulated transport to preserved bytes, verification, normalization, real kernel and policy usable',async()=>{
 const x=await setup(),before=JSON.stringify(x.request),p=x.prepare();
 assert.equal(x.calls(),0);assert.equal(p.engineInvocations,0);assert.equal(p.policyInvocations,0);assert.equal(p.decision,null);
 assert.equal(p.kind,'FRESH_PROVIDER_OBSERVATION');assert.equal(p.normalization.mode,'PROVIDER_OBSERVATION_DIAGNOSTIC');
 assert.equal(x.request.attempts,11);assert.equal(x.request.capture.requests.length,11);
 const r=x.run();assert.equal(x.calls(),1);assert.equal(r.engineInvocations,1);assert.equal(r.policyInvocations,1);
 assert.equal(r.executionStatus,'POLICY_EXECUTED');assert.equal(r.output.decision.status,'usable');
 assert.equal(JSON.stringify(x.request),before);assert.equal(r.syntheticProofOnly,true);assert.equal(r.humanReceiptCreated,false);
 assert.equal(r.output.publicIntegrationEnabled,false);assert.equal(r.output.automaticGoldenAdmission,false);
});
test('LP02 absence of distance survives market context and policy without fake points or kilometers',async()=>{
 const x=await setup(),r=x.run();assert.deepEqual(r.input.context.semantics,'not-requested');assert.equal(r.input.context.kilometers,null);
 assert(r.input.candidates.every((c:any)=>c.assessment.distanceKm===null&&!c.facts.some((f:any)=>f.code==='location.coordinates')));
 assert(r.output.candidates.every((c:any)=>c.distance.status==='not-requested'&&c.policy.dimensions.location.score===null));
 assert(r.output.market);assert.equal(r.output.decision.status,'usable');
});
for(const type of ['omitted','empty','currency','basis','remark','suggested'])test('LP03 '+type+' fiscal uncertainty preserves evidence and yields actual abstention',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(!commercial(q))return;const rate=selected(p);
  if(type==='omitted')delete rate.taxesAndFees;
  if(type==='empty')rate.taxesAndFees=[];
  if(type==='currency')rate.taxesAndFees=[{amount:10,currency:'USD',included:false}];
  if(type==='basis')rate.taxesAndFees=[{amount:10,currency:'EUR',included:false,basis:'PER_PERSON_PER_NIGHT'}];
  if(type==='remark')rate.remarks='Mandatory city tax payable at property, amount unspecified';
  if(type==='suggested')p.data.roomTypes[0].suggestedSellingPrice={amount:2,currency:'EUR'};
 }});const r=x.run();assert.equal(r.policyInvocations,1);assert.equal(r.output.decision.status,'abstained');
 assert(r.normalization.offers.every((o:any)=>o.completeTotal.state==='UNKNOWN'));assert(r.observations.every((o:any)=>o.fiscal.issues.length>0));
 assert.equal(r.output.candidates.length,3);assert.equal(r.output.fullRobustness,'NOT_EXECUTED');
});
test('LP04 explicit null all-included differs from empty/omitted; included/excluded sums only aggregate same currency',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(commercial(q))selected(p).taxesAndFees=[{amount:'30.00',currency:'EUR',included:true,description:'VAT'},
  {amount:'20.00',currency:'EUR',included:false,description:'Mandatory aggregate city levy',basis:'TOTAL_STAY'}];}});
 const r=x.run();assert.equal(r.output.decision.status,'usable');assert(r.observations.every((o:any)=>o.fiscal.completeTotal===o.fiscal.baseAmount+20));
 assert(r.observations.every((o:any)=>o.fiscal.payAtProperty.length===1&&o.fiscal.fxApplied===false));
 const c=await setup();assert(c.prepare().observations.every((o:any)=>o.fiscal.representation==='NULL_ALL_INCLUDED'));
});
for(const kind of ['prebook-failed','get-failed','wrong-hotel','wrong-offer','wrong-room','wrong-ages','wrong-count','wrong-date','wrong-currency','retrieval-change'])test('LP05 '+kind+' never certifies fallback search facts',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(!commercial(q))return;
  if(kind==='wrong-hotel')p.data.hotelId='other';if(kind==='wrong-offer')p.data.roomTypes[0].offerId='other';
  if(kind==='wrong-room')selected(p).mappedRoomId='other';if(kind==='wrong-ages')selected(p).children=[8,12];
  if(kind==='wrong-count')selected(p).childCount=1;if(kind==='wrong-date')p.data.checkin='2099-10-11';
  if(kind==='wrong-currency')p.data.currency='USD';if(kind==='retrieval-change'&&q.kind==='PREBOOK_GET')p.data.roomTypes[0].offerRetailRate.amount+=1;
 },respond:(r:any,q:any)=>{if(kind==='prebook-failed'&&q.kind==='PREBOOK'||kind==='get-failed'&&q.kind==='PREBOOK_GET')r.status=422;}});
 const r=x.run();assert.equal(r.output.decision.status,'abstained');assert(r.normalization.offers.every((o:any)=>o.availability.bookability.value!==true));
 assert.equal(r.policyInvocations,1);assert(r.observations.every((o:any)=>o.issues.length));
});
test('LP06 missing expiry remains null, not ten minutes; explicit expired/invalid declarations block',async()=>{
 const a=await setup(),p=a.prepare();assert(p.observations.every((o:any)=>o.time.providerValidUntil===null&&o.time.internalTtl===null&&o.time.status==='PROVIDER_EXPIRY_NOT_DECLARED'));
 for(const expiry of ['2099-09-01T12:01:00Z','not-a-date']){const x=await setup({mutate:(p:any,q:any)=>{if(commercial(q))p.data.validUntil=expiry;}});const r=x.run();
  assert.equal(r.output.decision.status,'abstained');assert(r.observations.every((o:any)=>o.issues.some((s:string)=>s.startsWith('PROVIDER_TIME_'))));}
 const z=await setup({mutate:(p:any,q:any)=>{if(commercial(q))p.data.validUntil='2099-09-01T12:20:00Z';}});assert.equal(z.run().output.decision.status,'usable');
});
test('LP07 commercial change retained as new prebook observation, retrieval exact, historical bytes unchanged',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(commercial(q))p.data.roomTypes[0].offerRetailRate.amount+=11;}}),r=x.run();
 assert(r.observations.every((o:any)=>o.commercialChange===true));assert.equal(r.output.decision.status,'usable');
 assert(r.input.candidates.every((c:any)=>c.observations.other.search.offer.offerRetailRate.amount+11===c.observations.other.prebook.offer.offerRetailRate.amount));
});
for(const count of [0,1])test('LP08 '+count+' candidates never fabricated; no policy abstention label',async()=>{
 const x=await setup({count}),r=x.run();assert.equal(x.calls(),0);assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(r.executionStatus,'NOT_EXECUTED');
 assert.equal(r.output,null);assert.equal(r.normalization.offers.length,count);
});
for(const text of ['Private room; Private bathroom; 1 divano letto','Private room; Private bathroom; 2 letti a castello','Private room; Private bathroom'])test('LP09 no capacity-to-beds or bunk/sofa multiplier '+text,async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(q.kind==='SEARCH')for(const h of p.data)h.roomTypes[0].rates[0].name=text;else if(commercial(q))selected(p).name=text;}}),r=x.run();
 assert.equal(r.output.decision.status,'abstained');assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='INSUFFICIENT_INFORMATION'));
 assert.deepEqual(r.output.party,{adults:2,childAgesAtStay:[7,12],unitsRequested:1});
});
test('LP10 missing property detail/rating does not invent quality, eligibility not forced',async()=>{
 const x=await setup({respond:(r:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')r.status=404;}}),r=x.run();
 assert(r.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='property.stars').value===null&&c.facts.find((f:any)=>f.code==='review.score').value===null));
 assert(r.normalization.offers.every((o:any)=>o.ratingScale.state==='UNKNOWN'));assert.equal(r.output.decision.status,'abstained');
});
test('LP11 mixed incomplete candidate remains; complete peers considered without replacement',async()=>{
 const x=await setup({mutate:(p:any,q:any,i:number)=>{if(i===0&&commercial(q))delete selected(p).taxesAndFees;}}),r=x.run();
 assert.equal(r.output.candidates.length,3);assert.equal(r.normalization.offers.filter((o:any)=>o.completeTotal.state==='UNKNOWN').length,1);
 assert.equal(r.output.decision.status,'usable');const bad=r.output.candidates.find((c:any)=>c.policy.totalCost===null);
 assert(!r.output.decision.portfolio.bestChoice.equivalentSolutionIds.includes(bad.policy.solutionId));
});
test('LP12 integrity checkpoint and sealed essential scenario reject before engine',async()=>{
 const x=await setup();x.request.checkpoint={...x.request.checkpoint,head:'c'.repeat(40)};
 assert.throws(x.run,/CHECKPOINT/);assert.equal(x.calls(),0);
 const y=await setup();y.request.capture.requests[0].response.body.base64='e30=';assert.throws(y.run,/INTEGRITY/);assert.equal(y.calls(),0);
 const z=await setup();z.request.scenario.party.requirements.sleepingPlaces=false;assert.throws(z.run,/SCENARIO/);assert.equal(z.calls(),0);
});
test('LP13 provider display name/order and external feedback cannot alter scoring or selection',async()=>{
 const a=await setup(),r=a.run();const b=await setup({mutate:(p:any,q:any)=>{if(q.kind==='SEARCH'){p.data.reverse();for(const h of p.data)h.name='Best cheap provider first';}if(q.kind==='HOTEL_DETAIL')p.data.name='Human preferred name';}});
 b.request.feedback={winner:'invented-property-2'};const s=b.run();assert.deepEqual(decisions(s),decisions(r));assert.deepEqual(s.output.decision.portfolio,r.output.decision.portfolio);
 assert.equal(s.feedbackUsed,false);
});
test('LP14 privacy negation and generic property services cannot erase selected room limitation',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(commercial(q))selected(p).remarks='Private bathroom not available; WiFi not available';
  if(q.kind==='HOTEL_DETAIL')p.data.facilities=['Private bathroom','WiFi'];}}),r=x.run();
 assert(r.output.candidates.every((c:any)=>c.suitability.facts.bathroomState==='CONFLICTING'&&c.suitability.status!=='eligible'));
 assert(r.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='feature.wifi').value===false));assert.equal(r.output.decision.status,'abstained');
});
test('LP15 exact five candidates traverse all seventeen simulated requests and one policy call',async()=>{
 const x=await setup({count:5}),r=x.run();assert.equal(x.request.attempts,17);assert.equal(r.output.candidates.length,5);
 assert.equal(r.engineInvocations,1);assert.equal(r.policyInvocations,1);assert.equal(r.output.decision.status,'usable');
});
test('LP16 opaque provider identity changes do not change merit or selected commercial result',async()=>{
 const x=await setup(),a=x.run(),y=await setup({idPrefix:'changed-'}),b=y.run();
 const merit=(r:any)=>r.output.candidates.map((c:any)=>({cost:c.policy.totalCost,
  scores:Object.fromEntries(Object.entries(c.policy.dimensions).map(([k,v]:any)=>[k,v.score]))})).sort((a:any,b:any)=>a.cost-b.cost);
 const chosen=(r:any)=>r.output.candidates.filter((c:any)=>r.output.decision.portfolio.bestChoice.equivalentSolutionIds.includes(c.policy.solutionId)).map((c:any)=>c.policy.totalCost).sort();
 assert.deepEqual(merit(a),merit(b));assert.deepEqual(chosen(a),chosen(b));
});
