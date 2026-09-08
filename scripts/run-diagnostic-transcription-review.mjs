import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, existsSync, lstatSync, realpathSync, mkdirSync, readdirSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, sha256, json, initialReview, fingerprint, applyReview, reviewView } from './diagnostic-transcription-review-v1.mjs';
import { renderProspectiveAssistedReviewHtmlV3 } from './prospective-assisted-review-ui.mjs';

const fail = code=>{throw Error(code);};
export function safePath(root,path) {
  const base=resolve(root), full=resolve(base,path), rel=relative(base,full);
  if (!rel || rel==='..' || rel.startsWith('..'+sep) || isAbsolute(rel)) fail('REVIEW_PATH_OUTSIDE_ROOT');
  for(let p=full;;p=dirname(p)){if(existsSync(p)&&lstatSync(p).isSymbolicLink())fail('REVIEW_LINK_REJECTED');if(p===dirname(p))break;}
  return full;
}
export function verifyMaterials(packetPath,packetHash) {
  const bytes=readFileSync(packetPath); if(sha256(bytes)!==packetHash)fail('REVIEW_PACKET_HASH_MISMATCH');
  const packet=JSON.parse(bytes),root=dirname(packetPath);
  for(const proof of packet.proofs||[])if(sha256(readFileSync(safePath(root,proof.path)))!==proof.sha256)fail('REVIEW_PROOF_HASH_MISMATCH');
  for(const file of packet.sourceFiles||[])if(sha256(readFileSync(safePath(root,file.path)))!==file.sha256)fail('REVIEW_ORIGINAL_HASH_MISMATCH');
  return packet;
}
export function verifyCode(path,expected) {
  const bytes=readFileSync(path);if(sha256(bytes)!==expected)fail('REVIEW_CODE_MANIFEST_CHANGED');
  const manifest=JSON.parse(bytes),root=dirname(path);
  const required=['scripts/run-diagnostic-transcription-review.mjs','scripts/diagnostic-transcription-review-v1.mjs','scripts/prospective-assisted-review-ui.mjs','scripts/invoke-diagnostic-transcription-review.ps1'];
  if(required.some(path=>!manifest.files.some(f=>f.path===path)))fail('REVIEW_CODE_MANIFEST_INCOMPLETE');
  for(const file of manifest.files)if(sha256(readFileSync(safePath(root,file.path)))!==file.sha256)fail('REVIEW_CODE_CHANGED');
  if(realpathSync(join(root,'scripts/run-diagnostic-transcription-review.mjs'))!==realpathSync(fileURLToPath(import.meta.url)))fail('REVIEW_EXECUTED_COPY_NOT_BOUND');
  if(sha256(readFileSync(process.execPath))!==manifest.nodeSha256)fail('REVIEW_RUNTIME_CHANGED');
}
function exclusive(path,value){
  if(existsSync(path))fail('REVIEW_OVERWRITE_FORBIDDEN');const temp=path+'.'+randomUUID()+'.pending',fd=openSync(temp,'wx');
  try{writeFileSync(fd,json(value));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(temp,path);
}
export async function startReview({packet,codeHash,progressRoot,materialRoot,repoRoot,port=0}) {
  let state=initialReview(packet,codeHash);
  const root=resolve(progressRoot),repo=resolve(repoRoot);
  if(root===repo || root.startsWith(repo+sep) || root===resolve(materialRoot) || !root.includes('transcription-progress'))fail('REVIEW_PROGRESS_ROOT_INVALID');
  safePath(dirname(root),root);
  const existing=existsSync(root);if(!existing)mkdirSync(root,{recursive:true});
  const lock=join(root,'.owner.lock');let lockFd;
  try{lockFd=openSync(lock,'wx');}catch{fail('REVIEW_PROGRESS_ALREADY_OPEN_OR_INTERRUPTED');}
  const release=()=>{if(lockFd!==undefined){closeSync(lockFd);lockFd=undefined;unlinkSync(lock);}};
  try{
    const names=readdirSync(root).filter(name=>name!=='.owner.lock').sort();
    for(const [index,name] of names.entries()) {
      if(name!==String(index+1).padStart(8,'0')+'.json')fail('REVIEW_HISTORY_INCOMPLETE');
      const event=JSON.parse(readFileSync(safePath(root,name),'utf8'));
      const {eventHash,...body}=event;
      if(sha256(json(body))!==eventHash||event.previousHash!==state.lastEventHash||event.packetHash!==state.packetHash||event.codeHash!==codeHash||event.ordinal!==index+1)fail('REVIEW_HISTORY_BINDING_INVALID');
      state=applyReview(state,event.action,packet);state.lastEventHash=eventHash;
    }
  }catch(error){release();throw error;}
  const csrf=randomBytes(32).toString('hex'); let origin;
  const server=createServer(async(req,res)=>{
    const reply=(status,value,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(type==='application/json'?json(value):value);};
    try{
      if(req.headers.host!==origin.slice(7)||req.headers.origin&&req.headers.origin!==origin)fail('REVIEW_ORIGIN_REJECTED');
      if(req.method==='GET'&&req.url==='/'){const html=renderProspectiveAssistedReviewHtmlV3({transcriptionOnly:true}).replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta name="demo-csrf" content="${csrf}">`);return reply(200,html,'text/html; charset=utf-8');}
      if(req.method==='GET'&&req.url==='/api/state')return reply(200,reviewView(packet,state));
      if(req.method==='GET'&&req.url.startsWith('/api/proof/')){
        const proof=packet.proofs.find(p=>req.url===`/api/proof/${packet.caseId}/${p.ref}`);if(!proof)fail('REVIEW_PROOF_NOT_FOUND');
        const bytes=readFileSync(safePath(materialRoot,proof.path));if(sha256(bytes)!==proof.sha256)fail('REVIEW_PROOF_HASH_MISMATCH');
        return reply(200,bytes,/\.png$/i.test(proof.path)?'image/png':'image/jpeg');
      }
      if(req.method!=='POST'||req.headers['x-demo-csrf']!==csrf||!['/api/action','/api/stop'].includes(req.url))fail('REVIEW_ROUTE_NOT_AUTHORIZED');
      let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>128*1024)fail('REVIEW_REQUEST_TOO_LARGE');}
      const action=JSON.parse(text);
      if(req.url==='/api/stop'){reply(200,{status:'STOPPED',custodyCreated:false});server.close();return;}
      // No await between binding validation and atomic append: concurrent clients serialize here.
      const next=applyReview(state,action,packet);
      const body={schemaVersion:VERSION,ordinal:next.revision,packetHash:state.packetHash,codeHash,previousHash:state.lastEventHash,recordedAt:new Date().toISOString(),actor:packet.mode==='SYNTHETIC_TEST'?'SYNTHETIC_TEST':'LOCAL_HUMAN_TRANSCRIPTION',action};
      const eventHash=sha256(json(body));exclusive(join(root,String(next.revision).padStart(8,'0')+'.json'),{...body,eventHash});
      next.lastEventHash=eventHash;state=next;reply(200,reviewView(packet,state));
    }catch(error){const stale=error.message==='DEMO_DISPLAYED_VERSION_STALE';reply(stale?409:400,{error:stale?error.message:'REVIEW_OPERATION_REJECTED',message:stale?'I dati o i progressi sono cambiati. Rileggi la versione aggiornata prima di confermare.':'Operazione rifiutata. Nessuna conferma di salvataggio; conserva i progressi e controlla il report tecnico.'});}
  });
  server.on('close',release);
  try{await new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,'127.0.0.1',ok);});}catch(error){release();throw error;}
  origin=`http://127.0.0.1:${server.address().port}`;
  return {origin,csrf,server,close:()=>new Promise((ok,bad)=>server.close(error=>error?bad(error):ok())),getState:()=>structuredClone(state)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const options={};for(const arg of process.argv.slice(2)){const match=/^--([A-Za-z][A-Za-z0-9]*)=(.*)$/s.exec(arg);if(!match||options[match[1]]!==undefined)fail('REVIEW_ARGUMENT_INVALID');options[match[1]]=match[2];}
    const allowed=['Mode','Packet','PacketSha256','CodeManifest','CodeManifestSha256','ProgressRoot','RepositoryRoot'];if(Object.keys(options).some(k=>!allowed.includes(k))||!['Start','Inspect'].includes(options.Mode))fail('REVIEW_ARGUMENT_INVALID');
    verifyCode(options.CodeManifest,options.CodeManifestSha256);
    const packet=verifyMaterials(options.Packet,options.PacketSha256);initialReview(packet,options.CodeManifestSha256);
    if(options.Mode==='Inspect')console.log(json({status:'READY_FOR_TRANSCRIPTION_ONLY',caseId:packet.caseId,mode:packet.mode,alternativeCount:packet.alternatives.length,screenshotCount:packet.proofs.length,humanReview:'PENDING',custodyCreated:false,judgmentsEnabled:false}));
    else{
      const running=await startReview({packet,codeHash:options.CodeManifestSha256,progressRoot:options.ProgressRoot,materialRoot:dirname(options.Packet),repoRoot:options.RepositoryRoot});
      console.log('TRANSCRIPTION_REVIEW_URL='+running.origin);console.log('DIAGNOSTIC_ONLY; nessun giudizio, importazione o custodia. Apri soltanto questo indirizzo locale.');
      for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>running.server.close());
    }
  }catch(error){console.error(/^(REVIEW_|DEMO_)[A-Z_]+$/.test(error.message)?error.message:'REVIEW_START_FAILED_NO_PRIVATE_CONTENT_LOGGED');process.exitCode=1;}
}
