import test from 'node:test';import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const mod=(p:string)=>load(pathToFileURL(resolve(p)).href);
type Wire=any; // Mutations of invented original responses, not trusted facts.
async function fixture(options:Wire={}){
 const m=await mod('tests/engine-v3/fixtures/sspProbeSyntheticV1.mjs');
 return m.sspProbeFixture({retail:880,commission:80,ssp:920,returned:920.01,...options,
  plan:(p:Wire)=>{p.version='stayopti.liteapi-ssp-probe@1.2';p.comparisonPlan.caseId=p.caseId;
   p.hotelSource={reference:'C:/invented-only/source.json',sha256:'a'.repeat(64),pointer:'/hotel'};
   p.purpose='BOUNDED_REQUEST_MARGIN_FUNCTIONAL_TEST_NO_ENGINE';options.plan?.(p);},
  discovery:(b:Wire)=>{b.data[0].roomTypes[0].rates[0].retailRate.suggestedSellingPrice=[{amount:920.01,currency:'EUR',source:''}];options.discovery?.(b);}});
}
const firstOffer=(b:Wire)=>b.data[0].roomTypes[0];
const pure=()=>mod('scripts/liteapi-ssp-probe-v1.mjs');

test('SR01 preserved initial counterexample: historical versions still STOP at distinct SSPs',async()=>{
 const p=await pure(),f=await fixture();
 for(const version of ['stayopti.liteapi-ssp-probe@1','stayopti.liteapi-ssp-probe@1.1']){
  const plan=structuredClone(f.plan);plan.version=version;
  if(version.endsWith('@1')){delete plan.hotelSource;delete plan.purpose;}
  const r=p.prepareSspRequote(plan,f.first);assert.equal(r.status,'STOP');assert.equal(r.facts.ssp,null);
  assert.deepEqual(r.reasons,['RETAIL_SSP_COMMISSION_SCOPE_OR_CURRENCY_UNSUPPORTED','SSP_SOURCES_CONFLICT']);
 }
});

