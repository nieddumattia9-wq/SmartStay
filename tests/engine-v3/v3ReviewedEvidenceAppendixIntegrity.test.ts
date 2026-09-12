import assert from 'node:assert/strict';
import test from 'node:test';
import {appendixFixture} from './fixtures/reviewedEvidenceAppendixSyntheticV3';

const hiddenUnavailable=(f:any)=>{
 const proof=f.appendix.proofs[0],content=JSON.parse(proof.transcription.content);
 const temporal={relation:'DOCUMENTED_SUCCESSOR',priorClaimSha256:f.hash(f.n.offers[0].availability.unavailable),retiredObservations:[],retiredAvailability:[]};
 content.entries.push({field:'availability.unavailable',statement:'Selected rate verification: unavailable',temporal});
 f.seal(proof,content);
 return {proof,content,temporal};
};
const summary=(f:any,r:any)=>({requestSha256:f.hash(f.request),appendixSha256:f.hash(f.appendix),
 inputSha256:f.hash(r.input),outputSha256:f.hash(r.output),originalsSha256:f.hash({packet:f.args.packet,events:f.args.events,normalization:f.n}),
 policyExecuted:r.output.policyExecuted,decisionStatus:r.output.decision?.status,availability:r.input.candidates[0].assessment.availability,
 accommodation:r.requirementsEvaluation.offers[0].accommodation,integrations:r.integrations,
 activeUnits:r.integratedRequirements.offers[0].unitsOffered,activeSleeping:r.integratedRequirements.offers[0].sleeping});

test('EAI01 hidden applicable unavailable entry cannot be omitted from a shared financial proof',async t=>{
 const f=await appendixFixture();f.financial(0);const control=f.run();assert.equal(control.output.decision.status,'usable');
 const extra=hiddenUnavailable(f),before=f.hash(f.request);let calls=0;
 assert.throws(()=>f.run(()=>{calls++;return null;}),/APPENDIX_MULTI_ENTRY_SELECTION_INCOMPLETE/);
 t.diagnostic(JSON.stringify({case:'HIDDEN_UNAVAILABLE',sourceEntries:extra.content.entries,selectedFields:f.appendix.integrations.map((i:any)=>i.field),inputStatus:'REJECTED_BEFORE_POLICY',policyCalls:calls}));
 assert.equal(f.hash(f.request),before);
 assert.equal(calls,0);
});

test('EAI02 explicit sleeping expiry cannot resolve the original unknown and allow recommendation',async t=>{
 const f=await appendixFixture({unknown:['sleeping']});f.financial(0);
 const p=f.add('sleeping','Complete sleeping inventory: DOUBLE count 1 places each 2',0,{content:{observedAt:'2099-09-01T12:01:00Z',validUntil:'2099-09-01T12:01:30Z'}});
 const before=f.hash(f.request),r=f.run();
 t.diagnostic(JSON.stringify({case:'EXPIRED_SLEEPING',source:p.content,evaluatedAt:f.appendix.evaluatedAt,result:summary(f,r)}));
 assert.equal(f.hash(f.request),before);
 assert.equal(r.output.policyExecuted,true);
 assert.equal(r.integratedRequirements.offers[0].sleeping.state,'UNKNOWN');
 assert.equal(r.output.decision.status,'abstained');
});

const selectUnavailable=(f:any,extra:any)=>{
 f.appendix.integrations.push({id:'SYNTHETIC_EXPLICIT_UNAVAILABLE',alternativeId:f.n.offers[0].alternativeId,
  field:'availability.unavailable',proofId:extra.proof.id,claim:{state:'KNOWN',value:true,reason:'Explicit invented contradictory verification'},temporal:extra.temporal});
};

test('EAI04 unchanged coherent shared financial proof reaches actual usable policy with other offers incomplete',async()=>{
 const f=await appendixFixture();f.financial(0);const before=f.hash(f.request),r=f.run();
 assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'usable');assert.equal(r.output.candidates.length,3);
 assert.equal(r.input.candidates[0].assessment.availability,'VERIFIED_BOOKABLE');
 assert(r.input.candidates.slice(1).every((c:any)=>c.assessment.recommendationBlockers.length>0));
 assert.equal(f.hash(f.request),before);assert.equal(r.base.normalization.offers[0].completeTotal.state,'UNKNOWN');
});

