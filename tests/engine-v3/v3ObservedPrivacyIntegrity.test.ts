import assert from 'node:assert/strict';
import test from 'node:test';
import {privacyControl,reviewedPrivacy} from './fixtures/observedPrivacySyntheticV3';
for(const [name,amenities,unit,bath] of [
 ['shared bath','Camera privata; Bagno privato; Bagno condiviso','PRIVATE','CONFLICTING'],
 ['negative bath','Camera privata; Bagno privato; Bagno privato non disponibile','PRIVATE','CONFLICTING'],
 ['shared unit','Camera privata; Bagno privato; Camera condivisa','CONFLICTING','PRIVATE'],
])test('OPR before/after reviewed '+name,async()=>{
 const f=await reviewedPrivacy({amenities}),r=f.run(),c=r.output.candidates[0];
 console.log(JSON.stringify({synthetic:true,case:name,actual:{unit:c.suitability.facts.unitState,bath:c.suitability.facts.bathroomState,suitability:c.suitability.status},expected:{unit,bath}}));
 assert.equal(c.suitability.facts.unitState,unit);assert.equal(c.suitability.facts.bathroomState,bath);
});
test('OPR before/after property positive cannot erase selected room limits',async()=>{
 const f=await reviewedPrivacy({amenities:'Camera privata; Bagno privato; WiFi',roomAmenities:'Bagno privato non disponibile; WiFi non disponibile'}),r=f.run();
 const c=r.output.candidates[0],wifi=r.input.candidates[0].facts.find((f:any)=>f.code==='feature.wifi');
 console.log(JSON.stringify({synthetic:true,case:'offer limits',actual:{bath:c.suitability.facts.bathroomState,wifi:wifi?.value}}));
 assert.equal(c.suitability.facts.bathroomState,'NOT_PRIVATE');assert.equal(wifi.value,false);
});
for(const kind of ['CONFLICTING','NEGATIVE','POSITIVE'])test('OPR before/after structured '+kind,async()=>{
 const f=await privacyControl();for(const o of f.x.n.offers){Object.assign(o.privateBathroom,{state:kind==='CONFLICTING'?'CONFLICTING':'KNOWN',value:kind==='CONFLICTING'?null:kind==='POSITIVE'});
 if(kind==='POSITIVE')Object.assign(o.exclusiveUse,{state:'KNOWN',value:true});}
 if(kind==='POSITIVE')for(const s of f.request.syntheticSignals){s.roomText='Unit A';s.features=[];s.evidence=s.evidence.filter((e:any)=>!e.code.startsWith('feature.')&&!e.code.startsWith('accommodation.'));}
 const r=f.run(),c=r.output.candidates[0];
 console.log(JSON.stringify({synthetic:true,case:kind,actual:{decision:r.output.decision.status,bath:c.suitability.facts.bathroomState,unit:c.suitability.facts.unitState}}));
 if(kind==='POSITIVE'){assert.equal(c.suitability.facts.bathroomState,'PRIVATE');assert.equal(c.suitability.facts.unitState,'PRIVATE');assert.equal(c.suitability.facts.unitType,'unknown');assert.equal(r.output.decision.status,'usable');}
 else {assert.notEqual(c.suitability.facts.bathroomState,'PRIVATE');assert.equal(r.output.decision.status,'abstained');}
 assert.equal(f.x.n.party.requirements.privateBathroom,false);
});

