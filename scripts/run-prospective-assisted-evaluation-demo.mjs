import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, renameSync } from 'node:fs';
import { resolve, join, relative, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderProspectiveAssistedReviewHtmlV3 } from './prospective-assisted-review-ui.mjs';
import { prepareSyntheticCustody } from './prospective-assisted-synthetic-custody.mjs';
import { demoSha256, writeDemoExclusive, assertSyntheticDemoRoot, sealSyntheticScenario,
  openSyntheticObservation, verifySyntheticSequence, appendSyntheticEvent, loadSyntheticEvents,
  syntheticTreeInventory, verifySyntheticCompiledTree } from './prospective-assisted-durable-demo.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const fail = message => { throw Error(message); };
const read = path => JSON.parse(readFileSync(path, 'utf8'));
function child(root,path){const p=relative(resolve(root),resolve(path));if(!p||p==='..'||p.startsWith(`..${sep}`)||isAbsolute(p))fail('DEMO_PATH_OUTSIDE_SYNTHETIC_CASE');return path;}
const command = args => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  if (r.error || r.status !== 0) fail('DEMO_GIT_PREFLIGHT_FAILED');
  return r.stdout.trim();
};
function verifyCode(o) {
  if (!o.ExpectedBranch || !/^[a-f0-9]{40}$/.test(o.ExpectedHead??'') || !o.CodeInventoryPath || !/^[a-f0-9]{64}$/.test(o.CodeInventorySha256??'')) fail('DEMO_EXPLICIT_CHECKPOINT_REQUIRED');
  // DETACHED is an explicit checkpoint value for clean CI checkouts, never an
  // inferred fallback. Existing progress retains its original binding.
  const branch=command(['branch','--show-current'])||'DETACHED';
  if (command(['rev-parse','HEAD']) !== o.ExpectedHead || branch !== o.ExpectedBranch || command(['diff','--cached','--name-only']) !== '') fail('DEMO_REPOSITORY_CHECKPOINT_CHANGED');
    if (demoSha256(readFileSync(o.CodeInventoryPath)) !== o.CodeInventorySha256) fail('DEMO_CODE_INVENTORY_CHANGED');
    const inventory = read(o.CodeInventoryPath);
  if(inventory.version!=='stayopti.synthetic.demo-code-inventory@2'||inventory.expectedBranch!==o.ExpectedBranch||inventory.expectedHead!==o.ExpectedHead||!Array.isArray(inventory.codeFiles)||!inventory.codeFiles.length)fail('DEMO_INVENTORY_CHECKPOINT_MISMATCH');
  for (const file of inventory.codeFiles) if (demoSha256(readFileSync(child(ROOT,join(ROOT,file.path)))) !== file.sha256) fail('DEMO_EXECUTABLE_CHANGED');
  if(inventory.sourceFingerprint!==runtimeSourceFingerprint())fail('DEMO_EXECUTABLE_CHANGED');
  return {branch:o.ExpectedBranch,head:o.ExpectedHead,inventorySha256:o.CodeInventorySha256};
}
function compile(root) {
  const output = join(root, 'compiled');
  mkdirSync(output);
  const r = spawnSync(process.execPath, [join(ROOT,'node_modules/typescript/bin/tsc'),'-p',join(ROOT,'tsconfig.tests.json'),'--outDir',output], { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 8*1024*1024 });
  if (r.error || r.status !== 0) fail('DEMO_CANONICAL_COMPILATION_FAILED');
  writeDemoExclusive(join(output,'package.json'), { type: 'commonjs' });
  return output;
}
const moduleFrom = compiled => createRequire(import.meta.url)(join(compiled,'src/engine-v3/evaluation/prospectiveAssistedEvaluationV3.js'));
function runtimeSourceFingerprint(){
  // A resumed compiled tree must belong to the same source, not merely be an
  // internally intact cache left over from an earlier implementation.
  const files=['src','scripts'].flatMap(directory=>syntheticTreeInventory(join(ROOT,directory)).map(f=>({path:`${directory}/${f.path}`,sha256:f.sha256})));
  for(const path of ['tsconfig.tests.json','package.json','package-lock.json'])files.push({path,sha256:demoSha256(readFileSync(join(ROOT,path)))});
  return demoSha256(JSON.stringify(files));
}

