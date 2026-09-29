// Probe @1.3 only. Compare observed terms, never rank variants by price.
// Shape/uncertainty checks qualify the observation, not checkout completeness.
import {compareLiteApiCommercialTerms} from './liteapi-cancellation-comparison-v1.mjs';
import {parseExplicitInstant} from '../server/shared/explicit-instant.mjs';
const own=(x,k)=>x!=null&&Object.hasOwn(x,k);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const pick=(x,ks)=>Object.fromEntries(ks.map(k=>[k,own(x,k)?{present:true,value:x[k]}:{present:false}]));
const uncertain=x=>typeof x==='string'&&/^(unknown|unspecified|tbd|tbc|not specified|to be confirmed|on request|non verificato|da confermare)$/i.test(x.trim());
const amount=x=>(typeof x==='number'&&Number.isFinite(x)&&x>=0)||(typeof x==='string'&&/^\d+(?:\.\d+)?$/.test(x));

function projection(d,legacy){
 // Retain EVERY legacy term, including taxes/remarks at all original scopes.
 // Additional non-price terms are not inferred from another scope.
 const p=structuredClone(legacy);
 p.cancellationPolicies=d.rate.cancellationPolicies??null;
 p.rateScope=pick(d.rate,['boardType','paymentSchedule','restrictions','rateType']);
 Object.assign(p.offer,pick(d.offer,['paymentType','paymentTypes','paymentSchedule','priceType','rateType','paymentPolicies','restrictions','childrenPolicies','childPolicies','termsAndConditions']));
 Object.assign(p.hotel,pick(d.hotel,['paymentSchedule','paymentPolicies','restrictions','childrenPolicies','childPolicies']));
 return p;
}

function qualify(p){
 const unresolved=[],missing=[];
 const problem=(field,reason)=>unresolved.push({field,reason});
 function value(v,path,key){
  if(uncertain(v)){problem(path,'EXPLICIT_UNCERTAINTY');return;}
  if(key==='taxesAndFees'){
   // Documented null semantics are retained; omission is not null.
   if(v===null)return;
   if(!Array.isArray(v)){problem(path,'TAX_COMPONENTS_UNINTERPRETABLE');return;}
   for(const [i,c]of v.entries())if(!plain(c)||!amount(c.amount)||typeof c.currency!=='string'||!(/^[A-Z]{3}$/).test(c.currency)||typeof c.included!=='boolean')problem(path+'['+i+']','TAX_COMPONENT_UNINTERPRETABLE');
   return;
  }
  if(['maxOccupancy','maxAdults','maxChildren'].includes(key)){
   if(!Number.isSafeInteger(v)||v<0)problem(path,'OCCUPANCY_LIMIT_UNINTERPRETABLE');return;
  }
  if(['name','boardName','boardType','paymentType','paymentSchedule','priceType','rateType'].includes(key)){
   if(typeof v!=='string'||!v.trim())problem(path,'TERM_UNINTERPRETABLE');return;
  }
  if(key==='paymentTypes'){
   if(!Array.isArray(v)||!v.length||v.some(t=>typeof t!=='string'||!t.trim()||uncertain(t)))problem(path,'PAYMENT_UNINTERPRETABLE');return;
  }
  // Free-form limitations are retained verbatim, not interpreted as consent.
  // A null condition or a nested explicit UNKNOWN is not an equal known term.
  if(v===null){problem(path,'TERM_EXPLICIT_NULL');return;}
  if(Array.isArray(v))v.forEach((x,i)=>value(x,path+'['+i+']',''));
  else if(plain(v))for(const [k,x]of Object.entries(v))value(x,path+'.'+k,k);
  else if(!['string','number','boolean'].includes(typeof v))problem(path,'TERM_UNINTERPRETABLE');
 }
 function walk(v,path=''){
  for(const [k,x]of Object.entries(v)){
   const field=path?path+'.'+k:k;
   if(k==='cancellationPolicies'&&!path)continue;
   if(plain(x)&&own(x,'present')){
    if(x.present)value(x.value,field,k);else missing.push(field);
   }else if(plain(x))walk(x,field);
  }
 }
 walk(p);
 for(const k of ['name','boardName'])if(!p[k]?.present)problem(k,'REQUIRED_MATCH_DISCRIMINATOR_MISSING');
 // Only explicit supported name/code pairs; no inference for unfamiliar meals.
 const meal=p.boardName?.value,code=p.rateScope.boardType;
 const knownMeal=typeof meal==='string'?(/^room only$/i.test(meal)?'RO':/^breakfast(?: included)?$/i.test(meal)?'BI':null):null;
 if(knownMeal&&code.present&&code.value!==knownMeal){problem('boardName','BOARD_NAME_CODE_CONFLICT');problem('rateScope.boardType','BOARD_NAME_CODE_CONFLICT');}
 const c=p.cancellationPolicies;
 if(!plain(c)||!['NRFN','RFN'].includes(c.refundableTag)||!Array.isArray(c.cancelPolicyInfos))problem('cancellationPolicies','CANCELLATION_UNINTERPRETABLE');
 else{
  if(c.refundableTag==='RFN'&&!c.cancelPolicyInfos.length)problem('cancellationPolicies','REFUNDABLE_WINDOW_MISSING');
  for(const [i,x]of c.cancelPolicyInfos.entries()){
   const path='cancellationPolicies.cancelPolicyInfos['+i+']';
   if(!plain(x)||parseExplicitInstant(x.cancelTime).status!=='EXPLICIT_INSTANT')problem(path+'.cancelTime','EXPLICIT_CANCELLATION_INSTANT_REQUIRED');
   if(!plain(x)||!amount(x.amount)||typeof x.currency!=='string'||!(/^[A-Z]{3}$/).test(x.currency))problem(path,'CANCELLATION_COMPONENT_UNINTERPRETABLE');
  }
  // Includes remarks and any extra conditions; an unknown value is not erased.
  for(const [k,v]of Object.entries(c))if(k!=='cancelPolicyInfos')value(v,'cancellationPolicies.'+k,k);
 }
 return {unresolved,missing};
}

