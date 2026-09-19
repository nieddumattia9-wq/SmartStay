// D-0066. Authenticated source binding and pure room comparison, never a decision.
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DETAIL_SOURCE_VERSION,validateHotelDetailSource,canonical,sha,hash,same,fail,assertNoLinks} from './liteapi-hotel-detail-plan-v1.mjs';
import {readCoverageOriginals} from './liteapi-search-coverage-capture-v1.mjs';
import {classifyCoverageRatesResponse} from './liteapi-search-coverage-diagnostics-v1.mjs';
import {readDocumentaryResponse,decodeDocumentaryOffer,documentaryDetail} from './liteapi-documentary-wire-v1.mjs';
import {compareMappedRoom} from './liteapi-offer-qualification-v1.mjs';
import {sleepingText} from './liteapi-bed-description-v1.mjs';
import {qualifyMappedBedConditions} from './liteapi-mapped-bed-conditions-v1.mjs';
import {interpretRoomPresentation} from './room-presentation-text-v1.mjs';
const clone=x=>structuredClone(x),plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),own=(o,k)=>o!=null&&Object.hasOwn(o,k);
const opaque=x=>typeof x==='string'&&x.length>0&&!/[\x00-\x1f\x7f]/.test(x),hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const numericId=x=>Number.isSafeInteger(x)&&x>=0,validId=x=>numericId(x)||opaque(x),idKey=x=>validId(x)?String(x):null;
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT.*Z$/.test(x)&&Number.isFinite(Date.parse(x));
const project=(o,keys)=>Object.fromEntries(keys.filter(k=>own(o,k)).map(k=>[k,clone(o[k])]));
const bodyBytes=record=>{
 const b=record?.response?.body;if(!b||typeof b.base64!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.base64))fail('RESPONSE_ENCODING');
 const bytes=Buffer.from(b.base64,'base64');if(bytes.length!==b.byteLength||sha(bytes)!==b.sha256)fail('RESPONSE_INTEGRITY');return bytes;
};

/** Caller supplies the result of readCoverageOriginals, not a substituted raw
 * Rates object. Production preflight calls verifyHotelDetailSourceFiles again;
 * a self-hashed derivative alone is NOT accepted as authentication. */
