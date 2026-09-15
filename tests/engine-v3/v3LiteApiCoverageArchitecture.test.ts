import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {computeObservedOfferDiagnosticV3} from '../../src/engine-v3/evaluation/observedOfferDiagnosticV3';
import {fixture} from './fixtures/observedOfferRequirementsSyntheticV3';
import {evaluateSmartStaySearchV2} from '../../src/engine-v2/orchestrator/smartStayEngineV2';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const clone=(x:any)=>structuredClone(x);
function measured(input:any){const policy=require('../../src/engine-v3/policy/personalUtilityRolePolicyV3'),old=policy.runPersonalUtilityRolePolicyV3;let calls=0;
 policy.runPersonalUtilityRolePolicyV3=(...args:any[])=>{calls++;return old(...args);};
 try{const out=computeObservedOfferDiagnosticV3(input);assert.equal(out.policyInvocations,calls);return out;}finally{policy.runPersonalUtilityRolePolicyV3=old;}}
const projection=(r:any)=>({decision:r.decision.portfolio,status:r.decision.status,profile:r.profile,
 candidates:r.candidates.map((c:any)=>({id:c.hotelId,dimensions:c.policy.dimensions,hard:c.policy.hardConstraintsSatisfied,integrity:c.policy.offerIntegrity,eligibility:c.policy.contextualEligibility})).sort((a:any,b:any)=>a.id.localeCompare(b.id))});

test('CA01 representation-only catalog duplicates retain the same pool but distinct original hashes',async()=>{
 const p=await at('scripts/liteapi-search-coverage-plan-v1.mjs'),d=await at('scripts/liteapi-search-coverage-diagnostics-v1.mjs');
 const base={data:Array.from({length:25},(_,i)=>({id:'INVENTED_'+i,country:'IT',city:'Bologna'}))};
 const run=(v:any)=>{const b=Buffer.from(JSON.stringify(v));return d.selectCoverageCatalog(b,p.sha(b));},control=run(base);
 for(let i=0;i<12;i++){const v=clone(base);v.data.reverse();v.data.push({...v.data[i],country:' it ',city:'BOLOGNA',extra:{thumbnail:i,error:'not an error envelope'}});const r=run(v);
 assert.deepEqual(r.selectedIds,control.selectedIds);assert.equal(r.poolFingerprint,control.poolFingerprint);assert.notEqual(r.catalogSha256,control.catalogSha256);
 assert.equal(r.rows.filter((x:any)=>x.nonSelectionDifferences).length,2);assert.equal(r.rows.length,26);assert.equal(r.rows.filter((x:any)=>x.reason).length,0);}
 const conflict=clone(base);conflict.data.push({...conflict.data[0],country:'FR'});assert(!run(conflict).poolIds.includes('INVENTED_0'));
 const bytes=Buffer.from(JSON.stringify(base));assert.throws(()=>d.selectCoverageCatalog(Buffer.concat([bytes,Buffer.from(' ')]),sha(bytes)),/ORIGINAL_HASH/);
});
test('CA02 plan changes require different authorization; invalid or old profiles cannot be silently migrated',async()=>{
 const p=await at('scripts/liteapi-search-coverage-plan-v1.mjs'),f=await at('tests/engine-v3/fixtures/liteApiCoverageSyntheticV1.mjs');
 const c=f.coverageFixture({directory:'C:/invented'}).config,inv={expectedHead:'a'.repeat(40)};
 for(const mutate of [(x:any)=>x.caseId='SECOND_CASE',(x:any)=>x.scenario.destination='Invented City',(x:any)=>x.scenario.currency='USD',(x:any)=>x.controls.seed='SECOND_SEED',(x:any)=>x.controls.maximumSelectedIds=5]){
 const z=clone(c);mutate(z);assert.equal(p.validateCoveragePlan(z,{synthetic:true}).pending.length,0);assert.notEqual(p.coverageAuthorization(z,inv),p.coverageAuthorization(c,inv));}
 for(const mutate of [(x:any)=>x.version='stayopti.liteapi-search-coverage@1',(x:any)=>x.controls.host='example.invalid',(x:any)=>x.controls.limits.CATALOG=2,(x:any)=>x.controls.additionalPages=1,(x:any)=>x.scenario.units=2,(x:any)=>x.scenario.checkin='2099-02-31',(x:any)=>x.scenario.distancePreference='unknown']){const z=clone(c);mutate(z);assert.throws(()=>p.validateCoveragePlan(z,{synthetic:true}),/LITEAPI_COVERAGE_/);}
 const changed=clone(c);changed.scenario.currency='USD';const s=f.coverageFixture({directory:'C:/invented'}).selection;
 assert.throws(()=>p.validateCoverageRequest(p.coverageRequest('CITY_RATES',s,c),s,changed),/REQUEST_OUTSIDE_SEALED_PLAN/);
});
test('CA03 irrelevant extensions do not become protocol errors; actual scoped errors still stop',async()=>{
 const d=await at('scripts/liteapi-search-coverage-diagnostics-v1.mjs');
 assert.deepEqual(d.semanticErrors({data:[{roomTypes:[{rates:[{extension:{error:'analytics only'}}]}]}],extra:{errors:['debug']}}),[]);
 for(const v of [{error:'root'},{data:[{errors:['property']}]},{data:[{roomTypes:[{error:'offer'}]}]},{data:[{roomTypes:[{rates:[{error:'rate'}]}]}]}])assert.equal(d.semanticErrors(v).length,1);
});

