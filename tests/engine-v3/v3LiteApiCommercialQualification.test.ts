import assert from 'node:assert/strict';
import test from 'node:test';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
// D-0063: invented responses only, changed BEFORE capture registration. Old
// fixtures/evidence are not rewritten. No production loader or transport here.
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const kernel=require('../../src/engine-v3/evaluation/observedOfferDiagnosticV3');
const policy=require('../../src/engine-v3/policy/personalUtilityRolePolicyV3');
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const commercial=(q:any)=>['PREBOOK','PREBOOK_GET'].includes(q.kind);
const rate=(p:any)=>p.data.roomTypes[0].rates[0];
async function exercise(id:string,mutate?:any,count=3){
 const f=await at('tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs'),m=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
 const request=f.documentaryCaptureFixture({count,mutate}),original=JSON.stringify(request);let kernelCalls=0,policyCalls=0;
 const old=policy.runPersonalUtilityRolePolicyV3;policy.runPersonalUtilityRolePolicyV3=(...args:any[])=>{policyCalls++;return old(...args);};
 try{
  const prepared=m.prepareLiteApiProviderObservation(request);assert.equal(kernelCalls,0);assert.equal(policyCalls,0);
  assert.deepEqual(m.prepareLiteApiProviderObservation(request),prepared);assert.equal(policyCalls,0);
  const output=prepared.status==='PREPARED_DIAGNOSTIC_INPUT'?(kernelCalls++,kernel.computeObservedOfferDiagnosticV3(prepared.input)):null;
  assert.equal(JSON.stringify(request),original);assert.equal(policyCalls,output?.policyInvocations??0);
  const directory=process.env.STAYOPTI_D0063_EVIDENCE_DIR;
  if(directory){assert(isAbsolute(directory)&&relative(process.cwd(),resolve(directory)).startsWith('..')&&existsSync(directory));
   writeFileSync(join(directory,id+'.json'),JSON.stringify({syntheticOnly:true,id,request,prepared,output,originalsPreserved:true,
    inputSha256:sha(original),adapterSha256:sha(readFileSync('scripts/liteapi-observation-diagnostic-v1.mjs','utf8')),
    wireSha256:sha(readFileSync('scripts/liteapi-documentary-wire-v1.mjs','utf8')),purePreparationCalls:2,kernelCalls,policyCalls,providerRequests:0},null,2)+'\n',{flag:'wx'});}
  return {...prepared,output,kernelCalls,policyCalls};
 }finally{policy.runPersonalUtilityRolePolicyV3=old;}
}
test('CQ01 complete original documentary control remains usable',async()=>{const r=await exercise('01-control');assert.equal(r.output.decision.status,'usable');assert.equal(r.kernelCalls,1);assert.equal(r.policyCalls,1);});
test('CQ02 public retail above same-currency SSP is not rejected for inequality',async()=>{
 const r=await exercise('02-above-ssp',(p:any,q:any)=>{if(commercial(q))p.data.suggestedSellingPrice={amount:p.data.price-70,currency:'EUR'};});
 assert.equal(r.output.decision.status,'usable');assert(r.observations.every((o:any)=>o.fiscal.completeTotal===o.fiscal.baseAmount));
});
test('CQ03 English explicit bed conjunction reaches existing requirements',async()=>{
 const r=await exercise('03-english-beds',(p:any,q:any)=>{if(commercial(q))rate(p).name='Private room; Private bathroom; 2 Queen Beds';});
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='SATISFIED'));
 assert.equal(r.output.decision.status,'usable');
});
test('CQ04 mapped capacity contradicting a complete rate remains blocking',async()=>{
 const r=await exercise('04-mapped-capacity',(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.rooms[0].maxOccupancy=2;});
 assert.equal(r.output.decision.status,'abstained');assert(r.assessment.offers.every((o:any)=>o.accommodation.capacity.status==='CONFLICTING'));
});
test('CQ05 mapped bed contradiction is not erased by sufficient capacity',async()=>{
 const r=await exercise('05-mapped-beds',(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.rooms[0].bedTypes=[{quantity:1,bedType:'Single bed'},{quantity:1,bedType:'Double bed'}];});
 assert.equal(r.output.decision.status,'abstained');assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='CONFLICTING'));
});
test('CQ06 unresolved GET identifiers do not certify a commercial price change',async()=>{
 const r=await exercise('06-retrieval-identifiers',(p:any,q:any)=>{if(q.kind==='PREBOOK_GET'){rate(p).occupancyNumber=0;rate(p).rateId='invented-retrieved-rate';}});
 assert.equal(r.output.decision.status,'abstained');
 assert(r.observations.every((o:any)=>o.retrievalComparison?.occupancy.status==='UNRESOLVED_DIFFERENCE'&&o.retrievalComparison?.rateIdentity.status==='UNRESOLVED_DIFFERENCE'&&o.retrievalComparison?.commercial.status==='MATCH'));
 assert(r.observations.every((o:any)=>!o.issues.includes('PREBOOK_RETRIEVAL_COMMERCIAL_CONFLICT')));
});
test('CQ07 important mandatory conditions cannot disappear behind null taxes',async()=>{
 const r=await exercise('07-important-conditions',(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.hotelImportantInformation='A mandatory cleaning fee applies; amount not specified.';});
 assert.equal(r.output.decision.status,'abstained');assert(r.observations.every((o:any)=>o.fiscal.importantInformation.entries.length>0));
});
test('CQ08 retail below SSP stays blocked with unchanged price',async()=>{
 const r=await exercise('08-below-ssp',(p:any,q:any)=>{if(commercial(q))p.data.suggestedSellingPrice={amount:p.data.price+70,currency:'EUR'};});
 assert.equal(r.output.decision.status,'abstained');assert(r.observations.every((o:any)=>o.fiscal.completeTotal===null));
});
for(const [name,value,expected] of [
 ['equal',{amount:820,currency:'EUR'},'usable'],
 ['other-currency',{amount:700,currency:'USD'},'abstained'],
 ['scalar',820,'abstained'],
 ['scalar-string','820','abstained'],
] as const)test('CQ09 exact endpoint money shape and currency: '+name,async()=>{
 const r=await exercise('09-'+name,(p:any,q:any,i:number)=>{if(commercial(q))p.data.suggestedSellingPrice=typeof value==='object'?{...value,amount:value.amount+i*90}:value;});
 assert.equal(r.output.decision.status,expected);
 if(name==='scalar')for(const o of r.observations){const f=o.fiscal.priceQualification.fields.find((x:any)=>x.field==='prebook.suggestedSellingPrice');assert.equal(f.parsed,null);assert.equal(f.original,820);assert.equal(f.containerCurrencyObservation.value,'EUR');assert.equal(f.containerCurrencyObservation.assignedToUnsupportedScalar,false);}
});
for(const defect of ['tax-omitted','different-user-price','price-difference','ssp-source-difference'])test('CQ10 separate money facts cannot manufacture completeness: '+defect,async()=>{
 const r=await exercise('10-'+defect,(p:any,q:any)=>{if(commercial(q)){
  p.data.sellingPriceToUser=p.data.price;p.data.commission=13;rate(p).commission=[{amount:13,currency:'EUR'}];
  if(defect==='tax-omitted')delete rate(p).retailRate.taxesAndFees;
  if(defect==='different-user-price')p.data.sellingPriceToUser+=30;
  if(defect==='price-difference')p.data.price+=40;
  if(defect==='ssp-source-difference'){p.data.suggestedSellingPrice={amount:650,currency:'EUR'};rate(p).retailRate.suggestedSellingPrice=[{amount:600,currency:'EUR'}];}
 }});
 assert.equal(r.output.decision.status,'abstained');assert(r.normalization.offers.every((o:any)=>o.completeTotal.state==='UNKNOWN'));
 assert(r.observations.every((o:any)=>o.fiscal.priceQualification.fields.some((f:any)=>f.field==='sellingPriceToUser'&&f.source.responseSha256.length===64)));
 assert(r.observations.every((o:any)=>o.fiscal.priceQualification.commissionUsedForMerit===false));
});
test('CQ11 price, commission, SSP and excluded payment stay distinct and linked',async()=>{
 const r=await exercise('11-distinct-money',(p:any,q:any)=>{if(commercial(q)){
  p.data.sellingPriceToUser=p.data.price;p.data.suggestedSellingPrice={amount:p.data.price-50,currency:'EUR'};p.data.commission=17;
  rate(p).retailRate.taxesAndFees=[{amount:21,currency:'EUR',included:true},{amount:9,currency:'EUR',included:false}];
 }});
 assert.equal(r.output.decision.status,'usable');for(const o of r.observations){assert.equal(o.fiscal.completeTotal,o.fiscal.baseAmount+9);assert.equal(o.fiscal.payAtProperty[0].amount,9);
 assert.equal(o.fiscal.priceQualification.fields.find((f:any)=>f.field==='prebook.commission').parsed.amount,17);assert.equal(o.fiscal.priceQualification.taxCompletenessCertified,false);}
});
for(const [name,text,category,blocked] of [
 ['optional','Optional breakfast costs EUR 18.','OPTIONAL_EXTRA',false],
 ['optional-price-variants','Breakfast costs EUR 18 before arrival and EUR 23 at the property.','OPTIONAL_EXTRA',false],
 ['pets','Pets incur EUR 19 per night.','CONDITIONAL_EXTRA',false],
 ['hours','The restaurant is open from 18:00 to 21:00.','NON_MONETARY_CONDITION',false],
 ['deposit','A deposit may be required at the property.','DEPOSIT_SEPARATE_FROM_STAY_PRICE',true],
 ['refundable','A fully refundable security deposit is required.','DEPOSIT_SEPARATE_FROM_STAY_PRICE',false],
 ['nonrefundable','A non-refundable deposit is required.','DEPOSIT_SEPARATE_FROM_STAY_PRICE',true],
 ['fee','Mandatory service charge applies to every stay.','MANDATORY_OR_CONDITIONED_CHARGE',true],
 ['unsupported','Other costs follow local instructions.','UNCLASSIFIED',true],
] as const)test('CQ12 hotelImportantInformation whole condition preserved: '+name,async()=>{
 const r=await exercise('12-'+name,(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.hotelImportantInformation=text;});
 assert.equal(r.output.decision.status,blocked?'abstained':'usable');for(const o of r.observations){const info=o.fiscal.importantInformation;
 assert.equal(info.original,text);assert.equal(info.entries[0].category,category);assert.equal(info.automaticChargeSum,0);
 assert(info.entries[0].source.links.length);if(!blocked)assert.equal(o.fiscal.completeTotal,o.fiscal.baseAmount);}
});
for(const [name,text,known,places] of [
 ['queens','2 Queen Beds',true,4],['king-singles','1 King 2 Single Beds',true,4],
 ['and','One king-size bed and two twin beds',true,4],['comma','1 double bed, 2 single beds',true,4],
 ['or','2 double beds OR 4 single beds',false,null],['negation','2 queen beds; second bed unavailable',false,null],
 ['conditional','2 queen beds subject to availability',false,null],['uncertain','2 queen beds; bed configuration unknown',false,null],
 ['neutral','Standard Double Room; 2 double beds; breakfast not available',true,4],
 ['capacity-not-beds','Room for 4 guests',false,null],['sofa','1 king bed and 1 sofa bed',true,2],
] as const)test('CQ13 bounded English bed text: '+name,async()=>{
 const r=await exercise('13-'+name,(p:any,q:any)=>{if(commercial(q))rate(p).name='Private room; Private bathroom; '+text;
  if(q.kind==='HOTEL_DETAIL')delete p.data.rooms;});
 assert(r.normalization.offers.every((o:any)=>(o.sleeping.state==='KNOWN')===known));
 if(known)assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.documentedLowerBound===places));
 assert.equal(r.output.decision.status,known&&places===4?'usable':'abstained');
 if(name==='or')assert(r.observations.every((o:any)=>o.sleepingInterpretation.alternativeInventories.length===2&&o.sleepingInterpretation.inventory===null));
});
for(const [name,relation,beds,status] of [
 ['coherent-AND','AND',[{quantity:2,bedType:'Double bed'}],'usable'],
 ['coherent-OR','OR',[{quantity:2,bedType:'Double bed'},{quantity:4,bedType:'Single bed'}],'usable'],
 ['OR-not-AND','OR',[{quantity:1,bedType:'Double bed'},{quantity:2,bedType:'Single bed'}],'abstained'],
 ['complex','COMPLEX',[{quantity:2,bedType:'Double bed'}],'abstained'],
 ['negated-label','AND',[{quantity:2,bedType:'Double bed not available'}],'abstained'],
] as const)test('CQ14 mapped room relation is not invented: '+name,async()=>{
 const r=await exercise('14-'+name,(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL'){p.data.rooms[0].bedRelation=relation;p.data.rooms[0].bedTypes=beds;}});
 assert.equal(r.output.decision.status,status);assert(r.observations.every((o:any)=>o.mappedRoomAssessment.room.bedRelation===relation));
 assert(r.observations.every((o:any)=>o.mappedRoomAssessment.sources.length>=3));
});
test('CQ15 price mismatch and unresolved identifiers are distinct; metadata does not certify changed price',async()=>{
 const r=await exercise('15-separate-get',(p:any,q:any)=>{if(q.kind==='PREBOOK_GET'){rate(p).rateId='invented-new-id';rate(p).occupancyNumber=0;rate(p).paymentTypes=null;}if(q.kind==='PREBOOK')rate(p).paymentTypes=['SYNTHETIC_METHOD'];});
 assert.equal(r.output.decision.status,'abstained');for(const o of r.observations){assert.equal(o.commercialChange,null);assert.equal(o.retrievalComparison.commercial.status,'MATCH');
 assert.equal(o.retrievalComparison.commercialMetadata.status,'UNRESOLVED_DIFFERENCE');assert(o.fiscalByStage.PREBOOK.fiscal.priceQualification.fields.some((f:any)=>f.field==='price'&&f.parsed));}
});
test('CQ16 mixed contradictions retain all candidates and allow independent complete offers',async()=>{
 const r=await exercise('16-mixed',(p:any,q:any,i:number)=>{if(i===0&&q.kind==='HOTEL_DETAIL')p.data.rooms[0].maxOccupancy=2;});
 assert.equal(r.output.decision.status,'usable');assert.equal(r.output.candidates.length,3);
 const bad=r.observations.find((o:any)=>o.privateIdentity.hotelId==='invented-wire-property-0').alternativeId;
 const candidate=r.output.candidates.find((c:any)=>c.hotelId===bad);assert(!r.output.decision.portfolio.bestChoice.equivalentSolutionIds.includes(candidate.policy.solutionId));
});
test('CQ17 one candidate is not an engine abstention even after qualification repair',async()=>{
 const r=await exercise('17-single',undefined,1);assert.equal(r.status,'PREPARED_INSUFFICIENT_CANDIDATES');assert.equal(r.output,null);assert.equal(r.kernelCalls,0);assert.equal(r.policyCalls,0);
});
test('CQ18 tampered capture is refused, no preparation/policy from trusted-looking money',async()=>{
 const f=await at('tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs'),m=await at('scripts/liteapi-observation-diagnostic-v1.mjs');const r=f.documentaryCaptureFixture();
 r.capture.requests[0].response.body.sha256='0'.repeat(64);assert.throws(()=>m.prepareLiteApiProviderObservation(r),/CAPTURE_BINDING_OR_HASH/);
});
test('CQ19 explicit king versus queen contradiction is not hidden by equal place counts',async()=>{
 const r=await exercise('19-type-conflict',(p:any,q:any)=>{if(commercial(q))rate(p).name='Private room; Private bathroom; 2 King Beds';
 if(q.kind==='HOTEL_DETAIL')p.data.rooms[0].bedTypes=[{quantity:2,bedType:'Queen bed'}];});
 assert.equal(r.output.decision.status,'abstained');assert(r.observations.every((o:any)=>o.mappedRoomAssessment.sleepingConflict));
});
for(const [name,mutate] of [
 ['missing',(p:any)=>{p.data.rooms=[];}],['ambiguous',(p:any)=>{p.data.rooms.push(structuredClone(p.data.rooms[0]));}],
 ['wrong-property',(p:any)=>{p.data.rooms[0].hotelId='invented-other';}],['error',(p:any)=>{p.data.rooms[0].error={code:'invented-invalid-room'};}],
] as const)test('CQ20 mapped identity or semantic defect is not bypassed: '+name,async()=>{
 const r=await exercise('20-'+name,(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')mutate(p);});assert.equal(r.output.decision.status,'abstained');
 assert(r.normalization.offers.every((o:any)=>o.sleeping.state!=='KNOWN'));
});
test('CQ21 provider display order and labels cannot affect corrected decisions',async()=>{
 const a=await exercise('21-order-base'),b=await exercise('21-order-changed',(p:any,q:any)=>{if(q.kind==='SEARCH')p.data.reverse();if(q.kind==='HOTEL_DETAIL')p.data.name='Another invented neutral label';});
 const merit=(r:any)=>r.output.candidates.map((c:any)=>({cost:c.policy.totalCost,dimensions:c.policy.dimensions})).sort((x:any,y:any)=>x.cost-y.cost);
 assert.deepEqual(merit(a),merit(b));assert.deepEqual(a.output.decision.portfolio,b.output.decision.portfolio);
});
test('CQ22 arrival directions are retained, not misclassified as an unknown fee',async()=>{
 const r=await exercise('22-non-monetary',(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.hotelImportantInformation='Arrival directions: use the north entrance. Please note that the restaurant will only be open for dinner.';});
 assert.equal(r.output.decision.status,'usable');assert(r.observations.every((o:any)=>o.fiscal.importantInformation.entries.every((e:any)=>!e.blocking)));
});

for(const [name,text] of [
 ['deposit-fee','A fully refundable deposit and a mandatory cleaning fee are required.'],
 ['breakfast-tax','Optional breakfast costs EUR 18 and a city tax applies.'],
 ['pets-service','Pets incur EUR 19 per night and a service charge applies.'],
] as const)test('CQ23 an extra cannot hide a second charge in the same condition: '+name,async()=>{
 const r=await exercise('23-'+name,(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.hotelImportantInformation=text;});
 assert.equal(r.output.decision.status,'abstained');for(const o of r.observations){assert.equal(o.fiscal.importantInformation.original,text);
 assert(o.fiscal.importantInformation.entries.some((e:any)=>e.blocking));assert.equal(o.fiscal.importantInformation.automaticChargeSum,0);}
});
