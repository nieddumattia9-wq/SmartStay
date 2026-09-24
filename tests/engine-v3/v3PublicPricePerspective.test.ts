import test from 'node:test';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';import {readFileSync,writeFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
import {prepareAuthenticatedCommercialSetV3,isAuthenticatedCommercialPreparationV3} from '../../src/engine-v3/evaluation/authenticatedCommercialPreparationV3';
import {executeAuthenticatedCommercialV3,commercialExecutionAuthorizationV3} from '../../src/engine-v3/evaluation/executeAuthenticatedCommercialV3';
import {authenticatedDecisionInputV3} from '../../src/engine-v3/evaluation/authenticatedCommercialDecisionInputV3';
import {qualifyAuthenticatedCommercialSetV3} from '../../src/engine-v3/contract/authenticatedCommercialSetV3';
import {publicPriceScopeV3,qualifyPublicPricePerspectiveV3,type PublicPricePolicyV3} from '../../src/engine-v3/contract/publicPricePerspectiveV3';
import {createStableHashV3} from '../../src/engine-v3/contract/stableHashV3';
import {buildSmartStayFrontendRuntimeV2} from '../../src/engine-v2/frontend/smartStayFrontendAdapterV2';
import {adaptV2SearchResultToDecisionV3} from '../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import {createIndependentV3ComparableDecisionV3,runIndependentDecisionShadowV3} from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import {createBoundAuthenticatedCommercialV3,verifyBoundAuthenticatedCommercialV3} from '../../src/engine-v3/evaluation/boundAuthenticatedCommercialV3';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const moduleAt=(p:string)=>load(pathToFileURL(resolve(p)).href);
const fixtures=()=>moduleAt('tests/engine-v3/fixtures/publicPriceSyntheticV3.mjs');
const historical=()=>moduleAt('tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs');
const minimum:PublicPricePolicyV3={version:'stayopti.public-price-policy@1',mode:'DOCUMENTED_MINIMUM',additionalMarkup:0};
type Wire=any; // Deliberately invalid ORIGINAL wire variants, authenticated after construction.
const execute=(p:Awaited<ReturnType<typeof prepareAuthenticatedCommercialSetV3>>)=>executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
const perspective=(p:Awaited<ReturnType<typeof prepareAuthenticatedCommercialSetV3>>,i=0)=>{
 const q=p.assessment.offers[i].qualification;assert.ok('pricePerspective' in q);return q.pricePerspective!;
};
const zero={v2Evaluations:0,v3Constructions:0,bindingCreations:0,shadowRuns:0,replayVerifications:0};
const complete={v2Evaluations:1,v3Constructions:3,bindingCreations:1,shadowRuns:1,replayVerifications:1};
function recommended(p:Awaited<ReturnType<typeof prepareAuthenticatedCommercialSetV3>>){
 assert.equal(p.engineInvocations,0);assert.equal(p.assessment.status,'PREPARED_PILOT_SET',JSON.stringify(p.assessment.offers.map(x=>x.qualification.reasons)));
 const r=execute(p);assert.equal(r.status,'COMPARISON_EXECUTED_RECOMMENDED',JSON.stringify(r));assert.deepEqual(r.counts,complete);return r;
}
function stopped(p:Awaited<ReturnType<typeof prepareAuthenticatedCommercialSetV3>>,reason:RegExp){
 assert.equal(p.assessment.status,'PREPARATION_STOPPED');assert.ok(p.assessment.offers.every(x=>reason.test(x.qualification.reasons.join('|'))),JSON.stringify(p.assessment.offers.map(x=>x.qualification.reasons)));
 assert.equal(execute(p).status,'PREPARATION_STOPPED');assert.deepEqual(execute(p).counts,zero);
}
const explicit=(p:Awaited<ReturnType<typeof prepareAuthenticatedCommercialSetV3>>,delta=0):PublicPricePolicyV3=>({version:minimum.version,mode:'EXPLICIT_PROPOSALS',
 proposals:p.facts.offers.map(o=>({scope:publicPriceScopeV3(o.observed!),money:{amount:o.observed!.price.observed!.amount+delta,currency:o.observed!.search.currency}}))});

