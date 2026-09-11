import assert from 'node:assert/strict';
import test from 'node:test';
import {privacyControl,reviewedPrivacy} from './fixtures/observedPrivacySyntheticV3';

function bindClaim(f:any,key:string,value:boolean,field=key,applicability='OFFER_SCOPED'){
 for(const o of f.n.offers){Object.assign(o[key],{state:'KNOWN',value,applicability});o[key].links[0].field=field;}
}
function record(name:string,r:any,expected:any){
 const c=r.output.candidates[0],p=c.suitability.facts;
 console.log(JSON.stringify({synthetic:true,r2Counterexample:name,
  input:r.input.candidates.map((c:any)=>({roomKey:c.roomKey,rateKey:c.rateKey,roomText:c.roomText,
   scopedObservations:c.scopedObservations,privacyClaims:c.privacyClaims})),
  actual:{unit:p.unitState,bath:p.bathroomState,unitType:p.unitType,decision:r.output.decision.status,
   bathClaimConsumed:p.resolution[1].claimConsumed,selectedBathStates:p.resolution[1].selected.map((s:any)=>s.parsed.state)},expected}));
}
for(const [name,property,room,value,expected]of [
 ['A','Bagno privato','Camera privata; Bagno condiviso',true,'SHARED'],
 ['B','Bagno condiviso','Camera privata; Bagno privato',false,'PRIVATE'],
] as const)test('R2 reproduced reviewed '+name,async()=>{
 const f=await reviewedPrivacy({amenities:property,roomAmenities:room});
 bindClaim(f,'privateBathroom',value,'amenities','PROPERTY_WIDE');const r=f.run();record(name,r,{bath:expected,claimConsumed:false});
 const p=r.output.candidates[0].suitability.facts;
 assert.equal(p.bathroomState,expected);assert.equal(p.resolution[1].claimConsumed,false);
});
for(const roomName of ['Standard Quadruple Room','Camera Quadrupla Standard'])test('R2 reproduced reviewed neutral '+roomName,async()=>{
 const f=await reviewedPrivacy({roomName,privateBathroom:true,exclusiveUse:true});
 bindClaim(f,'privateBathroom',true);bindClaim(f,'exclusiveUse',true);
 const r=f.run();record(roomName,r,{unit:'PRIVATE',bath:'PRIVATE',unitType:'unknown'});
 for(const c of r.output.candidates){assert.equal(c.suitability.facts.unitState,'PRIVATE');assert.equal(c.suitability.facts.bathroomState,'PRIVATE');assert.equal(c.suitability.facts.unitType,'unknown');}
});
async function completeNeutral(roomName:string){
 const f=await privacyControl();
 for(const o of f.x.n.offers){
  o.scope.roomKey=roomName;
  const visit=(v:any)=>{if(v&&typeof v==='object'){if(v.state&&v.scope)v.scope.roomKey=roomName;else for(const x of Object.values(v))visit(x);}};
  visit(o);for(const key of ['privateBathroom','exclusiveUse'])Object.assign(o[key],{state:'KNOWN',value:true});
 }
 for(const s of f.request.syntheticSignals){s.roomText=roomName;s.features=[];s.evidence=s.evidence.filter((e:any)=>!e.code.startsWith('feature.')&&!e.code.startsWith('accommodation.'));}
 return f;
}
test('R2 reproduced complete neutral control and Italian denomination',async()=>{
 const a=await completeNeutral('Unit A'),b=await completeNeutral('Camera Quadrupla Standard');
 const control=a.run(),r=b.run();assert.equal(control.output.decision.status,'usable');
 record('business neutral contrast',r,{decision:'usable',unit:'PRIVATE',bath:'PRIVATE',unitType:'unknown'});
 assert.equal(r.output.decision.status,'usable');assert.deepEqual(r.output.decision.portfolio,control.output.decision.portfolio);
});

