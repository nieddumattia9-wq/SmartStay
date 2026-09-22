import {buildSmartStayFrontendRuntimeV2} from '../../engine-v2/frontend/smartStayFrontendAdapterV2';
import {adaptV2SearchResultToDecisionV3} from '../adapter/v2CompatibilityAdapterV3';
import {createIndependentV3ComparableDecisionV3,runIndependentDecisionShadowV3} from '../orchestrator/independentDecisionEngineV3';
import {createBoundAuthenticatedCommercialV3} from './boundAuthenticatedCommercialV3';
import {authenticatedDecisionInputV3} from './authenticatedCommercialDecisionInputV3';
import {isAuthenticatedCommercialPreparationV3,type AuthenticatedCommercialPreparationV3} from './authenticatedCommercialPreparationV3';
export const commercialExecutionAuthorizationV3=(p:AuthenticatedCommercialPreparationV3)=>'EXECUTE_PRIVATE_A02_SET_'+p.assessment.fullSetFingerprint;
/** No acquisition authority is execution authority. Synthetic and real are
 * reported distinctly; this consumer is NOT intent-role-policy or Golden. */
export function executeAuthenticatedCommercialV3(p:AuthenticatedCommercialPreparationV3,authorization:string){
 if(!isAuthenticatedCommercialPreparationV3(p))throw Error('ISSUED_PREPARATION_REQUIRED');
 if(authorization!==commercialExecutionAuthorizationV3(p))throw Error('SEPARATE_EXECUTION_AUTHORIZATION_REQUIRED');
 const counts={v2Evaluations:0,v3Constructions:0,bindingCreations:0,shadowRuns:0,replayVerifications:0};
 const base={origin:p.facts.origin,target:'INDEPENDENT_A02_SHADOW_ONLY',qualifiedProperties:p.assessment.distinctQualifiedProperties,fullSetFingerprint:p.assessment.fullSetFingerprint,counts,goldenAdmission:false,publicActivation:false};
 if(p.assessment.status!=='PREPARED_PILOT_SET')return {...base,status:p.assessment.status,decision:null,shadow:null};
 const input=authenticatedDecisionInputV3(p);counts.v2Evaluations++;
 const runtime=buildSmartStayFrontendRuntimeV2(input);
 const decision=adaptV2SearchResultToDecisionV3({searchInput:runtime.searchInput,result:runtime.result});counts.v3Constructions++;
 const comparable=createIndependentV3ComparableDecisionV3(decision,runtime.result.recommendationRoles.bestChoiceHotelId);
 if(comparable.status!=='recommended')return {...base,status:'COMPARISON_EXECUTED_ABSTAINED',decision,comparable,shadow:null};
 try{
  const evidence=createBoundAuthenticatedCommercialV3({prepared:p,decision,comparable,searchInput:runtime.searchInput});counts.bindingCreations++;
  counts.shadowRuns++;
  const days=(Date.parse(p.facts.scenario.checkin)-Date.parse(p.facts.offers[0].observed!.time.evaluatedAt))/86400000;
  const nights=input.nights!;
  const shadow=runIndependentDecisionShadowV3({mode:'shadow',comparisonToken:p.assessment.fullSetFingerprint,segment:{destination:'mixed',leadTime:days<=7?'same-week':days<=30?'short':days<=90?'medium':days<=180?'long':'very-long',duration:nights===1?'one-night':nights<4?'short-stay':nights<8?'medium-stay':nights<15?'long-stay':'extended-stay',coverage:'unknown',profile:'balanced'},searchInput:runtime.searchInput,publicV2Result:runtime.result,publicRateEvidence:evidence,
   onDecisionConstructed:()=>counts.v3Constructions++,onReplayVerified:()=>counts.replayVerifications++});
  const o=shadow.shadowObservation,success=o?.recordType==='shadow-comparison'&&o.safety.publicRateConsistency==='verified'&&o.safety.deterministicReplay==='pass'&&o.safety.priceIntegrity==='pass'&&o.safety.hardConstraints==='pass'&&o.safety.recommendationSafety==='pass'&&o.safety.commercialFirewall==='pass'&&o.safety.privacyFirewall==='pass';
  return {...base,status:success?'COMPARISON_EXECUTED_RECOMMENDED':'EXECUTED_BUT_BINDING_OR_SAFETY_FAILED',decision,comparable,evidence,shadow};
 }catch(e){return {...base,status:'EXECUTED_BUT_BINDING_OR_SAFETY_FAILED',decision,comparable,shadow:null,error:e instanceof Error?e.message:'BINDING_FAILED'};}
}
