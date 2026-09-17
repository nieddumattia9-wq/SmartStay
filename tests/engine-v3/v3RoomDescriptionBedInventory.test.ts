import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// D-0065: pure preparation only. These invented descriptors and prices are not
// copies of any private observation. No engine/kernel/policy module is invoked.
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const commercial=(q:any)=>q.kind==='PREBOOK'||q.kind==='PREBOOK_GET';
async function prepare(description:string,options:{mappedBeds?:any[],capacity?:number}={}){
 const fixture=await at('tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs');
 const adapter=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
 const request=fixture.documentaryCaptureFixture({count:2,mutate:(p:any,q:any,i:number)=>{
  if(q.kind==='SEARCH')for(const [j,h] of p.data.entries()){
   h.roomTypes[0].offerRetailRate.amount=643+j*113;
   h.roomTypes[0].rates[0].retailRate.total[0].amount=643+j*113;
  }
  if(commercial(q)){
   p.data.price=643+i*113;
   const rate=p.data.roomTypes[0].rates[0];rate.retailRate.total[0].amount=p.data.price;
   rate.name=description;
  }
  if(q.kind==='HOTEL_DETAIL'){
   p.data.name='Synthetic D0065 Cedar Annex '+i;
   if(options.mappedBeds)p.data.rooms[0].bedTypes=options.mappedBeds;
   else delete p.data.rooms;
   if(options.capacity!==undefined&&p.data.rooms)p.data.rooms[0].maxOccupancy=options.capacity;
  }
 }});
 const before=JSON.stringify(request.capture);
 const result=adapter.prepareLiteApiProviderObservation(request);
 assert.equal(JSON.stringify(request.capture),before,'pure preparation must preserve authenticated source bytes');
 assert.deepEqual(adapter.prepareLiteApiProviderObservation(request),result,'identical input is deterministic');
 assert.equal(Object.hasOwn(result,'output'),false,'no engine output');
 assert.equal(result.engineInvocations,0);assert.equal(result.policyInvocations,0);assert.equal(result.decision,null);
 return result;
}

const initialCases=[
 ['suite-word-count','SUITE TWO DOUBLE BEDS','KNOWN',4],
 ['deluxe-numeric','Deluxe Room - 3 single beds','KNOWN',3],
 ['studio-conjunction','Studio with one queen bed and two twin beds','KNOWN',4],
 ['suffix-denomination','2 king beds - Executive Suite','KNOWN',4],
 ['unknown-count','KING TWO BEDROOM SUITE','UNKNOWN',null],
 ['capacity-only','FAMILY 4 PAX','UNKNOWN',null],
 ['request-qualified','SUITE TWO DOUBLE BEDS on request','UNKNOWN',null],
 ['alternative-inventory','Suite: two double beds OR four single beds','UNKNOWN',null],
] as const;
for(const [id,description,state,places] of initialCases)test('RDB initial '+id,async()=>{
 const result=await prepare(description);
 for(const offer of result.normalization.offers)assert.equal(offer.sleeping.state,state);
 if(places!==null)for(const offer of result.assessment.offers)
  assert.equal(offer.accommodation.sleeping.documentedLowerBound,places);
 if(id==='alternative-inventory')for(const o of result.observations)
  assert.equal(o.sleepingInterpretation.alternativeInventories.length,2,'OR branches are retained without addition');
});

