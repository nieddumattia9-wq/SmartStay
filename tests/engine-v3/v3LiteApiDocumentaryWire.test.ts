import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {computeObservedOfferDiagnosticV3} from '../../src/engine-v3/evaluation/observedOfferDiagnosticV3';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const commercial=(q:any)=>['PREBOOK','PREBOOK_GET'].includes(q.kind);
const rate=(p:any)=>p.data.roomTypes[0].rates[0];
async function setup(options:any={}){
 const f=await at('tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs');
 const m=await at('scripts/liteapi-observation-diagnostic-v1.mjs'),w=await at('scripts/liteapi-documentary-wire-v1.mjs');
 const request=f.documentaryCaptureFixture(options);let calls=0;
 const prepare=()=>m.prepareLiteApiProviderObservation(request);
 return {f,m,w,request,prepare,calls:()=>calls,run:()=>{const p=prepare();if(p.status!=='PREPARED_DIAGNOSTIC_INPUT')return {...p,output:null};calls++;return {...p,output:computeObservedOfferDiagnosticV3(p.input)};}};
}
test('DW01 documented containers and opaque IDs reach unchanged kernel with no synthetic relabelling',async()=>{
 const x=await setup(),before=JSON.stringify(x.request),p=x.prepare();assert.equal(p.status,'PREPARED_DIAGNOSTIC_INPUT');
 assert.equal(p.engineInvocations,0);assert.equal(p.policyInvocations,0);assert.equal(p.decision,null);assert.equal(x.calls(),0);
 assert(p.input.candidates.every((c:any)=>c.provenance.kind==='SYNTHETIC_LOCAL_TRANSPORT'));
 const r=x.run();assert.equal(r.output.decision.status,'usable');assert.equal(r.output.policyInvocations,1);assert.equal(x.calls(),1);
 assert.equal(JSON.stringify(x.request),before);assert(r.observations.every((o:any)=>o.prebookVerified));
 assert(r.input.candidates.every((c:any)=>c.observations.other.prebook.binding.mappedRoomId===null));
 assert.equal(r.syntheticProofOnly,true);assert.equal(r.goldenAdmission,false);
});
test('DW02 singleton array offerRetailRate variant is explicit and preserves amount without cents conversion',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(q.kind==='SEARCH')for(const h of p.data)h.roomTypes[0].offerRetailRate=[h.roomTypes[0].offerRetailRate];}});
 const r=x.run();assert.equal(r.output.decision.status,'usable');assert.deepEqual(r.normalization.offers.map((o:any)=>o.completeTotal.value).sort((a:number,b:number)=>a-b),[820,910,1000]);
});
test('DW03 optional offerId and childrenAges echoes stay absent; original request binding remains explicit',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(commercial(q)){delete p.data.offerId;delete rate(p).childrenAges;}}}),r=x.run();
 assert.equal(r.output.decision.status,'usable');for(const c of r.input.candidates){const d=c.observations.other.prebook;
  assert.equal(d.binding.offerIdEchoed,false);assert.equal(d.binding.childAgesEchoed,false);assert(!Object.hasOwn(d.rate,'childrenAges'));assert(!Object.hasOwn(d.hotel,'offerId'));}
});
for(const defect of ['hotel','offer','ages','adults','checkin','currency','rate','mapped','capacity','price','negative','root-error','data-error','expiry'])test('DW04 GET '+defect+' conflicts are not replaced by historic favorable facts',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(q.kind!=='PREBOOK_GET')return;
  if(defect==='hotel')p.data.hotelId='other-invented-property';
  if(defect==='offer')p.data.offerId='other-invented-offer';
  if(defect==='ages')rate(p).childrenAges=[3,4];
  if(defect==='adults')rate(p).adultCount=1;
  if(defect==='checkin')p.data.checkin='2099-10-11';
  if(defect==='currency')p.data.currency='USD';
  if(defect==='rate')rate(p).rateId='different-current-rate';
  if(defect==='mapped')p.data.mappedRoomId=1;
  if(defect==='capacity')rate(p).maxOccupancy=1;
  if(defect==='price')p.data.price+=20;
  if(defect==='negative')rate(p).available=false;
  if(defect==='root-error')p.error={message:'Invented failure'};
  if(defect==='data-error')p.data.error={message:'Invented failure'};
  if(defect==='expiry')rate(p).expiresAt='2099-09-01T12:00:00.000Z';
 }}),r=x.run();assert.equal(r.output.decision.status,'abstained');assert(r.observations.every((o:any)=>!o.prebookVerified));
 assert(r.normalization.offers.every((o:any)=>o.completeTotal.state==='UNKNOWN'));
});
for(const defect of ['omitted','empty','mixed-currency','per-person','ssp','remarks','adjustments'])test('DW05 fiscal '+defect+' remains evidence insufficiency, not fake complete total',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(!commercial(q))return;
  if(defect==='omitted')delete rate(p).retailRate.taxesAndFees;
  if(defect==='empty')rate(p).retailRate.taxesAndFees=[];
  if(defect==='mixed-currency')rate(p).retailRate.taxesAndFees=[{amount:10,currency:'USD',included:false}];
  if(defect==='per-person')rate(p).retailRate.taxesAndFees=[{amount:10,currency:'EUR',included:false,basis:'PER_PERSON_PER_NIGHT'}];
  if(defect==='ssp')p.data.suggestedSellingPrice={amount:2000,currency:'EUR'};
  if(defect==='remarks')p.data.termsAndConditions='Mandatory additional fee amount not specified';
  if(defect==='adjustments')p.data.addonsTotalAmount=10;
 }}),r=x.run();assert.equal(r.output.decision.status,'abstained');assert(r.observations.every((o:any)=>o.fiscal.completeTotal===null));
 assert(r.normalization.offers.every((o:any)=>o.completeTotal.state==='UNKNOWN'));
});
test('DW06 included components are not double counted; excluded amount is aggregate without guest multiplication',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(commercial(q))rate(p).retailRate.taxesAndFees=[{amount:15,currency:'EUR',included:true},{amount:20,currency:'EUR',included:false}];}}),r=x.run();
 assert.equal(r.output.decision.status,'usable');assert(r.observations.every((o:any)=>o.fiscal.completeTotal===o.fiscal.baseAmount+20));
});
test('DW07 no expiry field is synthesized or treated as future guarantee',async()=>{const x=await setup(),p=x.prepare();assert(p.observations.every((o:any)=>o.time.providerValidUntil===null&&o.time.status==='PROVIDER_EXPIRY_NOT_DECLARED'&&o.time.futureAvailabilityGuaranteed===false));});
test('DW08 invalid details cannot supply property facts; catalog does not grant all facilities',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.error={message:'Synthetic detail failure'};}}),p=x.prepare();
 assert(p.observations.every((o:any)=>o.detailIdentityVerified&&!o.detailUsable));
 assert(p.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='property.stars').value===null&&!c.facts.some((f:any)=>f.code==='feature.pool'&&f.value===true)));
});
test('DW09 property facilities object names are consumed, unrelated catalog rows are not',async()=>{
 const x=await setup(),p=x.prepare();assert(p.input.candidates.every((c:any)=>c.facts.some((f:any)=>f.code==='feature.wifi'&&f.value===true)));
 assert(p.input.candidates.every((c:any)=>!c.facts.some((f:any)=>f.code==='feature.pool'&&f.value===true)));
 assert(p.input.candidates.every((c:any)=>c.scopedObservations.filter((o:any)=>o.scope==='PROPERTY').every((o:any)=>
  /^data\.(?:hotelFacilities\[\d+\]|facilities\[\d+\]\.name)$/.test(o.sourcePointer)&&o.links[0].field===o.sourcePointer)));
});
for(const count of [0,1])test('DW10 '+count+' candidates is not execution or engine abstention',async()=>{const x=await setup({count}),r=x.run();assert.equal(r.output,null);assert.equal(x.calls(),0);assert.equal(r.policyInvocations,0);});
test('DW11 tampered captured bytes rejected before preparing any policy input',async()=>{
 const x=await setup();x.request.capture.requests[0].response.body.base64=Buffer.from('{}').toString('base64');assert.throws(x.prepare,/CAPTURE_BINDING_OR_HASH/);assert.equal(x.calls(),0);
});
test('DW12 existing D0061 synthetic path rejects documentary capture instead of relabelling it',async()=>{
 const x=await setup();assert.throws(()=>x.m.prepareLiteApiObservationDiagnostic({capture:x.request.capture,scenario:x.request.config.scenario,checkpoint:x.request.checkpoint,selectionPolicy:x.request.config.selection,evaluatedAt:x.request.evaluatedAt}),/SCENARIO_UNREPRESENTABLE/);
});
test('DW13 opaque identifiers preserve long exact tokens and encoded GET path',async()=>{
 const x=await setup();assert(x.request.selection.selected.every((s:any)=>s.offerId.length>200));
 const ids=x.request.requests.filter((r:any)=>r.kind==='PREBOOK_GET');assert(ids.every((r:any)=>r.path.endsWith(encodeURIComponent(r.prebookId))));
 assert.equal(x.w.isOpaqueLiteApiId('x\nsecret'),false);assert.equal(x.w.isOpaqueLiteApiId('A'.repeat(40000)),false);
});
test('DW14 order of provider records cannot alter hash sample or decision evidence',async()=>{
 const a=await setup(),b=await setup({mutate:(p:any,q:any)=>{if(q.kind==='SEARCH')p.data.reverse();}});assert.deepEqual(a.request.selection.selected,b.request.selection.selected);
 const ar=a.run(),br=b.run();assert.equal(ar.output.decision.status,br.output.decision.status);
 assert.deepEqual(ar.output.candidates.map((c:any)=>c.policy.totalCost),br.output.candidates.map((c:any)=>c.policy.totalCost));
});