test('EAI05 selecting every valid contradictory entry yields an actual policy abstention with unchanged proof bytes',async()=>{
 const f=await appendixFixture();f.financial(0);const extra=hiddenUnavailable(f),hash=extra.proof.artifact.sha256;
 assert.throws(f.run,/MULTI_ENTRY_SELECTION_INCOMPLETE/);selectUnavailable(f,extra);
 const r=f.run();assert.equal(extra.proof.artifact.sha256,hash);assert.equal(r.output.policyExecuted,true);
 assert.equal(r.input.candidates[0].assessment.availability,'CONFLICTING');assert.equal(r.output.decision.status,'abstained');
 assert(r.consumedFacts.some((x:any)=>x.field==='availability.unavailable'&&x.sourceArtifactSha256===hash));
 assert.equal(r.base.normalization.offers[0].availability.unavailable.state,'UNKNOWN');
});

test('EAI06 nominal selection with a false negative-value claim cannot conceal a rejected contradictory member',async()=>{
 const f=await appendixFixture();f.financial(0);const extra=hiddenUnavailable(f);selectUnavailable(f,extra);
 f.appendix.integrations.at(-1).claim.value=false;let calls=0;
 assert.throws(()=>f.run(()=>{calls++;return null;}),/MULTI_ENTRY_VALIDATION_FAILED/);assert.equal(calls,0);
});

test('EAI07 an invalid original-claim link in a selected negative member cannot leave positive siblings usable',async()=>{
 const f=await appendixFixture();f.financial(0);const extra=hiddenUnavailable(f);selectUnavailable(f,extra);
 extra.content.entries[2].temporal.priorClaimSha256='0'.repeat(64);f.appendix.integrations.at(-1).temporal.priorClaimSha256='0'.repeat(64);
 f.seal(extra.proof,extra.content);let calls=0;
 assert.throws(()=>f.run(()=>{calls++;return null;}),/MULTI_ENTRY_VALIDATION_FAILED/);assert.equal(calls,0);
});

test('EAI08 partial shared-proof coverage remains rejected after integration order reversal',async()=>{
 const f=await appendixFixture();f.financial(0);hiddenUnavailable(f);const before=f.hash(f.request);
 for(let i=0;i<2;i++){assert.throws(f.run,/MULTI_ENTRY_SELECTION_INCOMPLETE/);f.appendix.integrations.reverse();f.appendix.proofs.reverse();}
 assert.equal(f.hash(f.request),before);
});

test('EAI09 current sleeping evidence resolves UNKNOWN and permits actual recommendation',async()=>{
 const f=await appendixFixture({unknown:['sleeping']});f.financial(0);
 f.add('sleeping','Complete sleeping inventory: DOUBLE count 1 places each 2',0,{content:{validUntil:'2099-09-01T12:10:00Z'}});
 const r=f.run();assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'usable');
 assert.equal(r.requirementsEvaluation.offers[0].accommodation.sleeping.status,'SATISFIED');assert.equal(f.n.offers[0].sleeping.state,'UNKNOWN');
});

test('EAI10 a static sleeping fact needs no invented expiry duration',async()=>{
 const f=await appendixFixture({unknown:['sleeping']});f.financial(0);
 f.add('sleeping','Complete sleeping inventory: DOUBLE count 1 places each 2',0,{content:{validUntil:null}});
 const r=f.run();assert.equal(r.integrations.at(-1).status,'APPLIED');assert.equal(r.output.decision.status,'usable');
 assert.equal(r.consumedFacts.find((x:any)=>x.field==='sleeping').validUntil,null);
});

for(const [field,statement]of [
 ['privateBathroom','Bagno privato'],['exclusiveUse','Camera privata'],['ratingScale','Rating scale: 0-10'],
 ['capacityGuests','Two guests'],['internalRooms','Two internal rooms'],['children.adultPricingFromAge','Da 5 anni pagano come adulti'],
] as const)test('EAI11 explicit expiry is respected for '+field,async()=>{
 const f=await appendixFixture();f.financial(0);const old=structuredClone(field.split('.').reduce((o:any,k)=>o[k],f.n.offers[0]));
 f.add(field,statement,0,{content:{validUntil:'2099-09-01T12:01:30Z'}});const r=f.run();
 const integration=r.integrations.find((i:any)=>i.field===field);assert.equal(integration.status,'INSUFFICIENT');assert.equal(integration.reason,'SOURCE_VALIDITY_EXPIRED');
 assert.deepEqual(field.split('.').reduce((o:any,k)=>o[k],r.integratedRequirements.offers[0]),old);
 assert(!r.consumedFacts.some((x:any)=>x.field===field));
});

