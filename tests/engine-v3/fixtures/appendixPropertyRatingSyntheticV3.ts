import {appendixFixture,APPENDIX_OBSERVED_AT} from './reviewedEvidenceAppendixSyntheticV3';

// Invented immutable REVIEWED source; no private identity, screenshot or receipt.
// All three ratings/names intentionally coincide. Identity must not use equality
// of a name or number as a substitute for packet + alternative + observation.
export async function propertyRatingFixture(options:any={}){
 const value=options.value??8.5,stars=Object.hasOwn(options,'stars')?options.stars:4;
 const f=await appendixFixture({fields:{propertyName:'Invented Meridian Property',rating:value,ratingObserved:value,stars,
  ...options.fields},normalizedClaims:{ratingObserved:value}});
 for(const o of f.n.offers)o.ratingObserved.links[0].field='rating';
 f.appendix.base=f.m.createReviewedAppendixBinding(f.request);
 const sealProperty=(proof:any,content:any)=>{
  const serialized=f.d.json(content),bytes=Buffer.from(serialized,'utf8');
  proof.artifact.base64=bytes.toString('base64');proof.artifact.sha256=f.d.sha256(bytes);
  proof.transcription={content:serialized,sha256:f.d.sha256(serialized)};
  const body={version:f.m.PROPERTY_RATING_REVIEW_VERSION,actorKind:'SYNTHETIC_TEST',actorId:'INVENTED_PROPERTY_POINT_REVIEWER',
   artifactSha256:proof.artifact.sha256,transcriptionSha256:proof.transcription.sha256,observationFingerprint:f.hash(content),
   method:'SOURCE_CONTENT_AND_PROPERTY_RATING_OBSERVATION_CHECK',reviewedAt:f.appendix.evaluatedAt,
   scopeBasis:'Invented common screenshot identifies this property and precise published overall rating',
   meaningBasis:'Invented general rule documents the rating interval; source and observation linkage reviewed separately',
   limitations:'Synthetic only; no independent historical rule validity or commercial verification',
   reviewedFields:['ratingScale'],propertyScopeSha256:f.hash(content.scope),
   propertyObservationLinkSha256:f.hash(content.propertyObservationLink),commercialVerificationAttested:false};
  proof.pointReview={...body,receiptSha256:f.hash(body)};return proof;
 };
 const addProperty=(index=0,statement='Rating scale: 1-10',overrides:any={})=>{
  const p=f.add('ratingScale',statement,index,overrides);
  const scope=f.m.createReviewedPropertyRatingScope(f.request,f.n.offers[index].alternativeId);
  const content:any={version:f.m.PROPERTY_RATING_EVIDENCE_VERSION,scope,sourceRef:'INVENTED_PLATFORM_GENERAL_RATING_RULE',sourceKind:'PROPERTY_DOCUMENT',
   observationId:'INVENTED_GENERAL_RULE_CAPTURE',observedAt:APPENDIX_OBSERVED_AT,timeSource:'SYNTHETIC_RULE_ACQUISITION_NOT_HISTORICAL_CERTIFICATE',
   validUntil:null,applicability:'PROPERTY_WIDE',field:'ratingScale',statement,temporal:p.integration.temporal,
   propertyObservationLink:{relation:'SCALE_OF_THIS_PROPERTY_RATING_OBSERVATION',scopeSha256:f.hash(scope),
    ruleSourceRef:'INVENTED_PLATFORM_GENERAL_RATING_RULE',basis:'Derived rule linkage to the precisely identified published rating in the immutable reviewed base',
    historicalValidity:'NOT_INDEPENDENTLY_CERTIFIED',historicalValidityLimitations:'Rule acquired after historical rating; no independent historical version retained'},
   ...overrides.content};
  sealProperty(p.proof,content);return {...p,content};
 };
 return {...f,addProperty,sealProperty,prepare:()=>f.m.prepareReviewedEvidenceAppendix(f.request,f.appendix)};
}