// Populated only with the fixed two synthetic fixtures. No archive/private-root
// parameter is accepted from the UI and no real-import route exists.
function buildCase(root, domain, count) {
  const id = `SYNTHETIC_CASE_${count}`; const caseRoot = join(root,id); mkdirSync(caseRoot);
  const frozenAt = new Date().toISOString();
  const template = domain.createSyntheticProspectiveAssistedPlanV3(count, frozenAt);
  const seal = sealSyntheticScenario(caseRoot, template.scenario, template.selection);
  const observation = openSyntheticObservation(caseRoot, seal.sha256);
  const input = domain.createSyntheticProspectiveAssistedInputV3(count, { frozenAt, observedAt: observation.openedAt, sessionId: id });
  // The offer generator is first called after the persisted acknowledgment.
  // This is local sequence proof, not trusted independent capture time.
  const observations = input.alternatives.map(a => ({ alternativeId:a.alternativeId, observedAt:observation.openedAt, source:'SYNTHETIC_LOCAL_PROCESS_CLOCK' }));
  const custody = prepareSyntheticCustody({ syntheticOnly:true,root:caseRoot,repoRoot:ROOT,caseId:id,
    scenarioSealPath:seal.path,scenarioSealHash:seal.sha256,alternatives:input.alternatives,observations });
  const binding = { scenarioSealSha256:seal.sha256,observationReceiptSha256:observation.sha256,
    descriptorSha256:demoSha256(readFileSync(custody.descriptorPath)),dataMapSha256:demoSha256(readFileSync(custody.dataMapPath)),
    reviewReceiptSha256:demoSha256(readFileSync(custody.reviewReceiptPath)),custodyProofSha256:demoSha256(readFileSync(custody.integrityProofPath)) };
  input.sourceBindings={archiveSha256:demoSha256(readFileSync(custody.archivePath)),descriptorSha256:binding.descriptorSha256,
    dataMapSha256:binding.dataMapSha256,reviewReceiptSha256:binding.reviewReceiptSha256,codeManifestSha256:demoSha256(readFileSync(custody.codeManifestPath))};
  input.evidence=[];
  const log=custody.artifactBindings.find(a=>a.kind==='CAPTURE_LOG'||a.archiveEntryPath.endsWith('/capture-log.json'));
  for(const alternative of input.alternatives){
    const timeRef=`EVIDENCE_${alternative.alternativeId}_TIME`;
    input.evidence.push({evidenceRef:timeRef,alternativeId:alternative.alternativeId,sha256:log.originalSha256,capturedAt:observation.openedAt,captureTimeSourceRef:timeRef,kind:'SYNTHETIC_CAPTURE_LOG'});
    for(const proof of custody.proofFiles.filter(p=>p.alternativeId===alternative.alternativeId)){
      const ref=`EVIDENCE_${proof.proofRef}`;
      input.evidence.push({evidenceRef:ref,alternativeId:alternative.alternativeId,sha256:proof.sha256,capturedAt:observation.openedAt,captureTimeSourceRef:timeRef,kind:'SYNTHETIC_SCREENSHOT'});
      for(const field of proof.fieldKeys)alternative.fields[field].evidenceRefs=[ref];
    }
  }
  domain.createProspectiveAssistedSessionV3(input);
  // Keep the real D-0037 synthetic diagnostic receipt separate from the later
  // interactive review. The bridge binding is checked again on every reopen.
  writeDemoExclusive(join(caseRoot,'d0037-bridge.json'), { binding,custody,synthetic:true });
  writeDemoExclusive(join(caseRoot,'input.json'),input);
  writeDemoExclusive(join(caseRoot,'input-integrity.json'),{sha256:demoSha256(readFileSync(join(caseRoot,'input.json')))});
  writeDemoExclusive(join(caseRoot,'ready.json'),{status:'SYNTHETIC_READY',binding});
  return id;
}
function caseState(root, domain, id) {
  if (!['SYNTHETIC_CASE_5','SYNTHETIC_CASE_8'].includes(id)) fail('DEMO_CASE_NOT_ALLOWLISTED');
  const p=join(root,id); const sequence=verifySyntheticSequence(p); const bridge=read(join(p,'d0037-bridge.json'));
  if(read(join(p,'ready.json')).status!=='SYNTHETIC_READY' || bridge.binding.scenarioSealSha256!==sequence.sealHash || bridge.binding.observationReceiptSha256!==demoSha256(readFileSync(join(p,'observation-open.json')))) fail('DEMO_NOT_READY');
  for(const [key,path] of [['descriptorSha256',bridge.custody.descriptorPath],['dataMapSha256',bridge.custody.dataMapPath],['reviewReceiptSha256',bridge.custody.reviewReceiptPath],['custodyProofSha256',bridge.custody.integrityProofPath]]) if(demoSha256(readFileSync(child(p,path)))!==bridge.binding[key]) fail('DEMO_CUSTODY_BINDING_CHANGED');
  if(demoSha256(readFileSync(join(p,'input.json')))!==read(join(p,'input-integrity.json')).sha256)fail('DEMO_INPUT_CHANGED');
  for(const file of bridge.custody.sessionInventory){const path=child(p,join(bridge.custody.sessionRoot,file.path));if(demoSha256(readFileSync(path))!==file.sha256)fail('DEMO_SYNTHETIC_CUSTODY_CHANGED');}
  const input=read(join(p,'input.json'));
  for(const [key,path] of [['archiveSha256',bridge.custody.archivePath],['codeManifestSha256',bridge.custody.codeManifestPath]]) if(demoSha256(readFileSync(child(p,path)))!==input.sourceBindings[key])fail('DEMO_SOURCE_BINDING_CHANGED');
  const events=loadSyntheticEvents(p);
  if(domain.fingerprintProspectiveAssistedV3(input.scenario)!==domain.fingerprintProspectiveAssistedV3(sequence.seal.scenario)||domain.fingerprintProspectiveAssistedV3(input.selection)!==domain.fingerprintProspectiveAssistedV3(sequence.seal.selection))fail('DEMO_PLAN_INPUT_MISMATCH');
  const state=domain.replayProspectiveAssistedEventsV3(input,events);
  return {root:p,state,bridge};
}

