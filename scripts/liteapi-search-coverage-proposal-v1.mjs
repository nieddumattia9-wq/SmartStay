// Proposed case data, not transport logic or permission to acquire. Any new
// plan needs an independently bound inventory/configuration and authorization.
export const CASE_ID='D0064_LITEAPI_BOLOGNA_COVERAGE_001';
export const LIMITS=Object.freeze({CATALOG:1,CITY_RATES:1,ID_RATES:1,total:3});
export const SEED='D0064_BOLOGNA_COVERAGE_001_HASH_SAMPLE_V1';
export const SCENARIO=Object.freeze({destination:'Bologna',countryCode:'IT',checkin:'2027-01-10',checkout:'2027-01-17',nights:7,adults:2,childAges:[6,11],units:1,currency:'EUR',guestNationality:'IT',budget:1400,profile:'BALANCED',profileSource:'manual',distancePreference:'NOT_REQUESTED'});
export const CONTROLS=Object.freeze({limits:LIMITS,concurrency:1,retries:0,redirects:0,additionalPages:0,pacingMs:1000,clientTimeoutMs:20000,providerTimeoutSeconds:12,catalogLimit:100,maximumSelectedIds:20,seed:SEED,
 host:'api.liteapi.travel',ratesLimit:20,maxRatesPerHotel:3});
export const PROPOSED_PLAN=Object.freeze({caseId:CASE_ID,scenario:SCENARIO,controls:CONTROLS});