const supported=[
 ['Suite TWO DOUBLE BEDS',4,'DOUBLE'],
 ['Superior room: three single beds',3,'SINGLE'],
 ['Junior Suite with one queen bed',2,'QUEEN'],
 ['  Studio ( one super-king bed + two twin beds )!  ',4,'SUPER-KING'],
 ['Five single beds - Classic Apartment',5,'SINGLE'],
 ['STANDARD ROOM, 2 QUEEN BEDS.',4,'QUEEN'],
 ['Economy Studio 6 twin beds',6,'TWIN'],
 ['Executive Suite: 1 King 2 Single Beds',4,'KING'],
 ['Premium Room with one double bed and one bunk bed',2,'DOUBLE'],
 ['Family Suite (2 sofa beds)',0,'SOFA'],
] as const;
for(const [description,places,firstType] of supported)test('RDB bounded descriptor and source span: '+description,async()=>{
 const module=await at('scripts/liteapi-offer-qualification-v1.mjs');
 const result=module.qualifyEnglishRoomDescriptionBeds(description);
 assert.equal(result.status,'SUPPORTED');assert.equal(result.originalText,description);
 assert.equal(result.reason,'INVENTORY_WITH_COMPLETE_RECOGNIZED_ROOM_DENOMINATION');
 assert.equal(result.parsed.inventory.complete,false);
 assert.equal(result.parsed.inventory.beds[0].documentedType,firstType);
 assert.equal(result.parsed.inventory.beds.reduce((n:number,b:any)=>n+b.count*(b.placesPerBed??0),0),places);
 const span=result.interpretedSpan;
 assert.equal(description.slice(span.start,span.end),span.text,'exact original substring, not rewritten text');
 assert.deepEqual(module.normalizeEnglishBedInventory(span.text),result.parsed);
 const pieces=[span,...result.surroundingSpans].sort((a:any,b:any)=>a.start-b.start);
 assert.equal(pieces.map((p:any)=>p.text).join(''),description,'all original characters remain traceable');
 assert.equal(result.uninterpretedSpans.length,0);assert.equal(result.limits.completeInventoryCertified,false);
 assert.equal(result.limits.capacityUsedAsBedEvidence,false);assert.equal(result.limits.unknownSurroundingTextDiscarded,false);
});

for(const description of [
 'SUITE TWO DOUBLE BEDS on request','Suite two double beds not guaranteed',
 'Suite two double beds subject to availability','Suite two double beds may be provided',
 'Suite two double beds unavailable','Suite without two double beds','NOT Suite two double beds',
 'No Suite two double beds','Suite two double beds not included','Suite two double beds except on arrival',
 'Suite two double beds if available','Suite (two double beds on request)',
 'Suite two double beds (not guaranteed)','Suite (two double beds) on request',
 'Suite ((two double beds))','Suite two double beds (','Suite (two double beds',
 'KING TWO BEDROOM SUITE','Family 4 PAX','Suite for 6 guests','2-bedroom Suite',
 'One king two bedroom suite','Suite one king bedroom','Suite 2 double bedspreads',
 'Celestial Suite two double beds','Suite two double beds Aurora Edition',
 'Suite two double beds including extras','Suite two double beds breakfast included',
 'Suite 101 double beds','Suite zero double beds','Suite -1 double beds',
 'Suite 1.5 double beds','Suite 2 double beds and','Suite 2 double beds or',
 'Suite 2 double beds OR unknown','Suite 2 double beds / 4 single beds',
 'Suite two double beds or Family Room','Suite TWO DOUBLE BEDS!?',
 '1 double room','one single room','one king suite','2 twin rooms',
 'Suite one king OR two twin beds','one queen OR two single beds - Suite',
])test('RDB rejects unsupported surrounding meaning: '+description,async()=>{
 const module=await at('scripts/liteapi-offer-qualification-v1.mjs');
 const result=module.qualifyEnglishRoomDescriptionBeds(description);
 assert.equal(result.status,'UNSUPPORTED');assert.equal(result.parsed,null);assert.equal(result.interpretedSpan,null);
 assert.equal(result.originalText,description);assert.equal(result.uninterpretedSpans[0].text,description);
 assert.equal(result.reason,'NO_COMPLETE_BOUNDED_INVENTORY_AND_ROOM_DENOMINATION');
});

for(const description of [
 'Suite: one king bed OR two twin beds','Family Room (two double beds OR four single beds OR two queen beds)',
 'one super-king bed OR 2 single beds - Premium Suite',
])test('RDB alternatives keep branches and never sum them: '+description,async()=>{
 const module=await at('scripts/liteapi-offer-qualification-v1.mjs');
 const result=module.qualifyEnglishRoomDescriptionBeds(description);
 assert.equal(result.status,'SUPPORTED');assert.equal(result.parsed.relation,'OR');assert.equal(result.parsed.inventory,null);
 assert.equal(result.parsed.alternatives.length,description.split(/\s+OR\s+/).length);
 const prepared=await prepare(description);
 for(const o of prepared.observations){assert.equal(o.sleepingInterpretation.inventory,null);
  assert.equal(o.sleepingInterpretation.claimState,'UNKNOWN');
  assert.equal(o.sleepingInterpretation.alternativeInventories.length,result.parsed.alternatives.length);}
});

