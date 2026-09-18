// Legacy MAX17 profile: version, root, receipt schema and caps remain unchanged.
import {createBoundedAcquisitionJournalProfile} from './bounded-acquisition-journal-core-v1.mjs';
export const LITEAPI_ACQUISITION_JOURNAL_VERSION='stayopti.liteapi-acquisition-journal@1';
export const LITEAPI_ACQUISITION_CAPS=Object.freeze({SEARCH:1,HOTEL_DETAIL:5,FACILITIES:1,PREBOOK:5,PREBOOK_GET:5,total:17,concurrency:1,retries:0,redirects:0});
const profile=createBoundedAcquisitionJournalProfile({
 version:LITEAPI_ACQUISITION_JOURNAL_VERSION,caps:LITEAPI_ACQUISITION_CAPS,
 registryDirectory:'liteapi-controlled-acquisition',errorPrefix:'LITEAPI_ACQUISITION_',
});
export const hashAcquisitionJournalValue=profile.hashValue;
export const createAcquisitionJournal=profile.create;
export const verifyAcquisitionJournal=profile.verify;
export const decryptAcquisitionOriginal=profile.decrypt;