// The UI adapter below translates the typed canonical model without weakening
// validation. Its public response excludes engine suggestions and private IDs.
const labels={totalStayPriceMinorUnits:'Totale soggiorno (centesimi EUR)',payNowMinorUnits:'Pagamento subito (centesimi)',payAtPropertyMinorUnits:'Pagamento in struttura (centesimi)',taxInclusionStatement:'Dicitura osservata sulle tasse',taxBreakdown:'Scomposizione fiscale',rating:'Rating pubblicato',ratingScale:'Scala del rating',reviewCount:'Numero recensioni',distanceMeters:'Distanza numerica dal riferimento (metri)',locationText:'Posizione testuale verificata',category:'Categoria',room:'Camera e ospiti',mealPlan:'Trattamento',cancellation:'Cancellazione e scadenza',refundability:'Rimborsabilità',amenities:'Servizi documentati',availability:'Disponibilità osservata'};
function viewCase(item,domain) {
  const {state,bridge}=item;
  const explicitExposure=state.events.some(r=>r.event.type==='RECORD_EXPOSURE'&&r.event.reviewerId==='SYNTHETIC_REVIEWER_MATTIA');
  const eligibility=domain.validateProspectiveAssistedSessionV3(state);
  let comparison=null;
  if(eligibility.eligible&&eligibility.transcriptReviewed){
    const projection=domain.createProspectiveAssistedComparisonV3(state);
    comparison={...projection.publicView,alternatives:projection.publicView.alternatives.map(a=>({...a,selectionId:projection.privateMapping.find(p=>p.label===a.label).alternativeId}))};
  }
  return { caseId:state.input.sessionId,scenario:state.input.scenario,
    temporal:{collectionWindow:state.input.collectionWindow,timezone:state.input.scenario.timezone,
      clockAssurance:'LOCAL_PROCESS_ONLY_NOT_INDEPENDENT_TIME_CERTIFICATION',
      alternatives:state.input.alternatives.map(a=>({alternativeId:a.alternativeId,observedAt:a.observedAt,observedLocalDateTime:a.observedLocalDateTime,leadTimeCalendarDays:domain.prospectiveAssistedLeadTimeDaysV3(a.observedAt,state.input.scenario.checkIn,state.input.scenario.timezone)})),
      importedAt:bridge.custody.integrityProof.importedAt,custodyStartedAt:bridge.custody.integrityProof.custodyStartedAt,expiresAt:bridge.custody.integrityProof.expiresAt},
    acquisition:state.input.acquisition,provenanceNotice:'Tutti i valori sono simulati: VERIFIED non certifica un browser o una raccolta reali.',
    alternatives:state.input.alternatives.map(a=>({id:a.alternativeId,label:a.alternativeId,
      fields:Object.entries(a.fields).map(([key,value])=>({key,label:labels[key]??key,value:{...value,evidenceRefs:value.evidenceRefs.map(r=>r.replace(/^EVIDENCE_/,'')),reason:value.unknownReason},critical:domain.PROSPECTIVE_ASSISTED_CRITICAL_FIELDS_V3?.includes(key)??false,
        reviewStatus:({CONFIRMED:'CORRECT',NOT_VERIFIABLE:'UNVERIFIABLE'})[state.fieldReviews?.[`${a.alternativeId}.${key}`]?.status]??'PENDING'})),
      proofs:bridge.custody.proofFiles.filter(p=>p.alternativeId===a.alternativeId).map(p=>({ref:p.proofRef,url:`/api/proof/${state.input.sessionId}/${p.proofRef}`,fieldKeys:p.fieldKeys}))})),
    reviewConfirmed:state.reviewedFingerprint!==null,exposure:explicitExposure?{knownData:state.exposures.SYNTHETIC_REVIEWER_MATTIA.caseDataSeen,recognizesCase:state.exposures.SYNTHETIC_REVIEWER_MATTIA.caseRecognized,knowsEngineAdvice:state.exposures.SYNTHETIC_REVIEWER_MATTIA.engineRecommendationSeen}:null,
    judgments:state.judgments,invalidatedJudgmentIds:state.invalidatedJudgmentIds,currentJudgmentValid:state.judgments.some(j=>!state.invalidatedJudgmentIds.includes(j.judgment.judgmentId)),
    revision:state.revision,contentFingerprint:domain.prospectiveAssistedContentFingerprintV3(state.input),eligibility,comparison,synthetic:true };
}
function applyAction(item,action,domain) {
  const state=item.state;
  // The client must identify the version it actually displayed. Never repair
  // a stale binding with the newer server state, even for a field approval or
  // exposure declaration. This check precedes every event/directory write.
  if(!Number.isSafeInteger(action.expectedRevision)||action.expectedRevision<0||typeof action.contentFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(action.contentFingerprint))fail('DEMO_DISPLAYED_BINDING_REQUIRED');
  if(action.expectedRevision!==state.revision||action.contentFingerprint!==domain.prospectiveAssistedContentFingerprintV3(state.input))fail('DEMO_DISPLAYED_VERSION_STALE');
  const base={eventId:`SYNTHETIC_EVENT_${randomUUID().replaceAll('-','').toUpperCase()}`,at:new Date().toISOString(),expectedRevision:action.expectedRevision};
  let event;
  if(action.type==='REVIEW_FIELD') {
    const field=state.input.alternatives.find(a=>a.alternativeId===action.alternativeId)?.fields[action.fieldKey];if(!field)fail('DEMO_FIELD_UNKNOWN');
    if(action.reviewStatus==='UNVERIFIABLE'&&field.status==='KNOWN'){
      const correction={...base,type:'CORRECT_FIELD',alternativeId:action.alternativeId,field:action.fieldKey,value:{...field,status:'UNKNOWN',value:null,reliability:'UNKNOWN',unknownReason:'REVIEWER_COULD_NOT_VERIFY'},reasonCode:'EVIDENCE_NOT_DOCUMENTED'};
      const review={...base,eventId:`SYNTHETIC_EVENT_${randomUUID().replaceAll('-','').toUpperCase()}`,expectedRevision:action.expectedRevision+1,type:'REVIEW_FIELD',alternativeId:action.alternativeId,field:action.fieldKey,status:'NOT_VERIFIABLE',reviewerId:'SYNTHETIC_REVIEWER_MATTIA'};
      // One explicit "Non verificabile" action on the displayed known value:
      // validate both internal transitions before persistence. The second
      // revision belongs to this compound operation, not a rebased client.
      domain.transitionProspectiveAssistedSessionV3(domain.transitionProspectiveAssistedSessionV3(state,correction),review);
      const corrected=appendSyntheticEvent(item.root,state,correction,domain.transitionProspectiveAssistedSessionV3);
      return appendSyntheticEvent(item.root,corrected,review,domain.transitionProspectiveAssistedSessionV3);
    }
    event={...base,type:action.type,alternativeId:action.alternativeId,field:action.fieldKey,status:({CORRECT:'CONFIRMED',UNVERIFIABLE:'NOT_VERIFIABLE'})[action.reviewStatus],reviewerId:'SYNTHETIC_REVIEWER_MATTIA'};
  }
  else if(action.type==='CORRECT_FIELD') {const before=state.input.alternatives.find(a=>a.alternativeId===action.alternativeId)?.fields[action.fieldKey];if(!before)fail('DEMO_FIELD_UNKNOWN');event={...base,type:action.type,alternativeId:action.alternativeId,field:action.fieldKey,value:{status:action.value.status,value:action.value.value,reliability:action.value.status==='UNKNOWN'?'UNKNOWN':before.reliability==='UNKNOWN'?'MEDIUM':before.reliability,evidenceRefs:before.evidenceRefs,unknownReason:action.value.status==='UNKNOWN'?(action.value.reason??'NOT_DOCUMENTED'):null},reasonCode:'TRANSCRIPTION_CORRECTION'};}
  else if(action.type==='CONFIRM_REVIEW') {if(action.confirmed!==true)fail('DEMO_CONFIRMATION_REQUIRED');event={...base,type:action.type,reviewerId:'SYNTHETIC_REVIEWER_MATTIA',contentFingerprint:action.contentFingerprint};}
  else if(action.type==='RECORD_EXPOSURE') event={...base,type:action.type,reviewerId:'SYNTHETIC_REVIEWER_MATTIA',exposure:{caseDataSeen:action.exposure.knownData,caseRecognized:action.exposure.recognizesCase,engineRecommendationSeen:action.exposure.knowsEngineAdvice}};
  else if(action.type==='RECORD_JUDGMENT') {
    const j=action.judgment;
    event={...base,type:action.type,judgment:{judgmentVersion:'stayopti.v3.prospective-assisted-judgment@1',judgmentId:`SYNTHETIC_JUDGMENT_${randomUUID().replaceAll('-','').toUpperCase()}`,sessionId:state.input.sessionId,contentFingerprint:action.contentFingerprint,evaluatorPseudonym:'SYNTHETIC_REVIEWER_MATTIA',evaluatorClass:'HUMAN_SIMULATION',choice:j.outcome==='NONE_ADEQUATE'?'NO_GOOD_OPTION':j.outcome,selectedAlternativeIds:j.selectedAlternativeIds,confidence:j.confidence,reasonCodes:[j.reasonCode],consentVersion:'synthetic-demo-not-human-consent@1',createdAtBucket:base.at.slice(0,7),blockingField:j.blockingField||null}};
  }
  else fail('DEMO_ACTION_NOT_ALLOWLISTED');
  return appendSyntheticEvent(item.root,state,event,domain.transitionProspectiveAssistedSessionV3);
}