export function compareSspObservedConditions(before,after,legacyBefore,legacyAfter){
 const a=projection(before,legacyBefore),b=projection(after,legacyAfter);
 const qa=qualify(a),qb=qualify(b),comparison=compareLiteApiCommercialTerms(a,b);
 const unresolved=[...qa.unresolved.map(x=>({...x,side:'DISCOVERY'})),...qb.unresolved.map(x=>({...x,side:'CANDIDATE'}))];
 // Missing optional facts on BOTH sides remain unobserved, not assertions of
 // absence. A presence transition cannot be assumed to mean a changed term.
 for(const field of new Set([...qa.missing,...qb.missing]))if(qa.missing.includes(field)!==qb.missing.includes(field))unresolved.push({field,reason:'TERM_PRESENCE_CHANGED',side:'PAIR'});
 // A demonstrated independent difference (e.g. board) still excludes a
 // variant with an unresolved cancellation timestamp. Conversely UNKNOWN
 // alone is NEVER a non-match. Parent comparisons with uncertain descendants
 // are conservative: they do not supply an established difference.
 const establishedDifferences=comparison.differences.filter(d=>!unresolved.some(u=>u.field===d.field||u.field.startsWith(d.field+'.')||u.field.startsWith(d.field+'[')));
 const status=establishedDifferences.length?'DIFFERENT_OBSERVED_CONDITIONS':unresolved.length?'UNRESOLVED':comparison.equal?'EQUIVALENT_OBSERVED_CONDITIONS':'UNRESOLVED';
 return {...comparison,version:'stayopti.ssp-observed-conditions@1',status,equal:status==='EQUIVALENT_OBSERVED_CONDITIONS',unresolved,
  establishedDifferences,
  missing:{before:qa.missing,after:qb.missing},observations:{before:a,after:b},
  completeTermsCertified:false,tokenContinuityCertified:false};
}
