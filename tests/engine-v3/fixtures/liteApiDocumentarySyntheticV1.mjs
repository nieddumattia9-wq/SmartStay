// Invented fields following public documentation, NOT copied provider data.
// The in-memory builder proves parsing only; simulation separately drives actual
// loopback acquisition. Neither certifies any live endpoint/account/availability.
import {createHash} from 'node:crypto';
import {PLAN_VERSION,LIMITS,canonical,hash,intent} from '../../../scripts/liteapi-controlled-plan-v1.mjs';
import {CAPTURE_VERSION} from '../../../scripts/liteapi-controlled-capture-v1.mjs';
import {selectDocumentaryLiteApiOffers,getDocumentaryPrebookId} from '../../../scripts/liteapi-documentary-wire-v1.mjs';
const clone=x=>structuredClone(x),pack=x=>{const b=Buffer.from(JSON.stringify(x));return {base64:b.toString('base64'),byteLength:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
export function documentaryFixture(options={}){
 const requirements={sleepingPlaces:true,capacity:true,childAdmission:true,exclusiveUse:false,privateBathroom:false};
 const config={version:PLAN_VERSION,origin:'SYNTHETIC_LOCAL_TRANSPORT',caseId:'D0062_INVENTED_DOCUMENTARY_CASE',limits:clone(LIMITS),concurrency:1,retries:0,redirects:0,pagination:0,pacingMs:1000,
  timeoutMs:{SEARCH:15000,HOTEL_DETAIL:15000,FACILITIES:15000,PREBOOK:30000,PREBOOK_GET:15000},
  selection:{version:'HASHED_PROVIDER_IDS_AUDIT_ONLY@1',seed:'D0060_CASE_001_SELECTION_V1',maximumHotels:5},
  scenario:{searchRequest:{cityName:'Invented wire laboratory',countryCode:'IT',checkin:'2099-10-10',checkout:'2099-10-17',currency:'EUR',guestNationality:'IT',occupancies:[{adults:2,children:[7,12]}],limit:20,maxRatesPerHotel:3,includeHotelData:true,roomMapping:true},
   party:{adults:2,childAgesAtStay:[7,12],unitsRequested:1,requirements},essentialRequirementBasis:clone(requirements),stay:{checkIn:'2099-10-10',checkOut:'2099-10-17',currency:'EUR'},
   distance:{semantics:'not-requested',kilometers:null},preferenceId:'balanced',preferenceSource:'manual',totalBudget:1600},
  scenarioConfirmed:true,account:{environment:'SYNTHETIC',conditionsConfirmed:true,accountReference:'INVENTED_ACCOUNT_NOT_AUTHORITY',commercialTermsReference:'SYNTHETIC_ONLY',priceBasis:options.priceBasis??'PUBLIC_CONSUMER_PAYABLE_OFFER_RETAIL',maximumUsageCostEur:0,fivePrebookCreationsAcknowledged:true},
  retention:{directory:options.directory??'C:/synthetic-d0062-fixture-never-real-custody',days:14,responsible:'Mattia',access:'WINDOWS_CURRENT_USER_DPAPI',noAutomaticDeletionAcknowledged:true}};
 const checkpoint={branch:'codex/evaluation-d0036-d0041',head:'a'.repeat(40),inventorySha256:'b'.repeat(64)};
 const hotels=Array.from({length:options.count??3},(_,i)=>({hotelId:'invented-wire-property-'+i,roomTypes:[{offerId:'OFFER_'+i+'_'+('OPAQUE'.repeat(100))+'+/=',
  offerRetailRate:{amount:820+i*90,currency:'EUR'},rates:[{rateId:'SEARCH_RATE_'+i,occupancyNumber:1,adultCount:2,childCount:2,childrenAges:[7,12],maxOccupancy:4,mappedRoomId:700+i,
   name:'Private room; Private bathroom; 2 letti matrimoniali',boardName:'Room only',retailRate:{total:[{amount:820+i*90,currency:'EUR'}],taxesAndFees:null},
   cancellationPolicies:{refundableTag:'NRFN',cancelPolicyInfos:[],hotelRemarks:[]}}]}]}));
 const responseForIntent=q=>{
  const i=hotels.findIndex(h=>h.hotelId===q.hotelId),h=hotels[i];let payload;
  if(q.kind==='SEARCH')payload={data:clone(hotels)};
  else if(q.kind==='HOTEL_DETAIL')payload={data:{id:h.hotelId,name:'Invented property label '+i,starRating:4,reviewCount:180+i*30,
   facilities:[{facilityId:1,name:'WiFi'},{facilityId:2,name:'Air conditioning'}],hotelFacilities:['Heating','Reception','Desk'],rooms:[{id:700+i,hotelId:h.hotelId,roomName:'Neutral room',maxOccupancy:4,bedTypes:[{quantity:2,bedType:'Double bed'}],bedRelation:'AND'}]}};
  else if(q.kind==='FACILITIES')payload={data:[{facility_id:1,facility:'WiFi'},{facility_id:2,facility:'Air conditioning'},{facility_id:3,facility:'Pool'}]};
  else {const rate=clone(h.roomTypes[0].rates[0]);delete rate.mappedRoomId;rate.rateId='PREBOOK_RATE_'+i;
   payload={data:{hotelId:h.hotelId,prebookId:'SESSION_'+i+'+/=',offerId:q.offerId,checkin:config.scenario.stay.checkIn,checkout:config.scenario.stay.checkOut,currency:'EUR',price:820+i*90,termsAndConditions:'',roomTypes:[{rates:[rate]}]}};}
  options.mutate?.(payload,q,i);
  return payload;
 };
 const searchIntent=intent('SEARCH',{config}),searchRecord={ordinal:1,intent:searchIntent,outcome:'SUCCEEDED',response:{status:200,headers:{'content-type':'application/json'},body:pack(responseForIntent(searchIntent))}};
 const selection=selectDocumentaryLiteApiOffers(searchRecord,config.selection,config.scenario),requests=[searchIntent];
 for(const s of selection.selected)requests.push(intent('HOTEL_DETAIL',{...s,offerId:null,config}));
 if(selection.selected.length)requests.push(intent('FACILITIES',{config}));
 for(const s of selection.selected)if(s.offerId){const p=intent('PREBOOK',{...s,config});requests.push(p);const payload=responseForIntent(p),prebookId=payload?.data?.prebookId;
  if(typeof prebookId==='string'&&!payload.error&&!payload.data.error)requests.push(intent('PREBOOK_GET',{...s,prebookId,config}));}
 const simulation={origin:'SYNTHETIC_ONLY',responses:requests.map(q=>({method:q.method,path:q.path+(Object.keys(q.query).length?'?'+new URLSearchParams(q.query):''),
  ...(q.body!==null?{body:clone(q.body)}:{}),response:responseForIntent(q)}))};
 return {config,checkpoint,simulation,selection,responseForIntent,requests};
}
export function documentaryCaptureFixture(options={}){
 const f=documentaryFixture(options),c={version:CAPTURE_VERSION,origin:f.config.origin,config:clone(f.config),checkpoint:clone(f.checkpoint),bindingSha256:hash({config:f.config,checkpoint:f.checkpoint}),
  sealedAt:'2099-09-01T12:00:00.000Z',selection:f.selection,requests:[],status:'COMPLETE',fixtureConstruction:'IN_MEMORY_SYNTHETIC_NOT_HTTP_EXECUTION'};
 let time=Date.parse(c.sealedAt);
 for(const q of f.requests){const r={ordinal:c.requests.length+1,intent:clone(q),startedAt:new Date(time+=1000).toISOString(),completedAt:new Date(time+=1000).toISOString(),outcome:'SUCCEEDED',failureClass:null,
  response:{status:200,headers:{'content-type':'application/json'},body:pack(f.responseForIntent(q))},returnedPrebookId:null,previousSha256:c.requests.at(-1)?.recordSha256??c.bindingSha256};
  if(q.kind==='PREBOOK')r.returnedPrebookId=getDocumentaryPrebookId(r);r.recordSha256=hash(r);c.requests.push(r);}
 c.captureSha256=hash(c);return {...f,capture:c,evaluatedAt:'2099-09-01T12:10:00.000Z'};
}