test('PP1 before/after: retail below floor stays historical violation, separate authenticated public quote -> binding/replay',async()=>{
 const m=await fixtures(),h=await historical(),f=m.publicPriceFixture(),before=h.syntheticOriginalTree(f.base);
 const old=await prepareAuthenticatedCommercialSetV3(f.locator),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);
 stopped(old,/PUBLIC_PRICE_VIOLATED/);assert.equal(old.version,'stayopti.issued-commercial-preparation@2');
 assert.equal(p.version,'stayopti.issued-commercial-preparation@2.1');assert.equal(p.assessment.offers.length,3);
 const v=perspective(p);assert.equal(v.originalRetail.money?.amount,820);assert.equal(v.originalRetail.historicalPublicMinimumQualification,'VIOLATED');
 assert.equal(v.documentedMinimum.atObservation.money?.amount,1100);assert.equal(v.proposal.money?.amount,1100);
 assert.equal(v.verifiedPrice?.money?.amount,1100);assert.equal(v.verifiedPrice?.originalTransactionQuote.money?.amount,820);
 assert.equal(v.verifiedPrice?.kind,'AUTHENTICATED_PUBLIC_QUOTE');assert.equal(v.completeCost.completeTotal,1100);
 assert.equal(v.proposal.origin,'LOCAL_ANALYTICAL_CHOICE');assert.equal(v.proposal.providerObservation,false);
 assert.equal(v.checkoutPriceCertified,false);assert.equal(v.automaticMarkupApplied,false);
 const r=recommended(p);assert.ok(r.decision!.integrity.offerSnapshots.some(o=>o.cost.total.amount===1100));
 assert.deepEqual(h.syntheticOriginalTree(f.base),before);assert.deepEqual(old.facts.offers.map(o=>o.observed),p.facts.offers.map(o=>o.observed));
});

