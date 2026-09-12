import assert from 'node:assert/strict';
import test from 'node:test';
import {appendixFixture} from './fixtures/reviewedEvidenceAppendixSyntheticV3';
import {computeObservedOfferDiagnosticV3} from '../../src/engine-v3/evaluation/observedOfferDiagnosticV3';

// Synthetic REVIEWED entry only. The unchanged historical fixture still uses
// its own 0-10 statement; no real source is changed to resemble this control.
const policyModule=require('../../src/engine-v3/policy/personalUtilityRolePolicyV3');
const invocations:{kernel:number;policy:number;status:string}[]=[];
function measured(f:any){
 let kernel=0,policy=0;const original=policyModule.runPersonalUtilityRolePolicyV3;
 policyModule.runPersonalUtilityRolePolicyV3=(...args:any[])=>{policy++;return original(...args);};
 try{
  const result=f.run((input:any)=>{kernel++;return computeObservedOfferDiagnosticV3(input);});
  assert.equal(kernel,1);assert.equal(policy,2); // actual strong-distance baseline plus final policy
  invocations.push({kernel,policy,status:result.output.decision?.status??'NOT_EXECUTED'});
  return result;
 }catch(error){invocations.push({kernel,policy,status:'THREW'});throw error;}
 finally{policyModule.runPersonalUtilityRolePolicyV3=original;}
}
async function ratingFixture(value=8.5,stars:number|null=4){
 const f=await appendixFixture({fields:{rating:value,ratingObserved:value,stars},normalizedClaims:{ratingObserved:value}});
 // New synthetic source values were sealed before its synthetic review. The
 // normalization is then required to equal those exact original field values.
 for(const o of f.n.offers)o.ratingObserved.links[0].field='rating';
 f.appendix.base=f.m.createReviewedAppendixBinding(f.request);
 return f;
}
const ratingFact=(r:any,index=0)=>r.input.candidates[index].facts.find((f:any)=>f.code==='review.score');
const ratingRecord=(r:any)=>r.integrations.find((i:any)=>i.field==='ratingScale');
const range={minimum:1,maximum:10};

test('RR01 documented 1-10 has a source interval distinct from its legacy numeric maximum',async()=>{
 const f=await ratingFixture(),r=f.m.interpretAppendixStatement('ratingScale','Rating scale: 1-10','EUR');
 assert.equal(r.state,'KNOWN');assert.equal(r.value,10);assert.deepEqual(r.sourceInterval,range);
});
for(const statement of ['Rating scale: 1–10',' Rating scale: 1-10 '])
 test('RR02 documented bounded punctuation/space variant '+statement,async()=>{
  const f=await ratingFixture(),r=f.m.interpretAppendixStatement('ratingScale',statement,'EUR');
  assert.equal(r.state,'KNOWN');assert.equal(r.value,10);assert.deepEqual(r.sourceInterval,range);
 });
for(const statement of ['Rating scale: 0-10','Rating scale: 0-5','Rating scale: 0-7.5'])
 test('RR03 old supported grammar remains numerical '+statement,async()=>{
  const f=await ratingFixture(),r=f.m.interpretAppendixStatement('ratingScale',statement,'EUR');
  assert.equal(r.state,'KNOWN');assert.equal(r.value,Number(statement.split('-')[1]));
  assert.deepEqual(r.sourceInterval,{minimum:0,maximum:r.value});
 });
for(const statement of ['Rating scale: not 1-10','Rating scale: 1-10 if applicable','Rating scale might be 1-10',
 'Rating scale: 1-10 or 1-5','Rating scale: 1-10; unavailable','Rating scale: UNKNOWN','Rating scale: 2-10','Rating scale: 1-5','Rating scale: 1 - 10'])
 test('RR04 unsupported ambiguous negated conditional range stays explicit '+statement,async()=>{
  const f=await ratingFixture(),r=f.m.interpretAppendixStatement('ratingScale',statement,'EUR');
  assert.equal(r.state,'UNKNOWN');assert.equal(r.value,null);assert.equal(typeof r.reason,'string');
 });