export function createHotelDetailSourceBinding(authenticatedCoverage,{configuration,resultSha256,configurationSha256,inventorySha256,sourceCheckpoint,locator=null}={}){
 const c=authenticatedCoverage,j=c?.journal;
 if(!j||j.status!=='COMPLETED'||!hex(j.lastEventSha256)||!Array.isArray(c.records)||!same(j.context?.config,configuration)||
  j.context?.checkpoint?.head!==sourceCheckpoint||j.context?.configFileSha256!==configurationSha256)fail('SOURCE_JOURNAL_NOT_COMPLETE_OR_BOUND');
 const origin=j.binding?.mode==='REAL'?'LITEAPI_PRODUCTION':j.binding?.mode==='SYNTHETIC_ONLY'?'SYNTHETIC_LOCAL_TRANSPORT':null;
 if(!origin||origin!==configuration.origin)fail('SOURCE_ORIGIN');
 const offers=[],observations=[];
 for(const pair of c.records){
  const request=pair.request,r=pair.response;if(!['CITY_RATES','ID_RATES'].includes(request?.kind))continue;
  if(r?.outcome!=='SUCCEEDED'||!utc(r.completedAt))fail('SOURCE_RATE_REQUEST_NOT_SUCCESSFUL');
  const bytes=bodyBytes(r);let classification,payload;
  try{classification=classifyCoverageRatesResponse({bytes,status:r.response.status,expectedSha256:r.response.body.sha256});
   if(!['SUCCESS','DOCUMENTED_NO_RESULTS'].includes(classification.classification))fail('SOURCE_RATES_UNSUPPORTED');
   observations.push({arm:request.kind,ordinal:r.ordinal,observedAt:r.completedAt,responseSha256:r.response.body.sha256,requestSha256:hash(request),classification:classification.classification});
   if(classification.classification==='DOCUMENTED_NO_RESULTS')continue;
   payload=JSON.parse(bytes.toString('utf8'));
  }finally{bytes.fill(0);}
  const expected={checkin:configuration.scenario.checkin,checkout:configuration.scenario.checkout,currency:configuration.scenario.currency,guestNationality:configuration.scenario.guestNationality,
   occupancies:[{adults:configuration.scenario.adults,children:configuration.scenario.childAges}]};
  if(Object.keys(expected).some(k=>!same(request.body?.[k],expected[k])))fail('SOURCE_RATE_SCENARIO_CONFLICT');
  const record={...r,intent:{...request,kind:'SEARCH'}};
  for(const [hi,h] of payload.data.entries()){
   if(!plain(h)||!opaque(h.hotelId)||!Array.isArray(h.roomTypes))fail('SOURCE_PROPERTY_UNSUPPORTED');
   for(const [oi,o] of h.roomTypes.entries()){
    if(!opaque(o?.offerId))fail('SOURCE_OFFER_IDENTITY');
    const d=decodeDocumentaryOffer(record,{hotelId:h.hotelId,offerId:o.offerId,scenario:{searchRequest:request.body},stage:'SEARCH'});
    if(d.issue)fail('SOURCE_OFFER_UNSUPPORTED');
    const fields=[h,o,d.rate].filter(v=>own(v,'mappedRoomId')&&v.mappedRoomId!==null).map(v=>v.mappedRoomId);
    if(!fields.length||fields.some(v=>!validId(v))||new Set(fields.map(idKey)).size!==1)fail('SOURCE_MAPPED_ROOM_IDENTITY');
    const pointer=`data[${hi}].roomTypes[${oi}]`,rate=project(d.rate,['name','maxOccupancy','maxAdults','maxChildren','mappedRoomId','remarks','occupancyNumber','adultCount','childCount','childrenAges']);
    offers.push({offerKey:hash({arm:request.kind,responseSha256:r.response.body.sha256,pointer}),arm:request.kind,hotelId:h.hotelId,offerId:o.offerId,rateId:d.rate.rateId,
     mappedRoomId:fields[0],pointer,responseSha256:r.response.body.sha256,requestSha256:hash(request),observedAt:r.completedAt,offerSha256:hash(o),rateSha256:hash(d.rate),
     roomText:typeof d.rate.name==='string'?d.rate.name:'',rate,issues:[...d.issues]});
   }
  }
 }
 const targets=[...new Set(offers.map(o=>o.hotelId))].sort().map(hotelId=>({hotelId,
  mappedRoomIds:[...new Map(offers.filter(o=>o.hotelId===hotelId).map(o=>[canonical(o.mappedRoomId),o.mappedRoomId])).values()].sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0),
  offerKeys:offers.filter(o=>o.hotelId===hotelId).map(o=>o.offerKey).sort()}));
 const source={version:DETAIL_SOURCE_VERSION,caseId:configuration.caseId,origin,checkpoint:sourceCheckpoint,resultSha256,configurationSha256,inventorySha256,
  journalLastEventSha256:j.lastEventSha256,journalEventCount:j.eventCount,scenario:clone(configuration.scenario),locator:clone(locator),offers,targets,observations,
  sourceCustodyRetentionRenewed:false,commercialObservationsRefreshed:false};
 const sealed={...source,bindingSha256:hash(source)};validateHotelDetailSource(sealed);return sealed;
}

/** Fixed read-only production verifier. Does not construct a store, mutate a
 * journal, ask for a credential, or use any current source label as authority. */