for(const priceBasis of ['NET_ONLY_NOT_PUBLIC','FIXTURE_RATE_TOTAL_EQUALS_SSP',''])test('DW15 unqualified account price basis '+JSON.stringify(priceBasis)+' cannot reach pure preparation or kernel',async()=>{
 const x=await setup({priceBasis});assert.throws(x.prepare,/CAPTURE_UNAPPROVED_CONFIG/);assert.equal(x.calls(),0);
 assert.equal(x.request.capture.config.account.priceBasis,priceBasis);
});

test('DW16 opaque ordinary spaces are preserved and encoded, not rejected by an invented provider grammar',async()=>{
 const x=await setup({mutate:(p:any,q:any)=>{if(q.kind==='SEARCH')for(const h of p.data)h.roomTypes[0].offerId+=' literal space';
  if(commercial(q))p.data.prebookId+=' literal space';}}),r=x.run();
 assert.equal(r.output.decision.status,'usable');assert.equal(x.w.isOpaqueLiteApiId('opaque ordinary space'),true);
 assert(x.request.requests.filter((q:any)=>q.kind==='PREBOOK_GET').every((q:any)=>q.path.endsWith(encodeURIComponent(q.prebookId))&&q.path.includes('%20')));
 assert(x.request.selection.selected.every((s:any)=>s.offerId.endsWith(' literal space')));
});
