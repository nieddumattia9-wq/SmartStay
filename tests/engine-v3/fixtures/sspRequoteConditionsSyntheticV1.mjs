// Invented original wire documents only. No historical acquisition data.
import {sspProbeFixture,probeRecord} from './sspProbeSyntheticV1.mjs';
import {assessSspRequote} from '../../../scripts/liteapi-ssp-probe-v1.mjs';
export function requoteConditionsFixture(options={}){
 const f=sspProbeFixture({plan:p=>{
  p.version=options.version??'stayopti.liteapi-ssp-probe@1.2';p.comparisonPlan.caseId=p.caseId;
  p.hotelSource={reference:'C:/invented-only/source.json',sha256:'a'.repeat(64),pointer:'/hotel'};
  p.purpose='BOUNDED_REQUEST_MARGIN_FUNCTIONAL_TEST_NO_ENGINE';
 },discovery:b=>{
  const o=b.data[0].roomTypes[0],r=o.rates[0];
  r.boardName='Breakfast';r.boardType='BI';r.paymentTypes=['INVENTED_PAY'];r.restrictions=[];
  r.retailRate.suggestedSellingPrice={amount:1150.01,currency:'EUR'};
  options.discovery?.(b);
 },returned:options.returned??1150.01,prebook:options.prebook});
 const body=JSON.parse(Buffer.from(f.second.response.body.base64,'base64').toString('utf8'));
 const equivalent=body.data[0].roomTypes[0];equivalent.offerId='invented-equivalent';
 const roomOnly=structuredClone(equivalent);roomOnly.offerId='invented-other-board';
 roomOnly.rates[0].boardName='Room only';roomOnly.rates[0].boardType='RO';
 const refundable=structuredClone(equivalent);refundable.offerId='invented-other-cancellation';
 refundable.rates[0].cancellationPolicies={refundableTag:'RFN',cancelPolicyInfos:[{cancelTime:'2099-10-09T12:00:00Z',amount:10,currency:'EUR'}],hotelRemarks:[]};
 body.data[0].roomTypes=[roomOnly,equivalent,refundable];options.requote?.(body);
 const second=probeRecord(f.prepared.request,body);
 const prebook=JSON.parse(Buffer.from(f.third.response.body.base64,'base64').toString('utf8'));
 prebook.data.offerId=equivalent.offerId;
 const third=probeRecord({...f.third.intent,offerId:equivalent.offerId,body:{...f.third.intent.body,offerId:equivalent.offerId}},prebook);
 const records=[f.first,second,third];
 const responses=records.map(r=>({method:r.intent.method,path:r.intent.path+(Object.keys(r.intent.query).length?'?'+new URLSearchParams(r.intent.query):''),body:r.intent.body,response:JSON.parse(Buffer.from(r.response.body.base64,'base64').toString('utf8'))}));
 return {...f,second,third,responses,assessed:assessSspRequote(f.plan,f.first,second)};
}
