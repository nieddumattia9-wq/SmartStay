// D-0066 R1. Pure qualification of mapped-room text; no I/O, HTML execution,
// additional beds, sleeping places or offer applicability are manufactured.
import {sleepingText} from './liteapi-bed-description-v1.mjs';

export const MAPPED_BED_CONDITIONS_VERSION='stayopti.mapped-bed-conditions@1';
const clone=x=>structuredClone(x),own=(x,k)=>x!==null&&typeof x==='object'&&Object.hasOwn(x,k);
const fields=['roomName','name','description','remarks','conditions'];
const bedSubject=/\b(?:beds?|bunks?|sofas?|sleeping|berths?|lett[oi]|divan[oi])\b/i;
const explicitQualifier=/\b(?:no|without|not|unavailable|unusable|unknown|uncertain|unconfirmed|unverified|undocumented|conditional|subject to|on request|upon request|to be confirmed|pending|may|might|if|can be|non|senza|nessun[oa]?|su richiesta|da confermare|da verificare|da definire|secondo disponibilit[aà]|sconosciut[oaie]|incert[oaie])\b/i;
const subjectless=/^(?:on request|upon request|subject to availability|subject to confirmation|not available|not guaranteed|not confirmed|unknown|unconfirmed|da confermare|da verificare|su richiesta|secondo disponibilit[aà])[.!]?$/i;
const entities=new Map([['&nbsp;',' '],['&amp;','&'],['&quot;','"'],['&apos;',"'"],['&#39;',"'"],['&#x27;',"'"],['&lt;','<'],['&gt;','>']]);

// Offsets identify exact UTF-16 slices of the original field, not offsets in
// rendered/decoded text. Only p/br separators and attribute-free inline tags
// are understood. Unknown markup is retained and cannot certify a fact.
function fragments(original){
 const ranges=[];let start=0;
 for(const m of original.matchAll(/<\/?p\s*>|<br\s*\/?>/ig)){
  if(m.index>start)ranges.push([start,m.index]);start=m.index+m[0].length;
 }
 if(start<original.length)ranges.push([start,original.length]);
 const out=[];
 for(const [begin,end] of ranges){
  let at=begin;
  for(const m of original.slice(begin,end).matchAll(/[.!?](?=\s|$)|;/g)){
   if(m[0]===';'&&/&(?:#\w+|[a-z]+)$/i.test(original.slice(begin,begin+m.index)))continue;
   const stop=begin+m.index+m[0].length;out.push([at,stop]);at=stop;
  }
  if(at<end)out.push([at,end]);
 }
 return out.map(([start,end])=>{
  const raw=original.slice(start,end),left=raw.length-raw.trimStart().length,right=raw.length-raw.trimEnd().length;
  start+=left;end-=right;
  const originalFragment=original.slice(start,end);
  let text=originalFragment.replace(/<\/?(?:b|strong|em|i|u|span)\s*>/ig,'');
  text=text.replace(/&(?:nbsp|amp|quot|apos|lt|gt|#39|#x27);/ig,e=>entities.get(e.toLowerCase()));
  text=text.replace(/\s+/g,' ').trim();
  const unsupportedMarkup=/<[^>]*>|&(?:#\w+|[a-z]+);/i.test(text);
  return {start,end,originalFragment,text,unsupportedMarkup};
 }).filter(x=>x.text.length);
}

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
function classify(fragment){
 const {text,unsupportedMarkup}=fragment;
 if(unsupportedMarkup)return {kind:'UNSUPPORTED_MARKUP',blocking:true,reason:'BOUNDED_MARKUP_GRAMMAR_CANNOT_CERTIFY_MEANING'};
 if(extraReferentOnly(text))return {kind:'EXTRA_BEDS_NOT_BASE_INVENTORY',blocking:false,reason:'SUPPLEMENTARY_BED_OR_COT_RULE_NOT_BASE_INVENTORY_OR_GUARANTEED_PLACES'};
 if(beddingReferentOnly(text))return {kind:'BEDDING_NOT_BED_INVENTORY',blocking:false,reason:'SHEETS_OR_LINEN_NOT_PHYSICAL_BED_ALLOCATION'};
 if(subjectless.test(text))return {kind:'UNRESOLVED_BED_QUALIFICATION',blocking:true,reason:'SUBJECT_NOT_DOCUMENTED_NO_BED_GUARANTEE'};
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
 const conditions=Object.fromEntries(fields.filter(k=>own(room,k)).map(k=>[k,clone(room[k])])),entries=[],unparsedFields=[];
 function visit(field,value){
  if(value===null||value===undefined)return;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)visit(field+'['+i+']',value[i]);return;}
  if(typeof value!=='string'){unparsedFields.push(field);return;}
  for(const fragment of fragments(value)){const {unsupportedMarkup,...retained}=fragment;void unsupportedMarkup;entries.push({field,...retained,...classify(fragment)});}
 }
 for(const field of fields)if(own(conditions,field))visit(field,conditions[field]);
 return {version:MAPPED_BED_CONDITIONS_VERSION,conditions,entries,unparsedFields,
  unresolved:unparsedFields.length>0||entries.some(e=>e.blocking)};
}
