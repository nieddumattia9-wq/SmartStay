// D-0066 R1. Pure qualification of mapped-room text; no I/O, HTML execution,
// additional beds, sleeping places or offer applicability are manufactured.
import {sleepingText} from './liteapi-bed-description-v1.mjs';
import {interpretRoomPresentation} from './room-presentation-text-v1.mjs';

export const MAPPED_BED_CONDITIONS_VERSION='stayopti.mapped-bed-conditions@1.1';
const clone=x=>structuredClone(x),own=(x,k)=>x!==null&&typeof x==='object'&&Object.hasOwn(x,k);
const fields=['roomName','name','description','remarks','conditions'];
const bedSubject=/\b(?:beds?|bunks?|sofas?|sleeping|berths?|lett[oi]|divan[oi])\b/i;
const explicitQualifier=/\b(?:no|without|not|unavailable|unusable|unknown|uncertain|unconfirmed|unverified|undocumented|conditional|subject to|on request|upon request|to be confirmed|pending|may|might|if|can be|non|senza|nessun[oa]?|su richiesta|da confermare|da verificare|da definire|secondo disponibilit[aà]|sconosciut[oaie]|incert[oaie])\b/i;
const subjectless=/^(?:on request|upon request|subject to availability|subject to confirmation|not available|not guaranteed|not confirmed|unknown|unconfirmed|da confermare|da verificare|su richiesta|secondo disponibilit[aà])[.!]?$/i;
// An explicit non-bed referent scopes only its immediately following
// subjectless qualification. No service availability/quality fact is certified.
const accessorySubject=/^(?:(?:the|a|an)\s+)?(?:irons?|ironing board|breakfast|wi[- ]?fi|internet|television|tv|parking|pets?|minibar|balcony|air conditioning|ferro da stiro|colazione|parcheggio)\b/i;

