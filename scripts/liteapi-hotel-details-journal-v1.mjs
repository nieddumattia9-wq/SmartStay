// D-0066. Fixed MAX5 details-only profile over the existing durable journal.
// No configuration may transfer its capability to Rates, facilities or prebook.
import {createBoundedAcquisitionJournalProfile} from './bounded-acquisition-journal-core-v1.mjs';
import {validateHotelDetailPlan,validateDetailsRequest,hash,fail} from './liteapi-hotel-detail-plan-v1.mjs';
import {resolve} from 'node:path';
export const HOTEL_DETAILS_JOURNAL_VERSION='stayopti.liteapi-hotel-details-journal@1';
export const HOTEL_DETAILS_CAPS=Object.freeze({HOTEL_DETAIL:5,total:5,concurrency:1,retries:0,redirects:0});
function validateContext(input,context){
 if(!context?.config||!context.checkpoint)fail('AUTHENTICATED_CONTEXT_REQUIRED');
 const c=context.config,synthetic=input.mode==='SYNTHETIC_ONLY';
 if(validateHotelDetailPlan(c,{synthetic}).pending.length)fail('CONFIGURATION_PENDING');
 if(c.caseId!==input.caseId||resolve(c.retention.directory)!==resolve(input.registryRoot)||
  hash({config:c,checkpoint:context.checkpoint})!==input.bindingSha256)fail('CONTEXT_BINDING_MISMATCH');
}
const profile=createBoundedAcquisitionJournalProfile({version:HOTEL_DETAILS_JOURNAL_VERSION,caps:HOTEL_DETAILS_CAPS,
 registryDirectory:'liteapi-hotel-detail-enrichment',errorPrefix:'LITEAPI_DETAIL_',validateContext,
 validateRequest({context,request,ordinal,kind,hotelId,snapshot}){
  if(kind!=='HOTEL_DETAIL'||hotelId!==request.hotelId)fail('REQUEST_KIND_OR_IDENTITY');
  validateDetailsRequest(request,ordinal-1,context.config);
  if(snapshot.requests.some(r=>r.state==='FAILED'))fail('REQUEST_AFTER_FAILURE');
 },
 validateSummary(summary,context){
  if(summary.status==='COMPLETED'&&(summary.attemptsReserved!==context.config.targets.length||summary.requests.some(r=>r.state!=='SUCCEEDED')))fail('INCOMPLETE_COLLECTION_NOT_COMPLETE');
  if(summary.attemptsReserved>context.config.targets.length)fail('REQUEST_OUTSIDE_SEALED_PLAN');
 },
 validateFinish(summary,status,context){
  if(status==='COMPLETED'&&(summary.attemptsReserved!==context.config.targets.length||summary.requests.some(r=>r.state!=='SUCCEEDED')))fail('INCOMPLETE_COLLECTION_NOT_COMPLETE');
 },
});
export const createHotelDetailsJournal=profile.create;
export const verifyHotelDetailsJournal=profile.verify;
export const decryptHotelDetailsOriginal=profile.decrypt;
export const hashHotelDetailsJournalValue=profile.hashValue;
