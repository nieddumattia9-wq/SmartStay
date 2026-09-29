import test from 'node:test';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const mod=(p:string)=>load(pathToFileURL(resolve(p)).href);
type Wire=any; // Mutated invented original documents, not trusted facts.
const fixture=async(o:Wire={})=>(await mod('tests/engine-v3/fixtures/sspRequoteConditionsSyntheticV1.mjs')).requoteConditionsFixture({version:'stayopti.liteapi-ssp-probe@1.3',...o});
const api=()=>mod('scripts/liteapi-ssp-probe-v1.mjs');
const wire=(r:Wire)=>JSON.parse(Buffer.from(r.response.body.base64,'base64').toString('utf8'));
async function change(r:Wire,mutate:(b:Wire)=>void){const b=wire(r);mutate(b);return (await mod('tests/engine-v3/fixtures/sspProbeSyntheticV1.mjs')).probeRecord(r.intent,b);}
const equalOffer=(b:Wire)=>b.data[0].roomTypes.find((o:Wire)=>o.offerId==='invented-equivalent');
const other=(b:Wire)=>b.data[0].roomTypes[0];
const variants=(b:Wire)=>b.data[0].roomTypes;
const result=async(f:Wire,r=f.second)=>(await api()).assessSspRequote(f.plan,f.first,r);

test('RC01 initial false ambiguity preserved in @1.2; @1.3 compares all conditions before uniqueness',async()=>{
 const old=await fixture({version:'stayopti.liteapi-ssp-probe@1.2'});assert.equal(old.assessed.status,'STOP');assert.deepEqual(old.assessed.reasons,['NEW_OBSERVATION_MATCH_MISSING_OR_AMBIGUOUS']);
 const f=await fixture(),snapshot=JSON.stringify(f),a=f.assessed;
 assert.equal(a.status,'EXACT_LOCAL_TARGET_RETURNED_NOT_PREBOOK_VERIFIED');assert.equal(a.variantMatching.equivalentCount,1);assert.equal(a.variantMatching.unresolvedCount,0);
 assert.equal(a.target.offerId,'invented-equivalent');assert.equal(a.prebookRequest.body.offerId,a.target.offerId);assert.equal(a.historicalOfferContinuityCertified,false);
 assert.equal(a.variantMatching.candidates.length,3);assert.equal(a.facts.sspResolution.status,'LIMITED_ONE_CENT_DISCREPANCY');
 for(const c of a.variantMatching.candidates){assert.equal(c.source.responseSha256,f.second.response.body.sha256);assert.equal(c.source.pointer,c.binding.pointer);assert.equal(c.comparison.completeTermsCertified,false);}
 assert.equal((await api()).assessSspPrebook(f.plan,f.first,f.second,f.third).status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED');assert.equal(JSON.stringify(f),snapshot);
});

for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])test('RC02 all permutations '+order,async()=>{
 const f=await fixture(),r=await change(f.second,b=>{const a=variants(b);b.data[0].roomTypes=order.map(i=>a[i]);});
 const a=await result(f,r);assert.equal(a.target.offerId,'invented-equivalent');assert.equal(a.status,f.assessed.status);assert.deepEqual(a.prebookRequest,f.assessed.prebookRequest);
 assert.deepEqual(a.comparison,f.assessed.comparison);assert.equal(a.variantMatching.candidates.length,3);
});

for(const count of [0,2])test('RC03 '+count+' equivalents STOP irrespective of unique target-price match',async()=>{
 const f=await fixture(),r=await change(f.second,b=>{
  if(!count){equalOffer(b).rates[0].boardName='Dinner';equalOffer(b).rates[0].boardType='DINNER';}
  else {const o=structuredClone(equalOffer(b));o.offerId='another-equivalent';o.offerRetailRate.amount=1;o.rates[0].retailRate.total[0].amount=1;b.data[0].roomTypes.push(o);}
 });const a=await result(f,r);assert.equal(a.status,'STOP');assert.equal(a.variantMatching.equivalentCount,count);assert(!a.prebookRequest);assert.match(a.reasons.join('|'),/MISSING_OR_AMBIGUOUS/);
 const c=await mod('scripts/liteapi-ssp-probe-capture-v1.mjs');let calls=0;await c.runSspProbeSequence(f.plan,async()=>[f.first,r][calls++],()=>{});assert.equal(calls,2);
});

