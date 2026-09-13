import assert from 'node:assert/strict';
import test from 'node:test';
import {propertyRatingFixture} from './fixtures/appendixPropertyRatingSyntheticV3';

// D-0057: invented REVIEWED sources and point receipts only. No real approval,
// property identifier, private evidence, transport or custody is read here.
const policyModule=require('../../src/engine-v3/policy/personalUtilityRolePolicyV3');
const kernelModule=require('../../src/engine-v3/evaluation/observedOfferDiagnosticV3');
const invocations:{mode:string;kernel:number;policy:number;status:string}[]=[];
function measured(f:any,mode:'prepare'|'execute'='execute'){
 let kernel=0,policy=0;const originalPolicy=policyModule.runPersonalUtilityRolePolicyV3,
  originalKernel=kernelModule.computeObservedOfferDiagnosticV3;
 policyModule.runPersonalUtilityRolePolicyV3=(...args:any[])=>{policy++;return originalPolicy(...args);};
 kernelModule.computeObservedOfferDiagnosticV3=(...args:any[])=>{kernel++;return originalKernel(...args);};
 try{
  const result=mode==='prepare'?f.prepare():f.run(kernelModule.computeObservedOfferDiagnosticV3);
  if(mode==='prepare'){
   assert.equal(kernel,0);assert.equal(policy,0);
   assert.equal(Object.hasOwn(result,'output'),false);assert.equal(Object.hasOwn(result,'decision'),false);
  }else{assert.equal(kernel,1);assert.equal(policy,2);}
  invocations.push({mode,kernel,policy,status:mode==='prepare'?'PREPARED_NO_DECISION':result.output.decision?.status??'NOT_EXECUTED'});
  return result;
 }catch(error){invocations.push({mode,kernel,policy,status:'THREW'});throw error;}
 finally{policyModule.runPersonalUtilityRolePolicyV3=originalPolicy;kernelModule.computeObservedOfferDiagnosticV3=originalKernel;}
}
const ratingRecord=(r:any)=>r.integrations.find((i:any)=>i.field==='ratingScale');
const ratingFact=(r:any,index=0)=>r.input.candidates[index].facts.find((f:any)=>f.code==='review.score');
const rejected=(r:any,reason:RegExp)=>{
 assert.equal(ratingRecord(r).status,'REJECTED');assert.match(ratingRecord(r).reason,reason);
 assert.equal(ratingFact(r).value,null);
};
function resealReceipt(f:any,p:any,change:(body:any)=>void){
 const {receiptSha256,...body}=p.proof.pointReview;void receiptSha256;change(body);
 p.proof.pointReview={...body,receiptSha256:f.hash(body)};
}

test('PR01 property-scale contract has explicit versions and no tariff attestation',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty(),r=measured(f,'prepare');
 assert.equal(f.appendix.version,'stayopti.reviewed-evidence-appendix@1.3');
 assert.equal(p.content.version,'stayopti.appendix-property-rating-evidence@1');
 assert.equal(p.proof.pointReview.version,'stayopti.appendix-property-rating-review@1');
 assert.equal(Object.hasOwn(p.content,'continuity'),false);
 assert.equal(Object.hasOwn(p.content.scope,'roomKey'),false);
 assert.equal(Object.hasOwn(p.content.scope,'rateKey'),false);
 assert.equal(p.proof.pointReview.commercialVerificationAttested,false);
 assert.deepEqual(p.proof.pointReview.reviewedFields,['ratingScale']);
 assert.equal(ratingRecord(r).status,'APPLIED');assert.equal(ratingFact(r).value,8.5);
});

test('PR02 complete supported property-bound control reaches the actual usable policy',async()=>{
 const f=await propertyRatingFixture();f.financial(0);f.addProperty();const r=measured(f);
 assert.equal(r.output.policyExecuted,true);assert.equal(r.output.decision.status,'usable');
 assert.equal(r.output.candidates.length,3);assert.equal(ratingRecord(r).status,'APPLIED');
 assert.equal(r.output.publicIntegrationEnabled,false);assert.equal(r.goldenAdmission,false);
});

