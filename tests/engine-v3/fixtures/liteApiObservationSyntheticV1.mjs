// Invented D-0061 wire examples. No captured provider response, private case,
// account assertion or production API/schema qualification is represented here.
import {captureSyntheticLiteApiPlan} from '../../../scripts/liteapi-diagnostic-governor-v1.mjs';
import {SUPPORTED_WIRE_PROFILE} from '../../../scripts/liteapi-observation-diagnostic-v1.mjs';
export const fixtureCheckpoint={branch:'codex/evaluation-d0036-d0041',head:'a'.repeat(40),inventorySha256:'b'.repeat(64)};
export function providerScenario(){
 const requirements={sleepingPlaces:true,capacity:true,childAdmission:true,exclusiveUse:false,privateBathroom:false};
 return {mode:'SYNTHETIC_ONLY',fixtureOrigin:'SYNTHETIC_ONLY',caseId:'D0061_INVENTED_FAMILY_CASE',wireProfile:SUPPORTED_WIRE_PROFILE,
  searchRequest:{cityName:'Invented Test City',countryCode:'IT',checkin:'2099-10-10',checkout:'2099-10-17',currency:'EUR',guestNationality:'IT',
   occupancies:[{adults:2,children:[7,12]}],limit:20,maxRatesPerHotel:3,includeHotelData:true,roomMapping:true},
  party:{adults:2,childAgesAtStay:[7,12],unitsRequested:1,requirements},essentialRequirementBasis:structuredClone(requirements),
  stay:{checkIn:'2099-10-10',checkOut:'2099-10-17',currency:'EUR'},totalBudget:1600,preferenceId:'balanced',preferenceSource:'manual',
  distance:{semantics:'not-requested',kilometers:null},account:{environment:'SYNTHETIC',priceBasis:'OFFER_RETAIL_RATE_DOCUMENTED_FOR_FIXTURE'},
  productionNationalityConfirmed:false,productionAccountConditionsConfirmed:false};
}
export function providerHotel(i){
 return {hotelId:'invented-property-'+i,roomTypes:[{offerId:'invented-offer-'+i,offerRetailRate:{amount:900+i*70,currency:'EUR'},rates:[{
  rateId:'invented-rate-'+i,mappedRoomId:'invented-room-'+i,occupancyNumber:1,adultCount:2,childCount:2,children:[7,12],maxOccupancy:4,
  name:'Private room; Private bathroom; 2 letti matrimoniali',boardName:'Room only',taxesAndFees:null,
  cancellationPolicies:{refundableTag:'NRFN',cancelPolicyInfos:[]}}]}]};
}
export async function providerCapture(options={}){
 const scenario=providerScenario(),selectionPolicy={version:'HASHED_PROVIDER_IDS_AUDIT_ONLY@1',seed:'D0061_FROZEN_SAMPLE_V1',maximumHotels:5};
 const hotels=Array.from({length:options.count??3},(_,i)=>providerHotel(i));
 if(options.idPrefix)for(const h of hotels){h.hotelId=options.idPrefix+h.hotelId;for(const o of h.roomTypes){o.offerId=options.idPrefix+o.offerId;
  for(const r of o.rates){r.rateId=options.idPrefix+r.rateId;r.mappedRoomId=options.idPrefix+r.mappedRoomId;}}}
 if(options.alterScenario)options.alterScenario(scenario);
 let attempts=0;
 const originals=[];
 const transport={mode:'SYNTHETIC_STUB',request:async request=>{
  attempts++;
  const index=hotels.findIndex(h=>h.hotelId===request.hotelId),hotel=hotels[index];
  let payload;
  if(request.kind==='SEARCH')payload={data:structuredClone(hotels)};
  else if(request.kind==='HOTEL_DETAIL')payload={data:{id:hotel.hotelId,name:'Invented non-ranking name '+index,starRating:4,reviewCount:200+index*100,
   facilities:['WiFi','Air conditioning','Heating','Reception','Desk']}};
  else if(request.kind==='FACILITIES')payload={data:[{id:1,name:'WiFi'}]};
  else payload={data:{...structuredClone(hotel),prebookId:'invented-prebook-'+index}};
  if(options.mutate)options.mutate(payload,request,index);
  const response={status:200,headers:{'content-type':'application/json'},bodyBytes:JSON.stringify(payload)};
  if(options.respond)options.respond(response,request,index);
  originals.push({request:structuredClone(request),response:structuredClone(response)});
  return response;
 }};
 let clock=Date.parse('2099-09-01T12:00:00Z');
 const capture=await captureSyntheticLiteApiPlan({checkpoint:fixtureCheckpoint,expectedCheckpoint:fixtureCheckpoint,scenario,selectionPolicy,
  transport,now:()=>new Date(clock+=1000).toISOString()});
 return {capture,checkpoint:fixtureCheckpoint,scenario,selectionPolicy,evaluatedAt:'2099-09-01T12:10:00Z',attempts,originals};
}
