import {resolve,join} from 'node:path';
import {runBoundedProfile} from './bounded-profile-execution-v1.mjs';
import {bandJournal,bandProgress,qualifyBandResponse,readAuthenticatedBandCapture} from './liteapi-band-comparison-capture-v1.mjs';
import {validateBandPlan,bandAuthorization,verifyBandInventory,loadBandFile,verifyBandEvidence,hash,same,bandFail} from './liteapi-band-comparison-plan-v1.mjs';
export async function acquireBandComparison({config,checkpoint,approval,simulation=null,syntheticProtector,verifyBeforeSend,signal}){
 const state=validateBandPlan(config),synthetic=config.origin==='SYNTHETIC_LOCAL_TRANSPORT';
 if(state.pending.length)bandFail('CONFIGURATION_PENDING');
 if(synthetic!==Boolean(simulation)||!synthetic&&(syntheticProtector||verifyBeforeSend))bandFail('PRODUCTION_INJECTION');
 let credential=approval?.credential??null;
 if(synthetic&&credential!==null)bandFail('SYNTHETIC_CREDENTIAL_INJECTION');
 if(!synthetic){
  if(!approval||approval.authorization!==bandAuthorization(config,approval.inventory)||typeof credential!=='string'||!credential.trim())bandFail('AUTHORIZATION');
  verifyBeforeSend=()=>{if(!same(loadBandFile(approval.configPath,approval.configSha256),config)||!same(loadBandFile(approval.inventoryPath,approval.inventorySha256),approval.inventory))bandFail('INPUT_CHANGED');
   if(!same(verifyBandInventory(approval.repositoryRoot,approval.inventory,checkpoint.head,checkpoint.branch),checkpoint))bandFail('CHECKPOINT_CHANGED');verifyBandEvidence(config,approval.repositoryRoot);};
 }
 if(typeof verifyBeforeSend!=='function')bandFail('BEFORE_SEND_REQUIRED');verifyBeforeSend();
 const registryRoot=resolve(config.retention.directory),input={root:join(registryRoot,'cases',config.caseId),registryRoot,caseId:config.caseId,mode:synthetic?'SYNTHETIC_ONLY':'REAL',bindingSha256:hash({config,checkpoint}),authorizationSha256:hash(synthetic?{config,checkpoint}:approval.authorization),...(syntheticProtector?{protector:syntheticProtector}:{}),context:{config:structuredClone(config),checkpoint,inventory:approval?.inventory??null}};
 const journal=bandJournal.create(input);
 let r;try{r=await runBoundedProfile({journal:{...journal,bindingSha256:input.bindingSha256},simulation,credential,signal,controls:config.controls,verifyBeforeSend,progress:records=>bandProgress(config,records),qualify:(q,r)=>qualifyBandResponse(q,r,config),fail:bandFail});}finally{credential=null;}
 const verified=readAuthenticatedBandCapture({root:input.root,registryRoot,...(syntheticProtector?{syntheticProtector}:{})});
 return {version:'stayopti.band-comparison-result@1',status:r.failureClass?'ABORTED':'COMPLETE',failureClass:r.failureClass,assessment:verified.progress,
  actualAttempts:r.receipt.attemptsReserved,counts:r.receipt.counts,transportInvocations:r.transportInvocations,localHttpRequests:r.localRequests,providerHttpRequests:synthetic?0:r.transportInvocations,
  caseDirectory:input.root,registryRoot,journalVerified:true,custodyStartedAt:r.receipt.startedAt,retentionEndsAt:new Date(Date.parse(r.receipt.startedAt)+14*86400000).toISOString(),
  retentionResponsible:config.retention.responsible,automaticDeletion:false,restartAllowed:false,engineInvocations:0,policyInvocations:0,syntheticProofOnly:synthetic,a02Production:'HOLD'};
}
