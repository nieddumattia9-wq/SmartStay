import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,readdirSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';
import {prepareAuthenticatedHistoricalCommercialV3,isPreparedHistoricalCommercialV3} from '../../src/engine-v3/evaluation/authenticatedHistoricalCommercialV3';
import {qualifyHistoricalCommercialFactsV3} from '../../src/engine-v3/contract/historicalCommercialEvidenceV3';
import {isPreparedCommercialEvidenceV3} from '../../src/engine-v3/evaluation/syntheticCommercialProtocolsV3';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
async function fixture(options:any={}){const m=await at('tests/engine-v3/fixtures/historicalCommercialSyntheticV1.mjs');return {...m.historicalJournalFixture(options),m};}
const positives={mutateDetail:(p:any)=>{p.data.childAllowed=true;}};

test('HC01 authenticated journals retain every variant and do not manufacture commercial verification',async()=>{
 const f=await fixture(positives),r=await prepareAuthenticatedHistoricalCommercialV3(f.locator);
 assert.equal(r.offerCount,4);assert.equal(r.propertyCount,2);assert(r.offers.every(o=>o.assessment.capacity==='SUPPORTED'&&o.assessment.sleeping==='SUPPORTED'));
 assert(r.offers.every(o=>o.assessment.familyAdmission==='SUPPORTED'&&o.assessment.cost.status==='SUPPORTED'));
 assert(r.offers.every(o=>o.facts.identity.providerVersion.state==='UNKNOWN'&&o.assessment.verificationCount===0));
 assert(r.offers.every(o=>o.assessment.futureBindingRequirements.includes('COMMERCIAL_VERIFICATION_MISSING')));
 assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(r.providerRequests,0);
 assert.deepEqual(f.m.syntheticTree(f.base),f.originals);assert(isPreparedHistoricalCommercialV3(r));assert(!isPreparedCommercialEvidenceV3(r));
 assert(!isPreparedHistoricalCommercialV3(structuredClone(r)));assert.throws(()=>{(r as any).offerCount=99;});
});

for(const [label,change,check]of [
 ['missing prices',(p:any)=>{delete p.data[0].roomTypes[0].rates[0].retailRate;},(a:any)=>assert.equal(a.cost.status,'UNKNOWN')],
 ['below SSP',(p:any)=>{p.data[0].roomTypes[0].rates[0].retailRate.suggestedSellingPrice={amount:950,currency:'CAD'};},(a:any)=>assert.equal(a.publicPrice,'VIOLATED')],
 ['adequate SSP',(p:any)=>{p.data[0].roomTypes[0].rates[0].retailRate.suggestedSellingPrice={amount:600,currency:'CAD'};},(a:any)=>assert.equal(a.publicPrice,'SUPPORTED')],
 ['foreign currency SSP',(p:any)=>{p.data[0].roomTypes[0].rates[0].retailRate.suggestedSellingPrice={amount:500,currency:'JPY'};},(a:any)=>assert.equal(a.publicPrice,'UNKNOWN')],
 ['real capacity restriction',(p:any)=>{p.data[0].roomTypes[0].rates[0].maxOccupancy=3;},(a:any)=>assert.equal(a.capacity,'VIOLATED')],
 ['equivalent ages',(p:any)=>{p.data[0].roomTypes[0].rates[0].childrenAges.reverse();},(a:any)=>assert.equal(a.representability,'REPRESENTABLE')],
 ['different ages',(p:any)=>{p.data[0].roomTypes[0].rates[0].childrenAges=[3,9];},(a:any)=>assert.equal(a.representability,'PARTIAL')],
 ['expired',(p:any)=>{p.data[0].roomTypes[0].rates[0].validUntil='2099-08-01T11:00:00Z';},(a:any)=>assert.equal(a.freshness,'EXPIRED')],
 ['unknown offset',(p:any)=>{p.data[0].roomTypes[0].rates[0].validUntil='2099-08-01T13:00:00-00:00';},(a:any)=>assert.equal(a.freshness,'UNINTERPRETABLE')],
] as Array<[string,(p:any)=>void,(a:any)=>void]>)test('HC02 '+label+' is consumed without removing independent offers',async()=>{
 const f=await fixture({...positives,mutateRates:change}),r=await prepareAuthenticatedHistoricalCommercialV3(f.locator);check(r.offers[0].assessment);
 assert.equal(r.offerCount,4);assert.equal(r.offers[1].assessment.capacity,'SUPPORTED');assert.deepEqual(f.m.syntheticTree(f.base),f.originals);
});

