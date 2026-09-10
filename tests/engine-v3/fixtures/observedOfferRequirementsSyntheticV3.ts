import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {intentFixture} from './intentRolePolicySyntheticV3';
// D0052 reuse of the unchanged D0051/R1 invented fixture construction.
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const moduleAt=(f:string)=>load(pathToFileURL(join(process.cwd(),'scripts',f)).href);
const H='a'.repeat(64),AT='2099-09-01T12:00:00Z';
function claim(value:any,scope:any,field='invented',applicability='OFFER_SCOPED'):any{
 return {state:value===null?'UNKNOWN':'KNOWN',value:structuredClone(value),reason:'Invented explicit evidence, not real material',observedAt:AT,timeSource:'SYNTHETIC_DECLARATION',scope:structuredClone(scope),applicability,
   links:[{field,evidence:[{ref:'SYNTHETIC_PROOF',sha256:H}]}]};
}
export async function fixture(){
 const m=await moduleAt('diagnostic-offer-requirements-v1.mjs'),b=intentFixture();
 b.search.maximumDistanceKm=3;b.distance.semantics='strong-preference';
 const party={adults:2,childAgesAtStay:[],unitsRequested:1,requirements:{sleepingPlaces:true,capacity:true,childAdmission:false,exclusiveUse:false,privateBathroom:false}};
 const stay={checkIn:b.search.checkIn,checkOut:b.search.checkOut,currency:'EUR'};
 const reference={kind:'SELECTED_LOCATION',id:'INVENTED_ORIGIN',provenance:'Explicit synthetic selected point',point:{latitude:0,longitude:0}};
 const n:any={version:m.DIAGNOSTIC_REQUIREMENTS_VERSION,caseId:b.caseId,mode:'SYNTHETIC',evaluatedAt:AT,party,stay,
  geography:{commonReference:claim(reference,null,'reference','SET_DOCUMENTED'),contexts:[{id:'PREFERENCE',semantics:'strong-preference',kilometers:3}]},
  offers:b.search.hotels.map(h=>{const rate=h.offers[0],scope={roomKey:rate.roomName,rateKey:rate.id};const c=(v:any)=>claim(v,scope);return {alternativeId:h.id,
   scope:{...scope,stay,party:{adults:2,childAgesAtStay:[],unitsRequested:1}},reference:c(reference),distanceKm:c(h.distance),
   availability:{observed:c('AVAILABLE'),bookability:c(true),unavailable:c(null)},unitsOffered:c(1),internalRooms:c(1),capacityGuests:c(2),
   sleeping:c({complete:true,beds:[{kind:'DOUBLE',count:1,placesPerBed:2,placeBasis:'Explicit two-person bed in synthetic evidence'}]}),
   children:{admitted:c(null),minimumAge:c(null),adultPricingFromAge:c(null),extraBedsAvailable:c(null)},exclusiveUse:c(null),privateBathroom:c(null),
   completeTotal:c(rate.totalKnownCost),ratingScale:c(10),ratingObserved:c(h.reviewScore)};})};
 return {m,n,b,run:()=>m.evaluateDiagnosticOfferRequirements(n),prepare:()=>m.prepareSupportedIntentBridgeInput(n,b)};
}
export const state=(c:any,state:string,value:any=null)=>Object.assign(c,{state,value});
export function family(x:any,ages=[8,13]){x.n.party.childAgesAtStay=ages;x.n.party.requirements.childAdmission=true;x.b.search.children=ages.length;
 for(const o of x.n.offers){o.scope.party.childAgesAtStay=ages;o.capacityGuests.value=4;o.children.admitted.value=true;o.children.admitted.state='KNOWN';
 o.sleeping.value.beds=[{kind:'DOUBLE',count:1,placesPerBed:2,placeBasis:'Explicit synthetic pair'},{kind:'SINGLE',count:2,placesPerBed:1,placeBasis:'Explicit synthetic single places'}];}}
