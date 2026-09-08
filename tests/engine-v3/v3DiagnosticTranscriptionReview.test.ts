import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, cpSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { Script, runInNewContext } from 'node:vm';
import {createSyntheticProspectiveAssistedInputV3,createProspectiveAssistedSessionV3} from '../../src/engine-v3/evaluation/prospectiveAssistedEvaluationV3';

const ROOT=process.cwd();
const dynamicImport=new Function('path','return import(path)') as (path:string)=>Promise<any>;
const domain=()=>dynamicImport(pathToFileURL(join(ROOT,'scripts/diagnostic-transcription-review-v1.mjs')).href);
const runtime=()=>dynamicImport(pathToFileURL(join(ROOT,'scripts/run-diagnostic-transcription-review.mjs')).href);
const sha='a'.repeat(64), proofBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64');
async function fixture(root:string){
  const d=await domain();writeFileSync(join(root,'proof.png'),proofBytes);
  const proofs=[{ref:'SYNTHETIC_PROOF',path:'proof.png',sha256:d.sha256(proofBytes),label:'Prova interamente sintetica'}];
  const raw=(value:unknown,kind='OBSERVED')=>({value,kind,evidence:['SYNTHETIC_PROOF'],reason:kind==='UNKNOWN'?'Non documentato':undefined});
  const offers=Array.from({length:5},(_,i)=>({offerId:'SYNTHETIC_'+i,fields:{rating:raw({value:7.5,source:'synthetic'}),ratingScale:raw(null,'UNKNOWN'),mealPlan:raw('unknown'),displayedPrice:raw(100),completeTotal:raw(null,'UNKNOWN'),refundable:raw(false),beds:raw('divano letto'),exclusiveUse:raw(null,'UNKNOWN')}}));
  const alternatives=d.normalizeOffers(offers,['SYNTHETIC_PROOF']);for(const alt of alternatives)alt.proofs=[{ref:'SYNTHETIC_PROOF'}];
  return {schemaVersion:d.VERSION,caseId:'SYNTHETIC_TRANSCRIPTION',mode:'SYNTHETIC_TEST',classification:'DIAGNOSTIC_ONLY',humanReview:'PENDING',custodyCreated:false,sourceArchiveSha256:sha,proofs,alternatives,scenario:{destination:'Città inventata',currency:'EUR'},context:['Fixture sintetica del percorso diagnostico.'],sourceFiles:[]};
}
function clean(root:string){assert.ok(relative(tmpdir(),root).startsWith('StayOpti-Transcription-Test-'));rmSync(root,{recursive:true,force:true});}
const temporary=()=>mkdtempSync(join(tmpdir(),'StayOpti-Transcription-Test-'));

