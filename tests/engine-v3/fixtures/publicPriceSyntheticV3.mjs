// Invented public customer quote extension of the invented attestation protocol.
// NOT a documented LiteAPI sellingPriceToUser response or any live evidence.
import {authenticatedComparisonFixture} from './authenticatedComparisonSyntheticV3.mjs';
export const minimumPricePolicy={version:'stayopti.public-price-policy@1',mode:'DOCUMENTED_MINIMUM',additionalMarkup:0};
export function publicPriceFixture(options={}){
 return authenticatedComparisonFixture({protocol:'SYNTHETIC_ATTESTED_QUOTE@1',...options,
  mutate(b,q){
   for(const h of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[]){
    const i=Number(h.hotelId.split('-').at(-1));
    h.roomTypes[0].suggestedSellingPrice={amount:1100+i*90,currency:'EUR'};
   }
   options.mutate?.(b,q);
  },
  mutateEnvelope(e,q,c){
   const i=Number(q.hotelId.split('-').at(-1)),amount=1100+i*90;
   e.publicPriceVerification={version:'invented-public-price-quote@1',
    scope:{propertyId:q.hotelId,offerId:q.offerId,roomId:String(700+i),checkIn:c.scenario.checkin,checkOut:c.scenario.checkout,
     adults:c.scenario.adults,children:c.scenario.childAges.length,childAges:[...c.scenario.childAges],units:c.scenario.units,currency:c.scenario.currency},
    money:{amount,currency:'EUR'},mandatoryCoverage:'enumerated-all-compulsory-stay-charges',components:[],contraryObservations:[]};
   options.mutateEnvelope?.(e,q,c);
  }
 });
}
