// Entirely invented documents. The response is a fixture, not a provider model.
import {join} from 'node:path';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {comparisonFixture} from './authenticatedComparisonSyntheticV3.mjs';
import {SSP_PROBE_VERSION,SSP_PROBE_CAPS,sspDiscoveryRequest,prepareSspRequote,assessSspRequote} from '../../../scripts/liteapi-ssp-probe-v1.mjs';
import {canonical,sha} from '../../../scripts/liteapi-comparison-plan-v1.mjs';
export const pack=x=>{const b=Buffer.from(canonical(x));return {base64:b.toString('base64'),sha256:sha(b),byteLength:b.length};};
export function probeRecord(q,payload){return {kind:q.kind,intent:structuredClone(q),outcome:'SUCCEEDED',completedAt:'2099-09-01T12:00:00.000Z',response:{status:200,headers:{'content-type':'application/json'},body:pack(payload)}};}
export function sspProbeFixture(options={}){
 const base=comparisonFixture().config;
 const plan={version:SSP_PROBE_VERSION,origin:'SYNTHETIC_ONLY',caseId:'INVENTED_MARGIN_EXPERIMENT',comparisonPlan:base,hotelId:'invented-margin-hotel+/=',marginDecimals:6,caps:structuredClone(SSP_PROBE_CAPS)};
 options.plan?.(plan);
 const currency=plan.comparisonPlan.scenario.currency;
 const money=amount=>({amount,currency});
 const rate={rateId:'opaque-first-rate+/=',occupancyNumber:1,adultCount:base.scenario.adults,childCount:base.scenario.childAges.length,childrenAges:[...base.scenario.childAges],
  mappedRoomId:'opaque-room/1',maxOccupancy:4,name:'Private room, private bathroom, two double beds',boardName:'Room only',
  retailRate:{total:[money(options.retail??1100)],taxesAndFees:null},commission:money(options.commission??100),cancellationPolicies:{refundableTag:'NRFN',cancelPolicyInfos:[],hotelRemarks:[]}};
 const offer={offerId:'opaque-first-offer+/=',offerRetailRate:money(options.retail??1100),suggestedSellingPrice:money(options.ssp??1150),rates:[rate]};
 const discovery={data:[{hotelId:plan.hotelId,termsAndConditions:'',roomTypes:[offer]}]};
 options.discovery?.(discovery);
 const first=probeRecord(sspDiscoveryRequest(plan),discovery),prepared=prepareSspRequote(plan,first);
 const requote=structuredClone(discovery),next=requote.data[0].roomTypes[0];
 next.offerId='opaque-NEW-offer+/=';next.rates[0].rateId='opaque-NEW-rate+/=';
 next.offerRetailRate=money(options.returned??options.ssp??1150);next.rates[0].retailRate.total=[money(options.returned??options.ssp??1150)];
 next.rates[0].commission=money(150);
 options.requote?.(requote);
 const second=prepared.request?probeRecord(prepared.request,requote):null;
 const assessed=second?assessSspRequote(plan,first,second):null;
 const prebook={data:{hotelId:plan.hotelId,offerId:next.offerId,prebookId:'invented-only-session',checkin:base.scenario.checkin,checkout:base.scenario.checkout,currency,
  price:next.rates[0].retailRate.total[0].amount,termsAndConditions:'',roomTypes:[{rates:structuredClone(next.rates),suggestedSellingPrice:structuredClone(next.suggestedSellingPrice)}]}};
 options.prebook?.(prebook);
 const third=assessed?.prebookRequest?probeRecord(assessed.prebookRequest,prebook):null;
 const records=[first,second,third].filter(Boolean),responses=records.map(r=>({method:r.intent.method,path:r.intent.path+(Object.keys(r.intent.query).length?'?'+new URLSearchParams(r.intent.query):''),body:r.intent.body,response:JSON.parse(Buffer.from(r.response.body.base64,'base64'))}));
 return {plan,first,second,third,prepared,assessed,responses,registryRoot:mkdtempSync(join(tmpdir(),'stayopti-ssp-probe-synthetic-')),
  protector:{protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:x=>x,unprotectDataKey:x=>x}};
}
