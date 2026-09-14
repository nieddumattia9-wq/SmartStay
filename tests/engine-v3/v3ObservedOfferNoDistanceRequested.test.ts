import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {fixture} from './fixtures/observedOfferRequirementsSyntheticV3';
import {computeObservedOfferDiagnosticV3} from '../../src/engine-v3/evaluation/observedOfferDiagnosticV3';
import {evaluateSmartStaySearchV2} from '../../src/engine-v2/orchestrator/smartStayEngineV2';
import {getPersonalUtilityRolePolicySettingsV3} from '../../src/engine-v3/policy/personalUtilityRolePolicyV3';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const unknown=(claim:any)=>Object.assign(claim,{state:'UNKNOWN',value:null});

// Reuse an invented complete control. No fresh-provider authority is conferred
// by this synthetic entry; the new provider ingress has its own source checks.
async function control(notRequested=true){
  const f=await fixture();
  const execution=await load(pathToFileURL(join(process.cwd(),'scripts/observed-offer-execution-v1.mjs')).href);
  const requirements=await load(pathToFileURL(join(process.cwd(),'scripts/diagnostic-offer-requirements-v1.mjs')).href);
  for(const h of f.b.search.hotels){h.latitude=null;h.longitude=null;h.availableData.hasCoordinates=false;}
  const previous=evaluateSmartStaySearchV2(f.b.search);
  const query:any={...f.b.search,childAgesAtStay:[],preferenceSource:'manual',destinationKey:'Synthetic no-distance location'};
  delete query.hotels;
  if(notRequested){
    f.n.geography.contexts=[{id:'NO_DISTANCE',semantics:'not-requested',kilometers:null}];
    f.n.geography.commonReference=null;
    for(const o of f.n.offers){o.reference=null;unknown(o.distanceKm);}
    delete query.maximumDistanceKm;delete query.selectedLocation;
  }
  const request:any={kind:'SYNTHETIC',normalization:f.n,contextId:notRequested?'NO_DISTANCE':'PREFERENCE',
    syntheticRequirementBasis:structuredClone(f.n.party.requirements),syntheticQuery:query,
    syntheticSignals:previous.evaluations.map(e=>({alternativeId:e.hotel.id,evidence:structuredClone(e.evidence),
      features:[...e.hotel.amenities,...e.hotel.facilities],roomText:e.hotel.offers[0].roomName,category:null,
      observations:{synthetic:true},provenance:{kind:'SYNTHETIC'}}))};
  return {f,request,execution,requirements,run:()=>execution.executeObservedOfferDiagnostic(request,computeObservedOfferDiagnosticV3)};
}

test('ND01 explicit no-requested distance reaches actual policy without threshold, coordinates or score',async()=>{
  const f=await control(),before=JSON.stringify(f.request),r=f.run();
  assert.equal(r.output.decision.status,'usable');assert.equal(r.output.policyInvocations,1);assert.equal(r.output.kernelInvocations,1);
  assert.equal(r.input.context.semantics,'not-requested');assert.equal(r.input.context.kilometers,null);assert.equal(r.input.context.reference,null);
  for(const c of r.output.candidates){
    assert.equal(c.distance.status,'not-requested');assert.equal(c.policy.dimensions.location.score,null);
    assert.equal(c.calculated.location.constraint.provided,false);assert.equal(c.calculated.location.constraint.maximumDistanceKm,null);
    assert.equal(c.calculated.location.constraint.withinLimit,null);assert.equal(c.calculated.location.distance.selectedDistanceKm,null);
    assert(!c.dimensionsCalculated.includes('location'));assert(!c.policy.contextualEligibility.reasonCodes.includes('intent:preferred-distance-unverified'));
  }
  assert(r.input.candidates.every((c:any)=>!c.facts.some((v:any)=>v.code==='location.coordinates')));
  assert.equal(JSON.stringify(f.request),before);
});

test('ND02 original requested-distance path retains its two actual policy invocations',async()=>{
  const f=await control(false),r=f.run();assert.equal(r.output.policyInvocations,2);assert.equal(r.output.kernelInvocations,1);
  assert(r.output.candidates.some((c:any)=>c.policy.dimensions.location.score!==null));
});

test('ND03 unsupported essential need does not execute policy despite unrequested distance',async()=>{
  const f=await control(),p=f.execution.prepareObservedOfferDiagnostic(f.request);
  p.input.essentialCoverage='UNREPRESENTED_ESSENTIAL_NEEDS';
  const r=computeObservedOfferDiagnosticV3(p.input);assert.equal(r.policyInvocations,0);assert.equal(r.policyExecuted,false);assert.equal(r.decision,null);
});