for(const [text,expected]of [
 ['Private room without a private bathroom','NOT_PRIVATE'],
 ['Double room with no en suite bathroom','NOT_PRIVATE'],
 ['Private bathroom not available','NOT_PRIVATE'],
 ['Bagno privato su richiesta','UNKNOWN'],
 ['Bagno privato solo in alcune camere','UNKNOWN'],
 ['Some rooms have a private bathroom','UNKNOWN'],
 ['Bagno privato non documentato','UNKNOWN'],
 ['Bagno privato; Bagno condiviso','CONFLICTING'],
])test('OPR scoped offer polarity '+text,async()=>{
 const f=await reviewedPrivacy({amenities:'Camera privata; Bagno privato; WiFi',roomAmenities:text});const r=f.run();
 assert.equal(r.output.candidates[0].suitability.facts.bathroomState,expected);
 const record=r.output.candidates[0].suitability.facts.resolution[1].selected.find((s:any)=>s.sourceField==='roomAmenities');
 assert.equal(record.scope,'OFFER');assert.equal(record.original.value,text);assert.equal(record.offerScope.rateKey,f.n.offers[0].scope.rateKey);
 assert.equal(record.links[0].evidence[0].sha256,'a'.repeat(64));
});
test('OPR property limitation does not negate explicitly scoped positive room',async()=>{
 const f=await reviewedPrivacy({amenities:'Bagno condiviso; WiFi non disponibile',roomAmenities:'Camera privata; Bagno privato; WiFi'}),r=f.run();
 assert.equal(r.output.candidates[0].suitability.facts.bathroomState,'PRIVATE');assert.equal(r.input.candidates[0].facts.find((e:any)=>e.code==='feature.wifi').value,true);
});
for(const [text,availability,value]of [['WiFi','known',true],['WiFi non disponibile','known',false],['WiFi su richiesta','unknown',null],['WiFi; WiFi non disponibile','conflicting',null],['WiFi UNKNOWN','unknown',null]])
 test('OPR scoped service '+text,async()=>{
  const f=await reviewedPrivacy({amenities:'Camera privata; Bagno privato; WiFi; Aria condizionata',roomServices:text}),r=f.run(),facts=r.input.candidates[0].facts;
  const wifi=facts.find((e:any)=>e.code==='feature.wifi');assert.equal(wifi.value,value);assert.equal(wifi.availability,availability);
  assert.equal(facts.find((e:any)=>e.code==='feature.air-conditioning').value,true);
  const evaluated=r.output.candidates[0].calculated.comfort.features.find((e:any)=>e.featureCode==='wifi');
  assert.equal(evaluated.evidenceState,availability==='known'?value?'known-true':'known-false':availability);
 });