// Documentary LiteAPI variants traverse exact byte/capture verification and the
// same production-profile adapter before the synthetic kernel. No live transport.
test('CA04 equivalent money JSON representations preserve actual decision and retain different source bytes',async()=>{
 const f=await at('tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs'),a=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
 let calls=0;const run=(mutate?:any)=>{const request=f.documentaryCaptureFixture({mutate}),before=JSON.stringify(request),r=a.prepareLiteApiProviderObservation(request);
 assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(r.status,'PREPARED_DIAGNOSTIC_INPUT');const output=measured(r.input);calls+=output.policyInvocations;
 assert.equal(JSON.stringify(request),before);return {request,r,output};};
 const base=run();assert(base.output.decision);assert.equal(base.output.decision.status,'usable');
 for(let i=0;i<8;i++){const r=run((p:any)=>{const visit=(v:any)=>{if(!v||typeof v!=='object')return;for(const k of Object.keys(v)){if(k==='amount'&&typeof v[k]==='number')v[k]=v[k].toFixed(i%3);else visit(v[k]);}};visit(p);p.unusedDisplayMetadata={iteration:i};});
 assert.deepEqual(projection(r.output),projection(base.output));assert.notEqual(r.request.capture.captureSha256,base.request.capture.captureSha256);assert.notEqual(r.r.input.sourceFingerprint,base.r.input.sourceFingerprint);}
 assert.equal(calls,9);
 const tamper=f.documentaryCaptureFixture();tamper.capture.requests[0].response.body.base64=Buffer.from('{}').toString('base64');assert.throws(()=>a.prepareLiteApiProviderObservation(tamper),/LITEAPI_/);assert.equal(calls,9);
});

