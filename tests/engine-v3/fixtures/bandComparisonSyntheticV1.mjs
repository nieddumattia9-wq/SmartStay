// Entirely invented. No production identifiers, prices, custody or credentials.
import {join} from 'node:path';
import {comparisonFixture,comparisonSyntheticProtector} from './authenticatedComparisonSyntheticV3.mjs';
import {BAND_PLAN,BAND_CONTROLS,BAND_PRICE_POLICY,hash} from '../../../scripts/liteapi-band-comparison-plan-v1.mjs';
import {canonical,sha} from '../../../scripts/liteapi-comparison-plan-v1.mjs';
import {bandProgress,bandJournal} from '../../../scripts/liteapi-band-comparison-capture-v1.mjs';
export function bandFixture(options={}){
 const base=comparisonFixture({count:options.count??10}),config=structuredClone(base.config);
 Object.assign(config,{version:BAND_PLAN,caseId:'INVENTED_BAND_'+(options.count??10),controls:structuredClone(BAND_CONTROLS),pricePolicy:structuredClone(BAND_PRICE_POLICY),pilotMinimumDistinctProperties:10});config.selection.maximumHotels=10;
 options.configure?.(config);
 const reQuoted=new Set();
 function response(q){
  let b=base.response(q.kind==='REQUOTE'?{...q,kind:'SEARCH'}:q);
  if(q.kind==='REQUOTE'){b.data=b.data.filter(h=>h.hotelId===q.hotelId);reQuoted.add(q.hotelId);}
  for(const h of ['SEARCH','REQUOTE'].includes(q.kind)?b.data:q.kind==='PREBOOK'?[b.data]:[]){
   const i=Number(h.hotelId.split('-').at(-1)),s=900+i*30,requote=q.kind==='REQUOTE'||q.kind==='PREBOOK'&&reQuoted.has(h.hotelId);
   const amount=q.kind==='SEARCH'&&!options.direct?s-20:s+(options.delta??2),o=h.roomTypes[0],r=o.rates[0];
   h.termsAndConditions='Payment: pay now';o.offerId=(requote?'REQUOTE_':'OBSERVED_')+i+'+/=opaque';
   o.offerRetailRate={amount,currency:'EUR'};o.suggestedSellingPrice={amount:s,currency:'EUR'};
   r.rateId=(requote?'REQUOTE_RATE_':'OBSERVED_RATE_')+i;r.mappedRoomId=700+i;r.commission={amount:100,currency:'EUR'};
   r.retailRate.total=[{amount,currency:'EUR'}];r.retailRate.suggestedSellingPrice={amount:s,currency:'EUR'};
   r.childrenAges=[...config.scenario.childAges];r.childCount=config.scenario.childAges.length;r.adultCount=config.scenario.adults;
   if(q.kind==='PREBOOK'){h.price=amount;h.offerId=q.offerId;h.checkin=config.scenario.checkin;h.checkout=config.scenario.checkout;}
  }
  options.mutate?.(b,q);return b;
 }
 const pack=q=>{const b=Buffer.from(canonical(response(q)));return {status:200,headers:{'content-type':'application/json'},body:{base64:b.toString('base64'),sha256:sha(b),byteLength:b.length}};};
 const records=[],requests=[],simulation={origin:'SYNTHETIC_ONLY',responses:[]};
 for(let i=0;i<32;i++){
  const p=bandProgress(config,records);if(!p.next)break;const q=p.next,wire=response(q),raw=Buffer.from(canonical(wire));
  requests.push(q);simulation.responses.push({method:q.method,path:q.path+(Object.keys(q.query).length?'?'+new URLSearchParams(q.query):''),body:q.body,response:wire});
  records.push({ordinal:i+1,kind:q.kind,intent:q,outcome:'SUCCEEDED',completedAt:new Date(Date.parse('2099-09-01T12:00:00Z')+(i+1)*1000).toISOString(),response:{status:200,headers:{'content-type':'application/json'},body:{base64:raw.toString('base64'),sha256:sha(raw),byteLength:raw.length}}});
 }
 return {...base,config,response,pack,records,requests,simulation,progress:bandProgress(config,records)};
}
export function authenticatedBandFixture(options={}){
 const f=bandFixture(options);let ms=Date.parse('2099-09-01T12:00:00Z');const now=()=>new Date(ms+=100).toISOString();
 const input={root:join(f.registryRoot,'cases',f.config.caseId),registryRoot:f.registryRoot,caseId:f.config.caseId,mode:'SYNTHETIC_ONLY',bindingSha256:hash({config:f.config,checkpoint:f.checkpoint}),authorizationSha256:'c'.repeat(64),now,context:{config:f.config,checkpoint:f.checkpoint},...(options.dpapi?{}:{protector:comparisonSyntheticProtector})};
 const journal=bandJournal.create(input);let sealed=false;const completed=[];
 for(const original of f.records){const q=original.intent,{ordinal}=journal.reserve({kind:q.kind,hotelId:q.hotelId,offerId:q.offerId??null,requestBytes:Buffer.from(canonical(q)),checkpointSha256:input.bindingSha256});
  const r={...original,ordinal,completedAt:now()};journal.complete({ordinal,state:'SUCCEEDED',statusCode:200,responseBytes:Buffer.from(canonical(r))});completed.push(r);
  const p=bandProgress(f.config,completed);if(p.selection&&!sealed){journal.sealSelection(p.selection);sealed=true;}
 }
 if(!options.unfinished)journal.finish({status:'COMPLETED'});
 return {...f,input,journal,locator:{root:input.root,registryRoot:input.registryRoot,...(options.dpapi?{}:{syntheticProtector:comparisonSyntheticProtector})}};
}
