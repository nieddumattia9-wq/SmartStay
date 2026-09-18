import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const load=new Function('p','return import(p)') as(p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
async function examine(options:any={}){
 const fixture=await at('tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs');
 const comparison=await at('scripts/liteapi-room-detail-comparison-v1.mjs');
 const x=fixture.hotelDetailFixture({count:2,...options}),before=JSON.stringify(x);
 const result=comparison.compareHotelDetailCapture(x.source,x.capture);
 assert.equal(JSON.stringify(x),before,'pure comparison preserves exact synthetic inputs');
 assert.deepEqual(comparison.compareHotelDetailCapture(x.source,x.capture),result,'deterministic repeat');
 assert.equal(result.engineInvocations,0);assert.equal(result.policyInvocations,0);
 assert.equal(result.commercialObservationsRefreshed,false);
 for(const o of result.offers){assert.equal(o.bookabilityCertified,false);assert.equal(o.priceOrExpiryChanged,false);}
 return {result,x,comparison};
}
const rates=(mutate:(r:any)=>void)=>(p:any)=>p.data.forEach((h:any)=>h.roomTypes.forEach((o:any)=>mutate(o.rates[0])));
const compatible='COMPATIBLE_OBSERVATIONS_NOT_COMMERCIAL_CERTIFICATION';

test('HD-R1-01 complete unchanged control remains assessable without commercial promotion',async()=>{
 const {result}=await examine();assert.equal(result.assessableCount,2);assert.equal(result.conflictingCount,0);
});
for(const [rate,mapped] of [[4,5],[5,4],[6,7]])test(`HD-R1-02 different sufficient maxima ${rate}/${mapped} are not occupancy incompatibility`,async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.maxOccupancy=rate),mutateDetail:(p:any)=>p.data.rooms[0].maxOccupancy=mapped});
 for(const o of result.offers){assert.equal(o.capacityStatus,'COMPATIBLE');assert.equal(o.compatibility,compatible);assert.equal(o.mappedComparison.capacityConflict,false);
  assert.equal(o.capacities.rate,rate);assert.equal(o.capacities.mapped,mapped);assert(!o.issues.includes('RATE_MAPPED_ROOM_CAPACITY_CONFLICT'));
  assert.equal(o.mappedComparison.capacityAssessment.sourceAgreement,'DIFFERENT_LIMITS');assert.equal(o.partyCapacityStatus,'SATISFIED');
  const checks=o.mappedComparison.capacityAssessment.checks.filter((c:any)=>c.field==='maxOccupancy');assert.equal(checks.length,2);assert(checks.every((c:any)=>c.status==='SATISFIED'));}
});
for(const [rate,mapped] of [[3,5],[5,3],[3,3]])test(`HD-R1-03 insufficient applicable maximum ${rate}/${mapped} remains blocking`,async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.maxOccupancy=rate),mutateDetail:(p:any)=>p.data.rooms[0].maxOccupancy=mapped});
 assert(result.offers.every((o:any)=>o.capacityStatus==='CONFLICTING'&&o.compatibility==='CONFLICTING'&&o.partyCapacityStatus==='INSUFFICIENT'));
});
for(const field of ['maxAdults','maxChildren'])for(const location of ['rate','mapped'])test(`HD-R1-04 ${location} ${field} checked independently`,async()=>{
 const {result}=await examine(location==='rate'?{mutateRates:rates(r=>r[field]=1)}:{mutateDetail:(p:any)=>p.data.rooms[0][field]=1});
 assert(result.offers.every((o:any)=>o.capacityStatus==='CONFLICTING'&&o.compatibility==='CONFLICTING'&&o.partyCapacityStatus==='INSUFFICIENT'));
 for(const o of result.offers){const check=o.mappedComparison.capacityAssessment.checks.find((c:any)=>c.origin===(location==='rate'?'RATE':'MAPPED_ROOM')&&c.field===field);assert.equal(check.original,1);assert.equal(check.status,'INSUFFICIENT');}
});
for(const location of ['rate','mapped'])for(const value of [-1,1.5,'4',null])test(`HD-R1-05 ${location} unsupported maximum ${JSON.stringify(value)} remains unknown`,async()=>{
 const {result}=await examine(location==='rate'?{mutateRates:rates(r=>r.maxOccupancy=value)}:{mutateDetail:(p:any)=>p.data.rooms[0].maxOccupancy=value});
 assert(result.offers.every((o:any)=>o.capacityStatus==='UNKNOWN'&&o.compatibility==='PARTIALLY_ASSESSABLE'&&!o.mappedComparison.capacityConflict));
});
for(const field of ['maxAdults','maxChildren'])test(`HD-R1-06 malformed rate ${field} is not silently usable`,async()=>{
 const {result}=await examine({mutateRates:rates(r=>r[field]='many')});assert(result.offers.every((o:any)=>o.compatibility==='PARTIALLY_ASSESSABLE'));
});
for(const title of ['Neutral suite','FAMILY 4 PAX','KING TWO BEDROOM SUITE'])test(`HD-R1-07 generic title does not erase structured assigned beds: ${title}`,async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name=title)});
 for(const o of result.offers){assert.equal(o.compatibility,compatible);assert.equal(o.sleeping.inventory,null);assert.equal(o.mappedComparison.roomInventories[0].beds[0].count,2);assert.equal(o.sleepingAssessment.status,'SATISFIED');}
});
test('HD-R1-08 unqualified unknown bed clause is not a generic title',async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Suite with mystical beds')});assert(result.offers.every((o:any)=>o.compatibility==='PARTIALLY_ASSESSABLE'));
});
for(const text of ['Extra beds on request','No extra beds available','Pets allowed; Extra beds on request'])test(`HD-R1-09 extra beds condition does not invalidate adequate assigned base beds: ${text}`,async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description=text});assert(result.offers.every((o:any)=>o.compatibility===compatible));
});
for(const text of ['Beds on request','Second bed not available','Bed allocation unknown','on request'])test(`HD-R1-10 main bed qualification remains unresolved: ${text}`,async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description=text});assert(result.offers.every((o:any)=>o.compatibility!==compatible&&o.issues.includes('MAPPED_BED_CONDITIONS_REQUIRE_QUALIFICATION')));
});
test('HD-R1-11 unrelated description does not qualify beds',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description='Breakfast on request; City view; WiFi not available'});assert.equal(result.assessableCount,2);
});
test('HD-R1-12 agreeing inventory can still be insufficient for the party',async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Suite: one double bed'),mutateDetail:(p:any)=>p.data.rooms[0].bedTypes=[{quantity:1,bedType:'Double bed'}]});
 assert(result.offers.every((o:any)=>o.compatibility!==compatible));
 assert(result.offers.every((o:any)=>!o.mappedComparison.sleepingConflict),'insufficient places are not disagreement between sources');
 assert(result.offers.every((o:any)=>o.sleepingAssessment.status==='INSUFFICIENT'));
});
for(const type of ['Sofa bed','Bunk bed'])test(`HD-R1-13 unquantified ${type} places are not invented`,async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Neutral suite'),mutateDetail:(p:any)=>p.data.rooms[0].bedTypes=[{quantity:1,bedType:type}]});assert(result.offers.every((o:any)=>o.compatibility==='PARTIALLY_ASSESSABLE'));
});
test('HD-R1-14 sufficient lower bound survives additional unquantified sofa',async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Neutral suite'),mutateDetail:(p:any)=>p.data.rooms[0].bedTypes.push({quantity:1,bedType:'Sofa bed'})});assert.equal(result.assessableCount,2);
});
test('HD-R1-15 OR configurations stay unassigned and are never summed',async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Neutral suite'),mutateDetail:(p:any)=>{p.data.rooms[0].bedRelation='OR';p.data.rooms[0].bedTypes=[{quantity:2,bedType:'Double bed'},{quantity:4,bedType:'Single bed'}];}});
 assert(result.offers.every((o:any)=>o.bedStatus==='ALTERNATIVES_NOT_ASSIGNED'&&o.compatibility==='PARTIALLY_ASSESSABLE'));
});
test('HD-R1-16 true differing explicit bed configurations remain conflicting',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].bedTypes=[{quantity:4,bedType:'Single bed'}]});assert(result.offers.every((o:any)=>o.bedStatus==='CONFLICTING'&&o.mappedComparison.sleepingConflict));
});
test('HD-R1-17 real rate restriction is not overridden by structured inventory',async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Suite: two double beds; second bed not available')});assert.equal(result.assessableCount,0);
});
test('HD-R1-18 problem on one mapped room does not invalidate another offer',async()=>{
 const {result}=await examine({mutateDetail:(p:any,i:number)=>{if(i===0)p.data.rooms[0].maxOccupancy=3;}});assert.equal(result.assessableCount,1);assert.equal(result.conflictingCount,1);
});
test('HD-R1-19 equivalent order and irrelevant metadata do not affect semantic output',async()=>{
 const {result,x,comparison}=await examine();x.capture.records.reverse();assert.deepEqual(comparison.compareHotelDetailCapture(x.source,x.capture),result);
 const changed=await examine({mutateDetail:(p:any)=>{p.data.marketing={ignored:true};p.data.rooms[0].bedTypes[0].irrelevant='ignored';}});
 assert.deepEqual(changed.result.offers.map((o:any)=>[o.compatibility,o.capacityStatus,o.bedStatus]),result.offers.map((o:any)=>[o.compatibility,o.capacityStatus,o.bedStatus]));
});
test('HD-R1-20 independent adult-only scenario is evaluated by its actual required counts',async()=>{
 const {result}=await examine({scenario:{destination:'Invented Cedar Point',adults:3,childAges:[],budget:1100},mutateRates:rates(r=>{r.maxOccupancy=3;r.maxAdults=3;r.maxChildren=0;r.name='Studio: three single beds';}),mutateDetail:(p:any)=>{Object.assign(p.data.rooms[0],{maxOccupancy:4,maxAdults:4,maxChildren:0,bedTypes:[{quantity:3,bedType:'Single bed'}]});}});assert.equal(result.assessableCount,2);
});
test('HD-R1-21 HTML presentation and equivalent plaintext retain scoped conditions',async()=>{
 const clauses=['Suite: two double beds','Bed sheets provided','Iron available on request','Extra beds on request'];
 const a=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description=clauses.map(t=>'<p>'+t+'</p>').join('')});
 const b=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description=clauses.join('; ')});
 for(const result of [a.result,b.result])assert.equal(result.assessableCount,2);
 assert.deepEqual(a.result.offers.map((o:any)=>[o.compatibility,o.capacityStatus,o.bedStatus,o.sleepingAssessment.status]),b.result.offers.map((o:any)=>[o.compatibility,o.capacityStatus,o.bedStatus,o.sleepingAssessment.status]));
});
test('HD-R1-22 explicit unit bed count concordance does not manufacture a type or extra places',async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Neutral suite'),mutateDetail:(p:any)=>p.data.rooms[0].description='The unit offers 2 beds.'});
 assert.equal(result.assessableCount,2);assert(result.offers.every((o:any)=>o.sleeping.inventory===null&&o.sleepingAssessment.status==='SATISFIED'));
});
test('HD-R1-23 conflicting explicit unit bed count remains a real discrepancy',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description='The unit offers 3 beds.'});assert(result.offers.every((o:any)=>o.bedStatus==='CONFLICTING'&&o.compatibility==='CONFLICTING'));
});
test('HD-R1-24 bed count without types or assigned inventory cannot supply places',async()=>{
 const {result}=await examine({mutateRates:rates(r=>r.name='Neutral suite'),mutateDetail:(p:any)=>{delete p.data.rooms[0].bedTypes;p.data.rooms[0].description='The unit offers 2 beds.';}});
 assert(result.offers.every((o:any)=>o.compatibility==='PARTIALLY_ASSESSABLE'&&o.sleepingAssessment.status==='UNKNOWN'));
});
test('HD-R1-25 mixed extra-bed mention cannot hide a restriction on main beds',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description='Extra beds on request and standard beds not guaranteed'});assert.equal(result.assessableCount,0);
});
test('HD-R1-26 equality of maxima does not prove unavailable individual limits',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{delete p.data.rooms[0].maxAdults;delete p.data.rooms[0].maxChildren;}});
 for(const o of result.offers){assert.equal(o.mappedComparison.capacityAssessment.sourceAgreement,'EQUAL_LIMITS');const checks=o.mappedComparison.capacityAssessment.checks.filter((c:any)=>c.field!=='maxOccupancy');assert(checks.every((c:any)=>c.status==='UNKNOWN'));}
});
test('HD-R1-27 original source mismatch is still rejected before new comparison semantics',async()=>{
 const {x,comparison}=await examine();x.source.offers[0].rate.maxOccupancy=9;assert.throws(()=>comparison.compareHotelDetailCapture(x.source,x.capture),/SOURCE/);
});
for(const [kind,capacityState] of [['different-sufficient','KNOWN'],['rate-insufficient','CONFLICTING'],['rate-adults-insufficient','CONFLICTING'],['rate-limit-invalid','UNKNOWN']] as const)
 test('HD-R1-28 shared qualifier reaches legacy pure preparation: '+kind,async()=>{
  const fixture=await at('tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs');
  const adapter=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
  const request=fixture.documentaryCaptureFixture({count:2,mutate:(p:any,q:any)=>{
   if(q.kind==='HOTEL_DETAIL')p.data.rooms[0].maxOccupancy=5;
   if(q.kind==='PREBOOK'||q.kind==='PREBOOK_GET'){
    const rate=p.data.roomTypes[0].rates[0];
    if(kind==='rate-insufficient')rate.maxOccupancy=3;
    if(kind==='rate-adults-insufficient')rate.maxAdults=1;
    if(kind==='rate-limit-invalid')rate.maxAdults='many';
   }
  }}),original=JSON.stringify(request.capture),result=adapter.prepareLiteApiProviderObservation(request);
  assert.equal(result.engineInvocations,0);assert.equal(result.policyInvocations,0);assert.equal(result.decision,null);
  assert.equal(Object.hasOwn(result,'output'),false);assert.equal(JSON.stringify(request.capture),original);
  assert(result.normalization.offers.every((o:any)=>o.capacityGuests.state===capacityState));
  if(kind==='different-sufficient')assert(result.observations.every((o:any)=>o.mappedRoomAssessment.capacityAssessment.sourceAgreement==='DIFFERENT_LIMITS'));
 });