test('DT01 canonical UNKNOWN preserves reason and false/objects/numbers',async()=>{const d=await domain();for(const word of ['UNKNOWN','unknown',' UnKnOwN '])assert.equal(d.normalizeObservedField({kind:'OBSERVED',value:word,evidence:[]}).status,'UNKNOWN');for(const value of [false,0,7.7,{value:7.7,scale:null},['colazione']])assert.deepEqual(d.normalizeObservedField({kind:'OBSERVED',value,evidence:['x']}).value,value);});
test('DT02 no price, scale, bunk/sofa or exclusivity inference; aliases remain distinct',async()=>{const root=temporary();try{const d=await domain(),p=await fixture(root);assert.equal(p.alternatives[0].fields.find((f:any)=>f.key==='completeTotal').value.status,'UNKNOWN');assert.equal(p.alternatives[0].fields.find((f:any)=>f.key==='ratingScale').value.status,'UNKNOWN');assert.equal(p.alternatives[0].fields.find((f:any)=>f.key==='exclusiveUse').value.status,'UNKNOWN');assert.equal(p.alternatives[0].fields.find((f:any)=>f.key==='displayedPrice').value.value,100);const a=d.normalizeOffers([{offerId:'X',fields:{breakfast:{kind:'OBSERVED',value:{included:true},evidence:['p']},refundability:{kind:'OBSERVED',value:'testo',evidence:['p']}}}],['p']);assert.deepEqual(a[0].fields.map((f:any)=>f.key),['breakfast','refundability']);}finally{clean(root);}});
test('DT03 source references and packet scope fail closed',async()=>{const root=temporary();try{const d=await domain(),p=await fixture(root);assert.throws(()=>d.normalizeOffers([{offerId:'X',fields:{rating:{value:8,kind:'OBSERVED',evidence:['missing']}}}],['p']));for(const patch of [{classification:'GOLDEN'},{humanReview:'HUMAN_REVIEWED'},{custodyCreated:true},{mode:'SYNTHETIC'}])assert.throws(()=>d.initialReview({...p,...patch},sha));}finally{clean(root);}});
test('DT04 real mode cannot enter synthetic domain',async()=>{const oldInput=createSyntheticProspectiveAssistedInputV3(5);assert.throws(()=>createProspectiveAssistedSessionV3({...oldInput,synthetic:false} as any),/SYNTHETIC_BOUNDARY_REQUIRED/);const d=await domain(),root=temporary();try{const p=await fixture(root);p.mode='REAL_BROWSER_ASSISTED';const s=d.initialReview(p,sha);assert.equal(d.reviewView(p,s).cases[0].synthetic,false);assert.equal(d.reviewView(p,s).cases[0].eligibility.eligible,false);}finally{clean(root);}});
test('DT05 unknown confirmed stays missing; hidden fields are never approved',async()=>{const root=temporary();try{const d=await domain(),p=await fixture(root);let s=d.initialReview(p,sha);s=d.applyReview(s,{type:'REVIEW_FIELD',caseId:p.caseId,expectedRevision:0,contentFingerprint:d.fingerprint(s),alternativeId:p.alternatives[0].id,fieldKey:'completeTotal',reviewStatus:'CORRECT'},p);assert.equal(s.alternatives[0].fields.find((f:any)=>f.key==='completeTotal').value.status,'UNKNOWN');assert.equal(s.alternatives[0].fields.filter((f:any)=>f.reviewStatus==='CORRECT').length,1);assert.throws(()=>d.applyReview(s,{type:'CONFIRM_REVIEW',confirmed:true,caseId:p.caseId,expectedRevision:s.revision,contentFingerprint:d.fingerprint(s)},p));}finally{clean(root);}});
test('DT06 rendered diagnostic route has no choice/exposure form and client parses',async()=>{const {renderProspectiveAssistedReviewHtmlV3:render}=await dynamicImport(pathToFileURL(join(ROOT,'scripts/prospective-assisted-review-ui.mjs')).href);const html=render({transcriptionOnly:true});assert.doesNotMatch(html,/id="(?:judgment-form|decision-tab|save-exposure)"/);assert.match(html,/Conferme di gruppo/);assert.doesNotThrow(()=>new Script(/<script>([\s\S]*?)<\/script>/.exec(html)![1]));assert.match(render(),/id="judgment-form"/);});
test('DT07 material hashing, traversal, duplicate refs and missing proofs rejected',async()=>{const root=temporary();try{const d=await domain(),r=await runtime(),p=await fixture(root),path=join(root,'packet.json');writeFileSync(path,d.json(p));assert.throws(()=>r.verifyMaterials(path,sha));assert.throws(()=>r.safePath(root,'../other'));assert.throws(()=>d.validatePacket({...p,proofs:[...p.proofs,...p.proofs]}));writeFileSync(join(root,'proof.png'),'changed');assert.throws(()=>r.verifyMaterials(path,d.sha256(readFileSync(path))));}finally{clean(root);}});
test('DT08 actual API two clients stale review/correction/confirmation/judgment writes zero events; restart retains bound history',async()=>{
  const root=temporary();let running:any;
  try{const r=await runtime(),p=await fixture(root),progress=join(root,'transcription-progress');
    const options={packet:p,codeHash:sha,progressRoot:progress,materialRoot:root,repoRoot:ROOT};running=await r.startReview(options);
    const state=await(await fetch(running.origin+'/api/state')).json() as any,shown=state.cases[0];assert.equal(readdirSync(progress).filter(n=>n.endsWith('.json')).length,0);
    const request=(action:any)=>fetch(running.origin+'/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':running.csrf},body:JSON.stringify(action)});
    const old={caseId:p.caseId,expectedRevision:shown.revision,contentFingerprint:shown.contentFingerprint,alternativeId:p.alternatives[0].id,fieldKey:'displayedPrice'};
    assert.equal((await request({...old,type:'CORRECT_FIELD',value:{status:'KNOWN',value:110,reason:null,evidenceRefs:['SYNTHETIC_PROOF']}})).status,200);
    for(const a of [{...old,type:'REVIEW_FIELD',reviewStatus:'CORRECT'},{...old,type:'CORRECT_FIELD',value:{status:'UNKNOWN',value:null,reason:'test',evidenceRefs:['SYNTHETIC_PROOF']}},{caseId:p.caseId,expectedRevision:shown.revision,contentFingerprint:shown.contentFingerprint,type:'CONFIRM_REVIEW',confirmed:true}])assert.equal((await request(a)).status,409);
    assert.equal((await request({...old,type:'REVIEW_FIELD',reviewStatus:'CORRECT',judgment:{choice:'SELECT'}})).status,400);
    for(const type of ['RECORD_JUDGMENT','RECORD_EXPOSURE','IMPORT','GOLDEN'])assert.equal((await request({...old,type})).status,400);
    assert.equal(readdirSync(progress).filter(n=>n.endsWith('.json')).length,1);
    const after=running.getState();assert.equal(after.reviewConfirmed,false);await running.close();running=await r.startReview(options);assert.deepEqual(running.getState(),after);
    await running.close();running=null;await assert.rejects(r.startReview({...options,codeHash:'b'.repeat(64)}));
    const event=join(progress,'00000001.json');writeFileSync(event,readFileSync(event,'utf8').replace('110','111'));await assert.rejects(r.startReview(options));
  }finally{if(running)await running.close();clean(root);}
});
test('DT09 actual Windows PowerShell 5.1 launcher Start/Inspect and restart on synthetic new route', {skip:process.platform!=='win32'?'WINDOWS_POWERSHELL_51_REQUIRED':false}, async()=>{
  const root=temporary();const processes:any[]=[];
  try{const d=await domain(),p=await fixture(root);mkdirSync(join(root,'scripts'));
    const files=['run-diagnostic-transcription-review.mjs','diagnostic-transcription-review-v1.mjs','prospective-assisted-review-ui.mjs','invoke-diagnostic-transcription-review.ps1'].map(name=>{cpSync(join(ROOT,'scripts',name),join(root,'scripts',name));return{path:'scripts/'+name,sha256:d.sha256(readFileSync(join(root,'scripts',name)))};});
    const packet=join(root,'packet.json'),manifest=join(root,'code-manifest.json');writeFileSync(packet,d.json(p));writeFileSync(manifest,d.json({files,nodeSha256:d.sha256(readFileSync(process.execPath))}));
    const ps='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',args=['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(root,'scripts/invoke-diagnostic-transcription-review.ps1'),'-Packet',packet,'-PacketSha256',d.sha256(readFileSync(packet)),'-CodeManifest',manifest,'-CodeManifestSha256',d.sha256(readFileSync(manifest)),'-ProgressRoot',join(root,'transcription-progress'),'-RepositoryRoot',ROOT];
    const inspect=spawnSync(ps,[...args,'-Mode','Inspect'],{encoding:'utf8',windowsHide:true,timeout:60000});assert.equal(inspect.error,undefined);assert.equal(inspect.status,0,inspect.stderr);assert.match(inspect.stdout,/READY_FOR_TRANSCRIPTION_ONLY/);
    for(let round=0;round<2;round++){
      const child=spawn(ps,[...args,'-Mode','Start'],{windowsHide:true,stdio:['pipe','pipe','pipe']});processes.push(child);let output='',stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
      const origin=await new Promise<string>((ok,bad)=>{const timer=setTimeout(()=>bad(Error('LAUNCHER_TIMEOUT')),30000);child.on('error',bad);child.stdout.on('data',chunk=>{output+=chunk;const match=/TRANSCRIPTION_REVIEW_URL=(http:\/\/127\.0\.0\.1:\d+)/.exec(output);if(match){clearTimeout(timer);ok(match[1]);}});child.on('exit',()=>{clearTimeout(timer);bad(Error('LAUNCHER_EARLY_EXIT '+stderr));});});
      const html=await(await fetch(origin)).text(),csrf=/name="demo-csrf" content="([a-f0-9]+)"/.exec(html)![1];const state=await(await fetch(origin+'/api/state')).json() as any;assert.equal(state.cases[0].revision,round);
      if(!round){const c=state.cases[0],a=c.alternatives[0],g=a.reviewGroups.all[0];assert.equal((await fetch(origin+'/api/action',{method:'POST',headers:{'X-Demo-CSRF':csrf},body:JSON.stringify({type:'REVIEW_GROUP',caseId:c.caseId,expectedRevision:c.revision,contentFingerprint:c.contentFingerprint,alternativeId:a.id,groupId:g.id,groupPolicy:a.groupPolicy,viewFilter:'all',fieldKeys:g.fieldKeys,confirmed:true})})).status,200);}
      const ended=new Promise<number|null>(ok=>child.once('exit',ok));await fetch(origin+'/api/stop',{method:'POST',headers:{'X-Demo-CSRF':csrf},body:'{}'});assert.equal(await ended,0);assert.equal(stderr,'');
    }
  }finally{for(const p of processes)if(p.exitCode===null)p.kill();clean(root);}
});

test('DT10 proof groups are deterministic, small, exhaustive and never merge unrelated evidence',async()=>{
  const root=temporary();try{const d=await domain(),p=await fixture(root),alt=p.alternatives[0];
    alt.fields[7].value.evidenceRefs=[];
    const groups=d.reviewGroups(alt);assert.deepEqual(groups,d.reviewGroups(structuredClone(alt)));
    assert.equal(groups.flatMap((g:any)=>g.fieldKeys).length,8);assert.equal(new Set(groups.flatMap((g:any)=>g.fieldKeys)).size,8);
    for(const g of groups){assert.ok(g.fieldKeys.length<=5);for(const key of g.fieldKeys)assert.deepEqual(alt.fields.find((f:any)=>f.key===key).value.evidenceRefs,g.evidenceRefs);}
    assert.throws(()=>d.reviewGroups(alt,'hidden'));
  }finally{clean(root);}
});
test('DT11 explicit group retains UNKNOWN, values/reasons/references and only listed statuses change',async()=>{
  const root=temporary();try{const d=await domain(),p=await fixture(root),s=d.initialReview(p,sha),g=d.reviewGroups(s.alternatives[0],'critical')[0];
    const a={type:'REVIEW_GROUP',caseId:s.caseId,expectedRevision:0,contentFingerprint:d.fingerprint(s),alternativeId:s.alternatives[0].id,groupId:g.id,groupPolicy:d.GROUP_POLICY,fieldKeys:g.fieldKeys,viewFilter:'critical',confirmed:true};
    const next=d.applyReview(s,a,p);assert.deepEqual(next.alternatives.map((a:any)=>a.fields.map((f:any)=>f.value)),s.alternatives.map((a:any)=>a.fields.map((f:any)=>f.value)));
    assert.deepEqual(next.alternatives[0].fields.filter((f:any)=>f.reviewStatus==='CORRECT').map((f:any)=>f.key),g.fieldKeys);
    assert.equal(next.humanReview,'PENDING');assert.equal(next.reviewConfirmed,false);assert.equal(s.revision,0);
    for(const change of [{confirmed:false},{fieldKeys:[...g.fieldKeys,'rating']},{fieldKeys:[]},{fieldKeys:[g.fieldKeys[0],g.fieldKeys[0]]},{groupId:'fake'},{groupPolicy:'legacy'},{alternativeId:s.alternatives[1].id}])assert.throws(()=>d.applyReview(s,{...a,...change},p));
  }finally{clean(root);}
});

// Portable DOM harness executes the actual emitted client against the actual
// loopback API, not a mock of applyReview. It is not a visual-browser claim.
class ReviewElement {
  tagName:string;children:ReviewElement[]=[];parent:any=null;textContent='';value='';type='';disabled=false;checked=false;hidden=false;src='';open=false;className='';id='';dataset:any={};style:any={};attributes:any={};onclick:any=null;onchange:any=null;classes=new Set<string>();
  classList={add:(s:string)=>{this.classes.add(s);},remove:(s:string)=>{this.classes.delete(s);},contains:(s:string)=>this.classes.has(s),toggle:(s:string,force?:boolean)=>{if(force??!this.classes.has(s))this.classes.add(s);else this.classes.delete(s);}};
  constructor(tag:string){this.tagName=tag;}
  append(...els:ReviewElement[]){for(const e of els){e.parent=this;this.children.push(e);if(this.tagName==='select'&&this.children.length===1)this.value=e.value;}}
  replaceChildren(...els:ReviewElement[]){this.children=[];this.append(...els);}
  after(e:ReviewElement){if(this.parent)this.parent.append(e);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter((e:any)=>e!==this);}
  setAttribute(k:string,v:string){this.attributes[k]=v;}removeAttribute(k:string){delete this.attributes[k];if(k==='src')this.src='';}
  get childNodes(){return this.children;}get firstChild(){return this.children[0];}
  addEventListener(){}scrollIntoView(){}focus(){}close(){this.open=false;}
  querySelector(s:string){return this.querySelectorAll(s)[0]||null;}
  querySelectorAll(s:string):ReviewElement[]{return descend(this).slice(1).filter(e=>s==='section.field'?e.tagName==='section'&&e.className==='field':s==='.editor'?e.className==='editor':false);}
}
function descend(e:ReviewElement):ReviewElement[]{return[e,...e.children.flatMap(descend)];}
async function uiClient(running:any){
  const html=await(await fetch(running.origin)).text(),script=/<script>([\s\S]*?)<\/script>/.exec(html)![1],ids=new Map<string,ReviewElement>(),root=new ReviewElement('body');
  const get=(id:string)=>{const live=descend(root).find(e=>e.id===id);if(live)return live;if(!ids.has(id)){const e=new ReviewElement(id==='field-filter'?'select':'div');e.id=id;ids.set(id,e);root.append(e);}return ids.get(id)!;};get('field-filter').value='all';
  const sent:any[]=[];const context:any={URL,location:{href:running.origin+'/',origin:running.origin},document:{getElementById:get,createElement:(t:string)=>new ReviewElement(t),createTextNode:(t:string)=>Object.assign(new ReviewElement('text'),{textContent:t}),querySelector:()=>({getAttribute:()=>running.csrf}),querySelectorAll:(s:string)=>s==='button'?descend(root).filter(e=>e.tagName==='button'):s==='input,select,textarea'?descend(root).filter(e=>['input','select','textarea'].includes(e.tagName)):[]},fetch:async(path:string,options:any)=>{if(options?.body)sent.push(JSON.parse(options.body));return fetch(running.origin+path,options);}};
  const hooked=script.replace(/  load\(\);\r?\n\}\)\(\);\s*$/,"  globalThis.ui={load,renderFields,currentCase};\n})();");assert.notEqual(hooked,script);runInNewContext(hooked,context);await context.ui.load();
  return{get,sent,ui:context.ui,fields:()=>get('fields').querySelectorAll('section.field')};
}
test('DT12 real UI → API → journal confirms only filtered visible group; proof continuity and restart',async()=>{
  const root=temporary();let running:any;try{const r=await runtime(),p=await fixture(root),options={packet:p,codeHash:sha,progressRoot:join(root,'transcription-progress'),materialRoot:root,repoRoot:ROOT};running=await r.startReview(options);const c=await uiClient(running);
    c.get('field-filter').value='critical';c.get('field-filter').onchange();const shown=c.fields().map(f=>f.dataset.fieldKey);assert.deepEqual(shown,['ratingScale','mealPlan','completeTotal']);const proof=c.get('proof-image').src;assert.ok(proof.includes('/api/proof/'));
    await c.get('confirm-visible-group').onclick();assert.equal(c.sent.length,1);assert.deepEqual(c.sent[0].fieldKeys,shown);assert.equal(c.sent[0].expectedRevision,0);
    const state=running.getState();assert.deepEqual(state.alternatives[0].fields.filter((f:any)=>f.reviewStatus==='CORRECT').map((f:any)=>f.key),shown);assert.equal(c.get('proof-image').src,proof);
    const event=JSON.parse(readFileSync(join(options.progressRoot,'00000001.json'),'utf8'));assert.equal(event.actor,'SYNTHETIC_TEST');assert.deepEqual(event.action.fieldKeys,shown);assert.equal(event.action.contentFingerprint,c.sent[0].contentFingerprint);
    await running.close();running=await r.startReview(options);assert.deepEqual(running.getState(),state);const reopened=await uiClient(running);assert.equal(reopened.ui.currentCase().revision,1);
  }finally{if(running)await running.close();clean(root);}
});
test('DT13 two actual clients reject stale visible-group actions before append, without rebinding',async()=>{
  const root=temporary();let running:any;try{const r=await runtime(),p=await fixture(root);running=await r.startReview({packet:p,codeHash:sha,progressRoot:join(root,'transcription-progress'),materialRoot:root,repoRoot:ROOT});const a=await uiClient(running),b=await uiClient(running);
    await a.get('confirm-visible-group').onclick();await b.get('confirm-visible-group').onclick();assert.equal(running.getState().revision,1);assert.match(b.get('status').textContent,/non è stata salvata/);assert.equal(b.sent[0].expectedRevision,0);assert.equal(readdirSync(join(root,'transcription-progress')).filter(n=>n.endsWith('.json')).length,1);
    await b.ui.load();b.get('field-filter').value='pending';b.get('field-filter').onchange();await b.get('confirm-visible-group').onclick();assert.equal(running.getState().revision,2);assert.equal(running.getState().alternatives[0].fields.filter((f:any)=>f.reviewStatus==='CORRECT').length,8);
  }finally{if(running)await running.close();clean(root);}
});
test('DT14 client refuses hidden/removed field and open editor; API rejects forged filtered field set',async()=>{
  const root=temporary();let running:any;try{const r=await runtime(),p=await fixture(root);running=await r.startReview({packet:p,codeHash:sha,progressRoot:join(root,'transcription-progress'),materialRoot:root,repoRoot:ROOT});const c=await uiClient(running);
    c.fields()[0].hidden=true;await c.get('confirm-visible-group').onclick();assert.equal(c.sent.length,0);c.ui.renderFields(c.ui.currentCase());
    const field=c.fields()[0];descend(field).find(e=>e.textContent==='Correggi')!.onclick();await c.get('confirm-visible-group').onclick();assert.equal(c.sent.length,0);
    const s=c.ui.currentCase(),alt=s.alternatives[0],g=alt.reviewGroups.critical[0];const response=await fetch(running.origin+'/api/action',{method:'POST',headers:{'X-Demo-CSRF':running.csrf},body:JSON.stringify({type:'REVIEW_GROUP',caseId:s.caseId,expectedRevision:s.revision,contentFingerprint:s.contentFingerprint,alternativeId:alt.id,groupPolicy:alt.groupPolicy,groupId:g.id,fieldKeys:[...g.fieldKeys,'rating'],viewFilter:'critical',confirmed:true})});assert.equal(response.status,400);assert.equal(running.getState().revision,0);
  }finally{if(running)await running.close();clean(root);}
});
test('DT15 correction resets group field and complete confirmation; no assistant or judgment route',async()=>{
  const root=temporary();try{const d=await domain(),p=await fixture(root);let s=d.initialReview(p,sha);const act=(details:any)=>{s=d.applyReview(s,{caseId:s.caseId,expectedRevision:s.revision,contentFingerprint:d.fingerprint(s),...details},p);};
    for(const alt of s.alternatives)for(const g of d.reviewGroups(alt))act({type:'REVIEW_GROUP',alternativeId:alt.id,groupId:g.id,groupPolicy:d.GROUP_POLICY,viewFilter:'all',fieldKeys:g.fieldKeys,confirmed:true});
    act({type:'CONFIRM_REVIEW',confirmed:true});assert.equal(s.reviewConfirmed,true);act({type:'CORRECT_FIELD',alternativeId:s.alternatives[0].id,fieldKey:'displayedPrice',value:{status:'KNOWN',value:101,reason:null,evidenceRefs:['SYNTHETIC_PROOF']}});assert.equal(s.reviewConfirmed,false);assert.equal(s.alternatives[0].fields.find((f:any)=>f.key==='displayedPrice').reviewStatus,'PENDING');assert.throws(()=>act({type:'ASSISTANT_APPROVE_ALL'}));assert.throws(()=>act({type:'RECORD_JUDGMENT'}));
  }finally{clean(root);}
});
test('DT16 pending-group UI completes synthetic review with explicit final summary; reread/reopen preserves every event',async()=>{
  const root=temporary();let running:any;try{const r=await runtime(),p=await fixture(root),options={packet:p,codeHash:sha,progressRoot:join(root,'transcription-progress'),materialRoot:root,repoRoot:ROOT};running=await r.startReview(options);const c=await uiClient(running);
    assert.match(await(await fetch(running.origin)).text(),/<option value="pending" selected>/);
    c.get('field-filter').value='pending';c.get('field-filter').onchange();
    for(const alt of p.alternatives){c.get('alternative-picker').value=alt.id;c.get('alternative-picker').onchange();for(let group=0;group<2;group++)await c.get('confirm-visible-group').onclick();assert.equal(c.fields().length,0);}
    assert.equal(c.sent.length,10);assert.equal(running.getState().reviewConfirmed,false);
    c.get('summary').onclick();assert.equal(c.get('confirm-review').disabled,true);c.get('review-confirm').checked=true;c.get('review-confirm').onchange();assert.equal(c.get('confirm-review').disabled,false);c.get('confirm-review').onclick();
    for(let n=0;n<50&&running.getState().revision<11;n++)await new Promise(ok=>setTimeout(ok,10));
    assert.equal(running.getState().revision,11);assert.equal(running.getState().reviewConfirmed,true);
    const events=readdirSync(options.progressRoot).filter(n=>n.endsWith('.json')).sort().map(n=>JSON.parse(readFileSync(join(options.progressRoot,n),'utf8')));assert.equal(events.length,11);assert.equal(events.filter(e=>e.action.type==='REVIEW_GROUP').length,10);assert.ok(events.every(e=>e.actor==='SYNTHETIC_TEST'));assert.equal(events.flatMap(e=>e.action.fieldKeys||[]).length,40);
    const saved=running.getState();await running.close();running=await r.startReview(options);assert.deepEqual(running.getState(),saved);
  }finally{if(running)await running.close();clean(root);}
});
