import type { Hotel } from '../../../src/types/hotel';
// Invented fixtures, not a copy of a provider response or private dossier.
export function neutralHotel(index: number): Hotel {
 const price=420+index,provider='Synthetic Alpha',id=`synthetic-${String(index+1).padStart(2,'0')}`;
 return {id,provider,dataSources:[provider],dataConfidence:'full',
 availableData:{hasPrice:true,hasBasePrice:true,hasSaving:true,hasStars:true,hasReviewScore:true,hasReviewCount:true,hasDistance:true,hasImage:true,hasAddress:true,hasCoordinates:true,hasAmenities:true},
 name:`Invented ${id}`,stars:4,reviewScore:8.9,reviewCount:920,reviewCountRelation:'equal',reviewText:'Synthetic reviews',
 price,basePrice:price,saving:0,currency:'EUR',taxesIncluded:true,includedTaxes:24,excludedTaxes:0,unknownTaxes:0,totalKnownCost:price,
 distance:.7,image:`https://example.invalid/${id}.jpg`,address:`${index+1} Synthetic Street`,city:'Florence',country:'Italy',latitude:43.77+(index+1)/1000,longitude:11.25+(index+1)/1000,
 amenities:['Hotel room','Private bathroom','WiFi','Air conditioning','Breakfast','Reception','Elevator'],facilities:['Front desk','Daily housekeeping'],
 offers:[{id:`offer-${index+1}`,provider,price,basePrice:price,saving:0,currency:'EUR',cancellationPolicy:'Free cancellation before arrival',refundableTag:'RFN',refundable:true,freeCancellationUntil:'2099-09-01',cancellationPenalty:0,cancellationPenaltyCurrency:'EUR',cancellationPenaltyType:'amount',cancellationTimezone:'Europe/Rome',taxesIncluded:true,includedTaxes:24,excludedTaxes:0,unknownTaxes:0,totalKnownCost:price,roomName:'Double hotel room',mealPlan:'Breakfast included',bookable:true}]};
}
export function neutralSearch(){return {hotels:Array.from({length:8},(_,i)=>neutralHotel(i)),preferenceId:'balanced' as const,preferenceSource:'manual' as const,totalBudget:900,maximumDistanceKm:20,selectedLocation:{latitude:43.77,longitude:11.25,confidence:1},nights:4,adults:2,children:0,rooms:1,checkIn:'2099-09-10',checkOut:'2099-09-14',currency:'EUR',maximumVisibleResults:8};}