test('EAI12 expired sleeping leaves a trace without inventing a current observation',async()=>{
 const f=await appendixFixture({unknown:['sleeping']});f.financial(0);const p=f.add('sleeping','Complete sleeping inventory: DOUBLE count 1 places each 2',0,{content:{validUntil:'2099-09-01T12:01:30Z'}});
 const before=f.hash({request:f.request,appendix:f.appendix}),a=f.run(),b=f.run();assert.deepEqual(a,b);
 assert.equal(f.hash({request:f.request,appendix:f.appendix}),before);
 const record=a.integrations.find((i:any)=>i.field==='sleeping');assert.equal(record.proofSha256,p.proof.artifact.sha256);
 assert.equal(record.observedAt,'2099-09-01T12:01:00Z');assert.equal(record.reason,'SOURCE_VALIDITY_EXPIRED');
 assert.equal(a.integratedRequirements.offers[0].sleeping.observedAt,f.n.offers[0].sleeping.observedAt);
});

test('EAI13 one documented unit remains a usable positive control',async()=>{
 const f=await appendixFixture();f.financial(0);f.add('unitsOffered','One unit');const r=f.run();
 assert.equal(r.integrations.at(-1).status,'APPLIED');assert.equal(r.integratedRequirements.offers[0].unitsOffered.value,1);
 assert.equal(r.requirementsEvaluation.offers[0].accommodation.units.status,'SATISFIED');assert.equal(r.output.decision.status,'usable');
});

test('EAI14 zero units is a documented current violation, not a malformed count or historical certificate',async()=>{
 const f=await appendixFixture();f.financial(0);const p=f.add('unitsOffered','0 units');const r=f.run();
 assert.equal(r.integrations.at(-1).status,'APPLIED');assert.equal(r.integratedRequirements.offers[0].unitsOffered.value,0);
 assert.equal(r.requirementsEvaluation.offers[0].accommodation.units.status,'DOCUMENTED_VIOLATION');
 assert.equal(r.requirementsEvaluation.offers[0].accommodation.status,'DOCUMENTED_VIOLATION');
 assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'abstained');
 assert.equal(r.base.normalization.offers[0].unitsOffered.value,1);
 const fact=r.consumedFacts.find((x:any)=>x.field==='unitsOffered');assert.equal(fact.activeClaim.value,0);assert.equal(fact.sourceArtifactSha256,p.proof.artifact.sha256);
});

test('EAI15 absence for one offer does not erase another independently complete offer',async()=>{
 const f=await appendixFixture();f.financial(0);f.financial(1);f.add('unitsOffered','0 units',0);const r=f.run();
 assert.equal(r.output.candidates.length,3);assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'usable');
 assert.equal(r.requirementsEvaluation.offers[0].accommodation.units.status,'DOCUMENTED_VIOLATION');
 assert.equal(r.requirementsEvaluation.offers[1].accommodation.units.status,'SATISFIED');assert.equal(r.input.candidates[1].assessment.recommendationBlockers.length,0);
 assert(r.input.candidates[0].assessment.recommendationBlockers.includes('ACCOMMODATION_DOCUMENTED_VIOLATION'));
});

test('EAI16 malformed transformed zero is rejected rather than invented from a one-unit source',async()=>{
 const f=await appendixFixture();f.financial(0);const p=f.add('unitsOffered','One unit');p.integration.claim.value=0;const r=f.run();
 assert.equal(r.integrations.at(-1).status,'REJECTED');assert.equal(r.integrations.at(-1).reason,'APPENDIX_SEMANTIC_TRANSFORMATION_MISMATCH');
 assert.equal(r.integratedRequirements.offers[0].unitsOffered.value,1);assert.equal(r.output.decision.status,'usable');
});

test('EAI17 generic zero units is not a selected-rate absence certificate',async()=>{
 const f=await appendixFixture();f.financial(0);f.add('unitsOffered','0 units',0,{content:{applicability:'PROPERTY_WIDE'}});const r=f.run();
 assert.equal(r.integrations.at(-1).status,'REJECTED');assert.equal(r.integrations.at(-1).reason,'APPENDIX_FIELD_APPLICABILITY_UNSUPPORTED');
 assert.equal(r.integratedRequirements.offers[0].unitsOffered.value,1);assert.equal(r.output.decision.status,'usable');
});

