import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {prepareAuthenticatedHistoricalCommercialV3} from '../../src/engine-v3/evaluation/authenticatedHistoricalCommercialV3';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
async function prepare(change:(p:any)=>void){
 const m=await load(pathToFileURL(join(process.cwd(),'tests/engine-v3/fixtures/historicalCommercialSyntheticV1.mjs')).href);
 const f=m.historicalJournalFixture({mutateDetail:(p:any,i:number)=>{p.data.childAllowed=true;if(i===0)change(p.data);}});
 const result=await prepareAuthenticatedHistoricalCommercialV3(f.locator);
 assert.deepEqual(m.syntheticTree(f.base),f.originals);assert.equal(result.offerCount,4);
 assert.equal(result.engineInvocations,0);assert.equal(result.policyInvocations,0);
 assert.equal(result.offers[2].assessment.familyAdmission,'SUPPORTED');assert.equal(result.offers[2].assessment.cost.status,'SUPPORTED');
 return result.offers[0];
}
test('HCR01 nominal policy heading is not uncertain admission',async()=>{
 const o=await prepare(p=>{p.policies=[{type:'POLICY_CHILDREN',name:'Children and extra beds',description:'No rollaway/extra beds available'}];});
 assert.equal(o.assessment.familyAdmission,'SUPPORTED');assert.equal(o.assessment.sleeping,'SUPPORTED');
 assert(o.facts.conditions.some(c=>c.text==='Children and extra beds'&&c.effect==='INFORMATION_ONLY'));
});
test('HCR02 scoped service-animal exemption is not an unknown general charge',async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation='Service animals are exempt from fees/restrictions.';});
 assert.equal(o.assessment.cost.status,'SUPPORTED');
 assert(o.facts.conditions.some(c=>c.code==='SCOPED_ANIMAL_EXEMPTION'&&c.effect==='INFORMATION_ONLY'));
});
test('HCR03 animal condition cannot swallow a separate general mandatory charge',async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation='Pets are allowed, and a mandatory service fee is payable by all guests.';});
 assert.equal(o.assessment.cost.status,'UNKNOWN');assert.equal(o.assessment.sleeping,'SUPPORTED');
 assert(o.facts.conditions.some(c=>c.subject==='MONETARY'&&c.effect==='REQUIRES_CONFIRMATION'&&/mandatory service fee/.test(c.text)));
});
for(const heading of ['Children and extra beds','<b>Children and extra beds</b>','Pets','POLICY_CHILDREN'])test('HCR04 nominal presentation '+heading,async()=>{
 const o=await prepare(p=>{p.policies=[{name:heading,description:'No rollaway/extra beds available'}];});
 assert.equal(o.assessment.familyAdmission,'SUPPORTED');assert.equal(o.assessment.sleeping,'SUPPORTED');
 assert.equal(o.assessment.cost.status,'SUPPORTED');
 const c=o.facts.conditions.find(c=>c.code==='POLICY_HEADING');assert(c);
 assert.equal(c.interpretation?.originalFieldText,heading);assert.equal(c.source.pointer,'data.policies[0].name');
 assert.equal(c.interpretation?.role,'HEADING');assert.match(c.source.recordSha256,/^[a-f0-9]{64}$/);
 assert(o.facts.conditions.some(c=>c.text==='No rollaway/extra beds available'));
});
for(const [field,text,expected]of [
 ['description','Children are not allowed.','CONFLICTING'],
 ['name','Children are not allowed.','CONFLICTING'],
 ['description','Children are allowed only with prior approval.','UNKNOWN'],
 ['name','Children under an unspecified age require approval.','UNKNOWN'],
] as const)test('HCR05 substantive '+field+' is not discarded: '+text,async()=>{
 const o=await prepare(p=>{p.policies=[{name:'Children and extra beds',[field]:text}];});
 assert.equal(o.assessment.familyAdmission,expected);assert.equal(o.assessment.sleeping,'SUPPORTED');
 assert(o.facts.conditions.some(c=>c.text===text&&c.interpretation?.role==='CONTENT'&&c.source.pointer==='data.policies[0].'+field));
});
for(const text of ['Assistance animals are exempt from pet fees and restrictions.','<p>Service animals are exempt from fees/restrictions.</p>'])test('HCR06 equivalent bounded exemption '+text,async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation=text;});
 assert.equal(o.assessment.cost.status,'SUPPORTED');
 const c=o.facts.conditions.find(c=>c.code==='SCOPED_ANIMAL_EXEMPTION');assert(c);assert.equal(c.applicability,'UNVERIFIED');
 assert.equal(c.interpretation?.originalFieldText,text);assert.equal(c.source.pointer,'data.hotelImportantInformation');
});
for(const text of ['Service animals are not exempt from fees/restrictions.','Service animals are exempt from fees only if approved.','Guests might be exempt from a mandatory tax.'])test('HCR07 negated, conditional or unsupported exemption '+text,async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation=text;});
 assert.equal(o.assessment.cost.status,'UNKNOWN');assert(!o.facts.conditions.some(c=>c.code==='SCOPED_ANIMAL_EXEMPTION'));
 assert(o.facts.conditions.some(c=>c.text===text));assert.equal(o.assessment.sleeping,'SUPPORTED');
});
for(const text of [
 'Pets are allowed and a mandatory service fee is payable by all guests.',
 'Pets are allowed, but all guests must pay a mandatory facility charge.',
 'A compulsory resort charge applies to all guests, and pets are allowed.',
 'Service animals are exempt from fees/restrictions and a mandatory service fee is payable by all guests.',
 '<p>Pets are allowed</p><p>A compulsory city tax applies to every guest.</p>',
 'Pets are allowed; a mandatory maintenance charge applies to all guests.',
])test('HCR08 independent obligations retained: '+text,async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation=text;});
 assert.equal(o.assessment.cost.status,'UNKNOWN');assert.equal(o.assessment.familyAdmission,'SUPPORTED');
 assert.equal(o.assessment.sleeping,'SUPPORTED');
 const charges=o.facts.conditions.filter(c=>c.subject==='MONETARY'&&c.effect==='REQUIRES_CONFIRMATION');assert(charges.length);
 assert(charges.some(c=>!/\bpets?|service animals\b/i.test(c.text)));
 assert(charges.every(c=>c.interpretation?.originalFieldText===text&&c.source.pointer==='data.hotelImportantInformation'));
});
test('HCR09 unseparated mandatory scope stays uncertain instead of being suppressed by pet token',async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation='Pets are permitted with a mandatory cleaning charge for every guest.';});
 assert.equal(o.assessment.cost.status,'UNKNOWN');assert(o.facts.conditions.some(c=>c.code==='UNRESOLVED_COMPOUND_MONETARY_SCOPE'));
});
test('HCR10 conditional antecedent does not become an unconditional charge',async()=>{
 const text='If guests bring pets, a mandatory cleaning fee applies and all guests must pay it.';
 const o=await prepare(p=>{p.hotelImportantInformation=text;});
 assert.equal(o.assessment.cost.status,'UNKNOWN');
 const c=o.facts.conditions.find(c=>c.code==='UNRESOLVED_COMPOUND_MONETARY_SCOPE');assert(c);
 assert.equal(c.text,text);assert.equal(c.applicability,'UNVERIFIED');
});
test('HCR11 scoped exemption does not erase ordinary-pet restriction or real children prohibition',async()=>{
 const o=await prepare(p=>{p.childAllowed=false;p.hotelImportantInformation='Pets are not allowed; Service animals are exempt from fees/restrictions; Children are not allowed.';});
 assert(o.facts.conditions.some(c=>c.text==='Pets are not allowed'));
 assert(o.facts.conditions.some(c=>c.code==='SCOPED_ANIMAL_EXEMPTION'));
 assert.equal(o.assessment.familyAdmission,'VIOLATED');assert.equal(o.assessment.sleeping,'SUPPORTED');
});
test('HCR12 ordinary optional pet charge remains scoped, not a fee paid by every guest',async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation='When travelling with pets, an extra charge of 17 CAD per pet applies.';});
 assert.equal(o.assessment.cost.status,'SUPPORTED');assert(o.facts.conditions.some(c=>c.code==='CONDITIONAL_PET_EXTRA'&&c.applicability==='UNVERIFIED'));
});
test('HCR13 an obligation expressed as must be paid cannot hide behind an animal clause',async()=>{
 const o=await prepare(p=>{p.hotelImportantInformation='Pets are allowed and a maintenance fee of CAD 12 must be paid.';});
 assert.equal(o.assessment.cost.status,'UNKNOWN');
 assert(o.facts.conditions.some(c=>c.code==='UNRESOLVED_COMPOUND_MONETARY_SCOPE'));
});