export function verifyHotelDetailSourceFiles(source){
 validateHotelDetailSource(source);
 if(source.origin!=='LITEAPI_PRODUCTION')fail('PRODUCTION_SOURCE_REQUIRED');
 const p=source.locator,expected=['configurationPath','inventoryPath','resultPath','caseDirectory','registryRoot'];
 if(!plain(p)||!same(Object.keys(p).sort(),expected.sort()))fail('SOURCE_LOCATOR');
 for(const value of Object.values(p))if(typeof value!=='string'||resolve(value)!==value&&resolve(value).replaceAll('\\','/')!==value)fail('SOURCE_PATH_ABSOLUTE_REQUIRED');
 for(const value of Object.values(p))assertNoLinks(value);
 const read=(path,digest)=>{const b=readFileSync(path);if(sha(b)!==digest)fail('SOURCE_FILE_CHANGED');try{return JSON.parse(b.toString('utf8'));}finally{b.fill(0);}};
 const config=read(p.configurationPath,source.configurationSha256),inventory=read(p.inventoryPath,source.inventorySha256),result=read(p.resultPath,source.resultSha256);
 if(result.status!=='COMPLETE'||config.caseId!==source.caseId||inventory.expectedHead!==source.checkpoint||config.origin!=='LITEAPI_PRODUCTION'||
  resolve(p.caseDirectory)!==resolve(p.registryRoot,'cases',source.caseId)||resolve(config.retention.directory)!==resolve(p.registryRoot))fail('SOURCE_HISTORY_MISMATCH');
 const header=JSON.parse(readFileSync(join(p.caseDirectory,'header.json'),'utf8'));
 // Locator spelling remains part of the approved source fingerprint. Only the
 // filesystem arguments are canonicalized for the historical Windows reader.
 // No path or source binding is rewritten in the prepared artifact.
 const input={...header.binding,root:resolve(p.caseDirectory),registryRoot:resolve(p.registryRoot)};
 const authenticated=readCoverageOriginals(input);
 if(!same(authenticated.journal.context?.inventory,inventory)||authenticated.journal.context?.checkpoint?.inventorySha256!==hash(inventory))fail('SOURCE_INVENTORY_MISMATCH');
 const derived=createHotelDetailSourceBinding(authenticated,{configuration:config,resultSha256:source.resultSha256,configurationSha256:source.configurationSha256,inventorySha256:source.inventorySha256,sourceCheckpoint:source.checkpoint,locator:p});
 if(!same(derived,source))fail('SOURCE_DERIVATION_CHANGED');
 return {status:'AUTHENTICATED_SOURCE_UNCHANGED',bindingSha256:source.bindingSha256,offerCount:source.offers.length,hotelCount:source.targets.length,engineInvocations:0,policyInvocations:0};
}

export function inspectHotelDetailResponse(record,hotelId){
 const b=bodyBytes(record);b.fill(0);
 const base={responseSha256:record.response.body.sha256,observedAt:record.completedAt??null,identityVerified:false,usable:false,property:null};
 if(record.response.status!==200)return {...base,classification:'HTTP_ERROR',reason:'HTTP_'+record.response.status};
 const p=readDocumentaryResponse(record);
 if(!plain(p))return {...base,classification:'UNKNOWN_FORMAT',reason:'DETAIL_JSON_OR_CONTENT_TYPE_UNSUPPORTED'};
 const detail=documentaryDetail(record,hotelId);
 if(detail.issues.length)return {...base,classification:'PROVIDER_ERROR',reason:'DETAIL_APPLICATION_ERROR',issues:detail.issues,identityVerified:detail.identityVerified};
 if(!plain(p.data)||!detail.identityVerified)return {...base,classification:'UNKNOWN_FORMAT',reason:'DETAIL_PROPERTY_IDENTITY_UNVERIFIED'};
 if(own(p.data,'rooms')&&p.data.rooms!==null&&(!Array.isArray(p.data.rooms)||p.data.rooms.some(room=>!plain(room)||!validId(room.id))))
  return {...base,classification:'UNKNOWN_FORMAT',reason:'DETAIL_ROOM_ARRAY_UNSUPPORTED',identityVerified:true};
 const roomErrors=(p.data.rooms??[]).flatMap((room,index)=>['error','errors'].filter(k=>own(room,k)&&room[k]!==null&&!(Array.isArray(room[k])&&room[k].length===0)).map(k=>'data.rooms['+index+'].'+k));
 if(roomErrors.length)return {...base,classification:'PROVIDER_ERROR',reason:'DETAIL_ROOM_APPLICATION_ERROR',identityVerified:true,issues:roomErrors};
 return {...base,classification:'SUCCESS',reason:null,identityVerified:true,usable:true,property:clone(p.data),issues:[],source:detail.source};
}

