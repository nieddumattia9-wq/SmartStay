import { qualifyHistoricalCommercialFactsV3, HISTORICAL_COMMERCIAL_VERSION_V3, type HistoricalOfferFactsV3 } from '../contract/historicalCommercialEvidenceV3';

const issued=new WeakSet<object>();
const load=new Function('p','return import(p)') as (p:string)=>Promise<{
 readHistoricalLiteApiFacts:(input:unknown)=>unknown;
 isAuthenticatedHistoricalLiteApiFacts:(value:unknown)=>boolean;
}>;
// Evaluation Node entry only. Keep Node builtin types out of the public browser
// compilation, just as the existing evaluation runners load mjs boundaries.
const nodeLocation=new Function('return Promise.all([import("node:path"),import("node:url")]).then(([p,u])=>u.pathToFileURL(p.resolve("scripts/liteapi-historical-commercial-v1.mjs")).href)') as ()=>Promise<string>;
export interface HistoricalPreparationLocatorV3 {
 coverage:{root:string;registryRoot:string}; details?:{root:string;registryRoot:string};
 /** Only synthetic journals allow the existing explicit test protector. */
 syntheticProtector?:unknown;
}
function freeze<T>(v:T):T {if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export function isPreparedHistoricalCommercialV3(v:unknown):boolean {return !!v&&typeof v==='object'&&issued.has(v);}

/** Fixed authenticated-reader producer. No raw-payload, mark-trusted or normalizer callback. */
export async function prepareAuthenticatedHistoricalCommercialV3(locator:HistoricalPreparationLocatorV3) {
 const adapter=await load(await nodeLocation());
 const ingress=adapter.readHistoricalLiteApiFacts(locator);
 if(!adapter.isAuthenticatedHistoricalLiteApiFacts(ingress))throw Error('HISTORICAL_INGRESS_NOT_ISSUED');
 const data=ingress as {origin:string;offers:HistoricalOfferFactsV3[];authentication:unknown;arms:unknown;sourceBindingSha256:string|null};
 const offers=data.offers.map(f=>({facts:f,assessment:qualifyHistoricalCommercialFactsV3(f)}));
 const result=freeze({version:HISTORICAL_COMMERCIAL_VERSION_V3,origin:data.origin,authentication:data.authentication,
  sourceBindingSha256:data.sourceBindingSha256,arms:data.arms,offers,offerCount:offers.length,
  propertyCount:new Set(offers.map(o=>o.facts.identity.propertyId)).size,
  status:'PREPARED_DIAGNOSTIC_MATRIX' as const,decisionBindingSupported:false,engineInvocations:0,policyInvocations:0,
  providerRequests:0,originalsChanged:false,retentionRenewed:false});
 issued.add(result);return result;
}
