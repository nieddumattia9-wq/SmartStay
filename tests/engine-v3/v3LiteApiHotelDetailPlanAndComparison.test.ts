import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const load=new Function('p','return import(p)') as(p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
async function modules(){return {p:await at('scripts/liteapi-hotel-detail-plan-v1.mjs'),c:await at('scripts/liteapi-room-detail-comparison-v1.mjs'),f:await at('tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs')};}
async function examine(options:any={}){const {p,c,f}=await modules(),x=f.hotelDetailFixture(options),original=JSON.stringify(x),result=c.compareHotelDetailCapture(x.source,x.capture);assert.equal(JSON.stringify(x),original);assert.deepEqual(c.compareHotelDetailCapture(x.source,x.capture),result);assert.equal(result.engineInvocations,0);assert.equal(result.policyInvocations,0);return {p,c,f,x,result};}

test('HD01 all variants remain separate and details are not eight independent properties',async()=>{
 const {x,result}=await examine({count:3,twoOffers:true});assert.equal(result.offerCount,6);assert.equal(result.propertyCount,3);assert.equal(result.assessableCount,6);
 assert.equal(result.commercialObservationsRefreshed,false);assert.equal(x.source.sourceCustodyRetentionRenewed,false);
 for(const o of result.offers){assert.equal(o.rateObservedAt,'2099-08-01T12:00:02.000Z');assert.equal(o.detailObservedAt,'2099-08-03T12:00:02.000Z');assert.equal(o.bookabilityCertified,false);assert.equal(o.capacityStatus,'COMPATIBLE');}
});
test('HD02 exact opaque hotel ID survives query encoding unchanged',async()=>{
 const {p,f}=await modules(),x=f.hotelDetailFixture({count:1,mutateRates:(v:any)=>{v.data[0].hotelId='opaque/+? &é';}}),q=p.detailsRequest(0,x.config);
 assert.equal(q.hotelId,'opaque/+? &é');assert.equal(new URLSearchParams(new URLSearchParams(q.query).toString()).get('hotelId'),q.hotelId);
 assert.equal(q.query.timeout,4);assert.equal(q.query.language,'en');assert.equal(p.validateDetailsRequest(q,0,x.config),true);
});
for(const [name,field,value] of [
 ['six requests','limits',{HOTEL_DETAIL:6,total:6}],['retry','retries',1],['redirect','redirects',1],['pagination','additionalPages',1],['pacing','pacingMs',999],['timeout','clientTimeoutMs',21000],['response bound','maximumResponseBytes',33554433],['host','host','example.invalid'],['provider timeout','providerTimeoutSeconds',12],['path','path','/v3.0/hotels/rates'],['language','language','automatic'],
] as const)test('HD03 reject profile mutation '+name,async()=>{const {p,f}=await modules(),x=f.hotelDetailFixture();(x.config.controls as any)[field]=value;assert.throws(()=>p.validateHotelDetailPlan(x.config,{synthetic:true}));});
test('HD04 sixth target and repeated/out of order requests are rejected',async()=>{
 const {p,f}=await modules();assert.throws(()=>f.hotelDetailFixture({count:6}),/SOURCE_TARGETS/);const x=f.hotelDetailFixture({count:5});assert.throws(()=>p.detailsRequest(5,x.config),/TARGET_INDEX/);assert.throws(()=>p.validateDetailsRequest(p.detailsRequest(1,x.config),0,x.config),/REQUEST_OUTSIDE/);
 const q=p.detailsRequest(0,x.config);q.kind='PREBOOK';assert.throws(()=>p.validateDetailsRequest(q,0,x.config),/REQUEST_OUTSIDE/);
});
test('HD05 source self-hash does not authorize changed targets or scenario',async()=>{
 const {p,f}=await modules();for(const mutate of [(x:any)=>x.config.targets.reverse(),(x:any)=>x.config.scenario.adults++,(x:any)=>x.config.caseId=x.source.caseId]){
  const x=f.hotelDetailFixture();mutate(x);assert.throws(()=>p.validateHotelDetailPlan(x.config,{synthetic:true}),/SOURCE_PLAN/);
 }
});
test('HD06 source body hash and exact scenario checked before binding',async()=>{
 const {c,f}=await modules();for(const mutate of [(x:any)=>x.authenticatedCoverage.records[0].response.response.body.sha256='0'.repeat(64),(x:any)=>x.authenticatedCoverage.records[0].request.body.occupancies[0].adults=3]){
  const x=f.hotelDetailFixture();mutate(x);assert.throws(()=>c.createHotelDetailSourceBinding(x.authenticatedCoverage,x.metadata),/SOURCE_RATE_SCENARIO|RESPONSE_INTEGRITY/);
 }
});
test('HD07 missing mapped room is valid missing evidence not a fresh retry',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms=[]});assert.equal(result.roomFoundCount,0);assert.ok(result.offers.every((o:any)=>o.status==='MAPPED_ROOM_NOT_FOUND'));
});
test('HD08 no rooms or empty metadata preserves field uncertainty',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{delete p.data.rooms[0].maxOccupancy;delete p.data.rooms[0].bedTypes;}});
 assert.ok(result.offers.every((o:any)=>o.capacityStatus==='UNKNOWN'&&o.bedStatus==='UNKNOWN'&&o.compatibility==='PARTIALLY_ASSESSABLE'));
});
test('HD09 wrong property identity or mapped room ownership cannot match',async()=>{
 const a=await examine({mutateDetail:(p:any)=>p.data.id='wrong'});assert.ok(a.result.offers.every((o:any)=>o.status==='DETAIL_UNUSABLE'));
 const b=await examine({mutateDetail:(p:any)=>p.data.rooms[0].hotelId='wrong'});assert.ok(b.result.offers.every((o:any)=>o.compatibility==='CONFLICTING'));
});
test('HD10 discordant duplicate room IDs are explicit conflict; unrelated offer survives',async()=>{
 const {result}=await examine({mutateDetail:(p:any,i:number)=>{if(i===0)p.data.rooms.push({...p.data.rooms[0],maxOccupancy:3});}});
 assert.equal(result.offers[0].status,'DUPLICATE_MAPPED_ROOM_CONFLICT');assert.equal(result.assessableCount,2);
});
test('HD11 equivalent duplicates and irrelevant extension data do not block',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{p.marketing={ignored:true};p.data.rooms.push({...p.data.rooms[0],marketingCaption:'A synthetic label'});}});
 assert.equal(result.assessableCount,3);assert.equal(result.offers[0].duplicateEquivalentCount,2);
});
for(const position of ['root','data'] as const)test('HD12 declared '+position+' error prevents use of matching IDs',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{(position==='root'?p:p.data).error={code:'SYNTHETIC_INVALID'};}});assert.ok(result.offers.every((o:any)=>o.status==='DETAIL_UNUSABLE'&&o.detail.classification==='PROVIDER_ERROR'));
});
test('HD13 original response alteration is rejected before interpretation',async()=>{
 const {c,f}=await modules(),x=f.hotelDetailFixture();x.capture.records[0].response.response.body.base64=Buffer.from('{}').toString('base64');assert.throws(()=>c.compareHotelDetailCapture(x.source,x.capture),/RESPONSE_INTEGRITY/);
});
test('HD14 party occupancy does not create beds or rooms',async()=>{
 // R1 separates an absent rate inventory from the documented mapped inventory.
 const {result}=await examine({mutateRates:(p:any)=>p.data.forEach((h:any)=>h.roomTypes[0].rates[0].name='FAMILY 4 PAX')});assert.ok(result.offers.every((o:any)=>o.bedStatus==='COMPATIBLE'&&o.sleeping.inventory===null&&o.sleepingAssessment.rateInventoryInferred===false));
});
test('HD15 bedrooms do not create beds',async()=>{
 const {result}=await examine({mutateRates:(p:any)=>p.data.forEach((h:any)=>h.roomTypes[0].rates[0].name='KING TWO BEDROOM SUITE')});assert.ok(result.offers.every((o:any)=>o.bedStatus==='COMPATIBLE'&&o.sleeping.inventory===null&&o.bedSourceAgreement==='RATE_INVENTORY_NOT_DOCUMENTED'));
});
for(const description of ['Suite: two double beds; second bed not available','Suite: two double beds on request','Suite: two double beds; bed allocation unknown'])test('HD16 scoped bed limitations retained '+description,async()=>{
 const {result}=await examine({mutateRates:(p:any)=>p.data.forEach((h:any)=>h.roomTypes[0].rates[0].name=description)});assert.ok(result.offers.every((o:any)=>o.bedStatus!=='COMPATIBLE'));
});
test('HD17 AND differs from OR, alternatives are not summed or assigned',async()=>{
 const {result}=await examine({mutateRates:(p:any)=>p.data.forEach((h:any)=>h.roomTypes[0].rates[0].name='Suite: two double beds OR four single beds'),mutateDetail:(p:any)=>{p.data.rooms[0].bedRelation='OR';p.data.rooms[0].bedTypes=[{quantity:2,bedType:'Double bed'},{quantity:4,bedType:'Single bed'}];}});
 assert.ok(result.offers.every((o:any)=>o.bedStatus==='ALTERNATIVES_NOT_ASSIGNED'&&o.sleeping.alternativeInventories.length===2));
});
test('HD18 disjoint explicit configurations and deficient capacity conflict',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{p.data.rooms[0].maxOccupancy=3;p.data.rooms[0].bedTypes=[{quantity:3,bedType:'Single bed'}];}});
 assert.ok(result.offers.every((o:any)=>o.compatibility==='CONFLICTING'&&o.capacityStatus==='CONFLICTING'&&o.bedStatus==='CONFLICTING'));
});
test('HD19 adult and child limits retained separately',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{p.data.rooms[0].maxAdults=1;p.data.rooms[0].maxChildren=1;}});assert.ok(result.offers.every((o:any)=>o.issues.includes('MAPPED_MAX_ADULTS_BELOW_PARTY')&&o.issues.includes('MAPPED_MAX_CHILDREN_BELOW_PARTY')));
});
test('HD20 shuffled detail records preserve per-offer semantic results',async()=>{
 const {c,x,result}=await examine();x.capture.records.reverse();assert.deepEqual(c.compareHotelDetailCapture(x.source,x.capture),result);
});
test('HD21 target selection is deterministic and source malformed IDs are not dropped',async()=>{
 const {f}=await modules();const a=f.hotelDetailFixture(),b=f.hotelDetailFixture({mutateRates:(p:any)=>p.data.reverse()});assert.deepEqual(a.config.targets.map((t:any)=>t.hotelId),b.config.targets.map((t:any)=>t.hotelId));
 assert.throws(()=>f.hotelDetailFixture({mutateRates:(p:any)=>delete p.data[0].roomTypes[0].rates[0].mappedRoomId}),/SOURCE_MAPPED/);
});
test('HD22 synthetic source cannot be relabeled production',async()=>{
 const {p,c,f}=await modules(),x=f.hotelDetailFixture();x.config.origin='LITEAPI_PRODUCTION';assert.throws(()=>p.validateHotelDetailPlan(x.config),/SOURCE_ORIGIN/);assert.throws(()=>c.verifyHotelDetailSourceFiles(x.source),/PRODUCTION_SOURCE_REQUIRED/);
});
test('HD23 D0067 bounded token-boundary delta preserves the historical extraction body',()=>{
 // Exact function body from committed 2005caed; hash is a relocation proof,
 // not a substitute for semantic fixtures. No Git checkout is needed at runtime.
 const after=readFileSync('scripts/liteapi-bed-description-v1.mjs','utf8').split('export function sleepingText')[1];
 // D0067 repairs the preexisting accented-token boundary in this one regex.
 // Reverse only that approved delta, then retain the original historical hash:
 // unrelated edits to the mechanically extracted function still fail this test.
 const currentBoundary=String.raw`secondo disponibilit[aà](?![\p{L}\p{M}\p{N}_])`;
 const historicalBoundary=String.raw`secondo disponibilit[aà]\b`;
 assert.equal(after.split(currentBoundary).length-1,1);
 const matchingLines=after.split('\n').filter(line=>line.includes('const implicitQualification='));
 assert.equal(matchingLines.length,1);
 const currentLine=matchingLines[0];
 assert.ok(currentLine.includes(currentBoundary));
 assert.match(currentLine,/\/iu;\r?$/);
 const historicalLine=currentLine.replace(currentBoundary,historicalBoundary).replace(/\/iu;(\r?)$/,'/i;$1');
 const historicalBody=after.replace(currentLine,historicalLine);
 assert.equal(createHash('sha256').update(('function sleepingText'+historicalBody).trim().replaceAll('\r\n','\n')).digest('hex'),'89bd8124661b83555f3dfcae37a755befb94ce24f4e9d9d1bbfa7716989bb124');
});
test('HD24 failed transport record remains readable without fabricated details',async()=>{
 const {c,f}=await modules(),x=f.hotelDetailFixture();x.capture.records[0].response.response=null;x.capture.records[0].response.outcome='FAILED';x.capture.records[0].response.failureClass='TIMEOUT';x.capture.journal.status='ABORTED';
 const result=c.compareHotelDetailCapture(x.source,x.capture);assert.equal(result.collectionStatus,'ABORTED');assert.equal(result.offers[0].status,'DETAIL_NOT_ACQUIRED');assert.equal(result.offers[0].failureClass,'TIMEOUT');assert.equal(result.assessableCount,2);
});
test('HD25 mapped-room conditional and contradictory descriptions do not disappear',async()=>{
 for(const text of ['Beds on request','on request','Two single beds']){
  const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].description=text});assert.ok(result.offers.every((o:any)=>o.compatibility!=='COMPATIBLE_OBSERVATIONS_NOT_COMMERCIAL_CERTIFICATION'));
 }
});
test('HD26 valid detail without rooms is missing evidence; malformed room container is unsupported',async()=>{
 const a=await examine({mutateDetail:(p:any)=>delete p.data.rooms});assert.ok(a.result.offers.every((o:any)=>o.status==='MAPPED_ROOM_NOT_FOUND'));
 const b=await examine({mutateDetail:(p:any)=>p.data.rooms={id:510}});assert.ok(b.result.offers.every((o:any)=>o.status==='DETAIL_UNUSABLE'&&o.detail.classification==='UNKNOWN_FORMAT'));
});
test('HD27 mapped room application error never contributes beds or capacity',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0].error={code:'SYNTHETIC_ROOM_INVALID'}});assert.ok(result.offers.every((o:any)=>o.status==='DETAIL_UNUSABLE'&&o.detail.reason==='DETAIL_ROOM_APPLICATION_ERROR'));
});
test('HD28 equivalent bed order and extra irrelevant bed IDs do not create duplicate conflict',async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{
  const room=p.data.rooms[0];room.bedTypes=[{quantity:2,bedType:'Double bed'},{quantity:1,bedType:'Single bed'}];
  p.data.rooms.push({...room,bedTypes:[...room.bedTypes].reverse().map((b:any)=>({...b,id:99}))});
 }});assert.equal(result.assessableCount,3);
});
test('HD29 mapped OR and COMPLEX never become an assigned AND inventory',async()=>{
 for(const relation of ['OR','COMPLEX']){const {result}=await examine({mutateDetail:(p:any)=>{p.data.rooms[0].bedRelation=relation;p.data.rooms[0].bedTypes=[{quantity:2,bedType:'Double bed'},{quantity:4,bedType:'Single bed'}];}});
  assert.equal(result.assessableCount,0);assert.ok(result.offers.every((o:any)=>o.compatibility==='PARTIALLY_ASSESSABLE'));
 }
});
test('HD30 failed response cannot contribute facts even with valid JSON body',async()=>{
 const {c,f}=await modules(),x=f.hotelDetailFixture();x.capture.records[0].response.outcome='FAILED';x.capture.records[0].response.failureClass='INTERRUPTED';x.capture.journal.status='ABORTED';
 const result=c.compareHotelDetailCapture(x.source,x.capture);assert.equal(result.offers[0].status,'DETAIL_REQUEST_FAILED');assert.equal(result.offers[0].failedBodyNotConsumed,true);assert.equal(Object.hasOwn(result.offers[0],'mappedRoom'),false);assert.equal(result.assessableCount,2);
});
for(const field of ['name','roomName'])test('HD31 mapped '+field+' bed facts and qualifications retained',async()=>{
 for(const text of ['Room: two single beds','Suite: two double beds on request']){
  const {result}=await examine({mutateDetail:(p:any)=>p.data.rooms[0][field]=text});
  assert.equal(result.assessableCount,0);assert.ok(result.offers.every((o:any)=>o.relevantConditions.some((c:any)=>c.text===text)));
 }
});
test('HD32 mapped name and structured inventory conflict even when the rate matches the structured beds',async()=>{
 const {result}=await examine({mutateRates:(p:any)=>p.data.forEach((h:any)=>h.roomTypes[0].rates[0].name='Suite: one queen bed'),
  mutateDetail:(p:any)=>{p.data.rooms[0].bedTypes=[{quantity:1,bedType:'Queen bed'}];p.data.rooms[0].roomName='Suite two double beds';}});
 assert.ok(result.offers.every((o:any)=>o.bedStatus==='CONFLICTING'&&o.mappedTextChecks.some((c:any)=>c.comparison.sleepingConflict)));
});
for(const limit of [-1,'four',1.5])test('HD33 invalid individual capacity limits remain UNKNOWN '+limit,async()=>{
 const {result}=await examine({mutateDetail:(p:any)=>{p.data.rooms[0].maxAdults=limit;p.data.rooms[0].maxChildren=limit;}});
 assert.ok(result.offers.every((o:any)=>o.capacityStatus!=='CONFLICTING'&&o.adultLimitStatus==='UNKNOWN'&&o.childLimitStatus==='UNKNOWN'));
});