for(const [rate,offer,expected]of [[920,920,'EQUAL_OBSERVED_THRESHOLDS'],[920.01,920,'LIMITED_ONE_CENT_DISCREPANCY'],[920,920.01,'LIMITED_ONE_CENT_DISCREPANCY']] as const)
test('SR02 exact equality / one cent both orders reaches complete pure sequence '+rate+'/'+offer,async()=>{
 const f=await fixture({ssp:offer,returned:Math.max(rate,offer),discovery:(b:Wire)=>{firstOffer(b).rates[0].retailRate.suggestedSellingPrice=[{amount:String(rate),currency:'EUR',source:''}];}});
 const before=JSON.stringify([f.plan,f.first,f.second,f.third]),p=await pure(),a=f.prepared;
 assert.equal(a.status,'CANDIDATE_REQUOTE_NOT_VERIFIED');assert.equal(a.version,f.plan.version);
 assert.equal(a.facts.sspResolution.status,expected);assert.equal(a.facts.sspResolution.differenceMinorUnits,rate===offer?'0':'1');
 assert.equal(a.localTarget.amount,Math.max(rate,offer));assert.equal(a.facts.sspResolution.localProposal.providerReturnedSsp,false);
 assert.equal(a.facts.sspResolution.cause,'NOT_ESTABLISHED');assert.equal(a.facts.sspResolution.valuesDeclaredEqual,rate===offer);
 assert.equal(a.facts.retail.amount,880);assert.equal(a.calculation.guaranteedTarget,false);
 if(rate!==offer){assert.equal(a.facts.ssp,null);assert(a.facts.fiscal.priceQualification.issues.includes('SSP_SOURCES_CONFLICT'));}
 assert.equal(f.assessed.status,'EXACT_LOCAL_TARGET_RETURNED_NOT_PREBOOK_VERIFIED');assert.equal(f.assessed.returnedPriceMatchesLocalTarget,true);
 assert.equal(f.assessed.prebookRequest.body.offerId,f.assessed.newOfferId);
 const final=p.assessSspPrebook(f.plan,f.first,f.second,f.third);assert.equal(final.status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED',JSON.stringify(final.reasons));
 assert.equal(final.completeCost,Math.max(rate,offer));assert.equal(final.fullA02Admission,false);assert.equal(final.engineInvocations,0);
 assert(!final.remainingFiscalIssues.includes('SSP_SOURCES_CONFLICT'));
 if(rate!==offer){assert.equal(final.facts.fiscal.completeTotal,null);assert(final.facts.fiscal.issues.includes('SSP_SOURCES_CONFLICT'));}
 assert.equal(JSON.stringify([f.plan,f.first,f.second,f.third]),before);
 const capture=await mod('scripts/liteapi-ssp-probe-capture-v1.mjs');let calls=0,seals=0;
 const records=[f.first,f.second,f.third];const result=await capture.runSspProbeSequence(f.plan,async(q:Wire)=>{assert.deepEqual(q,records[calls].intent);if(calls>0)assert.equal(seals,1);return records[calls++];},()=>{seals++;});
 assert.equal(calls,3);assert.equal(result.status,final.status);assert.equal(result.engineInvocations,0);
});

const invalid:Array<[string,(b:Wire)=>void,RegExp]>=[
 ['two cents',b=>{firstOffer(b).rates[0].retailRate.suggestedSellingPrice[0].amount=920.02;},/EXCEEDS_ONE_CENT/],
 ['different currency',b=>{firstOffer(b).suggestedSellingPrice.currency='USD';},/CURRENCY/],
 ['missing currency',b=>{delete firstOffer(b).suggestedSellingPrice.currency;},/CURRENCY/],
 ['per night scope',b=>{firstOffer(b).suggestedSellingPrice.basis='PER_NIGHT';},/SCOPE/],
 ['unknown money annotation',b=>{firstOffer(b).suggestedSellingPrice.scope='unqualified';},/SCOPE/],
 ['missing both SSPs',b=>{delete firstOffer(b).suggestedSellingPrice;delete firstOffer(b).rates[0].retailRate.suggestedSellingPrice;},/SSP_MISSING/],
 ['explicit null',b=>{firstOffer(b).suggestedSellingPrice=null;},/UNQUALIFIED/],
 ['two components',b=>{firstOffer(b).rates.push(structuredClone(firstOffer(b).rates[0]));},/SINGLE_OCCUPANCY/],
 ['explicit two units',b=>{firstOffer(b).quantity=2;},/QUANTITY/],
 ['unknown units',b=>{firstOffer(b).rates[0].units=null;},/QUANTITY/],
 ['wrong occupancy',b=>{firstOffer(b).rates[0].occupancyNumber=2;},/OCCUPANCY/],
 ['wrong family',b=>{firstOffer(b).rates[0].childrenAges=[3,9];},/CHILD/],
 ['wrong stay',b=>{firstOffer(b).rates[0].checkout='2099-11-19';},/CHECKOUT/],
 ['ambiguous amount',b=>{firstOffer(b).rates[0].retailRate.suggestedSellingPrice.push({amount:920.01,currency:'EUR'});},/UNQUALIFIED/],
 ['subcent precision',b=>{firstOffer(b).suggestedSellingPrice.amount=920.001;},/UNQUALIFIED/],
 ['foreign prebook scope in search',b=>{b.data[0].suggestedSellingPrice={amount:920.01,currency:'EUR'};},/PREBOOK_SCOPE/],
 ['session label cannot promote search scope',b=>{b.data[0].prebookId='invented-label';b.data[0].suggestedSellingPrice={amount:920.01,currency:'EUR'};},/PREBOOK_SCOPE/],
];
for(const [name,discovery,reason]of invalid)test('SR03 scope guard: '+name,async()=>{
 const f=await fixture({discovery});assert.equal(f.prepared.status,'STOP');assert.match(f.prepared.reasons.join('|'),reason);assert(!f.prepared.request);
});

for(const returned of [920,920.02])test('SR04 returned price must equal the conservative target, with no cent tolerance: '+returned,async()=>{
 const f=await fixture({returned});assert.equal(f.assessed.status,'STOP');assert.equal(f.assessed.prebookRequest,null);
 assert(f.assessed.reasons.includes('RETURNED_PRICE_NOT_EXACT_LOCAL_TARGET'));
 if(returned===920)assert(f.assessed.reasons.includes('OBSERVED_PUBLIC_PRICE_BELOW_SSP'));
 const c=await mod('scripts/liteapi-ssp-probe-capture-v1.mjs');let calls=0;
 const result=await c.runSspProbeSequence(f.plan,async()=>[f.first,f.second][calls++],()=>{});assert.equal(calls,2);assert.equal(result.status,'STOP');
});

for(const [name,requote,reason]of [
 ['lower SSP changes despite stable maximum',(b:Wire)=>{firstOffer(b).suggestedSellingPrice.amount=920.01;},/NEW_SSP_CHANGED/],
 ['SSP source disappears',(b:Wire)=>{delete firstOffer(b).suggestedSellingPrice;},/NEW_SSP_CHANGED/],
 ['terms change',(b:Wire)=>{firstOffer(b).rates[0].boardName='Changed meal';},/CONDITIONS/],
 ['occupancy change',(b:Wire)=>{firstOffer(b).rates[0].adultCount=3;},/MATCH/],
 ['one source changes currency',(b:Wire)=>{firstOffer(b).suggestedSellingPrice.currency='USD';},/CURRENCY/],
] as Array<[string,(b:Wire)=>void,RegExp]>)test('SR05 requote still blocks '+name,async()=>{
 const f=await fixture({requote});assert.equal(f.assessed.status,'STOP');assert.match(f.assessed.reasons.join('|'),reason);assert(!f.assessed.prebookRequest);
});

for(const [name,prebook,reason]of [
 ['retail below higher SSP',(b:Wire)=>{b.data.price=920;b.data.roomTypes[0].rates[0].retailRate.total[0].amount=920;},/BELOW_SSP/],
 ['payable price below higher SSP',(b:Wire)=>{b.data.price=920;},/PAYABLE_PRICE/],
 ['higher session SSP',(b:Wire)=>{b.data.suggestedSellingPrice={amount:920.02,currency:'EUR'};},/EXCEEDS_ONE_CENT|BELOW_SSP/],
 ['foreign session currency',(b:Wire)=>{b.data.suggestedSellingPrice={amount:920.01,currency:'USD'};},/CURRENCY/],
 ['unqualified scalar SSP',(b:Wire)=>{b.data.suggestedSellingPrice=920.01;},/SCALAR_PREBOOK/],
 ['changed lower SSP',(b:Wire)=>{b.data.roomTypes[0].suggestedSellingPrice.amount=920.01;},/PRICE_OR_SSP_CHANGED/],
 ['wrong token',(b:Wire)=>{b.data.offerId='unrelated-token';},/OFFER_ID/],
 ['changed condition',(b:Wire)=>{b.data.roomTypes[0].rates[0].remarks='A changed requirement';},/CONDITIONS/],
] as Array<[string,(b:Wire)=>void,RegExp]>)test('SR06 prebook still blocks '+name,async()=>{
 const f=await fixture({prebook}),p=await pure(),r=p.assessSspPrebook(f.plan,f.first,f.second,f.third);
 assert.equal(r.status,'STOP');assert.match(r.reasons.join('|'),reason);
});

test('SR07 added prebook SSP is qualified, not ignored; no fabricated total for omitted taxes',async()=>{
 const f=await fixture({discovery:(b:Wire)=>{delete firstOffer(b).rates[0].retailRate.taxesAndFees;},prebook:(b:Wire)=>{b.data.suggestedSellingPrice={amount:920.01,currency:'EUR'};}});
 const r=(await pure()).assessSspPrebook(f.plan,f.first,f.second,f.third);
 assert.equal(r.status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED');assert.equal(r.completeCost,null);assert.equal(r.facts.sspResolution.sources.filter((x:Wire)=>x.presence==='PRESENT').length,3);
 assert(r.remainingFiscalIssues.includes('TAX_COVERAGE_UNDOCUMENTED_OMITTED'));assert.equal(r.checkoutCertified,false);
});

test('SR08 representation/metadata equivalence, identity and integrity remain separate',async()=>{
 const f=await fixture({discovery:(b:Wire)=>{b.trace='irrelevant metadata';const o=firstOffer(b);o.rates[0].retailRate.suggestedSellingPrice={amount:'920.01',currency:'EUR',source:'invented trace'};o.suggestedSellingPrice=[{amount:'920.00',currency:'EUR',source:''}];}});
 const p=await pure();assert.equal(p.assessSspPrebook(f.plan,f.first,f.second,f.third).status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED');
 f.first.response.body.sha256='0'.repeat(64);assert.throws(()=>p.prepareSspRequote(f.plan,f.first),/INTEGRITY/);
});

test('SR09 quantity context cannot be made multi-unit; no target based on retail maximum',async()=>{
 const f=await fixture({retail:1000,commission:100});assert.equal(f.prepared.localTarget.amount,920.01);assert.equal(f.prepared.facts.retail.amount,1000);
 f.plan.comparisonPlan.scenario.units=2;const p=await pure();assert.throws(()=>p.prepareSspRequote(f.plan,f.first),/SCENARIO_UNSUPPORTED/);
});

test('SR11 missing fiscal components are not solved by the local maximum; no double counting',async()=>{
 const f=await fixture({discovery:(b:Wire)=>{firstOffer(b).rates[0].retailRate.taxesAndFees=[
  {amount:40,currency:'EUR',included:true,mandatory:true,basis:'TOTAL_STAY'},
  {amount:20,currency:'EUR',included:false,mandatory:true,basis:'TOTAL_STAY'}];}});
 const r=(await pure()).assessSspPrebook(f.plan,f.first,f.second,f.third);
 assert.equal(r.status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED');assert.equal(r.localTarget.amount,920.01);assert.equal(r.completeCost,null);
 assert(r.remainingFiscalIssues.includes('COMPONENT_LIST_EXHAUSTIVENESS_NOT_ATTESTED'));assert.equal(r.facts.fiscal.payAtProperty.length,1);assert.equal(r.fullA02Admission,false);
});

test('SR12 source ordering, supported currency and multiple offers do not become fallback or price conversion',async()=>{
 const f=await fixture({plan:(p:Wire)=>{p.comparisonPlan.scenario.city='Invented alpine test';p.comparisonPlan.scenario.country='GB';p.comparisonPlan.scenario.currency='GBP';},discovery:(b:Wire)=>{firstOffer(b).rates[0].retailRate.suggestedSellingPrice[0].currency='GBP';}});
 const p=await pure();assert.equal(p.assessSspPrebook(f.plan,f.first,f.second,f.third).status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED');
 const m=await mod('tests/engine-v3/fixtures/sspProbeSyntheticV1.mjs');const body=JSON.parse(Buffer.from(f.first.response.body.base64,'base64').toString());
 const other=structuredClone(firstOffer(body));other.offerId='another-invented-offer';body.data[0].roomTypes.push(other);
 const a=p.prepareSspRequote(f.plan,m.probeRecord(f.first.intent,body));
 body.data[0].roomTypes.find((o:Wire)=>o.offerId===a.target.offerId).rates[0].retailRate.suggestedSellingPrice[0].amount=921;
 const stop=p.prepareSspRequote(f.plan,m.probeRecord(f.first.intent,body));assert.equal(stop.status,'STOP');assert.equal(stop.target.offerId,a.target.offerId);
 body.data[0].roomTypes.reverse();const reverse=p.prepareSspRequote(f.plan,m.probeRecord(f.first.intent,body));assert.equal(reverse.status,'STOP');assert.equal(reverse.target.offerId,a.target.offerId);
});

test('SR10 actual PS5.1 synthetic launcher @1.2 / DPAPI / authenticated replay; no real key',{skip:process.platform!=='win32'},async()=>{
 const f=await fixture(),p=await mod('scripts/liteapi-ssp-probe-plan-v1.mjs');
 f.plan.comparisonPlan.retention.directory=f.registryRoot;
 const proof=join(f.registryRoot,'invented-only.json');writeFileSync(proof,JSON.stringify({hotel:f.plan.hotelId,scope:'SYNTHETIC_ONLY_NOT_PROVIDER_PERMISSION'}));
 const ref={reference:proof,sha256:p.sha(readFileSync(proof))};f.plan.hotelSource={...ref,pointer:'/hotel'};
 for(const k of ['publicPriceBasis','permittedUse','retentionPermission'])f.plan.comparisonPlan.externalConditions[k]={...ref,status:'DOCUMENTED'};
 const config=join(f.registryRoot,'config.json'),inventory=join(f.registryRoot,'inventory.json'),simulation=join(f.registryRoot,'simulation.json'),output=join(f.registryRoot,'result.json');
 writeFileSync(config,JSON.stringify(f.plan));writeFileSync(simulation,JSON.stringify({origin:'SYNTHETIC_ONLY',responses:f.responses}));
 const head=p.git(process.cwd(),['rev-parse','HEAD']),branch=p.git(process.cwd(),['branch','--show-current']);
 const ps=join(process.env.SystemRoot!,'System32/WindowsPowerShell/v1.0/powershell.exe'),launcher=resolve('scripts/invoke-liteapi-ssp-probe.ps1');
 const run=(args:string[],success=true)=>{const r=spawnSync(ps,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',launcher,...args],{encoding:'utf8',windowsHide:true,timeout:120000});assert.ifError(r.error);assert.equal(r.status===0,success,r.stdout+r.stderr);return r;};
 const checkpoint=['-ExpectedHead',head,'-ExpectedBranch',branch];run(['-Mode','Inventory',...checkpoint,'-OutputPath',inventory]);
 const input=[...checkpoint,'-ConfigPath',config,'-ConfigSha',p.sha(readFileSync(config)),'-InventoryPath',inventory,'-InventorySha',p.sha(readFileSync(inventory))];
 const preflight=join(f.registryRoot,'preflight.json');run(['-Mode','Preflight',...input,'-OutputPath',preflight]);
 const pre=JSON.parse(readFileSync(preflight,'utf8'));assert.equal(pre.credentialLoaded,false);assert.equal(pre.rawCustodyCreated,false);assert(!existsSync(join(f.registryRoot,'cases')));
 run(['-Mode','Simulate',...input,'-SimulationPath',simulation,'-SimulationSha',p.sha(readFileSync(simulation)),'-OutputPath',output]);
 const r=JSON.parse(readFileSync(output,'utf8'));assert.equal(r.status,'COMPLETE');assert.equal(r.actualAttempts,3);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);assert.equal(r.assessment.status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED');
 assert.equal(JSON.parse(readFileSync(join(r.caseDirectory,'journal-key.json'),'utf8')).protectionClass,'WINDOWS_CURRENT_USER_DPAPI');
 const c=await mod('scripts/liteapi-ssp-probe-capture-v1.mjs'),read=c.readAuthenticatedSspProbe({root:r.caseDirectory,registryRoot:r.registryRoot});
 assert.equal(read.assessment.status,r.assessment.status);assert.equal(read.journal.context.config.version,f.plan.version);
 assert.match(run(['-Mode','Preflight',...input],false).stderr,/CASE_CONSUMED/);
});
