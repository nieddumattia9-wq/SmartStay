// Evaluation adapter: only the documented cancelPolicyInfos[].cancelTime is
// temporal. Amounts, currencies, remarks, tags and all other terms stay exact.
import {compareExplicitInstants} from '../server/shared/explicit-instant.mjs';
export const LITEAPI_CANCELLATION_COMPARISON_VERSION='stayopti.liteapi-cancellation-comparison@1';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>JSON.stringify(x,(_k,v)=>plain(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
const same=(a,b)=>canonical(a)===canonical(b);

export function compareLiteApiCommercialTerms(before,after){
 const temporalComparisons=[];
 const equal=(a,b,path)=>{
  if(/^cancellationPolicies\.cancelPolicyInfos\[\d+\]\.cancelTime$/.test(path)){
   const result=compareExplicitInstants(a,b);temporalComparisons.push({field:path,...result});return result.equivalent;
  }
  if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.map((v,i)=>equal(v,b[i],path+'['+i+']')).every(Boolean);
  if(plain(a)&&plain(b)){
   const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
   return keys.map(k=>Object.hasOwn(a,k)&&Object.hasOwn(b,k)&&equal(a[k],b[k],path?path+'.'+k:k)).every(Boolean);
  }
  return same(a,b);
 };
 const differences=[...new Set([...Object.keys(before),...Object.keys(after)])].sort().filter(field=>
  !Object.hasOwn(before,field)||!Object.hasOwn(after,field)||!equal(before[field],after[field],field)).map(field=>({field,before:structuredClone(before[field]),after:structuredClone(after[field])}));
 const unresolvedTimes=temporalComparisons.filter(v=>!v.equivalent&&v.status==='INSUFFICIENT_INFORMATION');
 return {version:LITEAPI_CANCELLATION_COMPARISON_VERSION,equal:differences.length===0,differences,temporalComparisons,
  unresolvedTimes,originalsRewritten:false,nonTemporalTermsReinterpreted:false};
}