for(const [label,change,check]of [
 ['capacity 4 versus 5',(p:any)=>{p.data.rooms[0].maxOccupancy=5;},(a:any)=>assert.equal(a.capacity,'SUPPORTED')],
 ['child limit',(p:any)=>{p.data.rooms[0].maxChildren=1;},(a:any)=>assert.equal(a.capacity,'VIOLATED')],
 ['sofa places',(p:any)=>{p.data.rooms[0].bedTypes=[{quantity:1,bedType:'Double bed'},{quantity:1,bedType:'Sofa bed'}];},(a:any)=>assert.notEqual(a.sleeping,'SUPPORTED')],
 ['false child flag and contrary prose',(p:any)=>{p.data.childAllowed=false;p.data.hotelImportantInformation='Children are welcome.';},(a:any)=>assert.equal(a.familyAdmission,'CONFLICTING')],
 ['explicit prohibition',(p:any)=>{p.data.childAllowed=false;p.data.hotelImportantInformation='Children are not allowed.';},(a:any)=>assert.equal(a.familyAdmission,'VIOLATED')],
 ['group condition not applicable',(p:any)=>{p.data.hotelImportantInformation='When booking more than 7 rooms, different conditions apply.';},(a:any)=>assert.equal(a.pendingConditions.length,0)],
 ['checkin ID is not tax or bed',(p:any)=>{p.data.hotelImportantInformation='Guests must show photo identification at check-in.';},(a:any)=>{assert.equal(a.cost.status,'SUPPORTED');assert.equal(a.sleeping,'SUPPORTED');assert(a.pendingConditions.includes('CHECKIN_IDENTIFICATION'));}],
 ['guardianship not inferred from adults',(p:any)=>{p.data.hotelImportantInformation='Guests under 18 must arrive with a parent or guardian.';},(a:any)=>{assert.equal(a.cost.status,'SUPPORTED');assert.equal(a.sleeping,'SUPPORTED');assert(a.pendingConditions.includes('MINOR_ACCOMPANIMENT'));}],
 ['special request not stay cost',(p:any)=>{p.data.hotelImportantInformation='Special Requests are subject to availability and additional charges may apply.';},(a:any)=>assert.equal(a.cost.status,'SUPPORTED')],
 ['mandatory property charge',(p:any)=>{p.data.hotelImportantInformation='A mandatory service fee is payable.';},(a:any)=>assert.equal(a.cost.status,'UNKNOWN')],
 ['invalid age condition not permit',(p:any)=>{p.data.hotelImportantInformation='Children are allowed only if prior approval is granted.';},(a:any)=>assert.equal(a.familyAdmission,'UNKNOWN')],
] as Array<[string,(p:any)=>void,(a:any)=>void]>)test('HC03 '+label+' remains scoped',async()=>{
 const f=await fixture({mutateDetail:(p:any,i:number)=>{p.data.childAllowed=true;if(i===0)change(p);}}),r=await prepareAuthenticatedHistoricalCommercialV3(f.locator);
 check(r.offers[0].assessment);assert.equal(r.offers[2].assessment.accommodation,'SUPPORTED');assert.deepEqual(f.m.syntheticTree(f.base),f.originals);
});