test('PR03 materialized property motivation comes from the observation linkage, not a rate basis',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty(),r=measured(f,'prepare'),claim=r.integratedRequirements.offers[0].ratingScale;
 assert.equal(claim.applicability,'PROPERTY_WIDE');
 assert.equal(claim.propertyBinding.reason,p.content.propertyObservationLink.basis);
 assert.equal(claim.propertyBinding.alternativeId,f.n.offers[0].alternativeId);
 assert.deepEqual(claim.sourceInterval,{minimum:1,maximum:10});assert.equal(claim.sourceStatement,'Rating scale: 1-10');
 assert.equal(r.base.normalization.offers[0].ratingScale.state,'UNKNOWN');
});

test('PR04 historical rating capture and rule acquisition remain separate with honest validity limits',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty(),r=measured(f,'prepare');
 assert.equal(p.content.scope.ratingObservation.capturedAt,'2099-09-01T12:00:00Z');
 assert.equal(p.content.observedAt,'2099-09-01T12:01:00Z');
 assert.equal(p.content.propertyObservationLink.historicalValidity,'NOT_INDEPENDENTLY_CERTIFIED');
 assert(p.content.propertyObservationLink.historicalValidityLimitations.length>0);
 assert.equal(r.integratedRequirements.offers[0].ratingObserved.observedAt,'2099-09-01T12:00:00Z');
 assert.equal(r.integratedRequirements.offers[0].ratingScale.observedAt,'2099-09-01T12:01:00Z');
 assert.equal(p.content.validUntil,null);
});

test('PR05 equal property names and equal ratings do not authorize cross-alternative proof reuse',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();
 assert.equal(f.n.offers[0].ratingObserved.value,f.n.offers[1].ratingObserved.value);
 p.integration.alternativeId=f.n.offers[1].alternativeId;
 const r=measured(f,'prepare');rejected(r,/PROPERTY_RATING_IDENTITY_OR_OBSERVATION_BINDING/);
 assert(r.input.candidates.every((_:any,i:number)=>ratingFact(r,i).value===null));
});

test('PR06 a self-consistent other-property scope is still not the selected historical observation',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();
 p.content.scope=f.m.createReviewedPropertyRatingScope(f.request,f.n.offers[1].alternativeId);
 p.content.propertyObservationLink.scopeSha256=f.hash(p.content.scope);f.sealProperty(p.proof,p.content);
 rejected(measured(f,'prepare'),/PROPERTY_RATING_IDENTITY_OR_OBSERVATION_BINDING/);
});

for(const [label,mutate]of [
 ['rating-claim',(s:any)=>s.ratingObservation.claimSha256='0'.repeat(64)],
 ['rating-field',(s:any)=>s.ratingObservation.fieldSha256='0'.repeat(64)],
 ['property-field',(s:any)=>s.propertyIdentity.fieldSha256='0'.repeat(64)],
 ['rating-proof',(s:any)=>s.ratingObservation.evidence[0].sha256='0'.repeat(64)],
 ['property-proof',(s:any)=>s.propertyIdentity.evidence[0].ref='OTHER_INVENTED_PROOF'],
 ['captured-at',(s:any)=>s.ratingObservation.capturedAt='2099-09-01T11:59:00Z'],
 ['journal',(s:any)=>s.journalHash='0'.repeat(64)],
 ['projection',(s:any)=>s.projectionFingerprint='0'.repeat(64)],
] as const)test('PR07 resealed proof cannot alter reviewed '+label,async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();mutate(p.content.scope);
 p.content.propertyObservationLink.scopeSha256=f.hash(p.content.scope);f.sealProperty(p.proof,p.content);
 rejected(measured(f,'prepare'),/PROPERTY_RATING_IDENTITY_OR_OBSERVATION_BINDING/);
});

test('PR08 exact reviewed source transformations remain checked before any appendix processing',async()=>{
 const f=await propertyRatingFixture();f.addProperty();f.n.offers[0].ratingObserved.value=9;
 assert.throws(()=>measured(f,'prepare'),/RATING|SOURCE|NORMALIZATION/);
 assert.deepEqual(invocations.at(-1),{mode:'prepare',kernel:0,policy:0,status:'THREW'});
});