const uncertainCases:Array<[string,(b:Wire)=>void]>=[
 ['missing board',b=>{delete other(b).rates[0].boardName;}],
 ['unknown board',b=>{other(b).rates[0].boardName='UNKNOWN';}],
 ['board object',b=>{other(b).rates[0].boardName={unrecognized:true};}],
 ['missing cancellation',b=>{delete other(b).rates[0].cancellationPolicies;}],
 ['ambiguous cancellation instant',b=>{other(b).rates[0].cancellationPolicies.cancelPolicyInfos=[{cancelTime:'2099-10-09 12:00',amount:10,currency:'EUR'}];}],
 ['refundable window missing',b=>{other(b).rates[0].cancellationPolicies.refundableTag='RFN';}],
 ['wrong family',b=>{other(b).rates[0].childrenAges=[1,8];}],
 ['unresolved occupancy number',b=>{other(b).rates[0].occupancyNumber=0;}],
 ['conflicting room scopes',b=>{other(b).mappedRoomId='contrary-room';}],
 ['room absent',b=>{delete other(b).rates[0].mappedRoomId;}],
 ['tax components malformed',b=>{other(b).rates[0].retailRate.taxesAndFees='unknown';}],
 ['null restrictions',b=>{other(b).rates[0].restrictions=null;}],
 ['unknown payment',b=>{other(b).rates[0].paymentTypes=['TBC'];}],
 ['rates missing',b=>{other(b).rates=[];}],
 ['duplicate offer identity',b=>{other(b).offerId=equalOffer(b).offerId;}],
 ['offer identity missing',b=>{delete other(b).offerId;}],
 ['malformed record',b=>{b.data[0].roomTypes[0]=null;}],
];
for(const [name,mutate]of uncertainCases)test('RC04 uncertainty cannot manufacture uniqueness: '+name,async()=>{
 const f=await fixture(),r=await change(f.second,b=>{
  // No independent known difference may exclude this second potential match.
  b.data[0].roomTypes[0]={...structuredClone(equalOffer(b)),offerId:'invented-potential-match'};mutate(b);
 }),a=await result(f,r);assert.equal(a.status,'STOP');assert(!a.prebookRequest);
 assert(a.variantMatching.unresolvedCount>0);assert(a.variantMatching.candidates.some((c:Wire)=>c.status==='UNRESOLVED'));assert.match(a.reasons.join('|'),/UNRESOLVED/);
});

const differences:Array<[string,(o:Wire,h:Wire)=>void]>=[
 ['meal',o=>{o.rates[0].boardName='Dinner';o.rates[0].boardType='DINNER';}],
 ['cancellation',o=>{o.rates[0].cancellationPolicies={refundableTag:'RFN',cancelPolicyInfos:[{cancelTime:'2099-10-09T12:00:00Z',amount:10,currency:'EUR'}],hotelRemarks:[]};}],
 ['payment',o=>{o.rates[0].paymentTypes=['OTHER_PAY'];}],
 ['restrictions',o=>{o.rates[0].restrictions=['Children require documented supervision'];}],
 ['tax inclusion',o=>{o.rates[0].retailRate.taxesAndFees=[{amount:30,currency:'EUR',included:false}];}],
 ['capacity',o=>{o.rates[0].maxOccupancy=3;}],
 ['hotel condition',(_o,h)=>{h.termsAndConditions='Mandatory different terms';}],
];
for(const [name,mutate]of differences)test('RC05 established non-price difference: '+name,async()=>{
 const f=await fixture(),r=await change(f.second,b=>mutate(equalOffer(b),b.data[0])),a=await result(f,r);
 assert.equal(a.status,'STOP');assert.equal(a.variantMatching.equivalentCount,0);assert.equal(a.variantMatching.unresolvedCount,0);assert(!a.prebookRequest);
});

test('RC06 optional missing facts stay missing; presence change is not silently different',async()=>{
 const f=await fixture();assert(f.assessed.comparison.missing.before.includes('paymentPolicies'));assert.equal(f.assessed.comparison.completeTermsCertified,false);
 const r=await change(f.second,b=>{b.data[0].roomTypes[0]={...structuredClone(equalOffer(b)),offerId:'invented-potential-match',paymentSchedule:'now'};});const a=await result(f,r);assert.equal(a.status,'STOP');assert.equal(a.variantMatching.unresolvedCount,1);
});

test('RC12 known independent difference survives an unresolved unrelated term, with explicit trace',async()=>{
 const f=await fixture(),r=await change(f.second,b=>{other(b).rates[0].cancellationPolicies.cancelPolicyInfos=[{cancelTime:'2099-10-09 12:00',amount:10,currency:'EUR'}];});
 const a=await result(f,r);assert.equal(a.status,f.assessed.status);assert.equal(a.target.offerId,'invented-equivalent');
 const c=a.variantMatching.candidates[0];assert.equal(c.status,'DIFFERENT_OBSERVED_CONDITIONS');assert(c.comparison.unresolved.length>0);assert(c.comparison.establishedDifferences.some((x:Wire)=>x.field==='boardName'));
 assert.deepEqual(c.reasons,['OBSERVED_CONDITIONS_DIFFER','CONDITIONS_UNINTERPRETABLE']);
});