for(const applicability of ['PROPERTY_WIDE','UNVERIFIED'])for(const [specific,expected]of [
 ['Bagno condiviso','SHARED'],['Bagno privato','PRIVATE'],['Bagno privato non disponibile','NOT_PRIVATE'],
 ['Bagno privato; Bagno condiviso','CONFLICTING'],['Bagno privato su richiesta','UNKNOWN'],
])test('R2 scoped bath survives ignored claim '+applicability+' '+specific,async()=>{
 const f=await reviewedPrivacy({amenities:'Bagno privato',roomAmenities:'Camera privata; '+specific});
 bindClaim(f,'privateBathroom',true,'amenities',applicability);const before=JSON.stringify({args:f.args,n:f.n}),r=f.run();
 const bath=r.output.candidates[0].suitability.facts.resolution[1];
 assert.equal(bath.state,expected);assert.equal(bath.claimConsumed,false);
 assert.equal(bath.claimNonConsumptionReason,'CLAIM_NOT_OFFER_APPLICABLE');assert.equal(bath.propertyFallbackUsed,false);
 assert.equal(bath.claim.applicability,applicability);assert(bath.observations.some((o:any)=>o.sourceField==='amenities'&&o.original.value==='Bagno privato'));
 assert(bath.selected.every((o:any)=>o.scope==='OFFER'));assert.equal(JSON.stringify({args:f.args,n:f.n}),before);
 // Removing an explicitly ignored claim cannot change an independently scoped fact.
 for(const o of f.n.offers)Object.assign(o.privateBathroom,{state:'UNKNOWN',value:null});
 assert.equal(f.run().output.candidates[0].suitability.facts.bathroomState,expected);
});
for(const applicability of ['PROPERTY_WIDE','UNVERIFIED'])test('R2 absent scoped bath cannot inherit inapplicable certificate '+applicability,async()=>{
 const f=await reviewedPrivacy({roomName:'Standard Quadruple Room',amenities:'Bagno privato'});
 bindClaim(f,'privateBathroom',true,'amenities',applicability);const bath=f.run().output.candidates[0].suitability.facts.resolution[1];
 assert.equal(bath.state,'UNKNOWN');assert.equal(bath.claimConsumed,false);assert.equal(bath.propertyFallbackUsed,false);assert.equal(bath.selected.length,0);
});
test('R2 inapplicable conflicting claim also has no hidden effect on scoped fact',async()=>{
 const f=await reviewedPrivacy({roomAmenities:'Camera privata; Bagno privato',amenities:'Bagno privato; Bagno condiviso'});
 for(const o of f.n.offers){Object.assign(o.privateBathroom,{state:'CONFLICTING',value:null,applicability:'PROPERTY_WIDE'});o.privateBathroom.links[0].field='amenities';}
 const bath=f.run().output.candidates[0].suitability.facts.resolution[1];assert.equal(bath.state,'PRIVATE');assert.equal(bath.claimConsumed,false);
});
for(const roomName of ['Standard Room','Double Room','Camera Doppia Standard','Stanza Singola','Standard Quadruple Room','Camera Quadrupla Standard'])
 test('R2 neutral denomination with complete facts does not change policy '+roomName,async()=>{
  const f=await completeNeutral(roomName),control=(await completeNeutral('Unit A')).run(),r=f.run();
  assert.equal(r.output.decision.status,'usable');assert.deepEqual(r.output.decision.portfolio,control.output.decision.portfolio);
  for(let i=0;i<r.output.candidates.length;i++){
   const c=r.output.candidates[i],p=c.suitability.facts;
   assert.equal(p.unitType,'unknown');assert.equal(p.unitState,'PRIVATE');assert.equal(p.bathroomState,'PRIVATE');
   assert.deepEqual(c.policy.dimensions,control.output.candidates[i].policy.dimensions);
   assert.equal(p.resolution[0].roomNameInterpretation.mentioned,false);
   assert.deepEqual(p.resolution[0].roomNameInterpretation.neutralDenominations,[roomName]);
  }
 });