test('PR09 changed base packet binding is an input rejection, not a policy abstention',async()=>{
 const f=await propertyRatingFixture();f.addProperty();f.appendix.base.packetHash='0'.repeat(64);
 assert.throws(()=>measured(f),/BASE_OR_SCHEMA_BINDING/);
 assert.deepEqual(invocations.at(-1),{mode:'execute',kernel:0,policy:0,status:'THREW'});
});

for(const [label,mutate,reason]of [
 ['artifact bytes',(p:any)=>p.proof.artifact.base64=Buffer.from('altered invented rule').toString('base64'),/PROOF_BYTES_HASH/],
 ['transcription',(p:any)=>p.proof.transcription.content+=' ',/TRANSCRIPTION_HASH/],
 ['receipt hash',(p:any)=>p.proof.pointReview.receiptSha256='0'.repeat(64),/POINT_REVIEW_HASH/],
 ['pending review',(p:any)=>p.proof.pointReview=null,/POINT_REVIEW_BINDING_OR_PENDING/],
] as const)test('PR10 property source preserves '+label+' verification',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();mutate(p);rejected(measured(f,'prepare'),reason);
});

for(const [label,mutate,reason]of [
 ['tariff-method',(r:any)=>r.method='SOURCE_CONTENT_AND_EXACT_OFFER_SCOPE_CHECK',/POINT_REVIEW_BINDING_OR_PENDING/],
 ['legacy-receipt',(r:any)=>r.version='stayopti.appendix-point-review@1',/POINT_REVIEW_BINDING_OR_PENDING/],
 ['fictional-human',(r:any)=>r.actorKind='HUMAN',/POINT_REVIEW_BINDING_OR_PENDING/],
 ['wrong-property',(r:any)=>r.propertyScopeSha256='0'.repeat(64),/PROPERTY_RATING_REVIEW_SCOPE/],
 ['wrong-link',(r:any)=>r.propertyObservationLinkSha256='0'.repeat(64),/PROPERTY_RATING_REVIEW_SCOPE/],
 ['commercial-attestation',(r:any)=>r.commercialVerificationAttested=true,/PROPERTY_RATING_REVIEW_SCOPE/],
 ['extra-reviewed-field',(r:any)=>r.reviewedFields.push('completeTotal'),/PROPERTY_RATING_REVIEW_SCOPE/],
] as const)test('PR11 hash-correct but wrong '+label+' receipt is not a point approval',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();resealReceipt(f,p,mutate);
 rejected(measured(f,'prepare'),reason);
});

for(const [label,mutate]of [
 ['source',(c:any)=>c.propertyObservationLink.ruleSourceRef='OTHER_INVENTED_RULE'],
 ['relation',(c:any)=>c.propertyObservationLink.relation='SCALE_OF_ANY_SCORE_ON_PAGE'],
 ['missing-basis',(c:any)=>c.propertyObservationLink.basis=''],
 ['missing-historical-limit',(c:any)=>c.propertyObservationLink.historicalValidityLimitations=''],
 ['invented-certification',(c:any)=>c.propertyObservationLink.historicalValidity='INDEPENDENTLY_CERTIFIED'],
] as const)test('PR12 incomplete or overclaimed property linkage '+label+' stays rejected',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();mutate(p.content);f.sealProperty(p.proof,p.content);
 rejected(measured(f,'prepare'),/PROPERTY_RATING_LINK_UNVERIFIED/);
});

test('PR13 property path does not silently accept an attached historical-rate certification',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();p.content.continuity={kind:'SAME_HISTORICAL_RATE',basis:'Not a property-rating claim'};
 f.sealProperty(p.proof,p.content);rejected(measured(f,'prepare'),/PROPERTY_RATING_TARIFF_ATTESTATION_FORBIDDEN/);
});

for(const field of ['completeTotal','availability.bookability','sleeping','privateBathroom'])
 test('PR14 property-rating version cannot authorize '+field+' before kernel',async()=>{
  const f=await propertyRatingFixture(),p=f.addProperty();p.integration.field=field;p.content.field=field;
  f.sealProperty(p.proof,p.content);
  assert.throws(()=>measured(f),/PROPERTY_RATING_ONLY/);
  assert.deepEqual(invocations.at(-1),{mode:'execute',kernel:0,policy:0,status:'THREW'});
 });