export async function reviewedFixture(options:any={}){
 const x=await fixture(),d=await moduleAt('diagnostic-transcription-review-v1.mjs'),v1=await moduleAt('reviewed-intent-input-assessment-v1.mjs'),v2=await moduleAt('reviewed-intent-input-assessment-v2.mjs');
 const hash=(x:any)=>d.sha256(d.json(x)),s=x.b.search;
 const manifest={caseId:x.n.caseId,profile:'Balanced',scenario:{budgetTotal:s.totalBudget,nights:s.nights,adults:s.adults,children:0,childAgesAtStay:[],rooms:1,currency:'EUR',checkIn:s.checkIn,checkOut:s.checkOut,needs:[{requirement:'Invented adequate sleeping places and guest capacity',essential:true}]}};
 const wrap=(v:any)=>({status:v===null?'UNKNOWN':'KNOWN',value:v,reliability:v===null?'UNKNOWN':'LOW',reason:v===null?'Synthetic missing evidence':null,evidenceRefs:['SYNTHETIC_PROOF']});
 const packet:any={schemaVersion:d.VERSION,caseId:x.n.caseId,mode:'SYNTHETIC_TEST',classification:'DIAGNOSTIC_ONLY',humanReview:'PENDING',custodyCreated:false,sourceArchiveSha256:H,scenario:{currency:'EUR'},proofs:[{ref:'SYNTHETIC_PROOF',path:'invented.png',sha256:H}],alternatives:x.b.search.hotels.map(h=>({id:h.id,proofs:[],fields:Object.entries({stay:{checkIn:s.checkIn,checkOut:s.checkOut},occupancy:{adults:2,children:0,childAges:[],rooms:1},currency:'EUR',roomName:h.offers[0].roomName,rateName:null,selection:'Invented selected rate',displayedPrice:h.price,cancellation:'Invented conditions',completeTotal:null,rating:h.reviewScore,ratingScale:null,distance:String(h.distance)+' km dal centro',beds:'Invented two-person bed',roomCapacity:'Two guests',availability:'Public observed rate'}).map(([key,v])=>({key,critical:true,reviewStatus:'PENDING',sourceKind:v===null?'UNKNOWN':'OBSERVED',value:wrap(v)}))}))};
 // Same invented two-place configuration, expressed in the bounded supported
 // lexical grammar; the original source observation is sealed before review.
 for(const a of packet.alternatives)a.fields.find((f:any)=>f.key==='beds').value.value='1 letto matrimoniale';
 // R1 adds explicit synthetic source evidence for unit counts; the former
 // all-claims->beds shortcut is not proof of capacity or unit normalization.
 for(const a of packet.alternatives){
  for(const [key,value]of Object.entries({unitsOffered:1,internalRooms:1,...options.fields})){
   const existing=a.fields.find((f:any)=>f.key===key);
   if(existing)existing.value=wrap(value);else a.fields.push({key,critical:true,reviewStatus:'PENDING',sourceKind:value===null?'UNKNOWN':'OBSERVED',value:wrap(value)});
  }
 }
 if(options.needs)manifest.scenario.needs=options.needs;
 let state=d.initialReview(packet,H);const events:any[]=[];
 const append=(a:any)=>{const action={...a,caseId:packet.caseId,expectedRevision:state.revision,contentFingerprint:d.fingerprint(state)},body={schemaVersion:d.VERSION,ordinal:state.revision+1,packetHash:state.packetHash,codeHash:H,previousHash:state.lastEventHash,recordedAt:AT,actor:'SYNTHETIC_TEST',action};const event={...body,eventHash:hash(body)};state=d.applyReview(state,action,packet);state.lastEventHash=event.eventHash;events.push(event);};
 for(const a of packet.alternatives)for(const f of a.fields)append({type:'REVIEW_FIELD',alternativeId:a.id,fieldKey:f.key,reviewStatus:'CORRECT'});append({type:'CONFIRM_REVIEW',confirmed:true});
 const preparedInput={caseId:packet.caseId,classification:'DIAGNOSTIC_ONLY',originalScenario:packet.scenario,originalScenarioManifestSha256:hash(manifest),alternatives:packet.alternatives.map((a:any)=>({alternativeId:a.id,fields:a.fields.map((f:any)=>({key:f.key,value:f.value}))})),postObservationContexts:[{contextId:'PREFERENCE',budgetMinorUnits:s.totalBudget!*100,currency:'EUR',prospectivelyFrozen:false,independentCase:false,distancePreference:{kilometers:3,semantics:'STRONG_PREFERENCE_WITH_JUSTIFIED_EXCEPTIONS',hardMaximum:false,generalToleranceKm:null}}]};
 const args={packet,events,codeHash:H,originalManifest:manifest,originalManifestSha256:hash(manifest),preparedInput,preparedInputSha256:hash(preparedInput)};
 const old=v1.assessReviewedIntentInput(args),n=x.n;n.reviewProjectionFingerprint=old.projectionFingerprint;n.requirementBasis=manifest.scenario.needs;
 n.requirementMapping=Object.entries(n.party.requirements).map(([key,value])=>({key,needIndexes:value?[0]:[],reason:'Explicit synthetic scenario mapping'}));
 const ref={kind:'SOURCE_CENTRE',id:'SYNTHETIC_COMMON',point:null,provenance:'Same documented invented source centre'};
 n.geography.commonReference.value=ref;n.geography.commonReference.links=[{field:n.offers[0].alternativeId+'/distance',evidence:[{ref:'SYNTHETIC_PROOF',sha256:H}]}];
 for(const o of n.offers){const c=old.projection.candidates.find((c:any)=>c.alternativeId===o.alternativeId);o.reviewedOfferBindingFingerprint=hash(c.offerBinding);o.scope.rateKey='REVIEWED_RATE_'+o.reviewedOfferBindingFingerprint;o.scope.roomKey=c.offerBinding.roomName.value;
  const visit=(v:any)=>{if(v&&typeof v==='object'){if(v.state){v.scope={roomKey:o.scope.roomKey,rateKey:o.scope.rateKey};v.links=[{field:'beds',evidence:[{ref:'SYNTHETIC_PROOF',sha256:H}]}];}else for(const z of Object.values(v))visit(z);}};visit(o);o.reference.value=ref;stateClaim(o.completeTotal);stateClaim(o.ratingScale);stateClaim(o.availability.bookability);o.sleeping.value=x.m.normalizeItalianBedInventory('1 letto matrimoniale');}
 function stateClaim(c:any){c.state='UNKNOWN';c.value=null;}
 for(const o of n.offers)for(const [key,field]of [['unitsOffered','unitsOffered'],['internalRooms','internalRooms'],['capacityGuests','roomCapacity']])o[key].links[0].field=field;
 return {x,args,n,old,v2,run:()=>v2.assessReviewedIntentRequirements(args,n)};
}
