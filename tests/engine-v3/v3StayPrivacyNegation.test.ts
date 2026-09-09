import test from 'node:test';
import assert from 'node:assert/strict';
import {privacyNegationInput,PRIVACY_NEGATION_CASES} from './fixtures/stayPrivacyNegationSyntheticV3';
import {runIntentRolePolicyBridgeV3} from '../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';

function evaluate(text:string,features:string[]=[]) {
  const input=privacyNegationInput(text,features),result=runIntentRolePolicyBridgeV3(input);
  const candidate=result.candidates.find(c=>c.hotelId===input.search.hotels[0].id)!;
  return {input,result,candidate,selected:result.decision.portfolio.bestChoice.equivalentSolutionIds.includes(candidate.policy.solutionId)};
}
test('PN01 user reproduction through complete bridge rejects the explicitly absent required bathroom',()=>{
  const {candidate:c,selected,result}=evaluate('Private room without a private bathroom');
  assert.equal(c.suitability.facts.unitState,'PRIVATE');
  assert.equal(c.suitability.facts.bathroomState,'NOT_PRIVATE');
  assert.equal(c.policy.hardConstraintsSatisfied,false);
  assert.ok(c.mandatoryRequirements.unmetFeatureCodes.includes('private-bathroom'));
  assert.equal(c.suitability.status,'ineligible');assert.equal(selected,false);
  for(const role of Object.values(result.decision.portfolio))assert.ok(!role.equivalentSolutionIds.includes(c.policy.solutionId));
});
for(const example of PRIVACY_NEGATION_CASES)test(`PN polarity ${example.id}`,()=>{
  const {candidate:c,selected}=evaluate(example.text);
  assert.equal(c.suitability.facts.unitState,example.unit);assert.equal(c.suitability.facts.bathroomState,example.bath);
  if(['NOT_PRIVATE','SHARED'].includes(example.bath)){
    assert.equal(c.policy.hardConstraintsSatisfied,false);assert.equal(selected,false);assert.equal(c.suitability.status,'ineligible');
  }else if(['UNKNOWN','CONFLICTING'].includes(example.bath)){
    assert.equal(c.policy.hardConstraintsSatisfied,null);assert.equal(selected,false);
    assert.ok(c.mandatoryRequirements.unverifiedFeatureCodes.includes('private-bathroom'));
  }else assert.equal(c.policy.hardConstraintsSatisfied,true);
  if(['NOT_PRIVATE','UNKNOWN','CONFLICTING'].includes(example.unit))assert.equal(selected,false);
});
test('PN02 evaluated-offer negation is not erased by positive property inventory',()=>{
  for(const text of ['Private room without a private bathroom','Private room; private bathroom not available']){
    const {candidate:c,selected}=evaluate(text,['Hotel room','Private bathroom']);
    assert.equal(c.suitability.facts.bathroomState,'NOT_PRIVATE');assert.equal(c.suitability.facts.bathroomSource,'EVALUATED_OFFER_ROOM_TEXT');
    assert.equal(c.policy.hardConstraintsSatisfied,false);assert.equal(selected,false);
  }
});
test('PN03 known nonprivate unit reaches contextual and explicit mandatory eligibility without inventing shared type',()=>{
  const input=privacyNegationInput('No private room; private bathroom',['Private room','Private bathroom']);
  input.search.comfortPreferences={requiredUnitTypes:['private-room','hotel-room'],requiredFeatureCodes:['private-bathroom']};
  const r=runIntentRolePolicyBridgeV3(input),c=r.candidates.find(c=>c.hotelId===input.search.hotels[0].id)!;
  assert.equal(c.suitability.facts.unitState,'NOT_PRIVATE');assert.equal(c.suitability.facts.unitType,'unknown');
  assert.equal(c.mandatoryRequirements.requiredUnitTypeStatus,'unmet');assert.equal(c.policy.hardConstraintsSatisfied,false);
  assert.equal(c.suitability.status,'ineligible');assert.equal(c.policy.dimensions.room.score,null);
  assert.ok(!r.decision.portfolio.bestChoice.equivalentSolutionIds.includes(c.policy.solutionId));
});
test('PN04 explicit sharing does not turn nonprivate evidence into a verified shared room',()=>{
  const input=privacyNegationInput('No private room; private bathroom');input.search.comfortPreferences={requiredUnitTypes:['shared-room']};
  const r=runIntentRolePolicyBridgeV3(input),c=r.candidates.find(c=>c.hotelId===input.search.hotels[0].id)!;
  assert.equal(c.suitability.facts.unitType,'unknown');assert.equal(c.mandatoryRequirements.requiredUnitTypeStatus,'unverified');
  assert.equal(c.policy.hardConstraintsSatisfied,null);assert.equal(c.suitability.status,'incomplete');
});
test('PN05 selected-offer ambiguity cannot fall back to generic property certification',()=>{
  for(const text of ['Private room; private bathroom on request','Private room not guaranteed; private bathroom']){
    const {candidate:c,selected}=evaluate(text,['Private room','Private bathroom']);
    assert.equal(c.suitability.status,'incomplete');assert.equal(selected,false);
    assert.ok([c.suitability.facts.unitState,c.suitability.facts.bathroomState].includes('UNKNOWN'));
  }
});
test('PN06 incomplete privacy and explicit absence preserve distinct abstention causes',()=>{
  for(const text of ['Private room; private bathroom not documented','Private room without a private bathroom']){
    const input=privacyNegationInput(text);for(const h of input.search.hotels){h.amenities=[];h.facilities=[];h.offers[0].roomName=text;}
    const r=runIntentRolePolicyBridgeV3(input);assert.equal(r.decision.status,'abstained');
    assert.ok(r.candidates.every(c=>c.policy.hardConstraintsSatisfied===(text.includes('without')?false:null)));
    assert.ok(r.contextualExplanation.abstentionReasons.length>0);
  }
});
test('PN07 negative bridge remains provider/order neutral with unchanged numeric policy',()=>{
  const input=privacyNegationInput('Private room without a private bathroom'),original=structuredClone(input);
  const semantic=(f:typeof input)=>{const r=runIntentRolePolicyBridgeV3(f);return {status:r.decision.status,
    choices:r.candidates.filter(c=>r.decision.portfolio.bestChoice.equivalentSolutionIds.includes(c.policy.solutionId)).map(c=>c.policy.totalCost).sort(),
    candidates:r.candidates.map(c=>({cost:c.policy.totalCost,hard:c.policy.hardConstraintsSatisfied,status:c.suitability.status,
      unit:c.suitability.facts.unitState,bath:c.suitability.facts.bathroomState,dimensions:Object.fromEntries(Object.entries(c.policy.dimensions).map(([k,d])=>[k,d.score]))})).sort((a,b)=>a.cost!-b.cost!)};};
  const expected=semantic(input);
  for(let i=0;i<5;i++){
    const changed=structuredClone(input);changed.search.hotels.forEach((h,j)=>{h.id=`synthetic-${i}-${7-j}`;h.provider=`invented-source-${i}`;
      // Keep the existing normalized offer-ID grammar; malformed IDs exercise
      // input rejection, not identity invariance (hotelOfferSelection.hasPublicOfferId).
      h.dataSources=[h.provider];h.offers.forEach((o,k)=>{o.id=`offer-${1000+i*100+j*10+k}`;o.provider=h.provider;});});
    changed.search.hotels.reverse();assert.deepEqual(semantic(changed),expected);
  }
  assert.deepEqual(input,original);
});
test('PN08 nonprivate context without an explicit requirement is not fabricated as a human hard violation',()=>{
  const input=privacyNegationInput('No private room; private bathroom',['Private room']);input.search.comfortPreferences={};
  const r=runIntentRolePolicyBridgeV3(input),c=r.candidates.find(c=>c.hotelId===input.search.hotels[0].id)!;
  assert.equal(c.suitability.facts.unitState,'NOT_PRIVATE');assert.equal(c.suitability.status,'ineligible');
  assert.equal(c.policy.hardConstraintsSatisfied,true);assert.equal(c.suitability.inventedHumanRequirements,false);
  for(const role of Object.values(r.decision.portfolio))assert.ok(!role.equivalentSolutionIds.includes(c.policy.solutionId));
});