test('PR15 multi-entry property document cannot hide a commercial entry behind rating-only selection',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();
 p.content.entries=[{field:'ratingScale',statement:p.content.statement,temporal:p.content.temporal},
  {field:'availability.bookability',statement:'Selected rate verification: bookable',temporal:p.content.temporal}];
 delete p.content.field;delete p.content.statement;delete p.content.temporal;f.sealProperty(p.proof,p.content);
 assert.throws(()=>measured(f),/PROPERTY_RATING_ONLY/);
 assert.deepEqual(invocations.at(-1),{mode:'execute',kernel:0,policy:0,status:'THREW'});
});

test('PR16 complete selection of mixed property-document fields is not an exact-rate certificate',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty(),extra=f.add('availability.bookability','Selected rate verification: bookable');
 p.content.entries=[{field:'ratingScale',statement:p.content.statement,temporal:p.content.temporal},
  {field:extra.content.field,statement:extra.content.statement,temporal:extra.content.temporal}];
 delete p.content.field;delete p.content.statement;delete p.content.temporal;
 extra.integration.proofId=p.proof.id;f.appendix.proofs=f.appendix.proofs.filter((v:any)=>v.id!==extra.proof.id);
 f.sealProperty(p.proof,p.content);assert.throws(()=>measured(f),/PROPERTY_RATING_ONLY/);
 assert.deepEqual(invocations.at(-1),{mode:'execute',kernel:0,policy:0,status:'THREW'});
});

test('PR17 the ordinary tariff path still requires its exact historical-rate continuity',async()=>{
 const f=await propertyRatingFixture(),p=f.add('availability.bookability','Selected rate verification: bookable');
 delete p.content.continuity;f.seal(p.proof,p.content);const r=measured(f,'prepare');
 assert.equal(r.integrations[0].status,'REJECTED');assert.match(r.integrations[0].reason,/HISTORICAL_RATE_CONTINUITY_UNPROVEN/);
 assert.equal(r.integratedRequirements.offers[0].availability.bookability.state,'UNKNOWN');
});

test('PR18 an explicit property-scale expiry stays effective without inventing static deadlines',async()=>{
 const expired=await propertyRatingFixture({stars:null}),fresh=await propertyRatingFixture({stars:null});
 for(const f of [expired,fresh])f.financial(0);
 expired.addProperty(0,'Rating scale: 1-10',{content:{validUntil:'2099-09-01T12:01:30Z'}});
 fresh.addProperty(0,'Rating scale: 1-10',{content:{validUntil:'2099-09-01T12:10:00Z'}});
 const a=measured(expired),b=measured(fresh);
 assert.equal(ratingRecord(a).status,'INSUFFICIENT');assert.equal(ratingRecord(a).reason,'SOURCE_VALIDITY_EXPIRED');
 assert.equal(ratingFact(a).value,null);assert.equal(a.output.decision.status,'abstained');
 assert.equal(ratingRecord(b).status,'APPLIED');assert.equal(b.output.decision.status,'usable');
});

for(const value of [.5,10.5])test('PR19 precise historical score outside documented interval is not promoted '+value,async()=>{
 const f=await propertyRatingFixture({value,stars:null});f.financial(0);f.addProperty();const r=measured(f);
 rejected(r,/RATING_OBSERVATION_OUTSIDE_DOCUMENTED_INTERVAL/);
 assert.equal(r.integratedRequirements.offers[0].ratingObserved.value,value);assert.equal(r.output.decision.status,'abstained');
});

test('PR20 conflicting applicable intervals are retained and no favorable interval wins by order',async()=>{
 const f=await propertyRatingFixture({stars:null});f.financial(0);f.addProperty();f.addProperty(0,'Rating scale: 0-10');
 const a=measured(f);f.appendix.integrations.reverse();f.appendix.proofs.reverse();const b=measured(f);
 assert(a.integrations.filter((i:any)=>i.field==='ratingScale').every((i:any)=>i.status==='CONFLICTING'));
 assert.equal(a.integratedRequirements.offers[0].ratingScale.state,'CONFLICTING');assert.equal(ratingFact(a).value,null);
 assert.equal(a.output.decision.status,'abstained');assert.deepEqual(a.output,b.output);
});

