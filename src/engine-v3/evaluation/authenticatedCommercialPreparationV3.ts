import {qualifyAuthenticatedCommercialSetV3,type AuthenticatedComparisonFactsV3} from '../contract/authenticatedCommercialSetV3';
import {validatePublicPricePolicyV3,type PublicPricePolicyV3} from '../contract/publicPricePerspectiveV3';
const issued=new WeakSet<object>();
const nodeLocation=new Function('return Promise.all([import("node:path"),import("node:url")]).then(([p,u])=>u.pathToFileURL(p.resolve("scripts/liteapi-comparison-facts-v1.mjs")).href)') as ()=>Promise<string>;
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export interface ComparisonLocatorV3 {root:string;registryRoot:string;syntheticProtector?:unknown}
export async function prepareAuthenticatedCommercialSetV3(locator:ComparisonLocatorV3,publicPricePolicy?:PublicPricePolicyV3){
 // Explicit opt-in only. Old locators/receipts/default callers remain @2.
 const pricePolicy=publicPricePolicy?structuredClone(publicPricePolicy):undefined;
 if(pricePolicy)validatePublicPricePolicyV3(pricePolicy);
 const load=new Function('u','return import(u)') as (u:string)=>Promise<{readComparisonFacts:(x:ComparisonLocatorV3,version?:string)=>AuthenticatedComparisonFactsV3;isIssuedComparisonFacts:(x:unknown)=>boolean}>;
 const module=await load(await nodeLocation());
 const facts=module.readComparisonFacts(locator,pricePolicy?'stayopti.public-price-perspective@1':undefined);if(!module.isIssuedComparisonFacts(facts))throw Error('AUTHENTICATED_FACTS_REQUIRED');
 const prepared=freeze({version:pricePolicy?'stayopti.issued-commercial-preparation@2.1' as const:'stayopti.issued-commercial-preparation@2' as const,facts,
  ...(pricePolicy?{pricePolicy}:{}),assessment:qualifyAuthenticatedCommercialSetV3(facts,pricePolicy),engineInvocations:0,policyInvocations:0});
 issued.add(prepared);return prepared;
}
export type AuthenticatedCommercialPreparationV3=Awaited<ReturnType<typeof prepareAuthenticatedCommercialSetV3>>;
export const isAuthenticatedCommercialPreparationV3=(x:unknown):x is AuthenticatedCommercialPreparationV3=>!!x&&typeof x==='object'&&issued.has(x);
