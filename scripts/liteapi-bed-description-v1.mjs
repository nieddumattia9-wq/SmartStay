// D-0066 mechanical extraction of the unchanged D-0065 bed-clause evaluator.
// D-0067: bounded Unicode token-boundary repair; historical extraction remains
// checked by HD23 after reversing only the explicitly documented regex delta.
// Pure: no capture, transport, kernel, policy or I/O.
import {normalizeItalianBedInventory} from './diagnostic-offer-requirements-v1.mjs';
import {qualifyEnglishRoomDescriptionBeds} from './liteapi-offer-qualification-v1.mjs';
const clone=x=>structuredClone(x);
const canonical=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
const equal=(a,b)=>canonical(a)===canonical(b);
export function sleepingText(value){
 const clauses=[],inventories=[],alternativeInventories=[];
 // This is a bounded clause grammar, not a whole-description sentiment test.
 // Numeric inventory must not drop a second clause qualifying the same beds.
 const bedSubject=/\b(?:lett[oi]|divan[oi]|beds?|bunks?|sofas?|sleeping|berths?)\b/i;
 const conditional=/\b(?:da confermare|da verificare|da definire|su richiesta|subject to|on request|to be confirmed|pending|may|might|if|se|salvo|secondo disponibilit[aà]|non garantit[oaie]|not guaranteed|oppure|alternativ[ae])\b/i;
 const uncertainty=/\b(?:unknown|unconfirmed|uncertain|undocumented|unverified|sconosciut[oaie]|incert[oaie]|non (?:specificat|documentat|verificat)[oaie])\b/i;
 const bedNegation=/\b(?:non\s+(?:disponibil[ei]|utilizzabil[ei]|present[ei]|previst[oi])|not\s+(?:available|usable|present|provided)|unavailable|unusable|(?:no|without)\s+(?:(?:a|the|any)\s+)?(?:beds?|bunks?|sofas?)|(?:nessun[oa]?|senza)\s+(?:un[oa]?\s+)?(?:lett[oi]|divan[oi]))\b/i;
 // An adjacent subjectless predicate remains uncertainty even when its tail is
 // unsupported. It is not silently discarded after a newly recognized title.
 // Require a recognized availability/configuration predicate after NOT/NON;
 // NOT alone cannot change the subject of breakfast, pets or room amenities.
 const implicitQualification=/^(?:not\s+(?:(?:always|currently|necessarily|fully|yet)\s+)?(?:available|provided|included|guaranteed|confirmed|present|usable|verified|documented|specified)\b|non\s+(?:disponibil[ei]|utilizzabil[ei]|garantit[oaie]|present[ei]|confermat[oaie]|specificat[oaie]|documentat[oaie]|verificat[oaie])\b|(?:unavailable|unconfirmed|unknown|unverified|uncertain)[.!]?$|su richiesta\b|on request\b|da (?:confermare|verificare|definire)\b|subject to (?:availability|confirmation)\b|(?:if|when) available\b|(?:availability|configuration) (?:is )?(?:not|unknown|uncertain|unconfirmed)\b|secondo disponibilit[aà](?![\p{L}\p{M}\p{N}_])|senza garanzia\b|without guarantee\b|no guarantee\b)/iu;
 let previousBed=false;
 if(typeof value==='string')for(const originalText of value.split(';').filter(v=>v.trim())){
  const textValue=originalText.trim(),englishInterpretation=qualifyEnglishRoomDescriptionBeds(originalText),english=englishInterpretation.parsed;
  const bed=bedSubject.test(textValue)||english!==null||/\b(?:\d+|one|two|three|four)\s+(?:king|queen|double|single|twin)\b/i.test(textValue),implicit=previousBed&&implicitQualification.test(textValue);
  const decoded=bed?normalizeItalianBedInventory(textValue)??english?.inventory:null;
  let kind;
  if(decoded){kind='SUPPORTED_INVENTORY';inventories.push(decoded);}
  else if(english?.relation==='OR'){kind='BED_ALTERNATIVES_NOT_ASSIGNED';alternativeInventories.push(...english.alternatives);}
  else if(bed){
   // A statement about extra beds is not a restriction on the base inventory.
   // The explicit extra/supplementary referent is separate from base beds; its
   // absence or conditional provision must not negate an existing base count.
   // Consume the WHOLE extra-bed statement. Merely mentioning extra beds in a
   // restriction on a base bed must never make that restriction disappear.
   const extraOnly=/^(?:nessun letto (?:aggiuntivo|supplementare)(?: disponibile)?|no (?:extra|supplementary) beds?(?: available)?|(?:letti (?:aggiuntivi|supplementari)|(?:extra|supplementary) beds?) (?:non disponibili|not available|su richiesta|on request|subject to availability))[.!]?$/i.test(textValue);
   kind=extraOnly?'EXTRA_BEDS_NOT_BASE_INVENTORY':conditional.test(textValue)||uncertainty.test(textValue)?'BED_CONDITION_OR_UNCERTAINTY':
    bedNegation.test(textValue)?'BED_NEGATION':'UNSUPPORTED_BED_CLAUSE';
  }else kind=implicit?'UNRESOLVED_BED_QUALIFICATION':'OTHER_SUBJECT';
  clauses.push({text:textValue,originalText,kind,englishInterpretation});previousBed=bed||implicit;
 }
 // A leading subjectless qualification can precede its inventory. Do not move
 // a predicate away from an earlier explicit other subject such as breakfast.
 let leading=0;
 while(leading<clauses.length&&clauses[leading].kind==='OTHER_SUBJECT'&&implicitQualification.test(clauses[leading].text))leading++;
 if(leading&&clauses[leading]&&clauses[leading].kind!=='OTHER_SUBJECT')
  for(let i=0;i<leading;i++)clauses[i].kind='UNRESOLVED_BED_QUALIFICATION';
 // A semicolon is not an AND operator or proof of separate physical beds.
 // Identical assertions repeat one lower bound; different inventories remain
 // separately visible until their relationship is explicitly documented.
 const inventoryComposition=inventories.length<2?'SINGLE_OR_NO_SUPPORTED_CLAUSE':
  inventories.every(i=>equal(i,inventories[0]))?'IDENTICAL_ASSERTIONS_NOT_ADDED':'UNRESOLVED_BETWEEN_CLAUSES';
 const negated=clauses.some(c=>c.kind==='BED_NEGATION');
 const uncertain=inventoryComposition==='UNRESOLVED_BETWEEN_CLAUSES'||clauses.some(c=>['BED_CONDITION_OR_UNCERTAINTY','UNSUPPORTED_BED_CLAUSE','UNRESOLVED_BED_QUALIFICATION','BED_ALTERNATIVES_NOT_ASSIGNED'].includes(c.kind));
 const status=negated&&inventories.length?'CONFLICTING_INVENTORY':negated?'NEGATED_UNQUANTIFIED_INVENTORY':
  uncertain?'UNVERIFIED_BED_QUALIFICATION':inventories.length?'SUPPORTED_LOWER_BOUND':'MISSING_SUPPORTED_INVENTORY';
 const claimState=status==='CONFLICTING_INVENTORY'?'CONFLICTING':status==='SUPPORTED_LOWER_BOUND'?'KNOWN':'UNKNOWN';
 return {originalText:typeof value==='string'?value:null,status,claimState,clauses,alternativeInventories,observedInventories:clone(inventories),inventoryComposition,
  inventory:claimState==='KNOWN'?{complete:false,beds:clone(inventories[0].beds)}:null,
  reason:'SCOPED_BED_CLAUSE_GRAMMAR:'+status,completeInventoryCertified:false};
}