test('PR21 rating integration alone cannot supply complete cost or verified bookability',async()=>{
 const f=await propertyRatingFixture({stars:null});f.addProperty();const p=measured(f,'prepare'),r=measured(f);
 assert.equal(ratingRecord(p).status,'APPLIED');assert.equal(ratingFact(r).value,8.5);
 assert.equal(r.integratedRequirements.offers[0].completeTotal.state,'UNKNOWN');
 assert.equal(r.integratedRequirements.offers[0].availability.bookability.state,'UNKNOWN');
 assert.equal(r.output.decision.status,'abstained');assert.equal(r.output.policyExecuted,true);
 assert.equal(r.output.candidates.length,3);
});

test('PR22 property and legacy exact-rate paths preserve the same numerical calculation and policy',async()=>{
 const a=await propertyRatingFixture(),b=await propertyRatingFixture();a.financial(0);b.financial(0);
 a.addProperty();b.add('ratingScale','Rating scale: 1-10',0,{content:{applicability:'PROPERTY_WIDE'}});
 const x=measured(a),y=measured(b);
 assert.deepEqual(x.output.candidates.map((c:any)=>c.calculated.quality),y.output.candidates.map((c:any)=>c.calculated.quality));
 assert.deepEqual(x.output.policyInput,y.output.policyInput);assert.deepEqual(x.output.decision,y.output.decision);
});

test('PR23 original inputs, journals, unknowns and both receipts stay unchanged by repeat preparation/execution',async()=>{
 const f=await propertyRatingFixture();f.financial(0);f.addProperty();const before=f.hash({r:f.request,a:f.appendix});
 const p=measured(f,'prepare'),q=measured(f,'prepare'),r=measured(f),s=measured(f);
 assert.deepEqual(p,q);assert.deepEqual(r,s);assert.equal(f.hash({r:f.request,a:f.appendix}),before);
 assert.deepEqual(r.input,p.input);assert.equal(r.originalReviewUnchanged,true);assert.equal(r.newGeneralReviewCreated,false);
 assert.equal(r.feedbackUsed,false);assert.equal(r.goldenAdmission,false);
});

test('PR24 empty appendix preserves the old computation without claiming to execute during preparation',async()=>{
 const f=await propertyRatingFixture(),before=f.baseRun(),p=measured(f,'prepare'),r=measured(f);
 assert.deepEqual(p.input,before.input);assert.deepEqual(r.output,before.output);assert.equal(p.consumedFacts.length,0);
});

test('PR25 unsupported conditional rule is insufficient without erasing the original observation',async()=>{
 const f=await propertyRatingFixture({stars:null});f.financial(0);f.addProperty(0,'Rating scale: 1-10 if applicable');
 const r=measured(f);assert.equal(ratingRecord(r).status,'INSUFFICIENT');assert.equal(ratingFact(r).value,null);
 assert.equal(r.integratedRequirements.offers[0].ratingObserved.value,8.5);assert.equal(r.output.decision.status,'abstained');
});

test('PR26 caller-normalized scale cannot contradict the exact reviewed source statement',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty();p.integration.claim.value=5;
 rejected(measured(f,'prepare'),/SEMANTIC_TRANSFORMATION_MISMATCH/);
});

test('PR27 no blanket promotion to all equal scores follows from one valid property observation link',async()=>{
 const f=await propertyRatingFixture();f.addProperty();const r=measured(f,'prepare');
 assert.equal(ratingFact(r,0).value,8.5);assert.equal(ratingFact(r,1).value,null);assert.equal(ratingFact(r,2).value,null);
 assert(r.integratedRequirements.offers.slice(1).every((o:any)=>o.ratingScale.state==='UNKNOWN'));
});

test('PR28 missing original property identity cannot be replaced by a caller-generated scope',async()=>{
 const f=await propertyRatingFixture({fields:{propertyName:null}}),before=f.hash(f.request);
 assert.throws(()=>f.m.createReviewedPropertyRatingScope(f.request,f.n.offers[0].alternativeId),/PROPERTY_RATING_REVIEWED_IDENTITY_REQUIRED/);
 assert.equal(f.hash(f.request),before);
});