test('RC13 inconsistent board cannot be used to eliminate a potential match',async()=>{
 const f=await fixture(),r=await change(f.second,b=>{other(b).rates[0].boardType='BI';});
 const a=await result(f,r);assert.equal(a.status,'STOP');assert(a.variantMatching.unresolvedCount>0);assert(a.variantMatching.candidates[0].comparison.unresolved.some((x:Wire)=>x.reason==='BOARD_NAME_CODE_CONFLICT'));
});

for(const price of [1149.99,1150,1150.02])test('RC07 unique match price gate AFTER matching: '+price,async()=>{
 const f=await fixture(),r=await change(f.second,b=>{const o=equalOffer(b);o.offerRetailRate.amount=price;o.rates[0].retailRate.total[0].amount=price;});
 const a=await result(f,r);assert.equal(a.variantMatching.equivalentCount,1);assert.equal(a.target.offerId,'invented-equivalent');assert.equal(a.status,'STOP');assert.equal(a.prebookRequest,null);
 assert(a.reasons.includes('RETURNED_PRICE_NOT_EXACT_LOCAL_TARGET'));if(price<1150.01)assert(a.reasons.includes('OBSERVED_PUBLIC_PRICE_BELOW_SSP'));
 let calls=0;const c=await mod('scripts/liteapi-ssp-probe-capture-v1.mjs');const out=await c.runSspProbeSequence(f.plan,async()=>[f.first,r][calls++],()=>{});assert.equal(out.status,'STOP');assert.equal(calls,2);
});

test('RC08 existing R06 equivalent instants reused; real time difference preserved',async()=>{
 const f=await fixture(),add=(b:Wire,time:string)=>{b.data[0].roomTypes.forEach((o:Wire)=>{o.rates[0].cancellationPolicies.cancelPolicyInfos=[{cancelTime:time,amount:10,currency:'EUR'}];});};
 f.first=await change(f.first,b=>add(b,'2099-10-09T12:00:00.123Z'));
 const r=await change(f.second,b=>add(b,'2099-10-09T13:00:00.123000+01:00'));
 assert.equal((await result(f,r)).variantMatching.equivalentCount,1);
 const different=await change(r,b=>{equalOffer(b).rates[0].cancellationPolicies.cancelPolicyInfos[0].cancelTime='2099-10-09T12:00:00.123001Z';});
 assert.equal((await result(f,different)).variantMatching.equivalentCount,0);
});

test('RC09 different room retained, metadata and price of rejected variants cannot choose the match',async()=>{
 const f=await fixture(),r=await change(f.second,b=>{b.extra='irrelevant';other(b).rates[0].mappedRoomId='different-room';other(b).rates[0].retailRate.total[0].amount=0;});
 const a=await result(f,r);assert.equal(a.target.offerId,'invented-equivalent');assert.equal(a.status,f.assessed.status);assert.equal(a.variantMatching.candidates[0].status,'DIFFERENT_ROOM');
 const shifted=await change(r,b=>{b.data.unshift({hotelId:'invented-unrelated',roomTypes:[]});});const x=await result(f,shifted);
 assert.equal(x.variantMatching.candidates[1].source.pointer,'data[1].roomTypes[1]');
});

test('RC10 new prebook still checks expanded terms and integrity; no old-token transfer',async()=>{
 const f=await fixture(),p=await api();
 for(const mutation of [(b:Wire)=>{b.data.roomTypes[0].rates[0].restrictions=['New restriction'];},(b:Wire)=>{b.data.offerId='old-token';},(b:Wire)=>{b.data.roomTypes[0].rates[0].retailRate.total[0].amount=1150;}]){
  const r=p.assessSspPrebook(f.plan,f.first,f.second,await change(f.third,mutation));assert.equal(r.status,'STOP');
 }
 f.second.response.body.sha256='0'.repeat(64);assert.throws(()=>p.assessSspRequote(f.plan,f.first,f.second),/INTEGRITY/);
});

for(const [name,mutate,pattern]of [
 ['SSP greater discrepancy',(b:Wire)=>{equalOffer(b).suggestedSellingPrice.amount=1150.04;},/SSP/],
 ['SSP incompatible currency',(b:Wire)=>{equalOffer(b).suggestedSellingPrice.currency='USD';},/SSP|CURRENCY/],
 ['lower threshold changed',(b:Wire)=>{equalOffer(b).suggestedSellingPrice.amount=1150.01;},/NEW_SSP_CHANGED/],
 ['expiry uninterpretable',(b:Wire)=>{equalOffer(b).expiresAt='unknown time';},/EXPIRY_UNINTERPRETABLE/],
 ['expiry elapsed',(b:Wire)=>{equalOffer(b).expiresAt='2099-09-01T11:59:00Z';},/EXPIRED/],
] as Array<[string,(b:Wire)=>void,RegExp]>)test('RC14 @1.3 preserves monetary/time STOP after unique match: '+name,async()=>{
 const f=await fixture(),a=await result(f,await change(f.second,mutate));assert.equal(a.variantMatching.equivalentCount,1);assert.equal(a.status,'STOP');assert.equal(a.prebookRequest,null);assert.match(a.reasons.join('|'),pattern);
});