test('HC04 common facts separate non-applicable from unknown channel requirements without provider names',async()=>{
 const f=await fixture(positives),r=await prepareAuthenticatedHistoricalCommercialV3(f.locator),facts=structuredClone(r.offers[0].facts);
 facts.identity.provider='Invented other provider';facts.price.publicMinimum={applicability:'NOT_APPLICABLE',amounts:[],issues:[]};
 const a=qualifyHistoricalCommercialFactsV3(facts);assert.equal(a.publicPrice,'NOT_APPLICABLE');assert.equal(a.authentication,'NOT_ATTESTED_BY_SEMANTIC_QUALIFIER');
 facts.price.publicMinimum.applicability='UNKNOWN';assert.equal(qualifyHistoricalCommercialFactsV3(facts).publicPrice,'UNKNOWN');
});
test('HC05 record permutation retains decisions of all dimensions and exact provenance is distinct',async()=>{
 const a=await fixture(positives),b=await fixture({...positives,mutateRates:(p:any)=>{p.data.reverse();p.data.forEach((h:any)=>h.roomTypes.reverse());}});
 const x=await prepareAuthenticatedHistoricalCommercialV3(a.locator),y=await prepareAuthenticatedHistoricalCommercialV3(b.locator);
 const key=(r:any)=>r.offers.map((o:any)=>[o.facts.identity.offerId,o.assessment.semanticKey]).sort();assert.deepEqual(key(x),key(y));
 assert.notEqual(x.offers[0].facts.identity.source.recordSha256,y.offers[0].facts.identity.source.recordSha256);
});
test('HC06 ciphertext tampering rejects before any prepared object',async()=>{
 const f=await fixture(),encrypted=join(f.locator.coverage.root,'encrypted'),p=join(encrypted,readdirSync(encrypted)[0]);
 const original=readFileSync(p),v=JSON.parse(original.toString());v.ciphertext=v.ciphertext.slice(0,-4)+'AAAA';writeFileSync(p,JSON.stringify(v));
 await assert.rejects(prepareAuthenticatedHistoricalCommercialV3(f.locator),/INTEGRITY|CHANGED|AUTHENTICATION|ENVELOPE|HASH/);
});
test('HC07 foreign detail acquisition cannot be joined by matching names or scene',async()=>{
 const a=await fixture(),b=await fixture({mutateRates:(p:any)=>{p.data[0].roomTypes[0].rates[0].retailRate.total[0].amount+=1;}});
 await assert.rejects(prepareAuthenticatedHistoricalCommercialV3({...a.locator,details:b.locator.details}),/DETAIL_TO_RATE_HISTORY_LINK_CHANGED/);
});
test('HC08 no details remain preparable, not falsely compatible',async()=>{
 const f=await fixture(),r=await prepareAuthenticatedHistoricalCommercialV3({coverage:f.locator.coverage,syntheticProtector:f.locator.syntheticProtector});
 assert.equal(r.offerCount,4);assert(r.offers.every(o=>o.assessment.accommodation==='UNKNOWN'));assert.equal(r.sourceBindingSha256,null);
});
test('HC09 GMT adapter preserves original and does not invent missing zones',async()=>{
 const m=await at('scripts/liteapi-historical-commercial-v1.mjs');
 const a=m.historicalCancellationInstants({cancelPolicyInfos:[{cancelTime:'2099-07-01 12:00:00.123000',timezone:'GMT'}]});
 assert.equal(a.entries[0].instant,'2099-07-01T12:00:00.123Z');assert.equal(a.entries[0].original.cancelTime,'2099-07-01 12:00:00.123000');
 assert.equal(m.historicalCancellationInstants({cancelPolicyInfos:[{cancelTime:'2099-07-01 12:00:00'}]}).entries[0].instant,null);
});
test('HC11 historical producer rejects arbitrary captured objects and forged origin flags',async()=>{
 const m=await at('scripts/liteapi-historical-commercial-v1.mjs');
 assert.equal(m.isAuthenticatedHistoricalLiteApiFacts({origin:'AUTHENTICATED_HISTORICAL_PROVIDER',authenticated:true}),false);
 assert.throws(()=>m.readHistoricalLiteApiFacts({coverage:{records:[]},authenticated:true}),/UNSUPPORTED_INPUT/);
});
test('HC12 included tax, unknown mandatory coverage, optional extras and deposit are not interchangeable',async()=>{
 const f=await fixture({...positives,mutateRates:(p:any)=>{p.data[0].roomTypes[0].rates[0].retailRate.taxesAndFees=[{amount:12,currency:'CAD',included:true,mandatory:true,basis:'TOTAL_STAY'}];}});
 const r=await prepareAuthenticatedHistoricalCommercialV3(f.locator);assert.equal(r.offers[0].assessment.cost.completeTotal,null);
 assert.equal(r.offers[0].facts.price.components[0].inclusion,'INCLUDED');assert.equal(r.offers[1].assessment.cost.status,'SUPPORTED');
 const facts=structuredClone(r.offers[1].facts),base=facts.price.observed!.amount;
 facts.price.components=[{amount:90,currency:'CAD',inclusion:'EXCLUDED',kind:'OPTIONAL',basis:'TOTAL_STAY'},{amount:40,currency:'CAD',inclusion:'EXCLUDED',kind:'REFUNDABLE_DEPOSIT',basis:'TOTAL_STAY'}];
 assert.equal(qualifyHistoricalCommercialFactsV3(facts).cost.completeTotal,base);
});
test('HC13 later details do not update offer expiry, price or commercial verification time',async()=>{
 const f=await fixture(positives),r=await prepareAuthenticatedHistoricalCommercialV3(f.locator);
 for(const o of r.offers){assert.notEqual(o.facts.time.detailObservedAt,o.facts.time.observedAt);assert.equal(o.assessment.observationAt,'2099-08-01T12:00:02Z');assert.equal(o.assessment.providerValidUntil,null);assert.equal(o.assessment.freshness,'UNKNOWN');assert.equal(o.assessment.retrievalCount,0);}
});
test('HC14 common uncertainty preserves repeated/missing ages and does not claim authenticity',async()=>{
 const f=await fixture(positives),r=await prepareAuthenticatedHistoricalCommercialV3(f.locator),facts=structuredClone(r.offers[0].facts);
 facts.search.childAges=[5,5];facts.childAgeEchoes=[{field:'synthetic.ages',value:[5,5]}];assert.deepEqual(qualifyHistoricalCommercialFactsV3(facts).searchAges.ages,[5,5]);
 facts.search.childAges=[5];assert.equal(qualifyHistoricalCommercialFactsV3(facts).searchAges.state,'PARTIAL');
 facts.search.childAges=null;assert.equal(qualifyHistoricalCommercialFactsV3(facts).searchAges.state,'UNKNOWN');
 facts.search.children=0;facts.childAgeEchoes=[];assert.equal(qualifyHistoricalCommercialFactsV3(facts).familyAdmission,'NOT_APPLICABLE');
});
test('HC15 offer-level monetary remark retains its exact source rather than a nonexistent rate field',async()=>{
 const f=await fixture({...positives,mutateRates:(p:any)=>{p.data[0].roomTypes[0].remarks='A mandatory service fee is payable.';}});
 const r=await prepareAuthenticatedHistoricalCommercialV3(f.locator),o=r.offers[0],c=o.facts.conditions.find(c=>c.code==='UNCLASSIFIED_MONETARY_CONDITION');
 assert(c);assert.equal(c.source.pointer,o.facts.identity.source.pointer+'.remarks');assert.equal(c.source.recordSha256,o.facts.identity.source.recordSha256);assert.equal(c.source.observedAt,o.facts.time.observedAt);
 assert.equal(o.assessment.cost.status,'UNKNOWN');assert.equal(r.offers[1].assessment.cost.status,'SUPPORTED');
});
test('HC10 real Windows PowerShell 5.1 and CurrentUser DPAPI synthetic original reader', {skip:process.platform!=='win32'?'requires actual Windows PS5.1/DPAPI in mandatory Windows job':false},async()=>{
 const temp=mkdtempSync(join(tmpdir(),'StayOpti-D0073-PS-')),script=join(temp,'read.mjs');
 writeFileSync(script,`import {historicalJournalFixture,syntheticTree} from ${JSON.stringify(pathToFileURL(join(process.cwd(),'tests/engine-v3/fixtures/historicalCommercialSyntheticV1.mjs')).href)};\nimport {readHistoricalLiteApiFacts} from ${JSON.stringify(pathToFileURL(join(process.cwd(),'scripts/liteapi-historical-commercial-v1.mjs')).href)};\nimport assert from 'node:assert/strict';\nconst f=historicalJournalFixture({dpapi:true,count:1,twoOffers:false});const r=readHistoricalLiteApiFacts(f.locator);assert.equal(r.offers.length,1);assert.equal(r.engineInvocations,0);assert.deepEqual(syntheticTree(f.base),f.originals);console.log('SYNTHETIC_CURRENTUSER_READER_PASS');`);
 const ps=spawnSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',`if ($PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'PS51_REQUIRED' }; & '${process.execPath.replace(/'/g,"''")}' '${script.replace(/'/g,"''")}'; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`],{encoding:'utf8',windowsHide:true,timeout:180000});
 assert.equal(ps.error,undefined);assert.notEqual(ps.status,null);assert.equal(ps.status,0,ps.stderr+ps.stdout);assert.match(ps.stdout,/SYNTHETIC_CURRENTUSER_READER_PASS/);
});
