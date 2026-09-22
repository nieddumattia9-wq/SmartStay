import type {Hotel,HotelOffer} from '../../types/hotel';
import type {SmartStayEngineV2SearchInput} from '../../engine-v2/orchestrator/smartStayEngineV2';
import {createSearchPartySource,resolveSearchParty} from '../../utils/searchParty';
import {createStableHashV3} from '../contract/stableHashV3';
import {commercialFactsTermsV3} from '../contract/authenticatedCommercialSetV3';
import {enumerateStayNightsV3} from '../integrity/stayOfferIntegrityV3';
import {isAuthenticatedCommercialPreparationV3,type AuthenticatedCommercialPreparationV3} from './authenticatedCommercialPreparationV3';
export function authenticatedDecisionInputV3(p:AuthenticatedCommercialPreparationV3):SmartStayEngineV2SearchInput {
 if(!isAuthenticatedCommercialPreparationV3(p))throw Error('ISSUED_PREPARATION_REQUIRED');
 const s=p.facts.scenario;
 const hotels:Hotel[]=p.assessment.offers.filter(x=>p.assessment.qualifiedKeys.includes(x.key)).map(({facts:f,qualification:q}):Hotel=>{
  const v=f.verified!,t=commercialFactsTermsV3(v),price=q.verified!.cost.completeTotal!,currency=s.currency,provider=v.identity.provider;
  const offer:HotelOffer={id:f.decisionOfferId,provider,price,basePrice:price,saving:0,currency,taxesIncluded:true,totalKnownCost:price,
   cancellationPolicy:t.cancellation.refundable===false?'Non-refundable':t.cancellation.refundable===true?'Refundable':null,
   refundable:t.cancellation.refundable,refundableTag:t.cancellation.refundable?'RFN':'NRFN',freeCancellationUntil:t.cancellation.until,
   cancellationPenalty:t.cancellation.penalty,cancellationPenaltyCurrency:t.cancellation.currency,
   roomName:t.roomName,mealPlan:t.mealPlan,bookable:true};
  // No numeric review without a supported scale, no geography, no room places
  // from capacity. Missing DTO scalar fields are explicitly masked as absent.
  return {id:v.identity.propertyId,name:f.merit.name,provider,dataSources:[provider],dataConfidence:'partial',offers:[offer],stars:f.merit.stars??0,
   reviewScore:null,reviewCount:null,reviewCountRelation:'unknown',reviewText:'',price,basePrice:price,saving:0,currency,taxesIncluded:true,totalKnownCost:price,
   distance:null,latitude:null,longitude:null,image:'',address:'',city:s.city,country:s.country,amenities:[...f.merit.features],facilities:[],
   availableData:{hasPrice:true,hasBasePrice:false,hasSaving:false,hasStars:f.merit.stars!==null,hasReviewScore:false,hasReviewCount:false,hasDistance:false,hasImage:false,hasAddress:false,hasCoordinates:false,hasAmenities:f.merit.features.length>0}};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 return {hotels,preferenceId:'balanced',preferenceSource:'manual',totalBudget:s.budget,maximumDistanceKm:null,selectedLocation:null,
  bookingReferenceAt:p.facts.offers.find(o=>o.verified)?.verified?.time.evaluatedAt??null,
  nights:enumerateStayNightsV3(s.checkin,s.checkout).length,adults:s.adults,children:s.childAges.length,rooms:s.units,
  searchParty:createSearchPartySource(s.childAges,[{adults:s.adults,children:s.childAges.length,childAges:s.childAges}]),checkIn:s.checkin,checkOut:s.checkout,currency:s.currency};
}
export function authenticatedInputFingerprintV3(x:SmartStayEngineV2SearchInput){
 return createStableHashV3({hotels:[...x.hotels].sort((a,b)=>a.id.localeCompare(b.id)),preferenceId:x.preferenceId,preferenceSource:x.preferenceSource,budget:x.totalBudget,
  maximumDistanceKm:x.maximumDistanceKm??null,selectedLocation:x.selectedLocation??null,checkIn:x.checkIn,checkOut:x.checkOut,currency:x.currency,nights:x.nights,bookingReferenceAt:x.bookingReferenceAt??null,
  party:x.searchParty?resolveSearchParty(x.searchParty,{adults:x.adults??null,children:x.children??null,rooms:x.rooms??null}):null},'authenticated-commercial-decision-input');
}