for(const text of ['All cots and extra beds are subject to availability.','Bed sheets are not available.'])test('HD-R1-29 accessory subject remains separate: '+text,async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description=text});assert.equal(result.assessableCount,2);
});
test('HD-R1-30 second-bed negation cannot be erased by an extra-bed mention',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description='The second bed is not available without an extra bed.'});assert.equal(result.assessableCount,0);
});
test('HD-R1-31 condition trace retains exact original fragments before HTML interpretation',async()=>{
 const helper=await at('scripts/liteapi-mapped-bed-conditions-v1.mjs');
 const original='<p><strong>Suite: two double beds</strong></p><p>Bed sheets provided</p><p>Extra beds on request</p>';
 const result=helper.qualifyMappedBedConditions({description:original});
 assert.equal(result.conditions.description,original);assert.equal(result.unresolved,false);
 for(const entry of result.entries){assert.equal(entry.field,'description');assert.equal(original.slice(entry.start,entry.end),entry.originalFragment);}
 assert(result.entries.some((e:any)=>e.kind==='SUPPORTED_BED_INVENTORY'));
 assert(result.entries.some((e:any)=>e.kind==='BEDDING_NOT_BED_INVENTORY'));
 assert(result.entries.some((e:any)=>e.kind==='EXTRA_BEDS_NOT_BASE_INVENTORY'));
});
test('HD-R1-32 unsupported markup cannot certify a condition',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description='<custom>Suite: two double beds</custom>'});assert.equal(result.assessableCount,0);
});
for(const [label,remarks] of [
 ['negation-scalar','Second bed not available'],['negation-array',['Second bed not available']],
 ['conditional-scalar','Beds on request'],['conditional-array',['Beds on request']],
 ['unknown-scalar','Bed allocation unknown'],['unknown-array',['Bed allocation unknown']],
 ['nontext',{bedAllocation:'not documented'}],['nested-nontext',['Breakfast included',{bedAllocation:'not documented'}]],
] as const)test('HD-R1-33 rate remarks cannot be overridden by mapped beds: '+label,async()=>{
 const {result}=await examine({mutateRates:rates(r=>{r.name='Neutral suite';r.remarks=structuredClone(remarks);})});
 assert.equal(result.assessableCount,0);
 for(const o of result.offers){assert.deepEqual(o.originalRate.remarks,remarks);assert.notEqual(o.sleepingAssessment.status,'SATISFIED');assert.notEqual(o.bedStatus,'COMPATIBLE');}
});
for(const [label,remarks] of [
 ['extra-scalar','Extra beds on request'],['extra-array',['No extra beds available']],
 ['unrelated-scalar','Breakfast on request'],['unrelated-array',['City view','WiFi not available']],
] as const)test('HD-R1-34 rate accessory or unrelated remarks do not invalidate assigned base beds: '+label,async()=>{
 const {result}=await examine({mutateRates:rates(r=>{r.name='Neutral suite';r.remarks=structuredClone(remarks);})});assert.equal(result.assessableCount,2);
 for(const o of result.offers)assert.deepEqual(o.originalRate.remarks,remarks);
});