function extraReferentOnly(text){
 // Consume the whole bounded statement, not a favorable phrase anywhere in
 // it. A following primary-bed limitation must remain outside this grammar.
 const englishSubject='(?:(?:free|extra|supplementary|additional)\\s+)?(?:cots?|cribs?(?:\\s*/\\s*infant beds?)?|infant beds?)|(?:extra|supplementary|additional|rollaway/extra)\\s+beds?';
 const list='(?:'+englishSubject+')(?:\\s*(?:,|and|/)\\s*(?:'+englishSubject+'))*';
 const predicate='(?:(?:are|is)\\s+)?(?:(?:not\\s+)?(?:available|provided|offered|allowed|possible)(?:\\s+(?:on request|upon request|subject to availability))?|unavailable|on request|upon request|subject to availability)';
 return new RegExp('^(?:(?:all|the|no)\\s+)?'+list+'(?:\\s*\\(surcharge\\))?\\s+'+predicate+'[.!]?$','i').test(text)||
  /^(?:no (?:extra|supplementary|additional) beds?|nessun letto (?:aggiuntivo|supplementare)(?: disponibile)?|(?:letti (?:aggiuntivi|supplementari)|culle|lettini) (?:non disponibili|su richiesta|secondo disponibilit[aà]))[.!]?$/i.test(text);
}
function beddingReferentOnly(text){
 const withoutBedding=text.replace(/\bbed\s+(?:linens?|sheets?|linen\/towels)\b/ig,'')
  .replace(/\b(?:bedsheets?|bedding|linens?|sheets?|lenzuol[ae]|biancheria(?: da letto)?)\b/ig,'');
 return /\b(?:bed\s+(?:linens?|sheets?)|bedsheets?|bedding|linens?|sheets?|lenzuol[ae]|biancheria(?: da letto)?)\b/i.test(text)&&!bedSubject.test(withoutBedding);
}
function classify(fragment,previousAccessory=false){
 const {text,unsupportedMarkup}=fragment;
 if(unsupportedMarkup)return {kind:'UNSUPPORTED_MARKUP',blocking:true,reason:'BOUNDED_MARKUP_GRAMMAR_CANNOT_CERTIFY_MEANING'};
 if(extraReferentOnly(text))return {kind:'EXTRA_BEDS_NOT_BASE_INVENTORY',blocking:false,reason:'SUPPLEMENTARY_BED_OR_COT_RULE_NOT_BASE_INVENTORY_OR_GUARANTEED_PLACES'};
 if(beddingReferentOnly(text))return {kind:'BEDDING_NOT_BED_INVENTORY',blocking:false,reason:'SHEETS_OR_LINEN_NOT_PHYSICAL_BED_ALLOCATION'};
 if(subjectless.test(text))return previousAccessory?
  {kind:'ACCESSORY_CONDITION_OR_UNCERTAINTY',blocking:false,affectedRequirement:'PRECEDING_EXPLICIT_ACCESSORY',reason:'ACCESSORY_QUALIFICATION_RETAINED_NOT_BASE_BED_EVIDENCE'}:
  {kind:'UNRESOLVED_BED_QUALIFICATION',blocking:true,reason:'SUBJECT_NOT_DOCUMENTED_NO_BED_GUARANTEE'};
 const count=/^The unit offers (\d+) beds?\.$/i.exec(text)||/^The unit offers (\d+) beds?$/i.exec(text);
 if(count){
  const value=Number(count[1]);
  return Number.isSafeInteger(value)&&value>=0&&value<=100?
   {kind:'DOCUMENTED_BED_COUNT',documentedBedCount:value,blocking:false,reason:'COUNT_ONLY_NO_TYPES_OR_SLEEPING_PLACES_INFERRED'}:
   {kind:'UNSUPPORTED_BED_ASSERTION',blocking:true,reason:'DOCUMENTED_COUNT_OUTSIDE_BOUNDED_INTEGER_GRAMMAR'};
 }
 const bedInterpretation=sleepingText(text),kinds=bedInterpretation.clauses.map(c=>c.kind);
 if(bedInterpretation.claimState==='KNOWN')return {kind:'SUPPORTED_BED_INVENTORY',bedInterpretation,blocking:false,reason:'EXPLICIT_BOUNDED_INVENTORY_NOT_FULL_ALLOCATION_CERTIFICATE'};
 if(bedInterpretation.alternativeInventories.length)return {kind:'BED_ALTERNATIVES_NOT_ASSIGNED',bedInterpretation,blocking:false,reason:'KEEP_EACH_CONFIGURATION_SEPARATE_NO_OR_TO_AND'};
 if(kinds.some(k=>['BED_NEGATION','BED_CONDITION_OR_UNCERTAINTY','UNRESOLVED_BED_QUALIFICATION'].includes(k))||bedSubject.test(text)&&explicitQualifier.test(text))
  return {kind:bedInterpretation.claimState==='CONFLICTING'?'CONFLICTING_BED_QUALIFICATION':'BED_CONDITION_OR_UNCERTAINTY',bedInterpretation,blocking:true,reason:'BASE_BED_NEGATION_CONDITION_OR_UNKNOWN_RETAINED'};
 if(bedSubject.test(text)||kinds.includes('UNSUPPORTED_BED_CLAUSE'))return {kind:'UNSUPPORTED_BED_ASSERTION',bedInterpretation,blocking:true,reason:'UNINTERPRETED_ASSERTION_NO_INVENTORY_OR_CONCORDANCE_INFERRED'};
 return {kind:'OTHER_SUBJECT',blocking:false,reason:'NO_BASE_BED_ASSERTION_CONSUMED'};
}

export function qualifyMappedBedConditions(room){
 const conditions=Object.fromEntries(fields.filter(k=>own(room,k)).map(k=>[k,clone(room[k])])),entries=[],unparsedFields=[],presentations=[];
 function visit(field,value){
  if(value===null||value===undefined)return;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)visit(field+'['+i+']',value[i]);return;}
  if(typeof value!=='string'){unparsedFields.push(field);return;}
  const presentation=interpretRoomPresentation(value);presentations.push({field,...presentation});let previousAccessory=false;
  if(!presentation.fragments.length&&presentation.issues.length)unparsedFields.push(field);
  for(const fragment of presentation.fragments){const {unsupportedMarkup,...retained}=fragment;void unsupportedMarkup;
   const classification=classify(fragment,previousAccessory);entries.push({field,...retained,...classification});
   previousAccessory=!fragment.unsupportedMarkup&&(classification.kind==='ACCESSORY_CONDITION_OR_UNCERTAINTY'||accessorySubject.test(fragment.text)&&!bedSubject.test(fragment.text));
  }
 }
 for(const field of fields)if(own(conditions,field))visit(field,conditions[field]);
 return {version:MAPPED_BED_CONDITIONS_VERSION,conditions,entries,unparsedFields,presentations,
  unresolved:unparsedFields.length>0||entries.some(e=>e.blocking)};
}