for(const roomName of ['Standard Quadruple Room','Camera Quadrupla Standard'])test('R2 neutral name alone proves no privacy '+roomName,async()=>{
 const f=await reviewedPrivacy({roomName}),r=f.run(),p=r.output.candidates[0].suitability.facts;
 assert.equal(p.unitState,'UNKNOWN');assert.equal(p.bathroomState,'UNKNOWN');assert.equal(p.unitType,'unknown');assert.equal(p.resolution[0].claimConsumed,false);
});
for(const [field,text,expected]of [
 ['roomName','Private room UNKNOWN','UNKNOWN'],['roomName','Room privacy unknown','UNKNOWN'],
 ['roomName','Camera privata su richiesta','UNKNOWN'],['roomName','Private room on request','UNKNOWN'],
 ['roomName','Camera privata; Camera condivisa','CONFLICTING'],['roomName','No private room','CONFLICTING'],
 ['roomAmenities','Camera condivisa','CONFLICTING'],['roomAmenities','Private room?','UNKNOWN'],
])test('R2 real privacy uncertainty/contradiction survives positive fact '+text,async()=>{
 const f=await reviewedPrivacy({roomName:'Camera Quadrupla Standard',privateBathroom:true,exclusiveUse:true,[field]:text});
 bindClaim(f,'privateBathroom',true);bindClaim(f,'exclusiveUse',true);
 const c=f.run().output.candidates[0];assert.equal(c.suitability.facts.unitState,expected);assert.equal(c.suitability.status,'incomplete');
 assert.equal(f.n.party.requirements.exclusiveUse,false);
});
test('R2 neutral clause cannot hide a separate explicit privacy-unknown clause',async()=>{
 const f=await reviewedPrivacy({roomName:'Standard Quadruple Room; Room privacy unknown',privateBathroom:true,exclusiveUse:true});
 bindClaim(f,'privateBathroom',true);bindClaim(f,'exclusiveUse',true);
 assert.equal(f.run().output.candidates[0].suitability.facts.unitState,'UNKNOWN');
});
for(const key of ['privateBathroom','exclusiveUse'])for(const value of [true,false])test('R2 reviewed neutral name consumes exact typed '+key+' '+value,async()=>{
 const f=await reviewedPrivacy({roomName:'Camera Quadrupla Standard',[key]:value});bindClaim(f,key,value);
 const p=f.run().output.candidates[0].suitability.facts;
 assert.equal(key==='privateBathroom'?p.bathroomState:p.unitState,value?'PRIVATE':'NOT_PRIVATE');assert.equal(p.unitType,'unknown');
 // Valid hash/reference cannot authorize the opposite meaning.
 f.n.offers[0][key].value=!value;assert.throws(f.run,/NORMALIZATION_CHANGED/);
});
test('R2 neutral name cannot be used as source for a private-use claim',async()=>{
 const f=await reviewedPrivacy({roomName:'Camera Quadrupla Standard'});bindClaim(f,'exclusiveUse',true,'roomName');
 assert.throws(f.run,/NORMALIZATION_UNSUPPORTED/);
});
test('R2 unknown dedicated source and unsupported room wording remain unverified',async()=>{
 for(const fields of [{exclusiveUse:null},{roomName:'Room with unusual undocumented arrangement'}]){
  const f=await reviewedPrivacy({roomName:'Standard Quadruple Room',roomAmenities:'Camera privata',...fields});
  assert.equal(f.run().output.candidates[0].suitability.facts.unitState,'UNKNOWN');
 }
});
test('R2 neutral denomination plus separate known bath neither erases nor invents facts',async()=>{
 const f=await reviewedPrivacy({roomName:'Camera Quadrupla Standard; Bagno privato',exclusiveUse:true});bindClaim(f,'exclusiveUse',true);
 const p=f.run().output.candidates[0].suitability.facts;assert.equal(p.unitState,'PRIVATE');assert.equal(p.bathroomState,'PRIVATE');assert.equal(p.unitType,'unknown');
});
for(const qualifier of ['privacy UNKNOWN','non privata','on request'])test('R2 neutral name cannot discard privacy qualifier '+qualifier,async()=>{
 const f=await reviewedPrivacy({roomName:'Camera Quadrupla Standard; '+qualifier,privateBathroom:true,exclusiveUse:true});
 bindClaim(f,'privateBathroom',true);bindClaim(f,'exclusiveUse',true);
 assert.equal(f.run().output.candidates[0].suitability.facts.unitState,'UNKNOWN');
});