test('PP2 analytical minimum without matching commercial price cannot promote known retail to another verified price',async()=>{
 const m=await fixtures(),f=m.publicPriceFixture({mutateEnvelope:(e:Wire)=>{delete e.publicPriceVerification;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);
 stopped(p,/PUBLIC_PROPOSAL_AMOUNT_NOT_VERIFIED/);assert.equal(perspective(p).proposalCompliance,'AT_OR_ABOVE_MINIMUM');
 assert.equal(perspective(p).verifiedPrice?.money?.amount,820);assert.equal(perspective(p).completeCost.completeTotal,null);
});

test('PP3 opt-out retains exact @2 result/fingerprint, even when unconsumed additive proof exists',async()=>{
 const h=await historical(),f=h.authenticatedComparisonFixture(),a=await prepareAuthenticatedCommercialSetV3(f.locator),b=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.deepEqual(a,b);assert.equal(a.facts.version,'stayopti.authenticated-commercial-facts@2');
 assert.equal(a.assessment.fullSetFingerprint,createStableHashV3(a.facts,'authenticated-full-alternative-set'));
 assert.ok(!('pricePolicy' in a));assert.ok(!('publicPriceVerification' in a.facts.offers[0]));
 recommended(a);assert.throws(()=>qualifyAuthenticatedCommercialSetV3(a.facts,minimum),/VERSION_MISMATCH/);
});

for(const protocol of ['LITEAPI_DOCUMENTARY@1','SYNTHETIC_ATTESTED_QUOTE@1'])test('PP4 at/above floor verified transaction, actual consumer: '+protocol,async()=>{
 const h=await historical(),f=h.authenticatedComparisonFixture({protocol}),old=await prepareAuthenticatedCommercialSetV3(f.locator),p=await prepareAuthenticatedCommercialSetV3(f.locator,explicit(old));
 assert.equal(perspective(p).proposalCompliance,'AT_OR_ABOVE_MINIMUM');assert.ok(perspective(p).proposal.money!.amount>perspective(p).documentedMinimum.atObservation.money!.amount);
 assert.equal(perspective(p).verifiedPrice?.kind,'AUTHENTICATED_TRANSACTION_QUOTE');
 assert.equal(recommended(p).decision!.robustness.policyPreferredHotelId,recommended(old).decision!.robustness.policyPreferredHotelId);
 const f2=h.authenticatedComparisonFixture({protocol,mutate:(b:Wire,q:Wire)=>{for(const hotel of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[]){hotel.roomTypes[0].suggestedSellingPrice.amount=hotel.roomTypes[0].rates[0].retailRate.total[0].amount;}}});
 const at=await prepareAuthenticatedCommercialSetV3(f2.locator,minimum);recommended(at);assert.equal(perspective(at).proposal.money!.amount,perspective(at).originalRetail.money!.amount);
});

test('PP5 explicit public proposal ABOVE minimum supported, local choice does not override quote',async()=>{
 const f=(await fixtures()).publicPriceFixture({mutateEnvelope:(e:Wire)=>{e.publicPriceVerification.money.amount+=55;}});
 const old=await prepareAuthenticatedCommercialSetV3(f.locator),policy=explicit(old,335),p=await prepareAuthenticatedCommercialSetV3(f.locator,policy);
 recommended(p);assert.equal(perspective(p).proposal.money?.amount,1155);assert.equal(perspective(p).documentedMinimum.atObservation.money?.amount,1100);
 const at=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);stopped(at,/AMOUNT_NOT_VERIFIED/);
 assert.notEqual(p.assessment.fullSetFingerprint,at.assessment.fullSetFingerprint);assert.notEqual(commercialExecutionAuthorizationV3(p),commercialExecutionAuthorizationV3(at));
});

test('PP6 below floor proposal rejected even if amount commercially quoted',async()=>{
 const f=(await fixtures()).publicPriceFixture({mutateEnvelope:(e:Wire)=>{e.publicPriceVerification.money.amount-=1;}}),old=await prepareAuthenticatedCommercialSetV3(f.locator);
 const p=await prepareAuthenticatedCommercialSetV3(f.locator,explicit(old,279));stopped(p,/BELOW_MINIMUM/);
 assert.equal(perspective(p).proposalVerification,'SAME_AMOUNT_AND_SCOPE_AS_VERIFIED_QUOTE');
});

const invalidProofs:Array<[string,(e:Wire)=>void,RegExp]>=[
 ['different currency',e=>{e.publicPriceVerification.money.currency='USD';},/AMOUNT_NOT_VERIFIED|COST/],
 ['absent amount',e=>{delete e.publicPriceVerification.money;},/AMOUNT_NOT_VERIFIED/],
 ['invalid amount',e=>{e.publicPriceVerification.money.amount=-1;},/AMOUNT_NOT_VERIFIED/],
 ['different offer',e=>{e.publicPriceVerification.scope.offerId+='x';},/SCOPE_CONFLICT/],
 ['different property',e=>{e.publicPriceVerification.scope.propertyId+='x';},/SCOPE_CONFLICT/],
 ['different room',e=>{e.publicPriceVerification.scope.roomId='other';},/SCOPE_CONFLICT/],
 ['different stay',e=>{e.publicPriceVerification.scope.checkOut='2099-10-18';},/SCOPE_CONFLICT/],
 ['different family',e=>{e.publicPriceVerification.scope.childAges=[4,8];},/SCOPE_CONFLICT/],
 ['different units',e=>{e.publicPriceVerification.scope.units=2;},/SCOPE_CONFLICT/],
 ['unknown coverage',e=>{delete e.publicPriceVerification.mandatoryCoverage;},/COMPLETE_COST_UNPROVEN/],
 ['contrary condition',e=>{e.publicPriceVerification.contraryObservations=['subject to a further mandatory charge'];},/CONTRARY/],
 ['error subrecord',e=>{e.publicPriceVerification.error={code:'invented-invalid-public-price'};},/PUBLIC_PRICE_PROOF_ERROR/],
 ['absent negative-observation inventory',e=>{delete e.publicPriceVerification.contraryObservations;},/CONTRARY_OBSERVATIONS/],
];
for(const [name,mutateEnvelope,reason]of invalidProofs)test('PP7 authenticated original quote invalid: '+name,async()=>{
 const f=(await fixtures()).publicPriceFixture({mutateEnvelope}),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);stopped(p,reason);
});