test('RC15 offer-scope payment retained, not reduced to rate-level fields',async()=>{
 const f=await fixture({discovery:(b:Wire)=>{const o=b.data[0].roomTypes[0];o.paymentTypes=['INVENTED_PAY'];o.paymentSchedule='now';}});
 const r=await change(f.second,b=>{equalOffer(b).paymentSchedule='later';});const a=await result(f,r);
 assert.equal(a.variantMatching.equivalentCount,0);assert.equal(a.status,'STOP');assert.equal(a.variantMatching.unresolvedCount,0);
 assert(a.variantMatching.candidates[1].comparison.establishedDifferences.some((d:Wire)=>d.field==='offer'));
});

test('RC11 real PS5.1 synthetic launcher @1.3, DPAPI authentication/replay and exact counters',{skip:process.platform!=='win32'},async()=>{
 const f=await fixture(),p=await mod('scripts/liteapi-ssp-probe-plan-v1.mjs');f.plan.comparisonPlan.retention.directory=f.registryRoot;
 const proof=join(f.registryRoot,'invented.json');writeFileSync(proof,JSON.stringify({hotel:f.plan.hotelId,scope:'SYNTHETIC_ONLY'}));const ref={reference:proof,sha256:p.sha(readFileSync(proof))};f.plan.hotelSource={...ref,pointer:'/hotel'};
 for(const k of ['publicPriceBasis','permittedUse','retentionPermission'])f.plan.comparisonPlan.externalConditions[k]={...ref,status:'DOCUMENTED'};
 const config=join(f.registryRoot,'config.json'),inventory=join(f.registryRoot,'inventory.json'),simulation=join(f.registryRoot,'simulation.json'),output=join(f.registryRoot,'result.json');
 writeFileSync(config,JSON.stringify(f.plan));writeFileSync(simulation,JSON.stringify({origin:'SYNTHETIC_ONLY',responses:f.responses}));
 const checkpoint=['-ExpectedHead',p.git(process.cwd(),['rev-parse','HEAD']),'-ExpectedBranch',p.git(process.cwd(),['branch','--show-current'])];
 const run=(args:string[])=>{const r=spawnSync(join(process.env.SystemRoot!,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('scripts/invoke-liteapi-ssp-probe.ps1'),...args],{encoding:'utf8',windowsHide:true,timeout:120000});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);};
 run(['-Mode','Inventory',...checkpoint,'-OutputPath',inventory]);const i=JSON.parse(readFileSync(inventory,'utf8'));assert(i.code.some((x:Wire)=>x.path==='scripts/liteapi-ssp-requote-conditions-v1.mjs'));
 const input=[...checkpoint,'-ConfigPath',config,'-ConfigSha',p.sha(readFileSync(config)),'-InventoryPath',inventory,'-InventorySha',p.sha(readFileSync(inventory))];
 const pre=join(f.registryRoot,'preflight.json');run(['-Mode','Preflight',...input,'-OutputPath',pre]);assert.equal(JSON.parse(readFileSync(pre,'utf8')).credentialLoaded,false);assert(!existsSync(join(f.registryRoot,'cases')));
 run(['-Mode','Simulate',...input,'-SimulationPath',simulation,'-SimulationSha',p.sha(readFileSync(simulation)),'-OutputPath',output]);
 const r=JSON.parse(readFileSync(output,'utf8'));assert.equal(r.status,'COMPLETE',r.failureClass);assert.deepEqual(r.counts,{DISCOVERY:1,REQUOTE:1,PREBOOK:1});assert.equal(r.actualAttempts,3);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);assert.equal(r.assessment.status,'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED');
 assert.equal(JSON.parse(readFileSync(join(r.caseDirectory,'journal-key.json'),'utf8')).protectionClass,'WINDOWS_CURRENT_USER_DPAPI');
 const v=(await mod('scripts/liteapi-ssp-probe-capture-v1.mjs')).readAuthenticatedSspProbe({root:r.caseDirectory,registryRoot:r.registryRoot});assert.deepEqual(v.assessment,r.assessment);assert.equal(v.records[2].request.body.offerId,'invented-equivalent');assert.equal(v.policyInvocations,0);
});