for(const context of [
  {id:'NO_DISTANCE',semantics:'not-requested',kilometers:0},
  {id:'NO_DISTANCE',semantics:'not-requested',kilometers:5},
  {id:'NO_DISTANCE',semantics:'strong-preference',kilometers:null},
  {id:'NO_DISTANCE',semantics:'unknown',kilometers:null},
])test('ND04 ambiguous distance context rejected: '+JSON.stringify(context),async()=>{
  const f=await control();f.f.n.geography.contexts=[context];assert.throws(f.run,/DISTANCE_CONTEXT/);
  const valid=await control(),p=valid.execution.prepareObservedOfferDiagnostic(valid.request);p.input.context=context;
  assert.throws(()=>computeObservedOfferDiagnosticV3(p.input),/DISTANCE_CONTEXT_INVALID/);
});

test('ND05 distance exception cannot create an undisclosed preference',async()=>{
  const f=await control();f.request.distanceException={hotelId:'invented',reason:'EXPLICIT_EXPERIENCE_GAIN_ACCEPTED'};
  assert.throws(f.run,/DISTANCE_CONTEXT_INVALID/);
});

test('ND06 UNKNOWN reference is retained without an unrequested location obligation',async()=>{
  const f=await control(),source=await control(false);
  f.f.n.geography.commonReference=unknown(structuredClone(source.f.n.geography.commonReference));
  f.f.n.offers.forEach((o:any,i:number)=>{o.reference=unknown(structuredClone(source.f.n.offers[i].reference));});
  const r=f.run();assert.equal(r.output.decision.status,'usable');assert.equal(r.input.context.reference.state,'UNKNOWN');
  assert(r.r1Assessment.offers.every((o:any)=>o.geography.state==='NOT_REQUESTED'&&o.geography.contexts[0].status==='NOT_REQUESTED'));
});

test('ND07 removing requested geography is not a way to certify a requested preference',async()=>{
  const f=await control(false);f.f.n.geography.commonReference=null;assert.throws(f.run,/CLAIM_SCOPE_OR_SCHEMA/);
});

test('ND08 known source observation is preserved but not scored without requested distance',async()=>{
  const f=await control(false);f.f.n.geography.contexts=[{id:'PREFERENCE',semantics:'not-requested',kilometers:null}];
  const distances=f.f.n.offers.map((o:any)=>o.distanceKm.value),r=f.run();
  assert.deepEqual(r.r1Assessment.offers.map((o:any)=>o.geography.reportedKilometers),distances);
  assert(r.output.candidates.every((o:any)=>o.policy.dimensions.location.score===null&&o.distance.status==='not-requested'));
});

test('ND09 explicit provider-observation mode validates requirements but does not grant reviewed or synthetic ingress',async()=>{
  const f=await control();f.f.n.mode='PROVIDER_OBSERVATION_DIAGNOSTIC';
  assert.equal(f.requirements.validateDiagnosticOfferRequirements(f.f.n),true);
  assert.throws(f.run,/SYNTHETIC_CANNOT_REPLACE_REVIEWED_ENTRY/);
  assert.throws(()=>f.execution.prepareObservedOfferDiagnostic({...f.request,kind:'PROVIDER_OBSERVATION'}),/EXPLICIT_ENTRY_KIND_REQUIRED/);
});

test('ND10 missing complete costs and bookability still cause actual abstention, never a distance substitute',async()=>{
  for(const field of ['completeTotal','bookability']){
    const f=await control();for(const o of f.f.n.offers)unknown(field==='completeTotal'?o.completeTotal:o.availability.bookability);
    const r=f.run();assert.equal(r.output.decision.status,'abstained');assert.equal(r.output.policyInvocations,1);
    assert.equal(r.output.candidates.length,3);
  }
});

test('ND11 no requested distance neither changes policy weights nor manufactures budget-market peers',async()=>{
  const f=await control(),r=f.run();
  assert.deepEqual(r.output.decision.profileSettings,getPersonalUtilityRolePolicySettingsV3(r.output.profile.effectivePreferenceId,f.request.syntheticQuery.nights));
  assert(r.output.candidates.every((c:any)=>c.calculated.location.score===null));
  assert.equal(r.output.publicIntegrationEnabled,false);assert.equal(r.output.automaticGoldenAdmission,false);
});

test('ND12 diagnostic kernel retains the at-least-two-candidates boundary',async()=>{
  const f=await control(),p=f.execution.prepareObservedOfferDiagnostic(f.request);p.input.candidates=p.input.candidates.slice(0,1);
  assert.throws(()=>computeObservedOfferDiagnosticV3(p.input),/SCOPE_INVALID/);
});