test('RDB exact full text and raw clauses survive pure preparation',async()=>{
 const description='  Private room ; Private bathroom;  SUITE ( TWO DOUBLE BEDS )  ; breakfast not available  ';
 const prepared=await prepare(description);
 for(const o of prepared.observations){const interpretation=o.sleepingInterpretation;
  assert.equal(interpretation.originalText,description);
  assert.equal(interpretation.clauses.map((c:any)=>c.originalText).join(';'),description);
  assert.equal(interpretation.claimState,'KNOWN');
  const clause=interpretation.clauses.find((c:any)=>c.kind==='SUPPORTED_INVENTORY');
  assert.equal(clause.englishInterpretation.originalText,'  SUITE ( TWO DOUBLE BEDS )  ');
  assert.equal(clause.englishInterpretation.interpretedSpan.text,'TWO DOUBLE BEDS');
 }
 for(const n of prepared.normalization.offers){assert.equal(n.sleeping.state,'KNOWN');assert(n.sleeping.links.length>0);}
});

for(const [qualification,state] of [
 ['second bed unavailable','CONFLICTING'],['not available','UNKNOWN'],['not guaranteed','UNKNOWN'],
 ['beds on request','UNKNOWN'],['bed configuration unknown','UNKNOWN'],
 ['without beds','CONFLICTING'],['two double beds OR four single beds','UNKNOWN'],
 ['no extra beds available','KNOWN'],['extra beds on request','KNOWN'],['breakfast not available','KNOWN'],
 ['not provided','UNKNOWN'],['not included','UNKNOWN'],['if available','UNKNOWN'],
 ['on request only','UNKNOWN'],['availability not guaranteed','UNKNOWN'],['no guarantee','UNKNOWN'],
 ['not always guaranteed','UNKNOWN'],['not included in this rate','UNKNOWN'],
 ['breakfast not included','KNOWN'],['no breakfast included','KNOWN'],
] as const)test('RDB whole description retains later qualification: '+qualification,async()=>{
 const prepared=await prepare('Suite two double beds; '+qualification);
 for(const n of prepared.normalization.offers)assert.equal(n.sleeping.state,state);
 for(const o of prepared.observations)assert.equal(o.sleepingInterpretation.clauses[1].text,qualification);
});

test('RDB explicit sufficient/insufficient lower bounds remain distinct from capacity',async()=>{
 const prepared=await prepare('Deluxe Room: 3 single beds');
 for(const n of prepared.normalization.offers){assert.equal(n.sleeping.state,'KNOWN');assert.equal(n.capacityGuests.value,4);}
 for(const o of prepared.assessment.offers){assert.equal(o.accommodation.sleeping.documentedLowerBound,3);
  assert.notEqual(o.accommodation.sleeping.status,'SATISFIED');}
});

for(const [name,description,beds,conflict] of [
 ['compatible','Suite two double beds',[{quantity:2,bedType:'Double bed'}],false],
 ['fewer-beds','Suite two double beds',[{quantity:1,bedType:'Double bed'}],true],
 ['different-specific-type','Suite two king beds',[{quantity:2,bedType:'Queen bed'}],true],
 ['generic-double','Suite two double beds',[{quantity:2,bedType:'Queen bed'}],false],
] as const)test('RDB mapped room comparison retains semantics: '+name,async()=>{
 const prepared=await prepare(description,{mappedBeds:[...beds]});
 for(const o of prepared.observations)assert.equal(o.mappedRoomAssessment.sleepingConflict,conflict);
 for(const n of prepared.normalization.offers)assert.equal(n.sleeping.state,conflict?'CONFLICTING':'KNOWN');
});

for(const label of ['Double bed not available','Double bed on request','Double beds - Suite','Double beds (Suite)'])
 test('RDB structured labels still require a whole strict bed type: '+label,async()=>{
  const prepared=await prepare('Suite two double beds',{mappedBeds:[{quantity:2,bedType:label}]});
  for(const o of prepared.observations)assert(o.mappedRoomAssessment.issues.includes('MAPPED_BED_CONFIGURATION_UNSUPPORTED'));
  for(const n of prepared.normalization.offers)assert.equal(n.sleeping.state,'UNKNOWN');
 });

test('RDB mapped capacity contradiction is independent of recognized inventory',async()=>{
 const prepared=await prepare('Suite two double beds',{mappedBeds:[{quantity:2,bedType:'Double bed'}],capacity:2});
 for(const o of prepared.observations){assert.equal(o.mappedRoomAssessment.capacityConflict,true);assert.equal(o.mappedRoomAssessment.sleepingConflict,false);}
 for(const n of prepared.normalization.offers){assert.equal(n.sleeping.state,'KNOWN');assert.equal(n.capacityGuests.state,'CONFLICTING');}
});