test('PR29 a rule acquired before rating capture retains both clocks without inventing a historic certificate',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty(0,'Rating scale: 1-10',{content:{observedAt:'2099-09-01T11:00:00Z'}});
 const r=measured(f,'prepare');assert.equal(ratingRecord(r).status,'APPLIED');
 assert.equal(r.integratedRequirements.offers[0].ratingObserved.observedAt,'2099-09-01T12:00:00Z');
 assert.equal(r.integratedRequirements.offers[0].ratingScale.observedAt,'2099-09-01T11:00:00Z');
 assert.equal(p.content.propertyObservationLink.historicalValidity,'NOT_INDEPENDENTLY_CERTIFIED');
});

test('PR30 a property-observation review cannot precede the observation it claims to review',async()=>{
 const f=await propertyRatingFixture(),p=f.addProperty(0,'Rating scale: 1-10',{content:{observedAt:'2099-09-01T11:00:00Z'}});
 resealReceipt(f,p,(r:any)=>r.reviewedAt='2099-09-01T11:30:00Z');
 rejected(measured(f,'prepare'),/PROPERTY_RATING_REVIEW_SCOPE/);
});

test('PR31 a commercial source-kind cannot be relabelled as this noncommercial property-rule proof',async()=>{
 const f=await propertyRatingFixture();f.addProperty(0,'Rating scale: 1-10',{content:{sourceKind:'RATE_VERIFICATION_RECORD'}});
 rejected(measured(f,'prepare'),/PROPERTY_RATING_COMMERCIAL_SOURCE_KIND/);
});

test('PR32 an equal numerical observation linked to beds is not a rating-source binding',async()=>{
 const f=await propertyRatingFixture();f.n.offers[0].ratingObserved.links[0].field='beds';
 assert.throws(()=>f.m.createReviewedPropertyRatingScope(f.request,f.n.offers[0].alternativeId),/PROPERTY_RATING_REVIEWED_IDENTITY_REQUIRED/);
});

test('PR33 an older appendix version is rejected rather than silently migrated',async()=>{
 const f=await propertyRatingFixture();f.addProperty();f.appendix.version='stayopti.reviewed-evidence-appendix@1.2';
 const before=f.hash(f.appendix);assert.throws(()=>measured(f,'prepare'),/BASE_OR_SCHEMA_BINDING/);
 assert.equal(f.hash(f.appendix),before);assert.deepEqual(invocations.at(-1),{mode:'prepare',kernel:0,policy:0,status:'THREW'});
});

test('PR34 the supported single-entry representation has no shadow scalar field and remains usable',async()=>{
 const f=await propertyRatingFixture();f.financial(0);const p=f.addProperty();
 p.content.entries=[{field:p.content.field,statement:p.content.statement,temporal:p.content.temporal}];
 delete p.content.field;delete p.content.statement;delete p.content.temporal;f.sealProperty(p.proof,p.content);
 const r=measured(f);assert.equal(ratingRecord(r).status,'APPLIED');assert.equal(r.output.decision.status,'usable');
 assert.equal(ratingFact(r).value,8.5);
});

test('PR99 measured pure verification is not a decision or abstention; executor counts are explicit',t=>{
 const pure=invocations.filter(v=>v.mode==='prepare'),executions=invocations.filter(v=>v.mode==='execute');
 assert(pure.length>0);assert(pure.every(v=>v.kernel===0&&v.policy===0));
 assert(executions.some(v=>v.status==='usable'&&v.kernel===1&&v.policy===2));
 assert(executions.some(v=>v.status==='abstained'&&v.kernel===1&&v.policy===2));
 assert(executions.filter(v=>v.status==='THREW').every(v=>v.kernel===0&&v.policy===0));
 t.diagnostic(JSON.stringify({phase:'D-0057',syntheticOnly:true,purePreparationCalls:pure.length,
  kernelInvocations:invocations.reduce((n,v)=>n+v.kernel,0),actualPolicyInvocations:invocations.reduce((n,v)=>n+v.policy,0),
  invocations,realInvocations:0,networkCalls:0}));
});
