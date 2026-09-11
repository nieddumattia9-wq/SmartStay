// Evaluation-only bounded grammar. Original wrappers and unsupported clauses
// survive interpretation; a recognized noun is not automatically a positive fact.
export const SCOPED_SIGNALS_VERSION='stayopti.diagnostic-scoped-signals@1';
const normalize=v=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const terms={wifi:'wifi|wi fi', 'air-conditioning':'aria condizionata|air conditioning',
 elevator:'ascensore|elevator',kitchen:'cucina|kitchen',heating:'riscaldamento|heating',reception:'reception',
 soundproofing:'insonorizzazione|soundproofing',desk:'scrivania|desk',
 'private-bathroom':'bagno privato|private bathroom|bagno in camera|en suite bathroom|ensuite bathroom',
 'exclusive-use':'uso esclusivo|exclusive use'};
export const serviceCodes=Object.keys(terms).filter(k=>!['private-bathroom','exclusive-use'].includes(k));
export function interpretScopedValue(value,code){
 const t=terms[code];if(!t)throw Error('SCOPED_SIGNAL_UNSUPPORTED_CODE');
 const items=Array.isArray(value)?value:typeof value==='string'?value.split(/[;,\n|]+/):[];
 const states=[];
 for(const item of items){if(typeof item!=='string')continue;const s=normalize(item);
  // A documented shared bath contradicts a private-bath boolean; negating a
  // shared bath does NOT prove a private one. The raw SHARED state is retained
  // separately by the privacy evaluator, never invented from generic false.
  if(code==='private-bathroom'&&/\b(?:shared bathroom|communal bathroom|bagno condiviso)\b/.test(s)){
   states.push(/^(?:shared bathroom|communal bathroom|bagno condiviso)$/.test(s)?'NEGATIVE':'UNKNOWN');continue;
  }
  if(!new RegExp('\\b(?:'+t+')\\b').test(s))continue;
  // Only complete bounded clauses can affirm/deny. Conditions, compound prose,
  // partial matches and trailing qualifications are NOT silently removed.
  const positive=new RegExp('^(?:'+t+')(?: gratis| gratuito| gratuita| free| disponibile| available)?$').test(s);
  const negative=new RegExp('^(?:no|not|without|senza|non|nessun) (?:a |an |the |un |una |il |la )?(?:'+t+')$').test(s)||
   new RegExp('^(?:'+t+') (?:(?:is|e) )?(?:not|non) (?:available|provided|included|disponibile|incluso|presente)$').test(s);
  states.push(positive?'POSITIVE':negative?'NEGATIVE':'UNKNOWN');
 }
 if(!states.length)return {state:'ABSENT',mentioned:false};
 return {state:states.includes('POSITIVE')&&states.includes('NEGATIVE')?'CONFLICTING':states.includes('UNKNOWN')?'UNKNOWN':states[0],mentioned:true};
}
export function reviewedScopedObservations(fields,proofs,scope){
 return fields.filter(f=>['roomName','amenities','roomAmenities','services','roomServices','privateBathroom','exclusiveUse'].includes(f.key)).map(f=>({
  sourceField:f.key,scope:['amenities','services'].includes(f.key)?'PROPERTY':'OFFER',offerScope:structuredClone(scope),
  original:structuredClone(f.value),links:[{field:f.key,evidence:f.value.evidenceRefs.map(ref=>{
   const p=proofs.find(p=>p.ref===ref);if(!p)throw Error('SCOPED_SIGNAL_PROOF');return {ref,sha256:p.sha256};})}],
  structuredPrivacy:['privateBathroom','exclusiveUse'].includes(f.key)?{
   state:f.value.status==='UNKNOWN'?'UNKNOWN':typeof f.value.value==='boolean'?f.value.value?'POSITIVE':'NEGATIVE':
    interpretScopedValue(f.value.value,f.key==='privateBathroom'?'private-bathroom':'exclusive-use').state}:null,
 }));
}
export function resolveScopedService(observations,code){
 const interpreted=observations.map(o=>({...o,interpretation:interpretScopedValue(o.original.status==='KNOWN'?o.original.value:null,code)}));
 const mentioned=interpreted.filter(o=>o.interpretation.mentioned),offer=mentioned.filter(o=>o.scope==='OFFER');
 const selected=offer.length?offer:mentioned,states=selected.map(o=>o.interpretation.state);
 const state=states.includes('CONFLICTING')||(states.includes('POSITIVE')&&states.includes('NEGATIVE'))?'CONFLICTING':
  states.includes('UNKNOWN')?'UNKNOWN':states[0]??'ABSENT';
 return {code,state,value:state==='POSITIVE'?true:state==='NEGATIVE'?false:null,selected,observations:interpreted,
  interpretationStatus:state==='ABSENT'?'DATA_ABSENT_OR_NOT_IDENTIFIED':state==='UNKNOWN'?'DATA_PRESENT_GRAMMAR_UNSUPPORTED_OR_CONDITIONAL':
   state==='CONFLICTING'?'DATA_PRESENT_CONFLICTING':'DOCUMENTED_SUPPORTED'};
}
// Reviewed structured booleans are recomputed from their ORIGINAL linked field,
// not a matching checksum alone. A boolean only has meaning in its own field.
export function verifyReviewedPrivacyClaim(claim,key,fields){
 if(claim.state!=='KNOWN')return;
 const code=key==='privateBathroom'?'private-bathroom':'exclusive-use',states=[];
 const allowed=['roomName','roomAmenities','roomServices','amenities','services',key];
 for(const l of claim.links){
  if(!allowed.includes(l.field))throw Error('REVIEWED_REQUIREMENTS_'+key+'_SOURCE_FIELD');
  const f=fields.find(f=>f.key===l.field),v=f?.value.status==='KNOWN'?f.value.value:null;
  if(l.field===key&&typeof v==='boolean')states.push(v?'POSITIVE':'NEGATIVE');
  else states.push(interpretScopedValue(v,code).state);
  if(claim.applicability==='OFFER_SCOPED'&&['amenities','services'].includes(l.field))throw Error('REVIEWED_REQUIREMENTS_'+key+'_SOURCE_SCOPE');
 }
 if(!states.length||states.some(s=>!['POSITIVE','NEGATIVE'].includes(s)))throw Error('REVIEWED_REQUIREMENTS_'+key+'_NORMALIZATION_UNSUPPORTED');
 if(states.some(s=>(s==='POSITIVE')!==claim.value))throw Error('REVIEWED_REQUIREMENTS_'+key+'_NORMALIZATION_CHANGED');
}