const presentationComparisonKey=value=>{
 if(Array.isArray(value))return value.map(presentationComparisonKey);
 if(typeof value!=='string')return clone(value);
 const p=interpretRoomPresentation(value);
 // Only wholly supported presentation differences are equivalent. All text,
 // including ancillary/negative conditions, participates; no bed-only projection.
 return p.supported?{presentationVersion:p.version,text:p.text}:{unsupportedOriginal:value};
};
const roomRelevant=room=>{
 const facts=project(room,['id','hotelId','maxOccupancy','maxAdults','maxChildren','bedTypes','bedRelation','roomName','name','description','remarks','conditions','error','errors']);
 for(const field of ['roomName','name','description','remarks','conditions'])if(own(facts,field))facts[field]=presentationComparisonKey(facts[field]);
 if(Array.isArray(facts.bedTypes))facts.bedTypes=facts.bedTypes.map(b=>plain(b)?project(b,['quantity','bedType','bedSize']):b).sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0);
 return facts;
};
function compareOne(source,offer,record){
 const initial={offerKey:offer.offerKey,hotelId:offer.hotelId,offerId:offer.offerId,rateId:offer.rateId,mappedRoomId:clone(offer.mappedRoomId),rateObservedAt:offer.observedAt,
  detailObservedAt:record?.completedAt??null,rateResponseSha256:offer.responseSha256,detailResponseSha256:record?.response?.body?.sha256??null,
  originalRate:clone(offer.rate),rateRoomText:offer.roomText,issues:[...offer.issues],commercialObservationsRefreshed:false,bookabilityCertified:false,priceOrExpiryChanged:false};
 if(!record||!record.response)return {...initial,status:'DETAIL_NOT_ACQUIRED',roomFound:false,compatibility:'NOT_ASSESSABLE',failureClass:record?.failureClass??null};
 if(record.outcome!=='SUCCEEDED')return {...initial,status:'DETAIL_REQUEST_FAILED',roomFound:false,compatibility:'NOT_ASSESSABLE',failureClass:record.failureClass??'RESPONSE_OUTCOME_NOT_SUCCESSFUL',
  failedBodyNotConsumed:true};
 const detail=inspectHotelDetailResponse(record,offer.hotelId);
 if(!detail.usable)return {...initial,status:'DETAIL_UNUSABLE',roomFound:false,compatibility:'NOT_ASSESSABLE',detail};
 const matches=(detail.property.rooms??[]).map((room,index)=>({room,index})).filter(x=>idKey(x.room.id)===idKey(offer.mappedRoomId));
 if(!matches.length)return {...initial,status:'MAPPED_ROOM_NOT_FOUND',roomFound:false,compatibility:'NOT_ASSESSABLE',detailRoomCount:detail.property.rooms?.length??null};
 const facts=matches.map(x=>roomRelevant(x.room)),duplicateConflict=facts.some(f=>!same(f,facts[0]));
 if(duplicateConflict)return {...initial,status:'DUPLICATE_MAPPED_ROOM_CONFLICT',roomFound:true,compatibility:'CONFLICTING',rooms:clone(matches),issues:[...initial.issues,'DUPLICATE_MAPPED_ROOM_CONFLICT']};
 const room=matches[0].room,preparedDetail={...detail,property:{...detail.property,rooms:[room]}};
 const decoded={binding:{hotelId:offer.hotelId,mappedRoomId:idKey(offer.mappedRoomId),payloadSha256:offer.responseSha256,pointer:offer.pointer},rate:clone(offer.rate)};
 const ratePresentation=interpretRoomPresentation(offer.roomText);
 const sleeping={...sleepingText(ratePresentation.supported?ratePresentation.text:offer.roomText),originalText:offer.roomText,presentation:ratePresentation},party={adults:source.scenario.adults,childAgesAtStay:source.scenario.childAges};
 const comparison=compareMappedRoom(preparedDetail,decoded,decoded,sleeping,party);
 const capacities={rate:offer.rate.maxOccupancy??null,mapped:room.maxOccupancy??null,maxAdults:room.maxAdults??null,maxChildren:room.maxChildren??null,
  requestedAdults:party.adults,requestedChildAges:clone(party.childAgesAtStay),bedPlacesInferredFromCapacity:false};
 const partyCapacityStatus=comparison.capacityAssessment?.status??'UNKNOWN';
 const limitStatus=field=>{
  const s=comparison.capacityAssessment?.checks.find(c=>c.origin==='MAPPED_ROOM'&&c.field===field)?.status;
  return s==='SATISFIED'?'SATISFIES_REQUESTED_COUNT':s==='INSUFFICIENT'?'DOCUMENTED_LIMIT_CONFLICT':'UNKNOWN';
 };
 const adultLimitStatus=limitStatus('maxAdults'),childLimitStatus=limitStatus('maxChildren');
 const conditionAssessment=qualifyMappedBedConditions(room),conditions=conditionAssessment.conditions;
 const rateConditionAssessment={...qualifyMappedBedConditions(project(offer.rate,['name','remarks','conditions'])),scope:'SOURCE_BOUND_RATE_NOT_GENERIC_PROPERTY'};
 const rateConditions=rateConditionAssessment.entries.filter(c=>c.kind!=='OTHER_SUBJECT');
 const relevantConditions=conditionAssessment.entries.filter(c=>c.kind!=='OTHER_SUBJECT');
 const unparsedConditions=conditionAssessment.unparsedFields,subjectlessConditions=relevantConditions.filter(c=>c.kind==='UNRESOLVED_BED_QUALIFICATION').map(c=>c.text);
 const bedConditionUnresolved=conditionAssessment.unresolved;
 const roomInventoryKnown=Array.isArray(comparison.roomInventories)&&comparison.roomInventories.length>0;
 const alternativeChecks=sleeping.alternativeInventories.map(inventory=>compareMappedRoom(preparedDetail,decoded,decoded,{inventory},party));
 const alternativesConflict=alternativeChecks.length>0&&alternativeChecks.every(x=>x.sleepingConflict);
 const mappedTextChecks=relevantConditions.filter(c=>c.bedInterpretation?.inventory).map(c=>({text:c.text,field:c.field,comparison:compareMappedRoom(preparedDetail,decoded,decoded,c.bedInterpretation,party)}));
 const mappedAlternativeChecks=relevantConditions.filter(c=>c.bedInterpretation?.alternativeInventories.length).map(c=>({text:c.text,field:c.field,
  alternatives:c.bedInterpretation.alternativeInventories.map(inventory=>compareMappedRoom(preparedDetail,decoded,decoded,{inventory},party))}));
 const rateTextChecks=rateConditions.filter(c=>c.bedInterpretation?.inventory).map(c=>({text:c.text,field:c.field,comparison:compareMappedRoom(preparedDetail,decoded,decoded,c.bedInterpretation,party)}));
 const rateAlternativeChecks=rateConditions.filter(c=>c.bedInterpretation?.alternativeInventories.length).map(c=>({text:c.text,field:c.field,
  alternatives:c.bedInterpretation.alternativeInventories.map(inventory=>compareMappedRoom(preparedDetail,decoded,decoded,{inventory},party))}));
 const allConditions=[...relevantConditions.map(c=>({...c,scope:'MAPPED_ROOM'})),...rateConditions.map(c=>({...c,scope:'RATE'}))];
 const bedCountChecks=allConditions.filter(c=>Number.isSafeInteger(c.documentedBedCount)).map(c=>({scope:c.scope,field:c.field,text:c.text,count:c.documentedBedCount,
  status:!roomInventoryKnown?'UNKNOWN':comparison.roomInventories.some(i=>i.beds.reduce((n,b)=>n+b.count,0)===c.documentedBedCount)?'AGREES_WITH_A_DOCUMENTED_CONFIGURATION':'CONFLICTING',
  placesInferred:false}));
 const bedConflict=comparison.sleepingConflict||sleeping.claimState==='CONFLICTING'||alternativesConflict||[...mappedTextChecks,...rateTextChecks].some(c=>c.comparison.sleepingConflict)||[...mappedAlternativeChecks,...rateAlternativeChecks].some(c=>c.alternatives.every(a=>a.sleepingConflict))||bedCountChecks.some(c=>c.status==='CONFLICTING')||
  allConditions.some(c=>c.bedInterpretation?.claimState==='CONFLICTING'||c.bedInterpretation?.clauses.some(x=>x.kind==='BED_NEGATION'));
 const capacityConflict=comparison.capacityConflict;
 // Generic rate names assert no bed inventory. They neither create places nor
 // erase separately documented mapped-room beds. Actual rate qualifiers do.
 const rateBedUnresolved=rateConditionAssessment.unresolved||sleeping.clauses.some(c=>!['OTHER_SUBJECT','EXTRA_BEDS_NOT_BASE_INVENTORY','SUPPORTED_INVENTORY'].includes(c.kind));
 const alternatives=comparison.roomInventories.map(i=>{
  const documentedLowerBound=i.beds.reduce((n,b)=>n+(Number.isSafeInteger(b.placesPerBed)?b.count*b.placesPerBed:0),0);
  const unknownPlaces=i.beds.some(b=>!Number.isSafeInteger(b.placesPerBed));
  return {inventory:clone(i),documentedLowerBound,unknownPlaces,status:documentedLowerBound>=party.adults+party.childAgesAtStay.length?'SATISFIED':unknownPlaces?'UNKNOWN':'INSUFFICIENT'};
 });
 const hasAlternatives=room.bedRelation==='OR'||sleeping.alternativeInventories.length>0||allConditions.some(c=>c.bedInterpretation?.alternativeInventories.length);
 const sleepingAssessment={version:'stayopti.mapped-sleeping-assessment@1',requiredGuests:party.adults+party.childAgesAtStay.length,alternatives,
  status:bedConflict?'CONFLICTING':!alternatives.length||comparison.sleepingUnverified||bedConditionUnresolved||rateBedUnresolved?'UNKNOWN':
   alternatives.every(a=>a.status==='SATISFIED')?'SATISFIED':alternatives.every(a=>a.status==='INSUFFICIENT')?'INSUFFICIENT':'UNKNOWN',
  assignedConfiguration:!hasAlternatives,rateInventoryInferred:false,bedPlacesInferredFromCapacity:false,
  scope:'MAPPED_ROOM_DESCRIPTION_NOT_VERIFIED_ASSIGNMENT_TO_HISTORICAL_RATE'};
 const bedSourceAgreement=bedConflict?'CONFLICTING':!sleeping.inventory?'RATE_INVENTORY_NOT_DOCUMENTED':roomInventoryKnown&&!comparison.sleepingUnverified?'CONSISTENT_LOWER_BOUND':'UNKNOWN';
 const unresolved=initial.issues.length>0||partyCapacityStatus!=='SATISFIED'||sleepingAssessment.status!=='SATISFIED'||hasAlternatives;
 return {...initial,status:'MAPPED_ROOM_FOUND',roomFound:true,compatibility:capacityConflict||bedConflict?'CONFLICTING':unresolved?'PARTIALLY_ASSESSABLE':'COMPATIBLE_OBSERVATIONS_NOT_COMMERCIAL_CERTIFICATION',
  capacities,capacityStatus:capacityConflict?'CONFLICTING':partyCapacityStatus==='SATISFIED'?'COMPATIBLE':'UNKNOWN',partyCapacityStatus,adultLimitStatus,childLimitStatus,sleeping,sleepingAssessment,bedSourceAgreement,
  bedStatus:bedConflict?'CONFLICTING':hasAlternatives?'ALTERNATIVES_NOT_ASSIGNED':sleepingAssessment.status==='SATISFIED'?'COMPATIBLE':sleepingAssessment.status==='INSUFFICIENT'?'INSUFFICIENT':'UNKNOWN',
  mappedRoom:clone(room),mappedRoomPointers:matches.map(x=>'data.rooms['+x.index+']'),duplicateEquivalentCount:matches.length,
  mappedRoomObservations:matches.map(x=>({pointer:'data.rooms['+x.index+']',original:clone(x.room)})),
  mappedComparison:comparison,alternativeChecks,mappedTextChecks,mappedAlternativeChecks,rateTextChecks,rateAlternativeChecks,bedCountChecks,rateConditionAssessment,conditionAssessment,conditions,relevantConditions,unparsedConditions,subjectlessConditions,
  issues:[...new Set([...initial.issues,...comparison.issues,
   ...(sleepingAssessment.status==='INSUFFICIENT'?['MAPPED_SLEEPING_PLACES_BELOW_PARTY']:[]),
   ...(bedCountChecks.some(c=>c.status==='CONFLICTING')?['MAPPED_TEXT_BED_COUNT_CONFLICT']:[]),
   ...(mappedTextChecks.some(c=>c.comparison.sleepingConflict)?['MAPPED_TEXT_BED_CONFIGURATION_CONFLICT']:[]),
   ...(rateTextChecks.some(c=>c.comparison.sleepingConflict)?['RATE_TEXT_MAPPED_BED_CONFIGURATION_CONFLICT']:[]),
   ...(rateConditionAssessment.unresolved?['RATE_BED_CONDITIONS_REQUIRE_QUALIFICATION']:[]),
   ...(bedConditionUnresolved?['MAPPED_BED_CONDITIONS_REQUIRE_QUALIFICATION']:[])])],
  temporalRelation:record.completedAt===offer.observedAt?'SAME_DECLARED_INSTANT_NOT_INDEPENDENT_CERTIFICATION':'SEPARATE_OBSERVATIONS_NO_RETROACTIVE_ROOM_ASSIGNMENT_CERTIFICATE'};
}
export function compareHotelDetailCapture(source,capture){
 validateHotelDetailSource(source);
 const records=Array.isArray(capture?.records)?capture.records:[];
 const matches=new Map();for(const pair of records){const q=pair.request,r=pair.response;
  if(q?.kind!=='HOTEL_DETAIL'||!source.targets.some(t=>t.hotelId===q.hotelId)||matches.has(q.hotelId))fail('DETAIL_CAPTURE_TARGET_IDENTITY');
  matches.set(q.hotelId,r);
 }
 const offers=source.offers.map(o=>compareOne(source,o,matches.get(o.hotelId)));
 return {version:'stayopti.liteapi-room-detail-comparison@1.2',sourceBindingSha256:source.bindingSha256,sourceCaseId:source.caseId,
  collectionStatus:capture?.journal?.status??capture?.status??'UNVERIFIED_COLLECTION_STATUS',offerCount:offers.length,propertyCount:source.targets.length,
  roomFoundCount:offers.filter(o=>o.roomFound).length,assessableCount:offers.filter(o=>o.compatibility==='COMPATIBLE_OBSERVATIONS_NOT_COMMERCIAL_CERTIFICATION').length,
  conflictingCount:offers.filter(o=>o.compatibility==='CONFLICTING').length,offers,sourceOriginalsChanged:false,commercialObservationsRefreshed:false,engineInvocations:0,policyInvocations:0};
}
