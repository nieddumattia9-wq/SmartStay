import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const load=new Function('p','return import(p)') as(p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const rates=(text:string)=>(p:any)=>p.data.forEach((h:any)=>h.roomTypes.forEach((o:any)=>o.rates[0].name=text));
async function examine(text:string,where='detail',options:any={}){
 const fixture=await at('tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs');
 const comparison=await at('scripts/liteapi-room-detail-comparison-v1.mjs');
 const x=fixture.hotelDetailFixture({count:2,...options,...(where==='detail'?{mutateDetail:(p:any)=>{options.mutateDetail?.(p);p.data.rooms[0].description=text;}}:{mutateRates:(p:any)=>{options.mutateRates?.(p);rates(text)(p);}})});
 const before=JSON.stringify(x),result=comparison.compareHotelDetailCapture(x.source,x.capture);
 assert.equal(JSON.stringify(x),before);assert.deepEqual(comparison.compareHotelDetailCapture(x.source,x.capture),result);
 assert.equal(result.engineInvocations,0);assert.equal(result.policyInvocations,0);
 for(const o of result.offers){assert.equal(o.priceOrExpiryChanged,false);assert.equal(o.bookabilityCertified,false);assert.equal(o.commercialObservationsRefreshed,false);}
 return {result,x};
}
const projection=(r:any)=>r.offers.map((o:any)=>({compatibility:o.compatibility,capacityStatus:o.capacityStatus,bedStatus:o.bedStatus,sleeping:o.sleepingAssessment.status,agreement:o.bedSourceAgreement}));
const complete='Suite: two double beds';
const presentations=[
 '<div class="room"><p><strong>Suite: two double beds</strong></p><p class="accessory">Iron available on request</p></div>',
 '<ul class="amenities"><li>Suite: two double beds</li><li>Iron available on request</li></ul>',
 '<section><p data-extra="not a fact">Suite: <span style="font-weight: bold">two double beds</span></p><div>Iron available on request</div></section>',
 '<p>Suite: two&nbsp;double&#32;beds</p><p>Iron available on request</p>',
 '<div>Suite: two dou<strong>ble</strong> beds<br />Iron available on request</div>',
];
for(const [index,text] of presentations.entries())test('R02-01 common presentation is equivalent end-to-end '+index,async()=>{
 const plain=await examine(complete+'; Iron available on request'),html=await examine(text);
 assert.equal(html.result.assessableCount,2);assert.deepEqual(projection(html.result),projection(plain.result));
 for(const o of html.result.offers){assert.equal(o.mappedRoom.description,text);assert.equal(o.conditionAssessment.conditions.description,text);
  for(const e of o.conditionAssessment.entries.filter((e:any)=>e.field==='description'))assert.equal(text.slice(e.start,e.end),e.originalFragment);
 }
});
for(const text of ['Suite: <b>two double beds</b>','<div class="rate">Suite: two double beds</div>','<span title="4 > 3">Suite: two double beds</span>'])
 test('R02-02 rate-name presentation does not create a false unknown '+text,async()=>{
  const plain=await examine(complete,'rate'),html=await examine(text,'rate');assert.deepEqual(projection(html.result),projection(plain.result));
  for(const o of html.result.offers){assert.equal(o.sleeping.originalText,text);assert.equal(o.sleeping.presentation.originalText,text);assert.equal(o.originalRate.name,text);}
 });
for(const [plain,html] of [
 ['Iron; on request','<p class="a">Iron</p><p>on request</p>'],
 ['Breakfast; unknown','<div>Breakfast</div><div>unknown</div>'],
 ['WiFi; subject to availability','<ul><li>WiFi</li><li>subject to availability</li></ul>'],
])for(const where of ['detail','rate'])test('R02-03 explicitly scoped accessory uncertainty does not become bed uncertainty '+where+' '+plain,async()=>{
 for(const text of [plain,html]){const {result}=await examine(text,where);assert.equal(result.assessableCount,2);
  assert(result.offers.every((o:any)=>(where==='detail'?o.conditionAssessment:o.rateConditionAssessment).entries.some((e:any)=>e.kind==='ACCESSORY_CONDITION_OR_UNCERTAINTY'&&!e.blocking)));
 }
});
for(const text of [
 '<p>Suite: two double beds</p><p class="warning">Second bed not available</p>',
 '<ul><li>Suite: two double beds</li><li>Beds on request</li></ul>',
 '<div>Suite: two double beds</div><div>not guaranteed</div>',
 '<p>Suite: two double beds</p><span>Bed allocation unconfirmed</span>',
 '<p>Suite: two double beds</p><p style="display:none">Beds not available</p>',
 '<p>Suite: two double beds</p><p>Beds n<strong>ot</strong> available</p>',
 '<p>Suite: two double beds</p><p>Beds &#110;ot available</p>',
 '<p>Suite: two double beds</p><p>Extra beds on request and standard beds not guaranteed</p>',
])for(const where of ['rate','detail'])test('R02-04 real bed qualification retained '+where+' '+text,async()=>{
 const {result}=await examine(text,where);assert.equal(result.assessableCount,0);assert(result.offers.every((o:any)=>o.sleepingAssessment.status!=='SATISFIED'));
});
for(const text of ['<p>on request</p>','<div>Unknown arrangement</div><p>on request</p>',
 '<p>Breakfast; second bed not available</p>','<p>Iron</p><p>Suite: two double beds</p><p>on request</p>'])
 test('R02-05 uncertain referent or actual bed referent cannot be assigned to accessories '+text,async()=>{
  const {result}=await examine(text);assert.equal(result.assessableCount,0);
 });
for(const text of ['<custom>Suite: two double beds</custom>','<p>Suite: two double beds',
 '<p><b>Suite: two double beds</p></b>','<script>globalThis.__R02_EXECUTED=true</script><p>Suite: two double beds</p>',
 '<style>.x{display:none}</style><p>Suite: two double beds</p>','<template>Suite: two double beds</template>',
 '<span onclick="globalThis.__R02_EXECUTED=true">Suite: two double beds</span>',
 '<p>Suite: two &missing;double beds</p>'])test('R02-06 unsupported active or malformed markup is not silently certified '+text,async()=>{
 const {result}=await examine(text);assert.equal(result.assessableCount,0);
 assert.equal((globalThis as any).__R02_EXECUTED,undefined);
 assert(result.offers.every((o:any)=>o.conditionAssessment.presentations.some((p:any)=>!p.supported)));
});
test('R02-07 OR stays OR in presentation and real mismatch still conflicts',async()=>{
 const alternatives=await examine('<p>Suite: two double beds or four single beds</p>');
 assert(alternatives.result.offers.every((o:any)=>o.bedStatus==='ALTERNATIVES_NOT_ASSIGNED'));
 const mismatch=await examine('<p>Suite: four single beds</p>');assert.equal(mismatch.result.conflictingCount,2);
});
test('R02-08 unknown sofa places are not created by HTML',async()=>{
 const {result}=await examine('<p>One sofa bed</p>');assert.equal(result.assessableCount,0);assert.equal(result.conflictingCount,2);
});
test('R02-09 trace of decoded entities does not execute encoded markup',async()=>{
 const helper=await at('scripts/room-presentation-text-v1.mjs');
 const text='<p data-source="ignored">Price &lt; 100 &amp; breakfast &#x6f;n request</p>';
 const result=helper.interpretRoomPresentation(text);assert.equal(result.originalText,text);
 assert.equal(result.text,'Price < 100 & breakfast on request');assert.equal(result.executedMarkup,false);
 assert.equal(result.attributesUsedAsFacts,false);assert.equal(result.fragments[0].originalFragment,text.slice(result.fragments[0].start,result.fragments[0].end));
});
test('R02-10 scenario and provider metadata do not select the interpretation',async()=>{
 const options={scenario:{destination:'Invented Quartz Harbour',adults:4,childAges:[],currency:'NZD',guestNationality:'NZ',budget:1900}};
 const a=await examine(complete+'; Breakfast; unknown','detail',options),b=await examine('<div>'+complete+'</div><p>Breakfast</p><p>unknown</p>','detail',options);
 assert.equal(a.result.assessableCount,2);assert.deepEqual(projection(a.result),projection(b.result));
});
for(const [count,type] of [[3,'Single'],[3,'Double'],[4,'Single']] as const)test('R02-11 representation equivalence retains actual quantities '+count+' '+type,async()=>{
 const inventory=count+' '+type.toLowerCase()+' beds',options={scenario:{adults:3,childAges:[]},mutateRates:rates('Neutral suite'),
  mutateDetail:(p:any)=>p.data.rooms[0].bedTypes=[{quantity:count,bedType:type+' bed'}]};
 const plain=await examine(inventory,'detail',options),html=await examine('<section><p class="inventory">'+count+' <b>'+type.toLowerCase()+'</b> beds</p></section>','detail',options);
 assert.equal(plain.result.assessableCount,2);assert.deepEqual(projection(html.result),projection(plain.result));
});
test('R02-12 accessory scope does not cross original fields or array members',async()=>{
 const helper=await at('scripts/liteapi-mapped-bed-conditions-v1.mjs');
 for(const room of [{name:'Iron',remarks:'on request'},{remarks:['Iron','on request']}]){
  const result=helper.qualifyMappedBedConditions(room);assert.equal(result.unresolved,true);
  assert(result.entries.some((e:any)=>e.kind==='UNRESOLVED_BED_QUALIFICATION'));
 }
});
test('R02-13 overlong or repeatedly malformed tags are bounded and stay uncertain',async()=>{
 const helper=await at('scripts/room-presentation-text-v1.mjs');
 for(const text of ['<p class="'+'x'.repeat(4200)+'">Beds not available</p>',('<p"').repeat(2000)+'Beds not available']){
  const result=helper.interpretRoomPresentation(text);assert.equal(result.supported,false);assert.equal(result.originalText,text);
  assert.equal(result.limits.maximumTagLength,4096);assert(result.issues.length>0);
 }
});
for(const newline of ['\n','\r\n'])for(const where of ['rate','detail'])test('R02-14 plain line boundaries equal presentation blocks '+JSON.stringify(newline)+' '+where,async()=>{
 const plain=await examine('two double beds'+newline+'Iron on request',where),html=await examine('<p>two double beds</p><p>Iron on request</p>',where);
 assert.equal(plain.result.assessableCount,2);assert.deepEqual(projection(plain.result),projection(html.result));
 const restriction=await examine('two double beds'+newline+'Beds on request',where);assert.equal(restriction.result.assessableCount,0);
});
test('R02-15 HTML source-code whitespace is not invented as a semantic block',async()=>{
 const plain=await examine('Suite: two double beds'),html=await examine('<p>Suite:\n two\n double beds</p>');
 assert.deepEqual(projection(plain.result),projection(html.result));
});
test('R02-16 equivalent duplicate mapped-room presentations retain all originals without false conflict',async()=>{
 const fixture=await at('tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs'),comparison=await at('scripts/liteapi-room-detail-comparison-v1.mjs');
 const x=fixture.hotelDetailFixture({count:2,mutateDetail:(p:any)=>{
  p.data.rooms[0].description='Suite: two double beds; Iron on request';
  p.data.rooms.push({...p.data.rooms[0],description:'<p>Suite: two double beds</p><p>Iron on request</p>'});
 }}),before=JSON.stringify(x),result=comparison.compareHotelDetailCapture(x.source,x.capture);
 assert.equal(result.assessableCount,2);assert.equal(JSON.stringify(x),before);
 for(const o of result.offers){assert.equal(o.duplicateEquivalentCount,2);assert.equal(o.mappedRoomObservations.length,2);
  assert.equal(o.mappedRoomObservations[0].original.description,'Suite: two double beds; Iron on request');
  assert.equal(o.mappedRoomObservations[1].original.description,'<p>Suite: two double beds</p><p>Iron on request</p>');
 }
 x.capture.records.forEach((r:any)=>{const p=JSON.parse(Buffer.from(r.response.response.body.base64,'base64').toString());p.data.rooms.reverse();r.response.response.body=fixture.packDetailFixture(p);});
 assert.deepEqual(projection(comparison.compareHotelDetailCapture(x.source,x.capture)),projection(result));
});
for(const description of ['<p>Suite: two double beds</p><p>Beds on request</p>',
 '<p>Suite: two double beds</p><p>Iron NOT available</p>',
 '<custom>Suite: two double beds; Iron on request</custom>'])test('R02-17 duplicate real conditions or unknown presentation do not become equivalent '+description,async()=>{
 const fixture=await at('tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs'),comparison=await at('scripts/liteapi-room-detail-comparison-v1.mjs');
 const x=fixture.hotelDetailFixture({count:2,mutateDetail:(p:any)=>{p.data.rooms[0].description='Suite: two double beds; Iron on request';p.data.rooms.push({...p.data.rooms[0],description});}});
 const result=comparison.compareHotelDetailCapture(x.source,x.capture);assert.equal(result.conflictingCount,2);
 assert(result.offers.every((o:any)=>o.status==='DUPLICATE_MAPPED_ROOM_CONFLICT'));
});