test('RDB strict normalizer contract and structured type vocabulary remain unchanged',async()=>{
 const module=await at('scripts/liteapi-offer-qualification-v1.mjs');
 for(const description of ['2 Queen Beds','One king-size bed and two twin beds','1 King 2 Single Beds','3 single beds, 1 double bed','1 super-king bed']){
  const strict=module.normalizeEnglishBedInventory(description);assert(strict);
  assert.deepEqual(module.qualifyEnglishRoomDescriptionBeds(description).parsed,strict);
  assert.deepEqual(Object.keys(strict),['relation','alternatives','inventory']);
  assert.equal(strict.inventory.complete,false);
 }
 assert.equal(module.normalizeEnglishBedInventory('Suite two double beds'),null);
 assert.equal(module.normalizeEnglishBedInventory('two double beds - Suite'),null);
 assert.equal(module.normalizeEnglishBedInventory('two double beds on request'),null);
 assert.equal(module.normalizeEnglishBedInventory('2 king beds OR 4 twin beds').inventory,null);
});

test('RDB unsupported input and bounded length retain explicit reasons',async()=>{
 const module=await at('scripts/liteapi-offer-qualification-v1.mjs');
 for(const input of [null,undefined,4,{description:'Suite two double beds'}]){
  const result=module.qualifyEnglishRoomDescriptionBeds(input);assert.equal(result.parsed,null);assert.equal(result.reason,'NOT_TEXT');
 }
 const description='Suite '+ ' '.repeat(1024)+'two double beds';
 const result=module.qualifyEnglishRoomDescriptionBeds(description);assert.equal(result.parsed,null);
 assert.equal(result.reason,'ROOM_DESCRIPTION_EXCEEDS_BOUNDED_LENGTH');assert.equal(result.originalText,description);
});

for(const qualification of ['on request','not guaranteed','if available','no guarantee'])
 test('RDB leading implicit qualification survives: '+qualification,async()=>{
  const prepared=await prepare(qualification+'; Suite two double beds');
  for(const n of prepared.normalization.offers)assert.equal(n.sleeping.state,'UNKNOWN');
  for(const o of prepared.observations)assert.equal(o.sleepingInterpretation.clauses[0].kind,'UNRESOLVED_BED_QUALIFICATION');
 });

test('RDB unrelated previous subject does not rebind its own qualification to beds',async()=>{
 const prepared=await prepare('breakfast; not available; Suite two double beds');
 for(const n of prepared.normalization.offers)assert.equal(n.sleeping.state,'KNOWN');
});

test('RDB repeated assertion is not additive inventory evidence',async()=>{
 const prepared=await prepare('Suite two double beds; two double beds');
 for(const o of prepared.assessment.offers)assert.equal(o.accommodation.sleeping.documentedLowerBound,4);
 for(const o of prepared.observations)assert.equal(o.sleepingInterpretation.inventoryComposition,'IDENTICAL_ASSERTIONS_NOT_ADDED');
});

test('RDB different semicolon inventories have no documented additive relation',async()=>{
 const prepared=await prepare('Suite one queen bed; two twin beds');
 for(const n of prepared.normalization.offers)assert.equal(n.sleeping.state,'UNKNOWN');
 for(const o of prepared.observations){assert.equal(o.sleepingInterpretation.inventory,null);
  assert.equal(o.sleepingInterpretation.inventoryComposition,'UNRESOLVED_BETWEEN_CLAUSES');
  assert.equal(o.sleepingInterpretation.observedInventories.length,2);}
});

for(const otherSubject of ['not including breakfast','not suitable for pets','not all rooms have air conditioning'])
 for(const leading of [true,false])test('RDB explicit other subject stays separate '+String(leading)+': '+otherSubject,async()=>{
  const description=leading?otherSubject+'; Suite two double beds':'Suite two double beds; '+otherSubject;
  const prepared=await prepare(description);
  for(const n of prepared.normalization.offers)assert.equal(n.sleeping.state,'KNOWN');
  for(const o of prepared.observations)assert(o.sleepingInterpretation.clauses.some((c:any)=>c.text===otherSubject&&c.kind==='OTHER_SUBJECT'));
 });
