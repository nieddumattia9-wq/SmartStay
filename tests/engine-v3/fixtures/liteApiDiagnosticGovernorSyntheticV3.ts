import {pathToFileURL} from 'node:url';
import path from 'node:path';
export async function liteApiGovernorFixture(){
 const m=await (new Function('u','return import(u)'))(pathToFileURL(path.resolve('scripts/liteapi-diagnostic-governor-v1.mjs')).href);
 const checkpoint={branch:'codex/synthetic-d0061',head:'a'.repeat(40),inventorySha256:'b'.repeat(64)};
 const scenario={mode:'SYNTHETIC_ONLY',caseId:'INVENTED_D0061_CASE',
  searchRequest:{cityName:'Invented Test City',countryCode:'ZZ',checkin:'2099-11-10',checkout:'2099-11-17',currency:'EUR',
   guestNationality:'ZZ',occupancies:[{adults:2,children:[6,11]}],limit:20,maxRatesPerHotel:3,includeHotelData:true,roomMapping:true}};
 const selectionPolicy={version:'HASHED_PROVIDER_IDS_AUDIT_ONLY@1',seed:'INVENTED_D0061_SELECTION_SEED',maximumHotels:5};
 const pool={data:Array.from({length:7},(_,i)=>({hotelId:'SYNTHETIC_HOTEL_'+i,name:'Invented lodging '+i,
  roomTypes:Array.from({length:2},(_,j)=>({offerId:'SYNTHETIC_OFFER_'+i+'_'+j,rates:[{rateId:'SYNTHETIC_RATE_'+i+'_'+j,occupancyNumber:1,adultCount:2,childCount:2,children:[6,11],occupancy:{adults:2,children:[6,11]}}],
   offerRetailRate:{amount:500+i*10+j,currency:'EUR'}}))}))};
 const calls:any[]=[];let tick=0;
 const options={checkpoint,expectedCheckpoint:structuredClone(checkpoint),scenario,selectionPolicy,
  now:()=>new Date(Date.parse('2099-01-01T12:00:00Z')+tick++*1000).toISOString()};
 const transport={mode:'SYNTHETIC_STUB',async request(r:any):Promise<any>{calls.push(structuredClone(r));
  const body=r.kind==='SEARCH'?pool:r.kind==='PREBOOK'?{data:{prebookId:'SYNTHETIC_PREBOOK_'+r.hotelId,offerId:r.offerId}}:
   r.kind==='PREBOOK_GET'?{data:{prebookId:r.prebookId,offerId:r.offerId}}:{data:{hotelId:r.hotelId,facilities:[]}};
  return {status:200,headers:{'content-type':'application/json'},bodyBytes:JSON.stringify(body)};}};
 const search=()=>({kind:'SEARCH',method:'POST',host:'api.liteapi.travel',path:'/v3.0/hotels/rates',bodyBytes:JSON.stringify(scenario.searchRequest)});
 const detail=(s:any)=>({kind:'HOTEL_DETAIL',method:'GET',host:'api.liteapi.travel',path:'/v3.0/data/hotel',query:{hotelId:s.hotelId},hotelId:s.hotelId});
 const facilities=()=>({kind:'FACILITIES',method:'GET',host:'api.liteapi.travel',path:'/v3.0/data/facilities'});
 const prebook=(s:any)=>({kind:'PREBOOK',method:'POST',host:'book.liteapi.travel',path:'/v3.0/rates/prebook',hotelId:s.hotelId,offerId:s.offerId,
  bodyBytes:JSON.stringify({offerId:s.offerId,usePaymentSdk:false})});
 const get=(s:any,pid:string)=>({kind:'PREBOOK_GET',method:'GET',host:'book.liteapi.travel',path:'/v3.0/prebooks/'+pid,hotelId:s.hotelId,offerId:s.offerId,prebookId:pid});
 const create=()=>m.createSyntheticLiteApiDiagnosticGovernor(options);
 const prime=async()=>{const g=create();await g.send(search(),transport);return {g,selected:g.sealSelection().selected};};
 const run=()=>m.captureSyntheticLiteApiPlan({...options,transport});
 const verify=(c:any)=>m.verifySyntheticLiteApiCapture(c,options);
 return {m,checkpoint,scenario,selectionPolicy,options,pool,calls,transport,search,detail,facilities,prebook,get,create,prime,run,verify};
}