const component=(id:string,overrides:Wire={})=>({id,amount:25,currency:'EUR',kind:'MANDATORY',category:'TAX',inclusion:'EXCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'AT_PROPERTY',...overrides});
test('PP8 cost includes compulsory excluded charge once, never SSP+retail, included tax, optional extra or refundable deposit',async()=>{
 const f=(await fixtures()).publicPriceFixture({mutateEnvelope:(e:Wire)=>{e.publicPriceVerification.components=[component('city-tax'),component('included-vat',{inclusion:'INCLUDED',amount:70}),component('optional',{kind:'OPTIONAL',amount:60}),component('deposit',{kind:'REFUNDABLE_DEPOSIT',amount:100})];}});
 const p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum),v=perspective(p);assert.equal(v.verifiedPrice?.money?.amount,1100);assert.equal(v.completeCost.completeTotal,1125);recommended(p);
 assert.equal(p.facts.offers[0].publicPriceVerification?.coverage,'DOCUMENTED_EXHAUSTIVE_COMPONENTS');
 assert.equal(v.verifiedPrice!.components.length,4);assert.equal(v.additionalLocalMarkupAdded,0);assert.equal(v.retailPlusMinimumSummed,false);
});
for(const [name,cs]of [
 ['duplicate component',[component('tax'),component('tax')]],
 ['currency',[component('tax',{currency:'USD'})]],
 ['scope',[component('tax',{basis:'PER_PERSON_PER_NIGHT'})]],
 ['unknown inclusion',[component('tax',{inclusion:'UNKNOWN'})]],
 ['unknown amount',[component('tax',{amount:null})]],
 ['unknown category',[component('tax',{category:'UNKNOWN'})]],
 ['unknown mandatory nature',[component('tax',{kind:'UNKNOWN'})]],
] as Array<[string,Wire[]]>)test('PP9 unresolved component '+name,async()=>{
 const f=(await fixtures()).publicPriceFixture({mutateEnvelope:(e:Wire)=>{e.publicPriceVerification.components=cs;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);stopped(p,/COMPONENT|COST/);
});

const guards:Array<[string,(b:Wire,q:Wire)=>void,RegExp]>=[
 ['unknown floor',(b,q)=>{for(const h of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[])delete h.roomTypes[0].suggestedSellingPrice;},/MINIMUM|PROPOSAL_UNKNOWN/],
 ['incompatible floor currency',(b,q)=>{for(const h of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[])h.roomTypes[0].suggestedSellingPrice.currency='USD';},/PROPOSAL/],
 ['later higher floor',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].suggestedSellingPrice.amount=6000;},/BELOW_MINIMUM/],
 ['known transaction change',(b,q)=>{if(q.kind==='PREBOOK'){b.data.price+=7;b.data.roomTypes[0].rates[0].retailRate.total[0].amount+=7;}},/KNOWN_PRICE_CHANGED/],
 ['negative availability',(b,q)=>{if(q.kind==='PREBOOK')b.data.available=false;},/AVAILABILITY/],
 ['insufficient capacity',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.rooms[0].maxOccupancy=3;},/ACCOMMODATION/],
 ['family restriction',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.childAllowed=false;},/FAMILY|ACCOMMODATION/],
 ['pending deposit condition',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.hotelImportantInformation='A refundable deposit is required';},/CONDITION/],
 ['expired quote',(b,q)=>{if(q.kind==='PREBOOK')b.data.validUntil='2099-09-01T11:00:00Z';},/EXPIRY_EXPIRED/],
 ['ambiguous expiry',(b,q)=>{if(q.kind==='PREBOOK')b.data.validUntil='2099-09-01T12:30:00-00:00';},/UNINTERPRETABLE/],
];
for(const [name,mutate,reason]of guards)test('PP10 other gates not bypassed: '+name,async()=>{
 const f=(await fixtures()).publicPriceFixture({mutate}),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);stopped(p,reason);
});

test('PP11 only analytical floor, search observations alone: no verification or engine run',async()=>{
 const f=(await fixtures()).publicPriceFixture({noVerification:true}),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);
 stopped(p,/COMMERCIAL_VERIFICATION_MISSING/);assert.equal(perspective(p).proposal.money?.amount,1100);assert.equal(perspective(p).verifiedPrice,null);
});

test('PP12 unsupported LiteAPI sellingPriceToUser is retained but never a public-price certificate',async()=>{
 const f=(await historical()).authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{if(q.kind==='PREBOOK')b.data.sellingPriceToUser=700;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);
 stopped(p,/AMOUNT_NOT_VERIFIED/);assert.equal(p.facts.offers[0].publicPriceVerification,null);
 assert.equal(perspective(p).verifiedPrice?.kind,'AUTHENTICATED_TRANSACTION_QUOTE');
});

test('PP13 incomplete alternative retained; independently qualified set reaches consumer and remains order-invariant',async()=>{
 const m=await fixtures();const options={mutateEnvelope:(e:Wire,q:Wire)=>{if(q.hotelId.endsWith('-0'))delete e.publicPriceVerification.mandatoryCoverage;}};
 const a=await prepareAuthenticatedCommercialSetV3(m.publicPriceFixture(options).locator,minimum);
 const b=await prepareAuthenticatedCommercialSetV3(m.publicPriceFixture({...options,mutate:(x:Wire,q:Wire)=>{if(q.kind==='SEARCH')x.data.reverse();}}).locator,minimum);
 assert.equal(a.assessment.offers.length,3);assert.equal(a.assessment.distinctQualifiedProperties,2);
 const x=recommended(a),y=recommended(b);assert.equal(x.decision!.robustness.policyPreferredHotelId,y.decision!.robustness.policyPreferredHotelId);
 assert.notEqual(x.decision!.robustness.policyPreferredHotelId,'invented-wire-property-0');
});