test('OPR no private room remains negative, not a documented dormitory',async()=>{
 const f=await reviewedPrivacy({amenities:'Camera privata; Bagno privato',roomAmenities:'No private room'}),c=f.run().output.candidates[0];
 assert.equal(c.suitability.facts.unitState,'NOT_PRIVATE');assert.equal(c.suitability.facts.unitType,'unknown');assert.equal(c.suitability.status,'ineligible');
});
test('OPR unrelated negation cannot erase documented private room',async()=>{
 const f=await reviewedPrivacy({roomName:'Private room, no breakfast',roomAmenities:'Private bathroom; WiFi'}),r=f.run();
 assert.equal(r.output.candidates[0].suitability.facts.unitState,'PRIVATE');assert.equal(r.output.candidates[0].suitability.facts.bathroomState,'PRIVATE');
});
test('OPR same-offer structured negative and positive text conflict, no hard need invented',async()=>{
 const f=await privacyControl();for(const o of f.x.n.offers)Object.assign(o.privateBathroom,{state:'KNOWN',value:false});
 for(const s of f.request.syntheticSignals)s.roomText='Private room with private bathroom';
 const r=f.run();assert.equal(r.output.decision.status,'abstained');assert(r.output.candidates.every((c:any)=>c.suitability.facts.bathroomState==='CONFLICTING'));
 assert(r.output.candidates.every((c:any)=>c.calculated.comfort.features.find((s:any)=>s.featureCode==='private-bathroom').evidenceState==='conflicting'));
 assert.equal(f.x.n.party.requirements.privateBathroom,false);
});
test('OPR existing explicit mandatory bathroom consumes negative fact, not stale positive',async()=>{
 const f=await privacyControl();f.request.syntheticQuery.comfortPreferences={requiredFeatureCodes:['private-bathroom']};
 for(const o of f.x.n.offers)Object.assign(o.privateBathroom,{state:'KNOWN',value:false});
 const r=f.run();assert(r.output.candidates.every((c:any)=>c.policy.hardConstraintsSatisfied===false));assert.equal(r.output.decision.status,'abstained');
});
for(const application of ['UNVERIFIED','PROPERTY_WIDE'])test('OPR unverified structured privacy cannot certify offer '+application,async()=>{
 const f=await privacyControl();for(const o of f.x.n.offers)Object.assign(o.privateBathroom,{state:'KNOWN',value:true,applicability:application});
 const r=f.run();assert(r.output.candidates.every((c:any)=>c.suitability.facts.bathroomState==='UNKNOWN'));assert.equal(r.output.decision.status,'abstained');
});
for(const key of ['privateBathroom','exclusiveUse']){
 test('OPR reviewed exact boolean '+key+' linked and consumed',async()=>{
  const f=await reviewedPrivacy({[key]:true});for(const o of f.n.offers){Object.assign(o[key],{state:'KNOWN',value:true});o[key].links[0].field=key;}
  const r=f.run(),facts=r.output.candidates[0].suitability.facts;assert.equal(key==='privateBathroom'?facts.bathroomState:facts.unitState,'PRIVATE');
  assert.equal(facts.unitType,'unknown');assert.equal(f.n.party.requirements[key],false);
 });
 test('OPR source-incompatible normalized boolean '+key+' rejected before kernel',async()=>{
  const f=await reviewedPrivacy({[key]:true}),o=f.n.offers[0];Object.assign(o[key],{state:'KNOWN',value:false});o[key].links[0].field=key;
  assert.throws(f.run,/NORMALIZATION_CHANGED/);
 });
 test('OPR unrelated source/hash cannot certify '+key,async()=>{
  const f=await reviewedPrivacy({amenities:'Camera privata; Bagno privato'}),o=f.n.offers[0];Object.assign(o[key],{state:'KNOWN',value:true});
  assert.throws(f.run,/SOURCE_FIELD/);
 });
 test('OPR unsupported typed source stays unknown '+key,async()=>{
  const f=await reviewedPrivacy({[key]:'Informazione particolare da verificare',amenities:'Camera privata; Bagno privato'});
  const r=f.run(),facts=r.output.candidates[0].suitability.facts;assert.equal(key==='privateBathroom'?facts.bathroomState:facts.unitState,'UNKNOWN');
  const o=f.n.offers[0];Object.assign(o[key],{state:'KNOWN',value:true});o[key].links[0].field=key;assert.throws(f.run,/NORMALIZATION_UNSUPPORTED/);
 });
}
test('OPR property source cannot be relabelled as selected offer claim',async()=>{
 const f=await reviewedPrivacy({amenities:'Bagno privato'}),o=f.n.offers[0];Object.assign(o.privateBathroom,{state:'KNOWN',value:true});o.privateBathroom.links[0].field='amenities';assert.throws(f.run,/SOURCE_SCOPE/);
});
test('OPR exact bounded privacy phrases support booleans but not unit classification',async()=>{
 const f=await reviewedPrivacy({privateBathroom:'Bagno privato',exclusiveUse:'Uso esclusivo'});
 for(const o of f.n.offers)for(const k of ['privateBathroom','exclusiveUse']){Object.assign(o[k],{state:'KNOWN',value:true});o[k].links[0].field=k;}
 const r=f.run();assert.equal(r.output.candidates[0].suitability.facts.unitType,'unknown');assert.equal(r.output.candidates[0].suitability.facts.unitState,'PRIVATE');assert.equal(r.output.candidates[0].suitability.facts.bathroomState,'PRIVATE');
});
test('OPR mixed complete control remains recommendable without selecting conflicted peer',async()=>{
 const f=await privacyControl();Object.assign(f.x.n.offers[0].privateBathroom,{state:'CONFLICTING',value:null});
 const r=f.run();assert.equal(r.output.decision.status,'usable');assert(!r.output.decision.portfolio.bestChoice.equivalentSolutionIds.includes(r.output.candidates[0].policy.solutionId));
});
test('OPR source, claims and review journal remain unchanged by execution',async()=>{
 const f=await reviewedPrivacy({amenities:'Camera privata; Bagno privato',roomAmenities:'Bagno privato non disponibile; WiFi UNKNOWN'}),before=JSON.stringify({args:f.args,n:f.n});
 f.run();assert.equal(JSON.stringify({args:f.args,n:f.n}),before);
});
test('OPR reviewed structured denial and scoped text affirmation remain conflicting',async()=>{
 const f=await reviewedPrivacy({roomName:'Private room with private bathroom',privateBathroom:false});
 for(const o of f.n.offers){Object.assign(o.privateBathroom,{state:'KNOWN',value:false});o.privateBathroom.links[0].field='privateBathroom';}
 assert(f.run().output.candidates.every((c:any)=>c.suitability.facts.bathroomState==='CONFLICTING'));
});
test('OPR essential privacy consumes resolved conflict even without contextual business trigger',async()=>{
 const f=await privacyControl();f.request.syntheticQuery.tripProfile='leisure';
 f.x.n.party.requirements.privateBathroom=true;f.request.syntheticRequirementBasis.privateBathroom=true;
 for(const o of f.x.n.offers)Object.assign(o.privateBathroom,{state:'KNOWN',value:true});
 for(const s of f.request.syntheticSignals)s.roomText='Private room with shared bathroom';
 const r=f.run();assert.equal(r.output.decision.status,'abstained');
 assert(r.output.candidates.every((c:any)=>c.policy.hardConstraintsSatisfied===null&&c.resolvedPrivacyRequirements.find((p:any)=>p.key==='privateBathroom').status==='CONFLICTING'));
});
test('OPR synthetic explicit sharing and private hostel unit retain distinct contextual meaning',async()=>{
 for(const shared of [false,true]){const f=await privacyControl();f.request.syntheticQuery.tripProfile='leisure';
  if(shared)f.request.syntheticQuery.comfortPreferences={preferredUnitTypes:['shared-room']};
  for(const s of f.request.syntheticSignals){s.category='hostel';s.roomText=shared?'Shared room with private bathroom':'Private room with private bathroom';}
  const r=f.run();assert(r.output.candidates.every((c:any)=>c.suitability.status==='eligible'));
  assert(r.output.candidates.every((c:any)=>c.suitability.facts.unitState===(shared?'SHARED':'PRIVATE')));
 }
});
test('OPR corrected privacy/service path is provider/order independent and ignores human feedback',async()=>{
 const f=await privacyControl();Object.assign(f.x.n.offers[0].privateBathroom,{state:'KNOWN',value:false});const a=f.run();
 f.request.feedback={winner:'not-a-target'};f.x.n.offers.reverse();f.request.syntheticSignals.reverse();for(const s of f.request.syntheticSignals){s.provider='unrelated';s.name='unrelated';}
 const b=f.run();assert.deepEqual(a.output.decision.portfolio,b.output.decision.portfolio);
 assert.deepEqual(a.output.candidates.map((c:any)=>[c.hotelId,c.suitability.status]).sort(),b.output.candidates.map((c:any)=>[c.hotelId,c.suitability.status]).sort());
});
test('OPR shared-bath source cannot legitimize an affirmative structured private bath',async()=>{
 for(const text of ['Bagno condiviso','Bagno privato; Bagno condiviso']){const f=await reviewedPrivacy({roomAmenities:text}),o=f.n.offers[0];
  Object.assign(o.privateBathroom,{state:'KNOWN',value:true});o.privateBathroom.links[0].field='roomAmenities';assert.throws(f.run,/NORMALIZATION_CHANGED|NORMALIZATION_UNSUPPORTED/);
 }
});
test('OPR existing aliases preserve surrounding negations instead of allowing property fallback',async()=>{
 const f=await reviewedPrivacy({amenities:'Suite privata; Bagno in camera',roomAmenities:'Suite privata non disponibile; Bagno in camera non disponibile'});
 const c=f.run().output.candidates[0];assert.equal(c.suitability.facts.unitState,'NOT_PRIVATE');assert.equal(c.suitability.facts.bathroomState,'NOT_PRIVATE');
});
