import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const {compareBookingOfferSnapshots,createPublicOfferId}=require('../../server/services/bookingOfferIntegrityService.js');
const {createCancellationSummary}=require('../../server/providers/liteApi/liteApiOfferMapper.js');
const sourceUrl=new URL('../../src/utils/bookingOfferComparison.ts',import.meta.url);
const compiled=ts.transpileModule(readFileSync(sourceUrl,'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true},
}).outputText;
const browserModule={exports:{}};
new Function('exports','module','require',compiled)(browserModule.exports,browserModule,createRequire(sourceUrl));
const {getMaterialChangedFields}=browserModule.exports;

const offer={
  id:'synthetic-cancellation-reference',sourceProvider:'synthetic-provider',providerOfferReference:'synthetic-local-token',
  price:800,totalKnownCost:800,currency:'EUR',taxesIncluded:true,includedTaxes:0,excludedTaxes:0,unknownTaxes:0,
  roomName:'Synthetic room',mealPlan:'Room only',refundable:true,
  freeCancellationUntil:'2099-04-12T12:00:00Z',cancellationPolicy:'Refundable',bookable:true,
};
const compare=(before,after)=>({backend:compareBookingOfferSnapshots(before,after),frontend:getMaterialChangedFields(before,after)});

for(const value of ['2099-04-12T13:00:00+01:00','2099-04-12T07:00:00-05:00','2099-04-12T12:00Z','2099-04-12T12:00:00.000000Z']){
  test('CI-public equivalent explicit deadline keeps backend and browser unchanged: '+value,()=>{
    const before=structuredClone(offer),after={...offer,freeCancellationUntil:value};
    const original=JSON.stringify({before,after}),result=compare(before,after);
    assert.equal(result.backend.changed,false);assert.deepEqual(result.backend.changedFields,[]);assert.deepEqual(result.frontend,[]);
    assert.equal(JSON.stringify({before,after}),original);
    assert.equal(result.backend.confirmed.freeCancellationUntil,value.toLowerCase(),'snapshot retains the source representation, not canonical date replacement');
  });
}
for(const value of ['2099-04-12T13:00:01+01:00','2099-04-12T12:00:00.0001Z','2099-04-12T12:00:00','2099-04-12','2099-04-12T12:00:00-00:00','2099-04-12T12:00:00+24:00',null]){
  test('CI-public actual difference or insufficient temporal information is not equated: '+value,()=>{
    const result=compare(offer,{...offer,freeCancellationUntil:value});
    assert.equal(result.backend.changed,true);assert.deepEqual(result.backend.changedFields,['freeCancellationUntil']);assert.deepEqual(result.frontend,['freeCancellationUntil']);
  });
}
test('CI-public invalid calendar must not normalize into a legitimate instant',()=>{
  const result=compare({...offer,freeCancellationUntil:'2099-02-30T12:00:00Z'},{...offer,freeCancellationUntil:'2099-03-02T12:00:00Z'});
  assert.deepEqual(result.backend.changedFields,['freeCancellationUntil']);assert.deepEqual(result.frontend,['freeCancellationUntil']);
});
test('CI-public equal ambiguous representations remain unchanged without asserting a known instant',()=>{
  const value={...offer,freeCancellationUntil:'2099-04-12T12:00:00'};
  assert.equal(compare(value,structuredClone(value)).backend.changed,false);
  assert.deepEqual(getMaterialChangedFields(value,structuredClone(value)),[]);
});
for(const [field,value] of [['refundable',false],['cancellationPolicy','Non-refundable'],['mealPlan','Breakfast'],['bookable',false],['roomName','Different room'],['totalKnownCost',810],['excludedTaxes',20],['currency','USD']]){
  test('CI-public equivalent deadline never erases another commercial change: '+field,()=>{
    const after={...offer,freeCancellationUntil:'2099-04-12T13:00:00+01:00',[field]:value};
    const result=compare(offer,after);
    assert.equal(result.backend.changed,true);assert(result.backend.changedFields.includes(field));
    assert(result.frontend.includes(field==='currency'?'totalKnownCost':field));
    assert(!result.backend.changedFields.includes('freeCancellationUntil'));assert(!result.frontend.includes('freeCancellationUntil'));
  });
}
test('CI-public cancellation prose is not silently interpreted as a date template',()=>{
  const before={...offer,cancellationPolicy:'Free cancellation until 2099-04-12T12:00:00Z'},
    after={...offer,freeCancellationUntil:'2099-04-12T13:00:00+01:00',cancellationPolicy:'Free cancellation until 2099-04-12T13:00:00+01:00'};
  assert.deepEqual(compare(before,after).backend.changedFields,['cancellationPolicy']);
  assert.deepEqual(getMaterialChangedFields(before,after),['cancellationPolicy']);
});
test('CI-public actual mapper-generated deadline and owned copy are equal for equivalent explicit offsets',()=>{
  const map=cancelTime=>createCancellationSummary({refundableTag:'RFN',cancellationPolicies:{cancelPolicyInfos:[{cancelTime,amount:200,currency:'EUR'}]}});
  const a=map('2099-04-12T12:00:00Z'),b=map('2099-04-12T13:00:00+01:00');
  assert.deepEqual(a,b,'existing provider mapper emits the same canonical owned copy');
  assert.match(a.cancellationPolicy,/^Refundable; cancellation fees apply from /);
  const result=compare({...offer,...a},{...offer,...b});
  assert.equal(result.backend.changed,false);assert.deepEqual(result.frontend,[]);
});
test('CI-public the new temporal equivalence is not an opaque offer identity migration',()=>{
  const changed={...offer,freeCancellationUntil:'2099-04-12T13:00:00+01:00'};
  assert.notEqual(createPublicOfferId(offer),createPublicOfferId(changed));
  assert.deepEqual(getMaterialChangedFields(offer,changed),[]);
});
test('CI-public panel consumes the tested comparison, not a separate deadline implementation',()=>{
  const panel=readFileSync(new URL('../../src/components/HotelDetailsPanel/HotelDetailsPanel.tsx',import.meta.url),'utf8');
  assert.match(panel,/from "\.\.\/\.\.\/utils\/bookingOfferComparison"/);
  assert.match(panel,/getMaterialChangedFields\(/);
  assert.doesNotMatch(panel,/function getMaterialChangedFields\(/);
});