export async function runProspectiveAssistedDemo(options) {
  if(!/^5\.1\./.test(options.PowerShellVersion??'')) fail('DEMO_PS51_LAUNCHER_REQUIRED');
  if(!['Start','PrepareOnly','Inspect'].includes(options.Mode))fail('DEMO_MODE_REQUIRED');
  const checkpoint=verifyCode(options); const root=assertSyntheticDemoRoot(options.DataRoot);
  const sourceFingerprint=runtimeSourceFingerprint();
  const validateConfig=config=>{
    if(config.version!=='stayopti.synthetic.assisted-demo@2'||config.synthetic!==true||JSON.stringify(config.checkpoint)!==JSON.stringify(checkpoint)||config.head!==options.ExpectedHead)fail('DEMO_CONFIG_CHANGED');
    if(config.sourceFingerprint!==sourceFingerprint)fail('DEMO_SOURCE_CHANGED_SINCE_PREPARATION');
    if(resolve(config.compiled)!==join(root,'compiled'))fail('DEMO_COMPILED_PATH_INVALID');
    verifySyntheticCompiledTree(config.compiled,config.compiledFiles);
  };
  // Rejection precedes mkdir, process-lock recovery and every progress write.
  if(existsSync(join(root,'demo.json')))validateConfig(read(join(root,'demo.json')));
  if(!existsSync(root)){if(options.Mode==='Inspect')fail('DEMO_NOT_FOUND');mkdirSync(root);}
  const lock=join(root,'active-process.json');
  if(existsSync(lock)){
    const previous=read(lock);if(previous.synthetic!==true||!Number.isSafeInteger(previous.pid)||previous.pid<1)fail('DEMO_INVALID_PROCESS_LOCK');
    let absent=false;try{process.kill(previous.pid,0);}catch(e){if(e.code==='ESRCH')absent=true;else fail('DEMO_PROCESS_STATE_UNCERTAIN');}
    if(!absent)fail('DEMO_ALREADY_OPEN_OR_INTERRUPTED');
    // Preserve the abandoned lock as a recovery fact. Never infer a live owner
    // is dead from time elapsed, and never discard an incomplete event.
    renameSync(lock,join(root,`recovered-process-${randomUUID()}.json`));
  }
  writeDemoExclusive(lock,{pid:process.pid,synthetic:true});
  let server;
  try {
    let config;
    if(!existsSync(join(root,'demo.json'))){
      if(options.Mode==='Inspect'||readdirSync(root).length!==1)fail('DEMO_INCOMPLETE_PREPARATION');
      const compiled=compile(root); const compiledFiles=syntheticTreeInventory(compiled);
      verifySyntheticCompiledTree(compiled,compiledFiles);
      const domain=moduleFrom(compiled); const caseIds=[buildCase(root,domain,5),buildCase(root,domain,8)];
      if(runtimeSourceFingerprint()!==sourceFingerprint)fail('DEMO_SOURCE_CHANGED_DURING_PREPARATION');
      verifyCode(options);
      config={version:'stayopti.synthetic.assisted-demo@2',synthetic:true,compiled,compiledFiles,caseIds,head:options.ExpectedHead,checkpoint,sourceFingerprint};
      writeDemoExclusive(join(root,'demo.json'),config);
    }else config=read(join(root,'demo.json'));
    validateConfig(config);
    const domain=moduleFrom(config.compiled);
    const state=()=>({cases:config.caseIds.map(id=>viewCase(caseState(root,domain,id),domain)),selectedCaseId:config.caseIds[0],synthetic:true});
    state();
    if(options.Mode!=='Start')return{status:'PASS_SYNTHETIC_ONLY',mode:options.Mode,dataRoot:root,cases:config.caseIds.length,externalHttpRequests:0,realCustodyCertified:false};
    const csrf=randomBytes(24).toString('hex');
    server=createServer(async(req,res)=>{
      const send=(code,body,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(type==='application/json'?JSON.stringify(body):body);};
      try{
        if(req.headers.host!==`127.0.0.1:${server.address().port}`)return send(403,{error:'DEMO_LOCAL_HOST_REQUIRED'});
        if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");return send(200,renderProspectiveAssistedReviewHtmlV3().replace('</head>',`<meta name="demo-csrf" content="${csrf}"></head>`),'text/html; charset=utf-8');}
        if(req.method==='GET'&&req.url==='/api/state')return send(200,state());
        if(req.method==='POST'&&req.url==='/api/stop'){
          if(req.headers.origin!==`http://127.0.0.1:${server.address().port}`||req.headers['content-type']!=='application/json'||req.headers['x-demo-csrf']!==csrf)return send(403,{error:'DEMO_SAME_ORIGIN_REQUIRED'});
          send(200,{status:'SAVED_SYNTHETIC_ONLY'});server.close();return;
        }
        if(req.method==='GET'&&req.url?.startsWith('/api/proof/')){
          const [, , ,id,ref]=req.url.split('/');const item=caseState(root,domain,id);
          const proof=item.bridge.custody.proofFiles.find(p=>p.proofRef===ref);if(!proof)fail('DEMO_PROOF_NOT_FOUND');
          const bytes=readFileSync(child(item.root,proof.originalPath));if(demoSha256(bytes)!==proof.sha256)fail('DEMO_PROOF_CHANGED');
          return send(200,bytes,proof.mediaType);
        }
        if(req.method==='POST'&&req.url==='/api/action'){
          if(req.headers.origin!==`http://127.0.0.1:${server.address().port}`||req.headers['content-type']!=='application/json'||req.headers['x-demo-csrf']!==csrf)return send(403,{error:'DEMO_SAME_ORIGIN_REQUIRED'});
          let body='';for await(const chunk of req){body+=chunk;if(body.length>64000)fail('DEMO_REQUEST_TOO_LARGE');}
          verifyCode(options);validateConfig(config);
          const action=JSON.parse(body);applyAction(caseState(root,domain,action.caseId),action,domain);return send(200,state());
        }
        return send(404,{error:'DEMO_ROUTE_NOT_FOUND'});
      }catch(e){return send(e.message==='DEMO_DISPLAYED_VERSION_STALE'?409:400,{error:/^[A-Z0-9_: .-]{3,160}$/.test(e.message??'')?e.message:'DEMO_VALIDATION_FAILED'});}
    });
    await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
    const ready={status:'SYNTHETIC_DEMO_READY',url:`http://127.0.0.1:${server.address().port}`,dataRoot:root,externalHttpRequests:0,realDataAllowed:false};
    console.log(JSON.stringify(ready));
    if(options.onReady)options.onReady(ready,server);
    await new Promise(ok=>{server.once('close',ok);process.once('SIGINT',()=>server.close());process.once('SIGTERM',()=>server.close());});
    return {status:'STOPPED_SAVED_SYNTHETIC_ONLY',dataRoot:root};
  }finally{if(existsSync(lock)&&read(lock).pid===process.pid)unlinkSync(lock);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const options={}; for(const arg of process.argv.slice(2)){const m=/^--([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(arg);if(!m||!['Mode','DataRoot','ExpectedBranch','ExpectedHead','PowerShellVersion','CodeInventoryPath','CodeInventorySha256'].includes(m[1])||Object.hasOwn(options,m[1]))fail('DEMO_ARGUMENT_INVALID');options[m[1]]=m[2];}
  runProspectiveAssistedDemo(options).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(/^[A-Z0-9_]+$/.test(e.message)?e.message:'DEMO_CONTROLLED_FAILURE');process.exitCode=1;});
}