test('PP14 authentic source/scope and issued capability remain necessary, policy cannot reissue a copied preparation',async()=>{
 const f=(await fixtures()).publicPriceFixture(),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);
 assert.equal(isAuthenticatedCommercialPreparationV3(structuredClone(p)),false);assert.throws(()=>authenticatedDecisionInputV3(structuredClone(p)),/ISSUED/);
 assert.throws(()=>{p.pricePolicy!.version='different' as never;},TypeError);
 const o=p.facts.offers[0],q=structuredClone(o.publicPriceVerification!);q.source.recordSha256='a'.repeat(64);
 const diagnostic=qualifyPublicPricePerspectiveV3(o.observed,o.verified,minimum,q);
 assert.ok(diagnostic.reasons.includes('PUBLIC_QUOTE_VERIFICATION_SOURCE_CONFLICT'));
 const file=resolve(f.input.root,'encrypted','001-response.aesgcm');writeFileSync(file,Buffer.concat([readFileSync(file),Buffer.from(' ')]));
 await assert.rejects(prepareAuthenticatedCommercialSetV3(f.locator,minimum),/INTEGRITY/);
});

test('PP15 binding consumes all verified public prices, not only the winning proposal',async()=>{
 const p=await prepareAuthenticatedCommercialSetV3((await fixtures()).publicPriceFixture().locator,minimum),runtime=buildSmartStayFrontendRuntimeV2(authenticatedDecisionInputV3(p));
 const decision=adaptV2SearchResultToDecisionV3({searchInput:runtime.searchInput,result:runtime.result}),comparable=createIndependentV3ComparableDecisionV3(decision,runtime.result.recommendationRoles.bestChoiceHotelId);
 const bound=createBoundAuthenticatedCommercialV3({prepared:p,searchInput:runtime.searchInput,decision,comparable});assert.equal(bound.version,'stayopti.bound-authenticated-commercial@2.1');
 assert.equal(verifyBoundAuthenticatedCommercialV3({decision,comparable,searchInput:runtime.searchInput,evidence:bound}),'verified');
 const changed=structuredClone(runtime.searchInput),other=changed.hotels.find(h=>h.id!==decision.robustness.policyPreferredHotelId)!;other.stars=1;
 assert.equal(verifyBoundAuthenticatedCommercialV3({decision,comparable,searchInput:changed,evidence:bound}),'failed');
 const wrong=buildSmartStayFrontendRuntimeV2(changed),shadow=runIndependentDecisionShadowV3({mode:'shadow',comparisonToken:'invented-public-price-set-tamper',segment:{destination:'mixed',leadTime:'long',duration:'medium-stay',coverage:'unknown',profile:'balanced'},searchInput:wrong.searchInput,publicV2Result:wrong.result,publicRateEvidence:bound});
 assert.equal(shadow.shadowObservation?.recordType,'shadow-comparison');
 if(shadow.shadowObservation?.recordType==='shadow-comparison')assert.equal(shadow.shadowObservation.safety.publicRateConsistency,'failed');
});

test('PP16 explicit proposal wrong scope/currency is not repaired by context or verified facts',async()=>{
 const f=(await fixtures()).publicPriceFixture(),base=await prepareAuthenticatedCommercialSetV3(f.locator);
 for(const change of [(x:Wire)=>{x.scope.roomId='not-this-room';},(x:Wire)=>{x.money.currency='USD';}]){
  const policy=explicit(base,280);assert.equal(policy.mode,'EXPLICIT_PROPOSALS');if(policy.mode!=='EXPLICIT_PROPOSALS')throw Error('fixture');policy.proposals.forEach(change);
  const p=await prepareAuthenticatedCommercialSetV3(f.locator,policy);stopped(p,/SCOPE_MISSING|NOT_COMPARABLE/);
 }
 await assert.rejects(prepareAuthenticatedCommercialSetV3(f.locator,{...minimum,additionalMarkup:0.1} as never),/MARKUP/);
});

