import { neutralSearch } from '../../engine-v2/fixtures/providerNeutralRankingSynthetic';
import { buildSmartStayFrontendRuntimeV2 } from '../../../src/engine-v2/frontend/smartStayFrontendAdapterV2';
import { adaptV2SearchResultToDecisionV3 } from '../../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import { createIndependentV3ComparableDecisionV3 } from '../../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import { commercialSha256V3, commercialPacketManifestV3, type SyntheticCommercialPacketV3, type SyntheticCommercialProfileV3 } from '../../../src/engine-v3/evaluation/syntheticCommercialProtocolsV3';
import type { CommercialScopeV3 } from '../../../src/engine-v3/contract/commercialEvidenceV3';

export function commercialDecisionFixture(cancellationUntil?:string) {
  const input=neutralSearch();
  if(cancellationUntil)input.hotels.forEach(h=>h.offers.forEach(o=>{o.freeCancellationUntil=cancellationUntil;}));
  const runtime=buildSmartStayFrontendRuntimeV2(input);
  const decision=adaptV2SearchResultToDecisionV3({searchInput:runtime.searchInput,result:runtime.result});
  const comparable=createIndependentV3ComparableDecisionV3(decision,runtime.result.recommendationRoles.bestChoiceHotelId);
  const selected=input.hotels.find(h=>h.id===decision.robustness.policyPreferredHotelId);
  if(!selected||comparable.status!=='recommended')throw new Error('Synthetic control must recommend');
  const offer=selected.offers[0];
  const scope:CommercialScopeV3={propertyId:selected.id,offerId:offer.id,offerVersion:'invented-offer-version-1',roomId:'invented-room-1',
    checkIn:input.checkIn,checkOut:input.checkOut,adults:2,childAges:[],units:1,currency:'EUR'};
  return {input,runtime,decision,comparable,scope,offer};
}
export async function resealCommercialPacket(packet:SyntheticCommercialPacketV3) {
  for(const r of packet.records)r.sha256=await commercialSha256V3(r.body);
  const {manifestSha256:_old,...body}=packet;packet.manifestSha256=await commercialPacketManifestV3(body);return packet;
}
// Only synthetic fixture authors use this helper. Sealing is not semantic approval.
export function editCommercialRecord(packet:SyntheticCommercialPacketV3,index:number,edit:(body:any,data:any)=>void) {
  const r=packet.records[index],body=JSON.parse(r.body);edit(body,body.data??body.quote);r.body=JSON.stringify(body);
}
export async function commercialPacket(profile:SyntheticCommercialProfileV3='synthetic-session@1',cancellationUntil?:string) {
  const control=commercialDecisionFixture(cancellationUntil),minor=profile==='synthetic-attested-quote@1';
  const snapshot=control.decision.integrity.offerSnapshots.find(s=>s.hotelId===control.scope.propertyId&&s.offerId===control.scope.offerId)!;
  const packet:SyntheticCommercialPacketV3={version:'synthetic-commercial-packet@1',origin:'SYNTHETIC_ONLY',profile,expectedScope:control.scope,evaluatedAt:'2099-08-01T10:02:00Z',manifestSha256:'',records:[]};
  const operations=minor?['LIST','VERIFY']:['SEARCH','CREATE_SESSION','READ_SESSION'];
  packet.records=operations.map((operation,index)=>{
    const price={...(minor?{minor:control.offer.price*100}:{amount:control.offer.price}),currency:'EUR',mandatoryCoverage:'enumerated-all-compulsory-stay-charges',components:[{
      id:minor?'included-levy-beta':'included-tax-alpha',...(minor?{minor:(control.offer.includedTaxes??0)*100}:{amount:control.offer.includedTaxes??0}),currency:'EUR',kind:'MANDATORY',category:'TAX',inclusion:'INCLUDED',basis:'TOTAL_STAY_ALL_GUESTS',payable:'NOW',
    }]};
    const data={scope:control.scope,...(minor?{money:price,verdict:index===0?'available':'confirmed'}:{price,status:index===0?'available':'confirmed'}),
      terms:{roomName:control.offer.roomName,mealPlan:control.offer.mealPlan,cancellation:{refundable:true,until:snapshot.cancellation.freeCancellationUntil,penalty:0,currency:'EUR'},payment:'unknown',restrictions:[]},
      adverse:[],verifiedAt:index===0?null:'2099-08-01T10:00:30Z',validUntil:'2099-08-01T10:10:00Z',
      ...(minor?{}:{sessionId:index===0?null:'invented-session',verificationRecordId:index===2?'record-1':null})};
    return {id:`record-${index}`,operation,capturedAt:`2099-08-01T10:0${index}:00Z`,body:JSON.stringify(minor?{quote:data}:{data}),sha256:''};
  });
  return {control,packet:await resealCommercialPacket(packet)};
}
