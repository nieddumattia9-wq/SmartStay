// Entirely invented, no real source IDs, offers, prices, account or custody.
import {DETAIL_VERSION,DETAIL_CONTROLS,hash,sha} from '../../../scripts/liteapi-hotel-detail-plan-v1.mjs';
import {createHotelDetailSourceBinding} from '../../../scripts/liteapi-room-detail-comparison-v1.mjs';
const clone=x=>structuredClone(x);
export const packDetailFixture=x=>{const b=Buffer.from(JSON.stringify(x));return {base64:b.toString('base64'),byteLength:b.length,sha256:sha(b)};};
export function hotelDetailFixture(options={}){
 const count=options.count??3;
 const scenario={destination:'Synthetic Maple Bay',countryCode:'CA',checkin:'2099-11-11',checkout:'2099-11-16',nights:5,adults:2,childAges:[5,13],units:1,currency:'CAD',guestNationality:'CA',budget:2300,profile:'BALANCED',profileSource:'manual',distancePreference:'NOT_REQUESTED',...clone(options.scenario??{})};
 const configuration={version:'stayopti.liteapi-search-coverage@1.2',origin:'SYNTHETIC_LOCAL_TRANSPORT',caseId:'SYNTHETIC_COVERAGE_SOURCE',scenario};
 const sourceCheckpoint='b'.repeat(40),configurationSha256=hash(configuration),inventorySha256='c'.repeat(64),resultSha256='d'.repeat(64);
 const request={kind:'CITY_RATES',method:'POST',host:'api.liteapi.travel',path:'/v3.0/hotels/rates',query:{},body:{checkin:scenario.checkin,checkout:scenario.checkout,currency:scenario.currency,guestNationality:scenario.guestNationality,occupancies:[{adults:scenario.adults,children:clone(scenario.childAges)}],limit:200,offset:0}};
 const payload={data:Array.from({length:count},(_,i)=>({hotelId:'SYNTHETIC_DETAIL_PROPERTY_'+i,roomTypes:Array.from({length:options.twoOffers?2:1},(_,j)=>({offerId:'SYNTHETIC_OFFER_'+i+'_'+j,rates:[{rateId:'SYNTHETIC_RATE_'+i+'_'+j,
  occupancyNumber:1,adultCount:scenario.adults,childCount:scenario.childAges.length,childrenAges:clone(scenario.childAges),maxOccupancy:4,mappedRoomId:510+i,name:'Suite: two double beds',
  retailRate:{total:[{amount:731+i*73+j*19,currency:scenario.currency}],taxesAndFees:null},boardName:'Room only'}]}))}))};
 options.mutateRates?.(payload);
 const response={ordinal:2,kind:'CITY_RATES',startedAt:'2099-08-01T12:00:01.000Z',completedAt:'2099-08-01T12:00:02.000Z',outcome:'SUCCEEDED',failureClass:null,response:{status:200,headers:{'content-type':'application/json'},body:packDetailFixture(payload)}};
 const authenticatedCoverage={journal:{status:'COMPLETED',binding:{mode:'SYNTHETIC_ONLY'},lastEventSha256:'a'.repeat(64),eventCount:9,context:{config:clone(configuration),checkpoint:{head:sourceCheckpoint},configFileSha256:configurationSha256}},records:[{request,response}],selection:null};
 const source=createHotelDetailSourceBinding(authenticatedCoverage,{configuration,resultSha256,configurationSha256,inventorySha256,sourceCheckpoint});
 const config={version:DETAIL_VERSION,origin:'SYNTHETIC_LOCAL_TRANSPORT',caseId:'SYNTHETIC_DETAILS_CASE',source:clone(source),targets:clone(source.targets),scenario:clone(scenario),controls:clone(DETAIL_CONTROLS),
  account:{environment:'SYNTHETIC',accountReference:'SYNTHETIC_NO_AUTHORITY',evidenceBasis:'INVENTED_FIXTURE',commercialTermsReference:'SYNTHETIC_ONLY',maximumUsageCostEur:0,conditionsConfirmed:true},
  retention:{directory:options.directory??'C:/synthetic-private-details-never-production',days:14,responsible:'Mattia',access:'WINDOWS_CURRENT_USER_DPAPI',noAutomaticDeletionAcknowledged:true,confirmed:true}};
 const records=source.targets.map((target,i)=>{
  const request={kind:'HOTEL_DETAIL',method:'GET',host:'api.liteapi.travel',path:'/v3.0/data/hotel',query:{hotelId:target.hotelId,timeout:4,language:'en'},body:null,hotelId:target.hotelId};
  const payload={data:{id:target.hotelId,name:'Invented Maple Property '+i,rooms:target.mappedRoomIds.map(id=>({id,hotelId:target.hotelId,roomName:'Neutral suite',maxOccupancy:4,maxAdults:4,maxChildren:2,bedRelation:'AND',bedTypes:[{quantity:2,bedType:'Double bed'}]}))}};
  options.mutateDetail?.(payload,i);
  return {request,response:{ordinal:i+1,kind:'HOTEL_DETAIL',startedAt:'2099-08-03T12:00:01.000Z',completedAt:'2099-08-03T12:00:02.000Z',outcome:'SUCCEEDED',failureClass:null,response:{status:200,headers:{'content-type':'application/json'},body:packDetailFixture(payload)}}};
 });
 const capture={journal:{status:'COMPLETED'},records};
 const simulation={origin:'SYNTHETIC_ONLY',responses:records.map(r=>({method:'GET',path:r.request.path+'?'+new URLSearchParams(r.request.query),response:JSON.parse(Buffer.from(r.response.response.body.base64,'base64').toString('utf8'))}))};
 return {config,source,capture,records,simulation,authenticatedCoverage,configuration,metadata:{configuration,resultSha256,configurationSha256,inventorySha256,sourceCheckpoint}};
}
