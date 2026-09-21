// Versioned private stdin frame. Metadata reports the launcher source, not
// commercial validity. This module never reads the persistent credential store.
export async function readProtectedCredentialFrame(input=process.stdin){
 let text='',frame;
 try{
  for await(const chunk of input){text+=chunk.toString('utf8');if(text.length>131072)throw Error('LITEAPI_CREDENTIAL_INPUT_TOO_LARGE');}
  try{frame=JSON.parse(text);}catch{throw Error('LITEAPI_CREDENTIAL_FRAME_INVALID');}
  if(frame?.version!=='stayopti.liteapi-credential-channel@1'||frame.profile!=='Production'||frame.persistence!=='DPAPI_CURRENT_USER_PROFILE_STORE'||
   Object.keys(frame).sort().join(',')!=='credential,persistence,profile,version'||typeof frame.credential!=='string'||!frame.credential.trim()||frame.credential.length>16000||/[\x00-\x1f\x7f]/.test(frame.credential))throw Error('LITEAPI_CREDENTIAL_FRAME_INVALID');
  return {credential:frame.credential,source:'DPAPI_CURRENT_USER_PROFILE_STORE'};
 }finally{text='';if(frame)frame.credential=null;}
}
export function credentialHandlingReport(source,failureClass=null){
 const stored=source==='DPAPI_CURRENT_USER_PROFILE_STORE';
 return {credentialHandlingVersion:'stayopti.liteapi-credential-handling@1',credentialPersisted:stored,
  credentialPersistence:stored?'DPAPI_CURRENT_USER_SEPARATE_PROFILE_STORE':source==='SYNTHETIC_NO_CREDENTIAL'?'NO_CREDENTIAL_USED':'UNVERIFIED_SOURCE',
  credentialSource:source,credentialPrinted:false,credentialInAcquisitionArtifacts:false,credentialClearedFromProcess:true,
  credentialCleanupBasis:'BEST_EFFORT_MEMORY_NO_ENVIRONMENT; PERSISTENT_STORE_SEPARATE_FROM_ACQUISITION',
  credentialNextAction:['HTTP_401','HTTP_403'].includes(failureClass)?'Accesso rifiutato: verificare account e chiave, eventualmente usare Replace. Nessun retry automatico; il tentativo resta consumato.':null};
}