test('RR05 complete supported REVIEWED range reaches the kernel and actual usable policy',async()=>{
 const f=await ratingFixture();f.financial(0);const p=f.add('ratingScale','Rating scale: 1-10');
 const before=f.hash({request:f.request,appendix:f.appendix}),r=measured(f);
 assert.equal(r.output.decision.status,'usable');assert.equal(ratingRecord(r).status,'APPLIED');
 assert.equal(ratingFact(r).value,8.5);assert.deepEqual(r.integratedRequirements.offers[0].ratingScale.sourceInterval,range);
 assert.deepEqual(r.consumedFacts.find((c:any)=>c.field==='ratingScale').claim.sourceInterval,range);
 assert.equal(r.integratedRequirements.offers[0].ratingScale.sourceStatement,p.content.statement);
 assert.equal(r.consumedFacts.find((c:any)=>c.field==='ratingScale').claim.sourceStatement,p.content.statement);
 assert.equal(p.content.statement,'Rating scale: 1-10');
 assert.equal(f.hash({request:f.request,appendix:f.appendix}),before);
 assert.equal(r.base.normalization.offers[0].ratingScale.state,'UNKNOWN');
 assert.equal(r.goldenAdmission,false);assert.equal(r.output.publicIntegrationEnabled,false);
});
test('RR06 8.5 remains numerically identical to supported 0-10 control, without interval rescaling',async()=>{
 const one=await ratingFixture(),zero=await ratingFixture();one.financial(0);zero.financial(0);
 one.add('ratingScale','Rating scale: 1-10');zero.add('ratingScale','Rating scale: 0-10');
 const a=measured(one),b=measured(zero);
 assert.equal(ratingFact(a).value,8.5);assert.equal(ratingFact(b).value,8.5);
 assert.deepEqual(a.output.candidates.map((c:any)=>c.calculated.quality),b.output.candidates.map((c:any)=>c.calculated.quality));
 assert.deepEqual(a.output.policyInput,b.output.policyInput);assert.deepEqual(a.output.decision,b.output.decision);
});
test('RR07 without stars valid scale supplies rating quality and complete offer remains usable',async()=>{
 const f=await ratingFixture(8.5,null);f.financial(0);f.add('ratingScale','Rating scale: 1-10');
 const r=measured(f),q=r.output.candidates[0].calculated.quality;
 assert.equal(q.starQuality.stars,null);assert.equal(q.starQuality.available,false);
 assert.equal(q.reviewQuality.rawScore,8.5);assert.notEqual(q.reviewQuality.normalizedScore,null);
 assert.notEqual(r.output.candidates[0].policy.dimensions.quality.score,null);assert.equal(r.output.decision.status,'usable');
});
test('RR08 scale alone does not manufacture cost or bookability; actual policy abstains',async()=>{
 const f=await ratingFixture(8.5,null);f.add('ratingScale','Rating scale: 1-10');const r=measured(f);
 assert.equal(ratingFact(r).value,8.5);assert.equal(r.integratedRequirements.offers[0].completeTotal.state,'UNKNOWN');
 assert.equal(r.integratedRequirements.offers[0].availability.bookability.state,'UNKNOWN');
 assert.equal(r.input.candidates[0].assessment.completeTotal,null);assert.equal(r.output.decision.status,'abstained');
 assert.equal(r.output.policyExecuted,true);assert.equal(r.output.candidates.length,3);
});
for(const value of [0,.5,10.5])test('RR09 historical observed rating outside documented 1-10 is not promoted '+value,async()=>{
 const f=await ratingFixture(value,null);f.financial(0);f.add('ratingScale','Rating scale: 1-10');const r=measured(f);
 assert.notEqual(ratingRecord(r).status,'APPLIED');assert.equal(r.integratedRequirements.offers[0].ratingScale.state,'UNKNOWN');
 assert.equal(r.integratedRequirements.offers[0].ratingObserved.value,value);assert.equal(ratingFact(r).value,null);
 assert.equal(r.output.candidates[0].calculated.quality.reviewQuality.rawScore,null);assert.equal(r.output.decision.status,'abstained');
});
for(const value of [1,10])test('RR10 inclusive documented boundary retains observed value '+value,async()=>{
 const f=await ratingFixture(value);f.add('ratingScale','Rating scale: 1-10');const r=measured(f);
 assert.equal(ratingRecord(r).status,'APPLIED');assert.equal(ratingFact(r).value,value);
});
test('RR11 inapplicable source cannot promote rating despite valid bytes and point receipt',async()=>{
 const f=await ratingFixture();f.add('ratingScale','Rating scale: 1-10',0,{content:{applicability:'UNVERIFIED'}});
 const r=measured(f);assert.equal(ratingRecord(r).status,'REJECTED');assert.match(ratingRecord(r).reason,/FIELD_APPLICABILITY_UNSUPPORTED/);
 assert.equal(ratingFact(r).value,null);
});
test('RR12 documented PROPERTY_WIDE scale remains bound to only the named original observation',async()=>{
 const f=await ratingFixture();f.add('ratingScale','Rating scale: 1-10',0,{content:{applicability:'PROPERTY_WIDE'}});
 const r=measured(f);assert.equal(ratingRecord(r).status,'APPLIED');assert.equal(ratingFact(r).value,8.5);
 assert(r.input.candidates.slice(1).every((_:any,i:number)=>ratingFact(r,i+1).value===null));
});
for(const change of ['claimSha256','observedValue','relation'])test('RR13 incorrect precise rating-observation binding refuses promotion '+change,async()=>{
 const f=await ratingFixture(),p=f.add('ratingScale','Rating scale: 1-10');
 p.content.ratingObservationBinding[change]=change==='claimSha256'?'0'.repeat(64):change==='observedValue'?8.4:'SOME_RATING_ON_PAGE';
 f.seal(p.proof,p.content);const r=measured(f);
 assert.equal(ratingRecord(r).status,'REJECTED');assert.match(ratingRecord(r).reason,/RATING_OBSERVATION_SOURCE_BINDING/);
 assert.equal(ratingFact(r).value,null);
});
test('RR14 byte tampering still refuses the integration before any rating use',async()=>{
 const f=await ratingFixture(),p=f.add('ratingScale','Rating scale: 1-10');p.proof.artifact.base64=Buffer.from('different synthetic source').toString('base64');
 const r=measured(f);assert.equal(ratingRecord(r).status,'REJECTED');assert.match(ratingRecord(r).reason,/PROOF_BYTES_HASH/);assert.equal(ratingFact(r).value,null);
});
test('RR15 incompatible room scope does not become an automatically page-wide scale',async()=>{
 const f=await ratingFixture(),p=f.add('ratingScale','Rating scale: 1-10');p.content.scope.roomKey='Other invented room';f.seal(p.proof,p.content);
 const r=measured(f);assert.equal(ratingRecord(r).status,'REJECTED');assert.match(ratingRecord(r).reason,/ROOM_RATE_STAY_PARTY_CURRENCY_SCOPE/);
 assert.equal(ratingFact(r).value,null);
});
test('RR16 caller cannot change numeric maximum without changing reviewed statement',async()=>{
 const f=await ratingFixture(),p=f.add('ratingScale','Rating scale: 1-10');p.integration.claim.value=9;const r=measured(f);
 assert.equal(ratingRecord(r).status,'REJECTED');assert.match(ratingRecord(r).reason,/SEMANTIC_TRANSFORMATION_MISMATCH/);
 assert.equal(ratingFact(r).value,null);
});
test('RR17 repeated range application is deterministic and originals remain immutable',async()=>{
 const f=await ratingFixture();f.financial(0);f.add('ratingScale','Rating scale: 1-10');const before=f.hash({request:f.request,appendix:f.appendix});
 const a=measured(f),b=measured(f);assert.deepEqual(a,b);assert.equal(f.hash({request:f.request,appendix:f.appendix}),before);
});
test('RR18 stale packet binding fails before kernel rather than being reported as policy abstention',async()=>{
 const f=await ratingFixture();f.add('ratingScale','Rating scale: 1-10');f.appendix.base.packetHash='0'.repeat(64);
 assert.throws(()=>measured(f),/BASE_OR_SCHEMA_BINDING/);assert.deepEqual(invocations.at(-1),{kernel:0,policy:0,status:'THREW'});
});
test('RR19 applicable narrower scale disqualifies incompatible historically normalized rating without erasing history',async()=>{
 const f=await appendixFixture({fields:{rating:.5,ratingObserved:.5,ratingScale:10,stars:null},normalizedClaims:{ratingObserved:.5,ratingScale:10}});
 for(const o of f.n.offers)o.ratingObserved.links[0].field='rating';
 f.appendix.base=f.m.createReviewedAppendixBinding(f.request);f.financial(0);
 const baseline=f.original.prepareObservedOfferDiagnostic(f.request);assert.equal(ratingFact(baseline).value,.5);
 f.add('ratingScale','Rating scale: 1-10');const before=f.hash(f.request),r=measured(f);
 assert.equal(ratingRecord(r).status,'CONFLICTING');assert.equal(r.integratedRequirements.offers[0].ratingScale.state,'CONFLICTING');
 assert.equal(ratingFact(r).value,null);assert.equal(r.base.normalization.offers[0].ratingScale.value,10);
 assert.equal(r.base.normalization.offers[0].ratingObserved.value,.5);assert.equal(f.hash(f.request),before);
 assert.equal(r.output.decision.status,'abstained');
});
test('RR20 inapplicable narrower proof cannot invalidate an applicable known historical scale',async()=>{
 const f=await appendixFixture({fields:{rating:.5,ratingObserved:.5,ratingScale:10},normalizedClaims:{ratingObserved:.5,ratingScale:10}});
 for(const o of f.n.offers)o.ratingObserved.links[0].field='rating';
 f.appendix.base=f.m.createReviewedAppendixBinding(f.request);
 f.add('ratingScale','Rating scale: 1-10',0,{content:{applicability:'UNVERIFIED'}});const r=measured(f);
 assert.equal(ratingRecord(r).status,'REJECTED');assert.match(ratingRecord(r).reason,/FIELD_APPLICABILITY_UNSUPPORTED/);
 assert.equal(r.integratedRequirements.offers[0].ratingScale.state,'KNOWN');assert.equal(ratingFact(r).value,.5);
});
test('RR21 conditional scale cannot supply missing no-star quality through complete REVIEWED path',async()=>{
 const f=await ratingFixture(8.5,null);f.financial(0);f.add('ratingScale','Rating scale: 1-10 if applicable');const r=measured(f);
 assert.equal(ratingRecord(r).status,'INSUFFICIENT');assert.equal(ratingFact(r).value,null);
 assert.equal(r.output.candidates[0].calculated.quality.starQuality.stars,null);assert.equal(r.output.candidates[0].policy.dimensions.quality.score,null);
 assert.equal(r.output.decision.status,'abstained');
});
test('RR22 caller-provided interval cannot replace the bounded interval parsed from reviewed source bytes',async()=>{
 const f=await ratingFixture(),p=f.add('ratingScale','Rating scale: 1-10');Object.assign(p.integration.claim,{sourceInterval:{minimum:0,maximum:10}});
 const r=measured(f);assert.equal(ratingRecord(r).status,'APPLIED');assert.deepEqual(r.integratedRequirements.offers[0].ratingScale.sourceInterval,range);
});
test('RR23 two documented but different source intervals conflict without last-wins authority',async()=>{
 const f=await ratingFixture();f.add('ratingScale','Rating scale: 0-10');f.add('ratingScale','Rating scale: 1-10');
 const a=measured(f);f.appendix.integrations.reverse();f.appendix.proofs.reverse();const b=measured(f);
 assert(a.integrations.every((i:any)=>i.status==='CONFLICTING'));assert.equal(ratingFact(a).value,null);assert.deepEqual(a.output,b.output);
});
test('RR24 incompatible applicable scale is not hidden by a favorable same-observation scale in either order',async()=>{
 const f=await ratingFixture(.5,null);f.financial(0);f.add('ratingScale','Rating scale: 0-10');f.add('ratingScale','Rating scale: 1-10');
 const before=f.hash(f.request),a=measured(f);f.appendix.integrations.reverse();f.appendix.proofs.reverse();const b=measured(f);
 assert.equal(a.integratedRequirements.offers[0].ratingScale.state,'CONFLICTING');assert.equal(ratingFact(a).value,null);
 assert(a.integrations.filter((i:any)=>i.field==='ratingScale').every((i:any)=>i.status==='CONFLICTING'));
 assert.equal(a.output.decision.status,'abstained');assert.deepEqual(a.output,b.output);assert.equal(f.hash(f.request),before);
});
test('RR99 record actual invocation counts; rejected individual evidence is not a no-execution preflight',t=>{
 assert(invocations.some(r=>r.status==='abstained'&&r.kernel===1&&r.policy===2));
 assert(invocations.some(r=>r.status==='usable'&&r.kernel===1&&r.policy===2));
 assert(invocations.filter(r=>r.status==='THREW').every(r=>r.kernel===0&&r.policy===0));
 t.diagnostic(JSON.stringify({phase:'D-0056',syntheticOnly:true,kernelInvocations:invocations.reduce((n,r)=>n+r.kernel,0),
  actualPolicyInvocations:invocations.reduce((n,r)=>n+r.policy,0),invocations,realInvocations:0,networkCalls:0}));
});