test('EAI18 expired zero cannot replace a still separate historical one-unit observation',async()=>{
 const f=await appendixFixture();f.financial(0);f.add('unitsOffered','0 units',0,{content:{validUntil:'2099-09-01T12:01:30Z'}});const r=f.run();
 assert.equal(r.integrations.at(-1).status,'INSUFFICIENT');assert.equal(r.integrations.at(-1).reason,'SOURCE_VALIDITY_EXPIRED');
 assert.equal(r.integratedRequirements.offers[0].unitsOffered.value,1);assert.equal(r.output.decision.status,'usable');
});

test('EAI19 zero unit application is deterministic, source-linked and preserves original needs and all input bytes',async()=>{
 const f=await appendixFixture();f.financial(0);f.add('unitsOffered','0 units');const before=f.hash({request:f.request,appendix:f.appendix}),a=f.run(),b=f.run();
 assert.deepEqual(a,b);assert.equal(f.hash({request:f.request,appendix:f.appendix}),before);
 f.appendix.integrations.reverse();f.appendix.proofs.reverse();const c=f.run();assert.deepEqual(a.output,c.output);assert.equal(a.appendixFingerprint,c.appendixFingerprint);
 assert.deepEqual(a.integratedRequirements.party,f.n.party);assert.deepEqual(a.integratedRequirements.requirementBasis,f.n.requirementBasis);
 assert.deepEqual(a.integratedRequirements.requirementMapping,f.n.requirementMapping);assert.equal(a.base.reviewedBinding.reviewConfirmed,true);
 assert.equal(a.feedbackUsed,false);assert.equal(a.goldenAdmission,false);
});

test('EAI20 actual abstention is not reported for an essential requirement that cannot be represented',async()=>{
 const f=await appendixFixture({needs:[{requirement:'Invented unsupported sensory requirement',essential:true}],unrepresented:true});f.financial(0);f.add('unitsOffered','0 units');const r=f.run();
 assert.equal(r.output.policyExecuted,false);assert.equal(r.output.decision,null);assert.equal(r.output.inputStatus,'NON_REPRESENTABLE_ESSENTIAL_REQUIREMENT');
});

test('EAI21 empty appendix still preserves exact prior REVIEWED kernel output',async()=>{
 const f=await appendixFixture(),old=f.baseRun(),r=f.run();assert.deepEqual(r.input,old.input);assert.deepEqual(r.output,old.output);
 assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'abstained');
});

test('EAI22 exact declared expiry boundary and a static null expiry preserve the documented interval semantics',async()=>{
 for(const validUntil of ['2099-09-01T12:02:00Z',null]){
  const f=await appendixFixture({unknown:['sleeping']});f.financial(0);
  f.add('sleeping','Complete sleeping inventory: DOUBLE count 1 places each 2',0,{content:{validUntil}});
  const r=f.run();assert.equal(r.integrations.at(-1).status,'APPLIED');assert.equal(r.output.policyExecuted,true);
  assert.equal(r.output.decision.status,'usable');assert.equal(r.consumedFacts.find((x:any)=>x.field==='sleeping').validUntil,validUntil);
 }
});

test('EAI23 byte-identical proof aliases cannot combine partial selections to satisfy complete-entry coverage',async()=>{
 const f=await appendixFixture();f.financial(0);const original=f.appendix.proofs[0],alias=structuredClone(original);
 alias.id='SYNTHETIC_ALIAS_OF_SHARED_PROOF';f.appendix.proofs.push(alias);
 f.appendix.integrations.find((i:any)=>i.field==='availability.bookability').proofId=alias.id;
 assert.equal(alias.artifact.sha256,original.artifact.sha256);assert.equal(alias.transcription.content,original.transcription.content);
 const before=f.hash(f.request);let calls=0;
 assert.throws(()=>f.run(()=>{calls++;return null;}),/MULTI_ENTRY_SELECTION_INCOMPLETE/);
 assert.equal(calls,0);assert.equal(f.hash(f.request),before);
});

test('EAI03 decoded zero units cannot silently retain satisfied historical accommodation',async t=>{
 const f=await appendixFixture();f.financial(0);const p=f.add('unitsOffered','0 units');
 const before=f.hash(f.request),r=f.run();
 t.diagnostic(JSON.stringify({case:'ZERO_UNITS',source:p.content,proposedClaim:p.integration.claim,result:summary(f,r)}));
 assert.equal(f.hash(f.request),before);
 assert.equal(r.output.policyExecuted,true);
 assert.notEqual(r.requirementsEvaluation.offers[0].accommodation.status,'SATISFIED');
 assert.equal(r.output.decision.status,'abstained');
});