// Two explicitly SYNTHETIC provider vocabularies. This test adapter lives only
// in tests: it cannot impersonate a production source or a HUMAN receipt.
async function syntheticProviders(){
 const x=await fixture(),entry=await at('scripts/observed-offer-execution-v1.mjs');
 for(const h of x.b.search.hotels){h.latitude=null;h.longitude=null;h.availableData.hasCoordinates=false;}
 const previous=evaluateSmartStaySearchV2(x.b.search),query:any={...x.b.search,childAgesAtStay:[],destinationKey:'INVENTED_CITY',preferenceSource:'manual'};delete query.hotels;
 const signals=previous.evaluations.map(e=>({alternativeId:e.hotel.id,evidence:clone(e.evidence),features:[...e.hotel.amenities,...e.hotel.facilities],roomText:e.hotel.offers[0].roomName,category:null,observations:{synthetic:true},provenance:{kind:'SYNTHETIC'}}));
 const encode=(provider:'A'|'B')=>{
 const records=x.n.offers.map((o:any)=>{const {completeTotal,ratingScale,ratingObserved,capacityGuests,...rest}=clone(o);
 return provider==='A'?{property:o.alternativeId,price:completeTotal.value,currency:o.scope.stay.currency,capacity:capacityGuests.value,rating:ratingObserved.value,maximum:ratingScale.value,
  context:rest,metadata:{completeTotal,ratingScale,ratingObserved,capacityGuests}}:
 {property:o.alternativeId,money:{minorUnits:completeTotal.value*100,unit:o.scope.stay.currency},sleepingCapacity:{guests:capacityGuests.value},review:{score:ratingObserved.value,range:{minimum:0,maximum:ratingScale.value}},
  context:rest,metadata:{completeTotal,ratingScale,ratingObserved,capacityGuests}};});
 return Buffer.from(JSON.stringify({syntheticOnly:true,provider,records}));};
 const decode=(bytes:Buffer,expected:string)=>{
 // Authenticate exact original before any semantic interpretation.
 assert.equal(sha(bytes),expected,'synthetic original hash mismatch');const wire=JSON.parse(bytes.toString());assert.equal(wire.syntheticOnly,true);assert(['A','B'].includes(wire.provider));
 const normalization=clone(x.n);normalization.offers=wire.records.map((r:any)=>{const m=r.metadata,o={...r.context,...m},b=wire.provider==='B';
 o.scope.stay.currency=b?r.money.unit:r.currency;o.completeTotal.value=b?r.money.minorUnits/100:r.price;o.capacityGuests.value=b?r.sleepingCapacity.guests:r.capacity;
 o.ratingObserved.value=b?r.review.score:r.rating;o.ratingScale.value=b?r.review.range.maximum:r.maximum;
 o.ratingScale.sourceInterval={minimum:b?r.review.range.minimum:0,maximum:o.ratingScale.value};
 for(const c of [o.completeTotal,o.capacityGuests,o.ratingScale,o.ratingObserved])c.links=[{field:r.property,evidence:[{ref:'SYNTHETIC_PROVIDER_'+wire.provider,sha256:expected}]}];return o;});
 const request={kind:'SYNTHETIC',normalization,contextId:'PREFERENCE',syntheticRequirementBasis:clone(x.n.party.requirements),syntheticQuery:clone(query),
 syntheticSignals:signals.map(s=>({...clone(s),observations:{source:wire},provenance:{kind:'SYNTHETIC',provider:wire.provider,originalSha256:expected}}))};
 return {request,prepared:entry.prepareObservedOfferDiagnostic(request)};};
 return {encode,decode,entry};
}
test('CA05 independent synthetic vocabularies, units and order converge only after authentication',async()=>{
 const f=await syntheticProviders();let baseline:any,calls=0;
 for(const provider of ['A','B'] as const)for(let i=0;i<6;i++){const w=JSON.parse(f.encode(provider).toString());if(i%2)w.records.reverse();w.nonDecision={label:'Invented '+i,providerOrder:i};const bytes=Buffer.from(JSON.stringify(w)),before=Buffer.from(bytes),r=f.decode(bytes,sha(bytes));
 const out=measured(r.prepared.input);calls+=out.policyInvocations;assert(out.decision);assert.equal(out.decision.status,'usable');if(baseline)assert.deepEqual(projection(out),baseline);else baseline=projection(out);
 assert(bytes.equals(before));assert.equal(r.prepared.input.candidates[0].provenance.provider,provider);assert.equal(r.prepared.goldenAdmission,false);}
 // Existing strong-distance policy runs a reference selection plus final selection.
 assert.equal(calls,24);const bytes=f.encode('B');assert.throws(()=>f.decode(Buffer.concat([bytes,Buffer.from(' ')]),sha(bytes)),/hash mismatch/);assert.equal(calls,24);
});
for(const change of ['currency','capacity','conditions','rating-meaning','rating-interval'])test('CA06 real semantic difference is retained: '+change,async()=>{
 const f=await syntheticProviders(),base=f.encode('B'),b=f.decode(base,sha(base)),before=measured(b.prepared.input),w=JSON.parse(base.toString());
 for(const r of w.records){if(change==='currency')r.money.unit='USD';if(change==='capacity')r.sleepingCapacity.guests=1;
 if(change==='conditions')Object.assign(r.context.availability.bookability,{state:'KNOWN',value:false});
 if(change==='rating-meaning')r.review.range.maximum=20;if(change==='rating-interval')r.review.range.minimum=9.9;}
 const bytes=Buffer.from(JSON.stringify(w));
 if(['currency','rating-interval'].includes(change)){assert.throws(()=>f.decode(bytes,sha(bytes)),change==='currency'?/REQUIREMENTS_OFFER_SCOPE/:/REQUIREMENTS_RATING_OUTSIDE_DOCUMENTED_SCALE/);return;}
 const r=f.decode(bytes,sha(bytes)),out=measured(r.prepared.input);assert.equal(out.policyInvocations,2);
 if(change==='rating-meaning'){assert.notDeepEqual(out.candidates.map(c=>c.policy.dimensions.quality),before.candidates.map(c=>c.policy.dimensions.quality));}
 else {assert(out.decision);assert.equal(out.decision.status,'abstained');}assert.notDeepEqual(projection(out),projection(before));
});
test('CA07 actual transitive core dependency closure excludes provider adapters; MAX3 excludes kernel/policy',async()=>{
 const seen=new Set<string>();function visit(file:string){file=resolve(file);if(seen.has(file))return;seen.add(file);const text=readFileSync(file,'utf8');
 for(const m of text.matchAll(/from\s*['"](\.[^'"]+)['"]/g)){const p=resolve(dirname(file),m[1]);const child=[p+'.ts',join(p,'index.ts')].find(existsSync);assert(child,'unresolved static core dependency '+m[1]);visit(child);}}
 visit('src/engine-v3/evaluation/observedOfferDiagnosticV3.ts');assert(seen.size>20);
 for(const p of seen){assert.doesNotMatch(relative(process.cwd(),p),/liteapi|serpapi|scripts|providers/i);assert.doesNotMatch(readFileSync(p,'utf8'),/\b(retailRate|sellingPriceToUser|mappedRoomId|occupancyNumber)\b/);}
 const plan=await at('scripts/liteapi-search-coverage-plan-v1.mjs');for(const p of plan.coverageCodePaths(process.cwd()))assert.doesNotMatch(p,/observed-offer-execution|observedOfferDiagnostic|personalUtilityRolePolicy|engine-v[23]/);
 for(const p of ['scripts/liteapi-search-coverage-capture-v1.mjs','scripts/liteapi-search-coverage-journal-v1.mjs','scripts/liteapi-search-coverage-diagnostics-v1.mjs'])assert.doesNotMatch(readFileSync(p,'utf8'),/Bologna|2027-01|\[6,11\]/);
});