test('PP18 canonical family meaning, distinct scope retained, no implicit proposal or quote repairs',async()=>{
 const m=await fixtures(),a=await prepareAuthenticatedCommercialSetV3(m.publicPriceFixture().locator,minimum);
 const equivalent=await prepareAuthenticatedCommercialSetV3(m.publicPriceFixture({mutateEnvelope:(e:Wire)=>{
  e.publicPriceVerification.scope.childAges.reverse();e.publicPriceVerification.displayHint='irrelevant';
 }}).locator,minimum);
 assert.equal(recommended(a).decision!.robustness.policyPreferredHotelId,recommended(equivalent).decision!.robustness.policyPreferredHotelId);
 assert.notEqual(a.facts.sourceSetFingerprint,equivalent.facts.sourceSetFingerprint);
 const f=m.publicPriceFixture({configure:(c:Wire)=>{c.scenario.childAges=[];},mutateEnvelope:(e:Wire)=>{e.publicPriceVerification.scope.childAges=null;}});
 const p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);recommended(p);
 const policy=explicit(p,280);if(policy.mode!=='EXPLICIT_PROPOSALS')throw Error('fixture');policy.proposals.forEach(x=>{x.scope.childAges=null;});
 recommended(await prepareAuthenticatedCommercialSetV3(f.locator,policy));
});

test('PP19 absent explicit quote amount must not fall back even when legacy retail equals chosen minimum',async()=>{
 const f=(await fixtures()).publicPriceFixture({mutate:(b:Wire,q:Wire)=>{
  for(const h of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[])h.roomTypes[0].suggestedSellingPrice.amount=h.roomTypes[0].rates[0].retailRate.total[0].amount;
 },mutateEnvelope:(e:Wire)=>{delete e.publicPriceVerification.money;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator,minimum);
 stopped(p,/AMOUNT_NOT_VERIFIED/);assert.equal(perspective(p).verifiedPrice?.money,null);
 assert.equal(perspective(p).originalRetail.money?.amount,perspective(p).proposal.money?.amount);
});

test('PP17 CLI opt-in DPAPI synthetic originals, hashed local policy, pure Prepare and actual shadow/replay',{skip:process.platform!=='win32'},async()=>{
 const f=(await fixtures()).publicPriceFixture({count:2,dpapi:true}),plan=await moduleAt('scripts/liteapi-comparison-plan-v1.mjs');
 const code=resolve('scripts/run-authenticated-commercial-comparison.mjs'),inventory=resolve(f.base,'code.json'),locator=resolve(f.base,'locator.json'),policy=resolve(f.base,'price-policy.json');
 writeFileSync(locator,JSON.stringify(f.locator));writeFileSync(policy,JSON.stringify(minimum));
 const checkpoint=['--ExpectedHead='+plan.git(process.cwd(),['rev-parse','HEAD']),'--ExpectedBranch='+plan.git(process.cwd(),['branch','--show-current'])];
 const run=(args:string[],success=true)=>{const r=spawnSync(process.execPath,[code,...checkpoint,...args],{encoding:'utf8',windowsHide:true,timeout:120000});assert.ifError(r.error);if(success)assert.equal(r.status,0,r.stderr);else assert.notEqual(r.status,0);return r;};
 run(['--Mode=Inventory','--OutputPath='+inventory]);const inputs=['--InventoryPath='+inventory,'--InventorySha='+plan.sha(readFileSync(inventory)),'--LocatorPath='+locator,'--LocatorSha='+plan.sha(readFileSync(locator)),'--PricePolicyPath='+policy,'--PricePolicySha='+plan.sha(readFileSync(policy))];
 const prepared=resolve(f.base,'prepared.json'),executed=resolve(f.base,'executed.json');run(['--Mode=Prepare',...inputs,'--OutputPath='+prepared]);
 const p=JSON.parse(readFileSync(prepared,'utf8'));assert.equal(p.version,'stayopti.private-commercial-run@2.1');assert.deepEqual(p.counts,zero);assert.equal(p.execution,null);assert.equal(p.preparation.assessment.status,'PREPARED_PILOT_SET');
 run(['--Mode=Execute',...inputs,'--OutputPath='+executed,'--Authorization='+p.executionAuthorization]);const r=JSON.parse(readFileSync(executed,'utf8'));assert.equal(r.execution.status,'COMPARISON_EXECUTED_RECOMMENDED');assert.deepEqual(r.counts,complete);
 run(['--Mode=Execute',...inputs,'--OutputPath='+resolve(f.base,'denied.json'),'--Authorization=DENIED'],false);
 writeFileSync(policy,JSON.stringify({...minimum,additionalMarkup:1}));run(['--Mode=Prepare',...inputs,'--OutputPath='+resolve(f.base,'changed.json')],false);
});
