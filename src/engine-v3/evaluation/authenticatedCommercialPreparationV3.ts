import {qualifyAuthenticatedCommercialSetV3,type AuthenticatedComparisonFactsV3} from '../contract/authenticatedCommercialSetV3';
const issued=new WeakSet<object>();
const nodeLocation=new Function('return Promise.all([import("node:path"),import("node:url")]).then(([p,u])=>u.pathToFileURL(p.resolve("scripts/liteapi-comparison-facts-v1.mjs")).href)') as ()=>Promise<string>;
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export interface ComparisonLocatorV3 {root:string;registryRoot:string;syntheticProtector?:unknown}
export async function prepareAuthenticatedCommercialSetV3(locator:ComparisonLocatorV3){
 const load=new Function('u','return import(u)') as (u:string)=>Promise<{readComparisonFacts:(x:ComparisonLocatorV3)=>AuthenticatedComparisonFactsV3;isIssuedComparisonFacts:(x:unknown)=>boolean}>;
 const module=await load(await nodeLocation());
 const facts=module.readComparisonFacts(locator);if(!module.isIssuedComparisonFacts(facts))throw Error('AUTHENTICATED_FACTS_REQUIRED');
 const prepared=freeze({version:'stayopti.issued-commercial-preparation@2' as const,facts,assessment:qualifyAuthenticatedCommercialSetV3(facts),engineInvocations:0,policyInvocations:0});
 issued.add(prepared);return prepared;
}
export type AuthenticatedCommercialPreparationV3=Awaited<ReturnType<typeof prepareAuthenticatedCommercialSetV3>>;
export const isAuthenticatedCommercialPreparationV3=(x:unknown):x is AuthenticatedCommercialPreparationV3=>!!x&&typeof x==='object'&&issued.has(x);
