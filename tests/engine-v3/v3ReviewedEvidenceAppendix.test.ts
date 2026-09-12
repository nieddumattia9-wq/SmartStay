import assert from 'node:assert/strict';
import test from 'node:test';
import {appendixFixture,APPENDIX_OBSERVED_AT} from './fixtures/reviewedEvidenceAppendixSyntheticV3';

const rejected=(r:any,reason:RegExp)=>{assert.equal(r.integrations[0].status,'REJECTED');assert.match(r.integrations[0].reason,reason);};
const privacy=(r:any)=>r.output.candidates[0].suitability.facts;
test('EA01 empty appendix preserves the existing reviewed input and actual policy output',async()=>{const f=await appendixFixture(),a=f.baseRun(),r=f.run();assert.deepEqual(r.input,a.input);assert.deepEqual(r.output,a.output);assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'abstained');});
test('EA02 full invented appendix reaches actual policy with all original candidates',async()=>{const f=await appendixFixture();f.complete();const r=f.run();assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'usable');assert.equal(r.output.candidates.length,3);assert(r.integrations.every((i:any)=>i.status==='APPLIED'));assert(r.input.candidates.every((c:any)=>c.assessment.availability==='VERIFIED_BOOKABLE'&&c.assessment.completeTotal!==null));assert.equal(r.goldenAdmission,false);});
test('EA03 complete cost without bookability retains the residual gap',async()=>{const f=await appendixFixture();f.add('completeTotal','Complete stay cost: base 690.00 EUR + mandatory taxes 20.00 + mandatory fees 10.00 = 720.00; all mandatory charges quantified');const r=f.run();assert.equal(r.integrations[0].status,'APPLIED');assert.equal(r.input.candidates[0].assessment.completeTotal,720);assert.notEqual(r.input.candidates[0].assessment.availability,'VERIFIED_BOOKABLE');assert.equal(r.output.decision.status,'abstained');});
test('EA04 bookability alone does not invent complete cost',async()=>{const f=await appendixFixture();f.add('availability.bookability','Selected rate verification: bookable');const r=f.run();assert.equal(r.input.candidates[0].assessment.completeTotal,null);assert.equal(r.integratedRequirements.offers[0].completeTotal.state,'UNKNOWN');assert.equal(r.output.decision.status,'abstained');});
test('EA05 partial integration retains every incomplete alternative rather than filtering it',async()=>{const f=await appendixFixture();f.financial(0);const r=f.run();assert.equal(r.output.candidates.length,3);assert.equal(r.input.candidates.filter((c:any)=>c.assessment.completeTotal!==null).length,1);assert(r.input.candidates.slice(1).every((c:any)=>c.assessment.recommendationBlockers.length>0));});
test('EA06 application is repeatable without mutating original packet journal normalization or appendix',async()=>{const f=await appendixFixture();f.complete();const before=JSON.stringify({r:f.request,a:f.appendix}),a=f.run(),b=f.run();assert.deepEqual(a,b);assert.equal(JSON.stringify({r:f.request,a:f.appendix}),before);assert.equal(a.base.normalization.offers[0].completeTotal.state,'UNKNOWN');assert.equal(a.base.reviewedBinding.reviewConfirmed,true);});
test('EA07 input integration and proof order do not change output or fingerprints',async()=>{const f=await appendixFixture();f.complete();const a=f.run();f.appendix.integrations.reverse();f.appendix.proofs.reverse();const b=f.run();assert.deepEqual(a.output,b.output);assert.equal(a.appendixFingerprint,b.appendixFingerprint);assert.equal(a.integratedProjectionFingerprint,b.integratedProjectionFingerprint);});
test('EA08 original review confirmation and all field hashes are checked before kernel',async()=>{const f=await appendixFixture();f.args.events.pop();let calls=0;assert.throws(()=>f.run(()=>{calls++;}),/REVIEW|CONFIRM|JOURNAL/);assert.equal(calls,0);});
test('EA09 original essential requirements cannot be disabled before applying evidence',async()=>{const f=await appendixFixture();f.complete();for(const k of Object.keys(f.n.party.requirements))f.n.party.requirements[k]=false;for(const r of f.n.requirementMapping)r.needIndexes=[];let calls=0;assert.throws(()=>f.run(()=>{calls++;}),/ESSENTIAL_REQUIREMENT_COVERAGE/);assert.equal(calls,0);});
test('EA10 unsupported essential need remains nonrepresentable despite complete appendix',async()=>{const f=await appendixFixture({needs:[{requirement:'Invented unsupported sensory requirement',essential:true}],unrepresented:true});f.complete();const r=f.run();assert.equal(r.output.policyExecuted,false);assert.equal(r.output.decision,null);assert.equal(r.output.inputStatus,'NON_REPRESENTABLE_ESSENTIAL_REQUIREMENT');});
test('EA11 lower synthetic entry cannot replace the reviewed front door',async()=>{const f=await appendixFixture();f.request.kind='SYNTHETIC';assert.throws(f.run,/ORIGINAL_REVIEWED_ENTRY_REQUIRED/);});
test('EA12 original incompatible capacity normalization remains rejected',async()=>{const f=await appendixFixture();f.n.offers[0].capacityGuests.value=0;assert.throws(f.run,/CAPACITY_NORMALIZATION_CHANGED/);});
for(const [key,change]of [
 ['packetHash',(b:any)=>b.packetHash='0'.repeat(64)],['journalHash',(b:any)=>b.journalHash='0'.repeat(64)],
 ['projectionFingerprint',(b:any)=>b.projectionFingerprint='0'.repeat(64)],['normalizationFingerprint',(b:any)=>b.normalizationFingerprint='0'.repeat(64)],
] as const)test('EA13 base binding rejects '+key,async()=>{const f=await appendixFixture();change(f.appendix.base);assert.throws(f.run,/BASE_OR_SCHEMA_BINDING/);});
for(const [label,mutate]of [
 ['room',(c:any)=>c.scope.roomKey='OTHER_ROOM'],['rate',(c:any)=>c.scope.rateKey='OTHER_RATE'],
 ['adults',(c:any)=>c.scope.party.adults=3],['children',(c:any)=>c.scope.party.childAgesAtStay=[9]],
 ['quantity',(c:any)=>c.scope.party.unitsRequested=2],['currency',(c:any)=>c.scope.stay.currency='USD'],
 ['check-in',(c:any)=>c.scope.stay.checkIn='2099-12-01'],['check-out',(c:any)=>c.scope.stay.checkOut='2099-12-02'],
 ['offer-fingerprint',(c:any)=>c.scope.offerBindingFingerprint='0'.repeat(64)],
] as const)test('EA14 exact offer scope rejects '+label,async()=>{const f=await appendixFixture(),p=f.add('ratingScale','Rating scale: 0-10');mutate(p.content);f.seal(p.proof,p.content);rejected(f.run(),/ROOM_RATE_STAY_PARTY_CURRENCY_SCOPE/);});
test('EA15 altered evidence bytes are rejected even when source description remains unchanged',async()=>{const f=await appendixFixture(),p=f.add('ratingScale','Rating scale: 0-10');p.proof.artifact.base64=Buffer.from('altered synthetic bytes').toString('base64');rejected(f.run(),/PROOF_BYTES_HASH/);});
test('EA16 altered transcription bytes are rejected',async()=>{const f=await appendixFixture(),p=f.add('ratingScale','Rating scale: 0-10');p.proof.transcription.content+=' ';rejected(f.run(),/TRANSCRIPTION_HASH/);});
test('EA17 point review must bind artifact transcription and observation',async()=>{const f=await appendixFixture(),p=f.add('ratingScale','Rating scale: 0-10');p.proof.pointReview.artifactSha256='0'.repeat(64);rejected(f.run(),/POINT_REVIEW_BINDING_OR_PENDING/);});
test('EA18 fabricated normalized capacity does not follow from valid hash or point receipt',async()=>{const f=await appendixFixture(),p=f.add('capacityGuests','Two guests');p.integration.claim.value=0;rejected(f.run(),/SEMANTIC_TRANSFORMATION_MISMATCH/);});
for(const sourceKind of ['PUBLIC_OBSERVATION','PROPERTY_DOCUMENT'])test('EA19 generic '+sourceKind+' is not a bookability certificate',async()=>{const f=await appendixFixture();f.add('availability.bookability','Selected rate verification: bookable',0,{content:{sourceKind}});rejected(f.run(),/PUBLIC_OR_GENERIC_PROOF_NOT_RATE_CERTIFICATION/);});
for(const applicability of ['PROPERTY_WIDE','UNVERIFIED'])test('EA20 '+applicability+' cannot certify an offer total',async()=>{const f=await appendixFixture();f.add('completeTotal','Complete stay cost: base 690.00 EUR + mandatory taxes 20.00 + mandatory fees 10.00 = 720.00; all mandatory charges quantified',0,{content:{applicability}});rejected(f.run(),/FIELD_APPLICABILITY_UNSUPPORTED/);});
test('EA21 explicit property-linked rating scale is usable without inventing new observation',async()=>{const f=await appendixFixture();f.add('ratingScale','Rating scale: 0-10',0,{content:{applicability:'PROPERTY_WIDE'}});const r=f.run();assert.equal(r.integrations[0].status,'APPLIED');assert.equal(r.input.candidates[0].assessment.ratingOmitted,false);assert.equal(r.integratedRequirements.offers[0].ratingObserved.value,f.n.offers[0].ratingObserved.value);});
test('EA22 incomplete tariff continuity is rejected instead of rebinding the historical rate',async()=>{const f=await appendixFixture(),p=f.add('ratingScale','Rating scale: 0-10');p.content.continuity.kind='NEW_RATE_WITH_NO_BINDING';f.seal(p.proof,p.content);rejected(f.run(),/HISTORICAL_RATE_CONTINUITY_UNPROVEN/);});
test('EA23 source time after evaluation is rejected',async()=>{const f=await appendixFixture();f.add('ratingScale','Rating scale: 0-10',0,{content:{observedAt:'2099-09-01T12:03:00Z'}});rejected(f.run(),/OBSERVATION_TIME_OR_SOURCE/);});
test('EA24 price/bookability with different observation times are not fused',async()=>{const f=await appendixFixture();f.financial(0,false);const p=f.appendix.proofs[1],c=JSON.parse(p.transcription.content);c.observedAt='2099-09-01T12:01:01Z';f.seal(p,c);const r=f.run();assert(r.temporalGaps.some((x:any)=>x.reason==='PRICE_BOOKABILITY_TEMPORAL_LINK_UNPROVEN'));assert.notEqual(r.input.candidates[0].assessment.availability,'VERIFIED_BOOKABLE');assert.equal(r.output.decision.status,'abstained');});
test('EA25 price/bookability without same observation identity are not fused',async()=>{const f=await appendixFixture();f.financial(0,false);const p=f.appendix.proofs[1],c=JSON.parse(p.transcription.content);c.observationId='OTHER_OBSERVATION';f.seal(p,c);assert.equal(f.run().temporalGaps.length,1);});
for(const validUntil of [null,'2099-09-01T12:01:30Z'])test('EA26 financial evidence without current interval stays insufficient '+validUntil,async()=>{const f=await appendixFixture();f.add('availability.bookability','Selected rate verification: bookable',0,{content:{validUntil}});const r=f.run();assert.equal(r.integrations[0].status,'INSUFFICIENT');assert.equal(r.integratedRequirements.offers[0].availability.bookability.state,'UNKNOWN');});
test('EA27 current evidence is not an indiscriminate latest-wins rule',async()=>{const f=await appendixFixture();f.add('privateBathroom','Bagno privato');f.add('privateBathroom','Bagno condiviso',0,{content:{observedAt:'2099-09-01T12:01:01Z'}});const r=f.run();assert(r.integrations.every((i:any)=>i.status==='CONFLICTING'));assert.equal(r.integratedRequirements.offers[0].privateBathroom.state,'CONFLICTING');assert.equal(privacy(r).bathroomState,'CONFLICTING');});
test('EA28 unsupported statement remains insufficient and its original content remains in appendix',async()=>{const f=await appendixFixture();f.add('privateBathroom','Private bathroom might be available');const before=JSON.stringify(f.appendix),r=f.run();assert.equal(r.integrations[0].status,'INSUFFICIENT');assert.equal(JSON.stringify(f.appendix),before);});
test('EA29 negated privacy reaches contextual suitability without invented shared configuration',async()=>{const f=await appendixFixture({fields:{roomName:'Unit A',roomAmenities:null}});f.add('privateBathroom','Bagno privato non disponibile');const r=f.run();assert.equal(r.integratedRequirements.offers[0].privateBathroom.value,false);assert.equal(privacy(r).bathroomState,'NOT_PRIVATE');});
test('EA30 positive and shared bath assertion remains conflicting not private',async()=>{const f=await appendixFixture();f.add('privateBathroom','Bagno privato; Bagno condiviso');const r=f.run();assert.equal(r.integrations[0].status,'CONFLICTING');assert.equal(privacy(r).bathroomState,'CONFLICTING');});
test('EA31 explicit unknown bathroom can be retired only from active view by bound new evidence',async()=>{const f=await appendixFixture({fields:{roomName:'Unit A',roomAmenities:null,privateBathroom:null}});const baseline=f.baseRun(),record=baseline.input.candidates[0].scopedObservations.find((x:any)=>x.sourceField==='privateBathroom');assert(record);f.add('privateBathroom','Bagno privato',0,{temporal:{retiredObservations:[{sourceField:'privateBathroom',sha256:f.hash(record)}]}});const r=f.run();assert.equal(privacy(r).bathroomState,'PRIVATE');assert.equal(f.args.packet.alternatives[0].fields.find((x:any)=>x.key==='privateBathroom').value.status,'UNKNOWN');assert(r.base.input.candidates[0].scopedObservations.some((x:any)=>x.sourceField==='privateBathroom'));});
test('EA32 unknown bed places resolve with explicit inventory, not sofa/bunk multiplication',async()=>{const f=await appendixFixture({unknown:['sleeping']});f.add('sleeping','Complete sleeping inventory: SOFA count 1 places each 2');const r=f.run();assert.equal(r.integrations[0].status,'APPLIED');assert.equal(r.requirementsEvaluation.offers[0].accommodation.sleeping.status,'SATISFIED');assert.equal(f.n.offers[0].sleeping.state,'UNKNOWN');});
test('EA33 explicit unknown sofa places remain insufficient',async()=>{const f=await appendixFixture({unknown:['sleeping']});f.add('sleeping','Complete sleeping inventory: SOFA count 1 places each UNKNOWN');const r=f.run();assert.equal(r.requirementsEvaluation.offers[0].accommodation.sleeping.status,'INSUFFICIENT_INFORMATION');assert.equal(r.output.decision.status,'abstained');});
test('EA34 two internal rooms remain one offered unit',async()=>{const f=await appendixFixture();f.add('internalRooms','Two internal rooms');f.add('unitsOffered','One unit');const r=f.run();assert(r.integrations.every((i:any)=>i.status==='APPLIED'));assert.equal(r.integratedRequirements.offers[0].unitsOffered.value,1);assert.equal(r.integratedRequirements.offers[0].internalRooms.value,2);});
test('EA35 child pricing does not change family composition or imply child admission',async()=>{const f=await appendixFixture();f.add('children.adultPricingFromAge','Da 5 anni pagano come adulti');const r=f.run();assert.equal(r.integrations[0].status,'APPLIED');assert.deepEqual(r.integratedRequirements.party,f.n.party);assert.equal(r.integratedRequirements.offers[0].children.admitted.state,'UNKNOWN');});
test('EA36 a same-context contradiction stays conflicting',async()=>{const f=await appendixFixture();f.add('capacityGuests','One guest',0,{temporal:{relation:'CORROBORATE_SAME_CONTEXT'},content:{observedAt:f.n.offers[0].capacityGuests.observedAt}});const r=f.run();assert.equal(r.integrations[0].status,'CONFLICTING');assert.equal(r.requirementsEvaluation.offers[0].accommodation.capacity.status,'CONFLICTING');});
test('EA37 negative availability is preserved with precise older-observation retirement',async()=>{const f=await appendixFixture();const old=f.n.offers[0].availability.observed;f.add('availability.unavailable','Selected rate verification: unavailable',0,{temporal:{relation:'DOCUMENTED_SUCCESSOR',retiredAvailability:[{field:'availability.observed',sha256:f.hash(old)}]}});const r=f.run();assert.equal(r.integrations[0].status,'APPLIED');assert.equal(r.input.candidates[0].assessment.availability,'KNOWN_UNAVAILABLE');assert.equal(f.n.offers[0].availability.observed.value,'AVAILABLE');});
test('EA38 duplicate integration IDs cannot become repeated grants',async()=>{const f=await appendixFixture();f.add('ratingScale','Rating scale: 0-10');f.appendix.integrations.push(structuredClone(f.appendix.integrations[0]));assert.throws(f.run,/BASE_OR_SCHEMA_BINDING/);});
test('EA39 missing proof is rejected while all original candidates survive',async()=>{const f=await appendixFixture();f.add('ratingScale','Rating scale: 0-10');f.appendix.proofs=[];const r=f.run();rejected(r,/PROOF_NOT_FOUND/);assert.equal(r.output.candidates.length,3);});
test('EA40 hash-correct normalized private flag cannot contradict the actual negative statement',async()=>{const f=await appendixFixture(),p=f.add('privateBathroom','Bagno privato non disponibile');p.integration.claim.value=true;rejected(f.run(),/SEMANTIC_TRANSFORMATION_MISMATCH/);});
test('EA41 narrow retirement cannot discard a multi-service original field',async()=>{const f=await appendixFixture(),record=f.baseRun().input.candidates[0].scopedObservations.find((x:any)=>x.sourceField==='roomAmenities');f.add('privateBathroom','Bagno privato',0,{temporal:{retiredObservations:[{sourceField:'roomAmenities',sha256:f.hash(record)}]}});rejected(f.run(),/RETIREMENT_WOULD_DROP_OTHER_FACTS/);});
test('EA42 feedback injection and absent human expertise cannot determine the policy',async()=>{const f=await appendixFixture();f.complete();const a=f.run();f.request.feedback={preferred:'invented-nonexistent-id',expert:true};f.request.reviewed.feedback={preferred:'invented-nonexistent-id'};const b=f.run();assert.deepEqual(a.output,b.output);assert.equal(b.feedbackUsed,false);assert.equal(b.humanComparisonPerformed,false);assert.equal(b.independentSourceAuthentication,false);});
test('EA43 matching repeated assertions corroborate without changing their time',async()=>{const f=await appendixFixture();f.add('ratingScale','Rating scale: 0-10');f.add('ratingScale','Rating scale: 0-10');const r=f.run();assert(r.integrations.every((i:any)=>i.status==='APPLIED'));assert.equal(r.integratedRequirements.offers[0].ratingScale.observedAt,APPENDIX_OBSERVED_AT);assert.equal(f.n.offers[0].ratingScale.observedAt,'2099-09-01T12:00:00Z');});
test('EA44 numeric total grammar rejects arithmetic inconsistency rather than rounded fabricated total',async()=>{const f=await appendixFixture();assert.throws(()=>f.add('completeTotal','Complete stay cost: base 690.00 EUR + mandatory taxes 20.00 + mandatory fees 10.00 = 721.00; all mandatory charges quantified'),/COST_COMPONENTS_OR_CURRENCY/);});
test('EA45 conditional same-context proof cannot silently retain a known positive privacy certificate',async()=>{
 const f=await appendixFixture({fields:{roomName:'Unit A',roomAmenities:null,privateBathroom:true,exclusiveUse:true},normalizedClaims:{privateBathroom:true,exclusiveUse:true}});
 f.add('privateBathroom','Private bathroom on request',0,{temporal:{relation:'CORROBORATE_SAME_CONTEXT'},content:{observedAt:f.n.offers[0].privateBathroom.observedAt}});
 const r=f.run();assert.equal(r.integrations[0].status,'CONFLICTING');assert.equal(privacy(r).bathroomState,'CONFLICTING');
 assert.equal(f.n.offers[0].privateBathroom.value,true);assert.equal(r.base.input.candidates[0].privacyClaims.privateBathroom.value,true);
});
test('EA46 internally resealed transcript cannot contradict machine-readable original source bytes',async()=>{
 const f=await appendixFixture(),p=f.add('ratingScale','Rating scale: 0-10'),artifact=structuredClone(p.proof.artifact);
 p.content.statement='Rating scale: 0-100';p.integration.claim.value=100;f.seal(p.proof,p.content);p.proof.artifact=artifact;
 const {receiptSha256,...body}=p.proof.pointReview;void receiptSha256;
 body.artifactSha256=artifact.sha256;p.proof.pointReview={...body,receiptSha256:f.hash(body)};
 rejected(f.run(),/TRANSCRIPTION_DIFFERS_FROM_MACHINE_READABLE_SOURCE/);
});
test('EA47 a declared rating scale below the retained observation is rejected per field schema',async()=>{const f=await appendixFixture();f.add('ratingScale','Rating scale: 0-1');const r=f.run();assert.equal(r.integrations[0].status,'REJECTED');assert.equal(r.integratedRequirements.offers[0].ratingScale.state,'UNKNOWN');});
test('EA48 zero offered units is rejected rather than an invented usable accommodation',async()=>{const f=await appendixFixture();f.add('unitsOffered','0 units');const r=f.run();assert.equal(r.integrations[0].status,'REJECTED');assert.equal(r.integratedRequirements.offers[0].unitsOffered.value,1);});
test('EA49 distinct source artifacts cannot be fused by copying only observation IDs and timestamps',async()=>{const f=await appendixFixture();f.financial(0,false);const r=f.run();assert.equal(r.temporalGaps.length,1);assert.equal(r.output.decision.status,'abstained');});
test('EA50 complete but genuinely over-budget offers do not become recommended merely because appendix is valid',async()=>{
 const f=await appendixFixture();f.complete();for(const p of f.appendix.proofs){const c=JSON.parse(p.transcription.content);if(!c.entries)continue;
  const entry=c.entries.find((e:any)=>e.field==='completeTotal');entry.statement='Complete stay cost: base 1690.00 EUR + mandatory taxes 20.00 + mandatory fees 10.00 = 1720.00; all mandatory charges quantified';
  f.appendix.integrations.find((i:any)=>i.proofId===p.id&&i.field==='completeTotal').claim.value=1720;f.seal(p,c);
 }const r=f.run();assert(r.integrations.every((i:any)=>i.status==='APPLIED'));assert.equal(r.output.decision.status,'abstained');
 assert(r.output.decision.candidates.every((c:any)=>c.reasonCodes.includes('policy:budget-ceiling-exceeded')));
});
test('EA51 the initial 720/800/880 control really exceeds its unchanged 450 budget and abstains',async()=>{
 const f=await appendixFixture();f.complete();for(let index=0;index<3;index++){
  const integration=f.appendix.integrations.find((i:any)=>i.alternativeId===f.n.offers[index].alternativeId&&i.field==='completeTotal');
  const proof=f.appendix.proofs.find((p:any)=>p.id===integration.proofId),content=JSON.parse(proof.transcription.content),total=720+80*index;
  content.entries.find((e:any)=>e.field==='completeTotal').statement=`Complete stay cost: base ${(total-30).toFixed(2)} EUR + mandatory taxes 20.00 + mandatory fees 10.00 = ${total.toFixed(2)}; all mandatory charges quantified`;
  integration.claim.value=total;f.seal(proof,content);
 }const r=f.run();assert.equal(r.input.query.totalBudget,450);assert.equal(r.output.decision.status,'abstained');
 assert.deepEqual(r.input.candidates.map((c:any)=>c.assessment.completeTotal),[720,800,880]);
});
for(const [label,change]of [
 ['missing',(c:any)=>delete c.ratingObservationBinding],
 ['hash',(c:any)=>c.ratingObservationBinding.claimSha256='0'.repeat(64)],
 ['value',(c:any)=>c.ratingObservationBinding.observedValue=1],
] as const)test('EA52 rating scale requires the retained published observation binding '+label,async()=>{
 const f=await appendixFixture(),p=f.add('ratingScale','Rating scale: 0-10');change(p.content);f.seal(p.proof,p.content);
 const r=f.run();assert.equal(r.integrations[0].status,'REJECTED');assert.match(r.integrations[0].reason,/RATING.*BINDING|RATING.*OBSERVATION/);
 assert.equal(r.input.candidates[0].assessment.ratingOmitted,true);
});
test('EA53 non-financial appendix preserves usable historical complete cost and original unknown bookability',async()=>{
 const f=await appendixFixture({fields:{completeTotal:360},normalizedClaims:{completeTotal:360}}),before=f.baseRun();
 f.add('ratingScale','Rating scale: 0-10');f.add('unitsOffered','One unit');const r=f.run();
 assert(r.integrations.every((i:any)=>i.status==='APPLIED'));
 assert.deepEqual(r.integratedRequirements.offers.map((o:any)=>o.completeTotal),f.n.offers.map((o:any)=>o.completeTotal));
 assert.deepEqual(r.integratedRequirements.offers.map((o:any)=>o.availability),f.n.offers.map((o:any)=>o.availability));
 assert.deepEqual(r.input.candidates.map((c:any)=>c.assessment.completeTotal),before.input.candidates.map((c:any)=>c.assessment.completeTotal));
 assert.equal(r.temporalGaps.length,0);assert.equal(r.output.decision.status,'abstained');
});
for(const [key,value]of [
 ['validUntil','2099-09-01T12:10:00Z'],['sourceKind','RATE_VERIFICATION_RECORD'],
 ['sourceRef','SYNTHETIC_DIFFERENT_SOURCE'],['observedAt','2099-09-01T12:01:00Z'],['applicability','OFFER_SCOPED'],
] as const)test('EA54 multi-entry proof cannot override validated root metadata '+key,async()=>{
 const f=await appendixFixture();f.financial(0);const proof=f.appendix.proofs[0],content=JSON.parse(proof.transcription.content);
 content.validUntil='2099-09-01T12:01:30Z';for(const entry of content.entries)entry[key]=value;
 f.seal(proof,content);const r=f.run();assert.equal(r.integrations.length,2);
 for(const record of r.integrations){assert.equal(record.status,'REJECTED');assert.equal(record.reason,'APPENDIX_POINT_ENTRY_METADATA_OVERRIDE');}
 assert.equal(r.output.decision.status,'abstained');assert.equal(r.input.candidates[0].assessment.completeTotal,null);
});
test('EA55 valid financial source with expired root validity remains insufficient without overrides',async()=>{
 const f=await appendixFixture();f.financial(0);const proof=f.appendix.proofs[0],content=JSON.parse(proof.transcription.content);
 content.validUntil='2099-09-01T12:01:30Z';f.seal(proof,content);const r=f.run();
 for(const record of r.integrations){assert.equal(record.status,'INSUFFICIENT');assert.equal(record.reason,'SOURCE_VALIDITY_EXPIRED');}
 assert.equal(r.output.decision.status,'abstained');assert.equal(r.input.candidates[0].assessment.completeTotal,null);
});
test('EA56 invalid calendar date is rejected rather than normalized by Date.parse',async()=>{
 const f=await appendixFixture();f.add('ratingScale','Rating scale: 0-10',0,{content:{observedAt:'2099-02-30T12:01:00Z'}});
 rejected(f.run(),/OBSERVATION_TIME_OR_SOURCE/);
});
