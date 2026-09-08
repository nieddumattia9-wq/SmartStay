/**
 * Synthetic, evaluation-only review surface. The loopback owner supplies all
 * state and persistence; this renderer neither opens custody nor calls engines.
 * Original proof and decision views are deliberately not labelled blind.
 */
export function renderProspectiveAssistedReviewHtmlV3(options = {}) {
  const html = String.raw`<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'self'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'">
  <title>StayOpti — prova sintetica di revisione</title>
  <style>
    :root{font-family:Segoe UI,system-ui,sans-serif;color:#172637;background:#f3f5f7;line-height:1.45;font-size:16px}*{box-sizing:border-box}body{margin:0}header,main,footer{max-width:1320px;margin:auto;padding:1rem 1.4rem}header{padding-bottom:0}h1{font-size:1.75rem;margin:.35rem 0}h2{font-size:1.3rem}h3{font-size:1.07rem}p{margin:.55rem 0}.notice{background:#fff3d6;border-left:4px solid #bd7e00;padding:.8rem 1rem}.muted{color:#506174}.panel{background:white;border:1px solid #ced7df;border-radius:10px;padding:1rem;margin:.8rem 0}.toolbar,.actions{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}.toolbar{padding:.7rem 0}.active{background:#173f69;color:white}button,input,select,textarea{font:inherit}button{background:white;border:1px solid #75899a;border-radius:6px;padding:.5rem .75rem;cursor:pointer}button:hover:not(:disabled){border-color:#173f69;background:#e5eef6;color:#172637}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #bb7400;outline-offset:2px}button:disabled{cursor:not-allowed;opacity:.55}.primary{background:#173f69;color:white;border-color:#173f69}select,input[type=text],input[type=number],textarea{width:100%;border:1px solid #75899a;border-radius:5px;padding:.5rem;background:white}input[type=checkbox],input[type=radio]{width:1.1rem;height:1.1rem;margin-right:.5rem}label{display:block;margin:.5rem 0}.layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(290px,1fr);gap:1rem;align-items:start}.proof-pane{position:sticky;top:1rem;max-height:90vh;overflow:auto}.proof-viewport{overflow:auto;max-height:65vh;background:#e8edf1;padding:.5rem;min-height:80px}.proof-viewport img{display:block;max-width:100%;height:auto;margin:auto}.proof-viewport img.zoomed{max-width:none;width:160%}.field{border-bottom:1px solid #e0e6ea;padding:.9rem 0}.field:last-child{border-bottom:0}.field-title{display:flex;justify-content:space-between;align-items:baseline;gap:.4rem;flex-wrap:wrap}.field-title h3{margin:0}.badge{font-size:.8rem;padding:.12rem .45rem;border:1px solid #b4c3cf;border-radius:4px;color:#3a4b5b}.critical{background:#fff3d6}.value{white-space:pre-wrap;overflow-wrap:anywhere;margin:.45rem 0}.refs{display:flex;gap:.35rem;flex-wrap:wrap;margin:.5rem 0}.refs button{font-size:.85rem;padding:.25rem .45rem}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1rem}.card{border:1px solid #bdcbd6;border-radius:8px;padding:1rem;background:white}.card dl{margin:0}.card dt{font-weight:600;margin-top:.6rem}.card dd{margin:.15rem 0;color:#374d60;overflow-wrap:anywhere}.scenario dl{display:grid;grid-template-columns:minmax(100px,1fr) 3fr;gap:.3rem .8rem;margin:0}.scenario dt{font-weight:600}.scenario dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}#status{min-height:1.5rem;padding:.35rem 0;white-space:pre-wrap}.error{color:#9b2020}.success{color:#155a39}.summary-table{width:100%;border-collapse:collapse;font-size:.92rem}.summary-table th,.summary-table td{text-align:left;vertical-align:top;padding:.5rem;border-bottom:1px solid #dce3e8;overflow-wrap:anywhere}.editor{border:2px solid #6c8fac;background:#f4f8fb;padding:.8rem;border-radius:6px;margin-top:.7rem}.choice-item{display:flex;align-items:center;margin:.4rem 0}.hidden{display:none!important}.small{font-size:.9rem}.outcome-box{padding:.8rem;background:#edf5f0}.exposure-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem}.field-help{color:#506174;font-size:.9rem}.break{overflow-wrap:anywhere}footer{font-size:.9rem;color:#506174;padding-top:0}@media(max-width:850px){.layout{grid-template-columns:1fr}.proof-pane{position:static;max-height:none}.scenario dl{grid-template-columns:1fr}.scenario dd{margin-bottom:.5rem}header,main,footer{padding-left:.8rem;padding-right:.8rem}}
    dialog{max-width:94vw;max-height:94vh;border:1px solid #75899a;border-radius:8px;padding:1rem;background:white;color:#172637}dialog::backdrop{background:rgba(15,25,40,.7)}dialog .proof-viewport{max-height:78vh}dialog img{max-width:85vw;cursor:zoom-in}dialog img.zoomed{max-width:none;width:150vw}
  </style>
</head>
<body>
<header>
  <p class="muted small">Evaluation-only · solo fixture sintetiche · nessuna raccolta reale</p>
  <h1>Revisione dei dati e confronto del soggiorno</h1>
  <p class="notice">Questa prova non produce giudizi ciechi qualificati, replay del motore o ammissioni Golden. Aprire una prova significa conoscere il caso: le due attività restano registrate separatamente.</p>
  <div class="toolbar"><label for="case-picker">Caso sintetico</label><select id="case-picker" style="max-width:470px" aria-label="Seleziona caso sintetico"></select><button id="reload" type="button">Rileggi progressi salvati</button><button id="stop-demo" type="button">Chiudi demo (progressi conservati)</button></div>
  <div id="status" role="status" aria-live="polite"></div>
</header>
<main>
  <section id="scenario" class="panel scenario" aria-labelledby="scenario-title"></section>
  <nav class="toolbar" aria-label="Attività separate"><button id="review-tab" class="active" type="button">1. Controlla dati e prove</button><button id="decision-tab" type="button">2. Esprimi un confronto diagnostico</button></nav>
  <section id="review-view">
    <p class="muted">I valori sono già trascritti. Controllali sulle prove: non occorre ricopiarli. Un campo filtrato non viene approvato automaticamente. Ogni azione confermata salva il progresso nel processo locale.</p>
    <div class="toolbar"><label for="alternative-picker">Alternativa corrente</label><select id="alternative-picker" style="max-width:300px"></select><label for="field-filter">Campi mostrati</label><select id="field-filter" style="max-width:240px"><option value="all">Tutti</option><option value="pending">Da verificare</option><option value="critical">Critici</option></select><button id="summary" type="button">Riepilogo completo</button></div>
    <p id="review-progress" class="muted"></p>
    <div class="layout"><div id="fields" class="panel"></div><aside class="panel proof-pane" aria-labelledby="proof-title"><h2 id="proof-title">Prove dell'alternativa</h2><p class="small muted">Tutti i riferimenti disponibili sono elencati. Nessuna immagine viene sostituita da un collage.</p><div id="proof-list" class="refs"></div><p id="proof-caption" class="small break">Seleziona una prova accanto al campo.</p><div class="actions"><button id="proof-zoom" type="button" disabled>Ingrandisci / riduci</button><button id="proof-open" type="button" disabled>Apri prova accanto</button></div><div class="proof-viewport"><img id="proof-image" class="hidden" alt="Prova sintetica selezionata"></div></aside></div>
    <section id="full-summary" class="panel hidden" aria-labelledby="summary-title"></section>
  </section>
  <section id="decision-view" class="hidden">
    <p class="notice">Confronto diagnostico umano su fixture. Non sono mostrate preferenze o raccomandazioni dell'AI. Conoscere già i dati, riconoscere il caso e conoscere un consiglio del motore sono condizioni diverse.</p>
    <section class="panel"><h2>Esposizione al caso</h2><div id="exposure-fields" class="exposure-grid"></div><button id="save-exposure" type="button">Registra queste tre risposte</button></section>
    <p id="decision-lock" class="muted"></p>
    <div id="comparison" class="cards"></div>
    <form id="judgment-form" class="panel" autocomplete="off">
      <h2>Per questo scenario, quale soluzione sceglieresti?</h2>
      <div id="draft-version-warning" class="notice hidden"><p>I dati sono cambiati. La bozza è conservata, ma non può essere inviata finché non rileggi i dati aggiornati e la riesamini.</p><button id="reconsider-draft" type="button">Ho riletto i dati aggiornati e riesaminato la bozza</button></div>
      <label for="outcome">Esito</label><select id="outcome" required><option value="">Scegli un esito</option><option value="SELECT">Una alternativa</option><option value="TIE">Pareggio tra alternative indicate</option><option value="NONE_ADEQUATE">Nessuna alternativa adeguata</option><option value="INSUFFICIENT_EVIDENCE">Dati insufficienti per scegliere</option></select>
      <div id="selected-alternatives"></div>
      <label for="confidence">Sicurezza nel giudizio, non qualità della struttura (1–5)</label><select id="confidence" required><option value="">Da indicare</option><option value="1">1 — molto incerto</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 — molto sicuro</option></select>
      <label for="reason">Motivo decisivo breve</label><select id="reason" required></select>
      <div id="blocking-control" class="hidden"><label for="blocking-field" id="blocking-label">Campo o requisito che impedisce la scelta</label><select id="blocking-field"></select></div>
      <p class="field-help">Pareggio: non emerge una preferenza materiale. Nessuna adeguata: nessuna proposta giustifica il compromesso, anche se i vincoli essenziali sono soddisfatti. Dati insufficienti: manca una prova necessaria. UNKNOWN non significa assente.</p>
      <label><input id="judgment-confirm" type="checkbox">Confermo questa risposta diagnostica. Sarà salvata prima di qualsiasi eventuale analisi successiva.</label>
      <button id="save-judgment" class="primary" type="submit">SALVA GIUDIZIO DIAGNOSTICO</button>
    </form>
    <section id="judgment-receipt" class="panel hidden"></section>
  </section>
</main>
<dialog id="proof-dialog" aria-labelledby="proof-dialog-title"><div class="toolbar"><h2 id="proof-dialog-title">Prova sintetica ingrandita</h2><button id="proof-dialog-close" type="button">Chiudi prova (Esc)</button></div><p class="small muted">Clicca l'immagine per ingrandire o ridurre. Esc chiude senza modificare i dati.</p><div class="proof-viewport"><img id="proof-dialog-image" alt="Prova sintetica ingrandita"></div></dialog>
<footer>Nessuna prova reale, credenziale o collegamento a servizi esterni. Per interrompere, chiudi la pagina: i soli cambiamenti già confermati sono conservati dal server locale. Riapri lo stesso indirizzo per riprendere.</footer>
<script>
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const REASONS = [
    ['BETTER_CONTEXTUAL_FIT','Migliore corrispondenza allo scenario'],['SENSIBLE_SAVING','Risparmio sensato'],
    ['JUSTIFIED_COMFORT','Comfort che giustifica il costo'],['BETTER_LOCATION','Posizione e spostamenti'],
    ['BETTER_FLEXIBILITY','Condizioni e pagamento'],['LOWER_DECISION_RISK','Minore rischio decisionale'],
    ['OPTIONS_EQUIVALENT','Alternative equivalenti'],['HARD_CONSTRAINT_NOT_MET','Requisito inderogabile non soddisfatto'],
    ['EVIDENCE_TOO_INCOMPLETE','Informazione necessaria mancante'],['TRADEOFF_NOT_JUSTIFIED','Sacrificio non giustificato']
  ];
  const OUTCOME_REASON={TIE:'OPTIONS_EQUIVALENT',NONE_ADEQUATE:'TRADEOFF_NOT_JUSTIFIED',INSUFFICIENT_EVIDENCE:'EVIDENCE_TOO_INCOMPLETE'};
  const EXPOSURES = [
    ['knownData','Ho già controllato o conosciuto i dati di questo caso'],
    ['recognizesCase','Riconosco una struttura o questo caso'],
    ['knowsEngineAdvice','Conosco un consiglio specifico dell’AI o di un motore per questo caso']
  ];
  const SCENARIO_LABELS = {destination:'Destinazione',destinationBucket:'Destinazione',checkin:'Check-in',checkout:'Check-out',nights:'Notti',adults:'Adulti',childrenAges:'Età bambini',childAges:'Età bambini',rooms:'Camere',currency:'Valuta',budgetMinorUnits:'Budget (unità minori)',budget:'Budget',preferenceProfile:'Profilo',profile:'Profilo',hardConstraints:'Requisiti inderogabili',purpose:'Scopo dichiarato',frozenAt:'Scenario congelato alle',observedAt:'Osservazione',collectionWindowStart:'Inizio osservazione',collectionWindowEnd:'Fine osservazione'};
  Object.assign(SCENARIO_LABELS,{timezone:'Fuso orario',checkIn:'Check-in',checkOut:'Check-out',destinationToken:'Destinazione sintetica',budgetMinorUnits:'Budget dichiarato (centesimi)',budgetScope:'Perimetro del budget',declaredNeeds:'Esigenze dichiarate'});
  const SCENARIO_VALUES={ACCOMMODATION_MANDATORY_COSTS:'Soggiorno e costi obbligatori',balanced:'Equilibrato',savings:'Risparmio','maximum-savings':'Massimo risparmio',comfort:'Comfort','maximum-comfort':'Massimo comfort',PRIVATE_ROOM:'Camera privata',PRIVATE_BATHROOM:'Bagno privato'};
  let state = null, caseId = '', alternativeId = '', activeView = 'review', busy = false, proofUrl = null, selectedProof = null;
  const decisionDrafts = new Map();
  const fieldEditors = new Map();
  function node(tag, text, className) { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el; }
  function option(value,label) { const el=node('option',label);el.value=value;return el; }
  function message(text,error=false) { byId('status').textContent=text;byId('status').className=error?'error':'success'; }
  function currentCase() { return state && state.cases.find(item=>item.caseId===caseId); }
  function currentAlternative() { return currentCase()?.alternatives.find(item=>item.id===alternativeId); }
  function plain(value) { if(value===null||value===undefined)return 'UNKNOWN'; if(typeof value==='string')return value; if(Array.isArray(value))return value.map(plain).join(', ')||'Nessuno dichiarato'; if(typeof value==='object')return Object.entries(value).map(([key,item])=>key+': '+plain(item)).join('; ');return String(value); }
  function knownValue(wrapper) { if(!wrapper||wrapper.status==='UNKNOWN')return 'UNKNOWN — '+(wrapper?.reason||wrapper?.unknownReason||'Non documentato');return plain(wrapper.value); }
  const AMOUNT_FIELD_KEYS=new Set(['totalStayPriceMinorUnits','payNowMinorUnits','payAtPropertyMinorUnits']);
  function formatMinorUnits(value,currency){if(typeof value==='number'&&Number.isSafeInteger(value)&&currency==='EUR')return new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100)+' EUR ('+value+' centesimi)';return plain(value)+' unità minori · valuta '+(currency||'UNKNOWN');}
  function displayFieldValue(key,wrapper,currency){return wrapper?.status==='KNOWN'&&AMOUNT_FIELD_KEYS.has(key)?formatMinorUnits(wrapper.value,currency):knownValue(wrapper);}
  function reviewed(field) { return ['CORRECT','CORRECTED','UNVERIFIABLE'].includes(String(field.reviewStatus||'').toUpperCase()); }
  function reviewLabel(field) { return {CORRECT:'Verificato corretto',CORRECTED:'Correzione registrata',UNVERIFIABLE:'Non verificabile'}[String(field.reviewStatus||'').toUpperCase()]||'Da verificare'; }
  function proofAddress(proof) { try { const url=new URL(proof.url,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/api/proof/')||url.username||url.password||url.search||url.hash)return null;return url.href; }catch{return null;} }
  function allFields(item) { return item.alternatives.flatMap(alt=>alt.fields.map(field=>({alt,field}))); }
  function displayedBinding(item=currentCase()){if(!Number.isInteger(item?.revision)||item.revision<0||typeof item.contentFingerprint!=='string'||!item.contentFingerprint)throw new Error('Versione dei dati non disponibile. Rileggi i progressi prima di confermare.');return{expectedRevision:item.revision,contentFingerprint:item.contentFingerprint};}
  function rememberDraft(){const item=currentCase();if(!item)return;const previous=decisionDrafts.get(item.caseId);decisionDrafts.set(item.caseId,{binding:previous?.binding||{expectedRevision:item.revision,contentFingerprint:item.contentFingerprint},requiresRereview:previous?.requiresRereview===true,outcome:byId('outcome').value,confidence:byId('confidence').value,reason:byId('reason').value,blockingField:byId('blocking-field').value,confirmed:byId('judgment-confirm').checked,selectedIds:[...document.querySelectorAll('input[name=selected-alternative]:checked')].map(input=>input.value),exposure:Object.fromEntries(EXPOSURES.map(([key])=>[key,byId('exposure-'+key).value]))});}
  function reconcileDraft(item){const draft=decisionDrafts.get(item.caseId);if(!draft)return null;const hasJudgmentDraft=Boolean(draft.outcome||draft.confidence||draft.reason||draft.blockingField||draft.confirmed||draft.selectedIds.length);if(draft.binding.contentFingerprint!==item.contentFingerprint&&(hasJudgmentDraft||draft.requiresRereview)){draft.requiresRereview=true;draft.confirmed=false;}else if(!draft.requiresRereview){draft.binding={expectedRevision:item.revision,contentFingerprint:item.contentFingerprint};}return draft;}
  function draftRequiresRereview(item=currentCase()){return decisionDrafts.get(item?.caseId)?.requiresRereview===true;}
  function reconsiderDraft(){const item=currentCase(),draft=decisionDrafts.get(item?.caseId);if(!draft?.requiresRereview)return;rememberDraft();const latest=decisionDrafts.get(item.caseId);latest.binding=displayedBinding(item);latest.requiresRereview=false;latest.confirmed=false;byId('judgment-confirm').checked=false;byId('draft-version-warning').classList.add('hidden');renderEnabled();message('Riesame della bozza registrato solo nella pagina. Ricontrolla esito e motivo, poi conferma esplicitamente prima di salvare. Nessun campo è stato approvato.');}
  async function request(path,body) {
    const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Demo-CSRF':document.querySelector('meta[name="demo-csrf"]')?.getAttribute('content')||''}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin',redirect:'error'});
    let result;try{result=await response.json();}catch{throw new Error('Risposta locale non leggibile. Nessun salvataggio confermato.');}
    if(!response.ok){const error=new Error(result.message||result.error||'Operazione locale rifiutata.');error.code=result.error;throw error;}
    return result;
  }
  function lockFormInputs(){const controls=[...document.querySelectorAll('input,select,textarea')].map(control=>({control,disabled:control.disabled}));for(const{control}of controls)control.disabled=true;return()=>{for(const{control,disabled}of controls)control.disabled=disabled;};}
  async function action(type,details={}) {
    if(busy)return false;let binding;try{binding=displayedBinding();if(type==='RECORD_JUDGMENT'&&draftRequiresRereview())throw new Error('I dati sono cambiati. Rileggili e riesamina esplicitamente la bozza prima di inviarla.');}catch(error){message(error.message,true);return false;}rememberDraft();busy=true;const restoreInputs=lockFormInputs();document.querySelectorAll('button').forEach(button=>button.disabled=true);
    try { state=await request('/api/action',{...details,caseId,type,...binding});render();message(draftRequiresRereview()?'Progresso salvato. I dati sono cambiati: la bozza del giudizio deve essere riletta e riesaminata.':'Progresso confermato e salvato.');return true; }
    catch(error){message(error.code==='DEMO_DISPLAYED_VERSION_STALE'?'I dati o i progressi sono cambiati in un’altra pagina. L’azione non è stata salvata. Premi “Rileggi progressi salvati”, poi rileggi la versione aggiornata prima di confermare.':error.message,true);return false;}
    finally{restoreInputs();busy=false;renderEnabled();}
  }
  async function load() { if(busy)return;rememberDraft();try{state=await request('/api/state');if(!Array.isArray(state.cases)||!state.cases.length)throw new Error('Nessun caso sintetico disponibile.');caseId=state.cases.some(item=>item.caseId===caseId)?caseId:(state.selectedCaseId||state.cases[0].caseId);render();message(draftRequiresRereview()?'Dati aggiornati letti. La bozza è conservata ma bloccata: rileggi i dati e riesaminala esplicitamente. Nessun campo è stato approvato.':'Progressi letti dal server locale. Bozze conservate; nessun campo è stato approvato.');}catch(error){message(error.message,true);} }
  async function stopDemo(){if(busy)return;busy=true;const restoreInputs=lockFormInputs();document.querySelectorAll('button').forEach(button=>button.disabled=true);try{await request('/api/stop',{});message('Chiuso. Riesegui il comando con la medesima DataRoot per riprendere. I progressi già confermati sono conservati; le modifiche non confermate non sono state salvate.');document.querySelectorAll('input,select,textarea').forEach(input=>input.disabled=true);}catch(error){restoreInputs();busy=false;renderEnabled();message('Chiusura non confermata: '+error.message,true);}}
  function renderScenario(item) {
    const section=byId('scenario');section.replaceChildren(node('h2','Scenario fissato prima della raccolta'));section.firstChild.id='scenario-title';
    const list=node('dl');for(const[key,value]of Object.entries(item.scenario||{})){const displayed=key==='budgetMinorUnits'?formatMinorUnits(value,item.scenario.currency):Array.isArray(value)?value.map(item=>SCENARIO_VALUES[item]||item):typeof value==='string'?SCENARIO_VALUES[value]||value:value;list.append(node('dt',SCENARIO_LABELS[key]||key),node('dd',plain(displayed)));}section.append(list);
    section.append(node('p','Caso '+item.caseId+' · '+item.alternatives.length+' alternative · scenario non modificabile da questa vista','muted small'));
    if(item.temporal){const time=item.temporal,box=node('div',undefined,'panel'),times=node('dl');box.append(node('h3','Tempi distinti di raccolta e custodia sintetica'));for(const[label,value]of [['Inizio osservazione UTC',time.collectionWindow?.start],['Fine osservazione UTC',time.collectionWindow?.end],['Fuso della raccolta',time.timezone],['Importazione sintetica UTC',time.importedAt],['Inizio custodia sintetica UTC',time.custodyStartedAt],['Scadenza dichiarata UTC',time.expiresAt]])times.append(node('dt',label),node('dd',value||'UNKNOWN — non documentato'));box.append(times,node('p','Tempi del processo locale: non costituiscono certificazione temporale indipendente, né prova retroattiva di una raccolta reale. L’importazione e la custodia non coincidono con la cattura.','field-help'));section.append(box);}
    if(item.acquisition){const values={VERIFIED:'Verificato nella fixture sintetica',DECLARED:'Dichiarato nella fixture sintetica',UNKNOWN:'UNKNOWN — non documentato'};const access=node('dl');for(const[key,label]of [['loggedOut','Utente non autenticato'],['incognito','Finestra anonima'],['personalizationAbsent','Assenza di personalizzazione']])access.append(node('dt',label),node('dd',values[item.acquisition[key]]||'UNKNOWN — non documentato'));section.append(node('h3','Provenienza e limiti — simulazione assistita, non raccolta reale'),access);}
  }
  function clearProof(){proofUrl=null;selectedProof=null;byId('proof-image').removeAttribute('src');byId('proof-image').classList.add('hidden');byId('proof-image').classList.remove('zoomed');byId('proof-caption').textContent='Seleziona una prova accanto al campo.';byId('proof-zoom').disabled=true;byId('proof-open').disabled=true;const dialog=byId('proof-dialog');if(dialog.open)dialog.close();}
  function showProof(proof){const url=proofAddress(proof);if(!url){message('Riferimento della prova non locale o non consentito.',true);return;}proofUrl=url;selectedProof={caseId,alternativeId,ref:proof.ref,url};const image=byId('proof-image');image.src=url;image.alt='Prova sintetica '+proof.ref;image.classList.remove('hidden');image.classList.remove('zoomed');byId('proof-caption').textContent=proof.ref+' — '+(proof.label||'prova associata all’alternativa corrente');byId('proof-zoom').disabled=false;byId('proof-open').disabled=false;}
  function proofButton(proof){const button=node('button','Apri '+proof.ref);button.type='button';button.onclick=()=>showProof(proof);return button;}
  function renderFields(item) {
    const alt=currentAlternative(),fields=byId('fields');fields.replaceChildren();const retainedProof=selectedProof?.caseId===caseId&&selectedProof?.alternativeId===alternativeId&&(alt?.proofs||[]).find(proof=>proof.ref===selectedProof.ref&&proofAddress(proof)===selectedProof.url);if(!retainedProof)clearProof();byId('proof-list').replaceChildren();if(!alt)return;
    fields.append(node('h2',alt.label||alt.id));const temporal=item.temporal?.alternatives?.find(entry=>entry.alternativeId===alt.id);if(temporal)fields.append(node('p','Osservazione UTC: '+(temporal.observedAt||'UNKNOWN')+' · locale: '+(temporal.observedLocalDateTime||'UNKNOWN')+' · giorni di calendario al check-in: '+(temporal.leadTimeCalendarDays??'UNKNOWN'),'field-help'));for(const proof of alt.proofs||[])byId('proof-list').append(proofButton(proof));
    const filter=byId('field-filter').value;
    for(const field of alt.fields){if(filter==='pending'&&reviewed(field)||filter==='critical'&&!field.critical)continue;
      const section=node('section',undefined,'field'),title=node('div',undefined,'field-title');title.append(node('h3',field.label||field.key),node('span',reviewLabel(field),'badge'));
      if(field.critical)title.append(node('span','Critico','badge critical'));section.append(title,node('p',displayFieldValue(field.key,field.value,item.scenario?.currency),'value'));
      if(field.help)section.append(node('p',field.help,'field-help'));
      const refs=node('div',undefined,'refs');for(const ref of field.value?.evidenceRefs||[]){const proof=(alt.proofs||[]).find(entry=>entry.ref===ref);refs.append(proof?proofButton(proof):node('span','Prova non disponibile: '+ref,'error'));}if(!refs.childNodes.length)refs.append(node('span','Nessuna prova associata: non inventare il dato.','field-help'));section.append(refs);
      const controls=node('div',undefined,'actions');const correct=node('button','Corretto');correct.type='button';correct.onclick=()=>action('REVIEW_FIELD',{alternativeId:alt.id,fieldKey:field.key,reviewStatus:'CORRECT'});
      const edit=node('button','Correggi');edit.type='button';edit.onclick=()=>editField(section,alt,field);
      const unverifiable=node('button','Non verificabile');unverifiable.type='button';unverifiable.onclick=()=>action('REVIEW_FIELD',{alternativeId:alt.id,fieldKey:field.key,reviewStatus:'UNVERIFIABLE'});
      controls.append(correct,edit,unverifiable);section.append(controls);const pendingEditor=fieldEditors.get(item.caseId+'|'+alt.id+'|'+field.key);if(pendingEditor){const stale=pendingEditor.contentFingerprint!==item.contentFingerprint;pendingEditor.save.d38StaleEditor=stale;pendingEditor.save.disabled=stale;pendingEditor.warning.classList.toggle('hidden',!stale);section.append(pendingEditor.element);}fields.append(section);
    }
    if(fields.children.length===1)fields.append(node('p','Nessun campo in questo filtro. Usa “Tutti” per vedere il contenuto completo.','muted'));
    const rows=allFields(item),done=rows.filter(({field})=>reviewed(field)).length;byId('review-progress').textContent=done+' / '+rows.length+' campi verificati. '+(item.reviewConfirmed?'Revisione confermata.':'Revisione complessiva ancora da confermare.');
  }
  const VALUE_LABELS={amount:'Importo (unità minori)',totalAmount:'Totale (unità minori)',payNowAmount:'Da pagare subito (unità minori)',payAtPropertyAmount:'Da pagare in struttura (unità minori)',currency:'Valuta',kind:'Tipo',status:'Stato',text:'Testo osservato',roomType:'Tipo di camera',roomTypeCode:'Tipo di camera',adults:'Adulti',childrenAges:'Età bambini',childAges:'Età bambini',rooms:'Camere',score:'Punteggio pubblicato',scale:'Scala',count:'Numero',meters:'Metri',measurement:'Misurazione',taxesIncluded:'Tasse incluse',feesIncluded:'Costi inclusi',taxInclusion:'Indicazione fiscale',refundability:'Rimborsabilità',freeCancellationUntilBucket:'Scadenza cancellazione',penaltyMinorUnits:'Penale (unità minori)',penaltyCurrency:'Valuta penale',featureCodes:'Servizi documentati',requiredCodes:'Requisiti',lat:'Latitudine',lng:'Longitudine',latitude:'Latitudine',longitude:'Longitudine',source:'Provenienza'};
  const LOCKED_VALUE_KEYS=new Set(['purchaseCompleted','bookingConfirmed','exactBookable','verifiedCheckoutTotal','sellerSpecific','automaticGoldenAdmission','liveBookableGoldenAvailable']);
  Object.assign(VALUE_LABELS,{totalStayPriceMinorUnits:'Prezzo totale osservato (centesimi)',payNowMinorUnits:'Da pagare subito (centesimi)',payAtPropertyMinorUnits:'Da pagare in struttura (centesimi)',rating:'Rating pubblicato',ratingScale:'Scala del rating',reviewCount:'Numero di recensioni',distanceMeters:'Distanza documentata dal riferimento (metri)',taxInclusionStatement:'Dicitura osservata su tasse e costi',taxBreakdown:'Scomposizione fiscale documentata',locationText:'Posizione testuale documentata',category:'Categoria mostrata',room:'Camera e configurazione',mealPlan:'Trattamento documentato',cancellation:'Condizioni di cancellazione',availability:'Disponibilità osservata',amenities:'Servizi documentati (codici)'});
  const NUMERIC_FIELD_KEYS=new Set(['totalStayPriceMinorUnits','payNowMinorUnits','payAtPropertyMinorUnits','rating','ratingScale','reviewCount','distanceMeters']);
  function createValueEditor(initial,key,depth=0,forcedType=null) {
    if(depth>8)throw new Error('Struttura troppo profonda: correzione bloccata senza modificare il campo.');
    const label=VALUE_LABELS[key]||key,container=node('div',undefined,'value-editor');
    if(LOCKED_VALUE_KEYS.has(key)){container.append(node('p',label+': '+plain(initial)+' — semantica protetta, non modificabile.','field-help'));return{element:container,read:()=>initial};}
    if(Array.isArray(initial)){
      container.append(node('h3',label));const entries=node('div'),controls=node('div',undefined,'actions');let children=[];
      function add(item,type=null){if(children.length>=64)throw new Error('Massimo 64 elementi nel campo.');const child=createValueEditor(item,'Elemento '+(children.length+1),depth+1,type),row=node('div',undefined,'panel'),remove=node('button','Rimuovi questo elemento');remove.type='button';remove.onclick=()=>{children=children.filter(candidate=>candidate!==child);row.remove();};row.append(child.element,remove);children.push(child);entries.append(row);}
      initial.forEach(item=>add(item));const kind=node('select');kind.setAttribute('aria-label','Tipo del nuovo elemento di '+label);kind.append(option('string','Nuovo elemento testuale'),option('number','Nuovo elemento numerico'),option('boolean','Nuovo elemento sì/no'));const append=node('button','Aggiungi elemento');append.type='button';append.onclick=()=>{try{add(undefined,kind.value);}catch(error){message(error.message,true);}};controls.append(kind,append);container.append(entries,controls);return{element:container,read:()=>children.map(child=>child.read())};
    }
    if(initial!==null&&typeof initial==='object'){
      container.append(node('h3',label));const entries=Object.entries(initial).map(([childKey,value])=>{if(['__proto__','constructor','prototype'].includes(childKey))throw new Error('Campo strutturato non sicuro.');const child=createValueEditor(value,childKey,depth+1);container.append(child.element);return[childKey,child];});return{element:container,read:()=>Object.fromEntries(entries.map(([childKey,child])=>[childKey,child.read()]))};
    }
    const fieldLabel=node('label',label),input=typeof initial==='boolean'?node('select'):node('input');let kind=null;
    if((initial===null||initial===undefined)&&forcedType){input.type='text';input.value='';input.placeholder=forcedType==='number'?'Numero documentato':forcedType==='boolean'?'true oppure false':'Valore documentato';if(forcedType==='number')input.inputMode='decimal';}
    else if(initial===null||initial===undefined){kind=node('select');kind.setAttribute('aria-label','Tipo per '+label);kind.append(option('null','Non documentato (null)'),option('text','Testo documentato'),option('number','Numero documentato'),option('boolean','Sì/no documentato'));container.append(kind);input.type='text';input.disabled=true;kind.onchange=()=>{input.disabled=kind.value==='null';input.value='';input.placeholder=kind.value==='boolean'?'true oppure false':kind.value==='number'?'Numero documentato':'Valore documentato';};}
    else if(typeof initial==='boolean'){input.append(option('true','Sì (true)'),option('false','No (false)'));input.value=String(initial);}
    else{input.type='text';input.value=String(initial);if(typeof initial==='number')input.inputMode='decimal';}
    fieldLabel.append(input);container.append(fieldLabel);
    return{element:container,read:()=>{const type=kind?kind.value:forcedType||typeof initial;if(type==='null')return null;const value=input.value.trim();if(!value)throw new Error('Completa '+label+' oppure usa UNKNOWN per il campo.');if(type==='number'){const parsed=Number(value);if(!Number.isFinite(parsed))throw new Error(label+' richiede un numero.');return parsed;}if(type==='boolean'){if(!['true','false'].includes(value.toLowerCase()))throw new Error(label+' richiede true o false.');return value.toLowerCase()==='true';}return value;}};
  }
  function editField(section,alt,field) {
    const item=currentCase(),editorKey=item?.caseId+'|'+alt.id+'|'+field.key,contentFingerprint=item?.contentFingerprint;section.querySelector('.editor')?.remove();const editor=node('div',undefined,'editor');editor.append(node('h3','Correzione mirata: '+(field.label||field.key)));
    const status=node('select');status.append(option('KNOWN','Dato documentato'),option('UNKNOWN','UNKNOWN — non documentato'));status.value=field.value?.status||'UNKNOWN';
    let valueEditor;try{valueEditor=createValueEditor(field.value?.value??(field.key==='amenities'?[]:null),field.key,0,NUMERIC_FIELD_KEYS.has(field.key)?'number':null);}catch(error){message(error.message,true);return;}
    const reason=node('input');reason.type='text';reason.value=field.value?.reason||'';
    const statusLabel=node('label','Stato del dato');statusLabel.append(status);const reasonLabel=node('label','Motivo se UNKNOWN');reasonLabel.append(reason);
    editor.append(statusLabel,valueEditor.element,reasonLabel,node('p','Gli importi restano nelle unità indicate. I riferimenti alla prova restano quelli del campo: non usare la correzione per sostituire la prova o inventare associazioni. “Non paghi ora” non significa “pagamento in struttura = 0”.','field-help'));
    const warning=node('p','I dati sono cambiati: questa modifica non è applicabile. Il testo è conservato per consultazione; annulla e riapri il campo aggiornato prima di correggerlo.','notice hidden');editor.append(warning);
    const save=node('button','APPLICA CORREZIONE');save.type='button';save.className='primary';save.onclick=async()=>{if(currentCase()?.contentFingerprint!==contentFingerprint){message('I dati sono cambiati. Annulla la modifica non salvata e rileggi il campo aggiornato.',true);return;}let value=null;if(status.value==='UNKNOWN'){if(!reason.value.trim()){message('Indica perché il dato non è documentato.',true);return;}}else{try{value=valueEditor.read();if(value===null)throw new Error('Il valore non documentato richiede UNKNOWN e un motivo.');}catch(error){message(error.message,true);return;}}
      const pending=fieldEditors.get(editorKey);fieldEditors.delete(editorKey);const saved=await action('CORRECT_FIELD',{alternativeId:alt.id,fieldKey:field.key,value:{status:status.value,value,reason:status.value==='UNKNOWN'?reason.value.trim():null,evidenceRefs:[...(field.value?.evidenceRefs||[])]}});if(!saved&&pending)fieldEditors.set(editorKey,pending);
    };
    const cancel=node('button','Annulla modifica non salvata');cancel.type='button';cancel.onclick=()=>{fieldEditors.delete(editorKey);editor.remove();};editor.append(save,cancel);fieldEditors.set(editorKey,{contentFingerprint,element:editor,save,warning});section.append(editor);status.focus();
  }
  function renderSummary() {
    const item=currentCase(),panel=byId('full-summary');panel.replaceChildren();panel.classList.remove('hidden');const title=node('h2','Riepilogo completo prima della conferma');title.id='summary-title';panel.append(title,node('p','Questo riepilogo include tutti i campi e tutte le alternative, indipendentemente dal filtro.'));
    const table=node('table',undefined,'summary-table'),head=node('tr');for(const text of ['Alternativa','Campo','Valore / UNKNOWN','Revisione'])head.append(node('th',text));const thead=node('thead');thead.append(head);table.append(thead);const tbody=node('tbody');for(const{alt,field}of allFields(item)){const row=node('tr');row.append(node('td',alt.label||alt.id),node('td',field.label||field.key),node('td',displayFieldValue(field.key,field.value,item.scenario?.currency)),node('td',reviewLabel(field)));tbody.append(row);}table.append(tbody);panel.append(table);
    const label=node('label'),checkbox=node('input');checkbox.type='checkbox';checkbox.id='review-confirm';label.append(checkbox,document.createTextNode('Confermo personalmente la revisione della versione mostrata; UNKNOWN resta non documentato.'));panel.append(label);
    const button=node('button','CONFERMA REVISIONE','primary');button.id='confirm-review';button.type='button';button.disabled=true;checkbox.onchange=()=>{button.disabled=!checkbox.checked||allFields(item).some(({field})=>!reviewed(field));};button.onclick=()=>{if(!checkbox.checked)return;action('CONFIRM_REVIEW',{confirmed:true});};panel.append(button);
    if(allFields(item).some(({field})=>!reviewed(field)))panel.append(node('p','Restano campi da verificare. Non è possibile approvarli mediante il solo riepilogo.','error'));panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderExposure(item) {
    const target=byId('exposure-fields');target.replaceChildren();for(const[key,text]of EXPOSURES){const label=node('label',text),select=node('select');select.id='exposure-'+key;select.append(option('','Da dichiarare'),option('true','Sì'),option('false','No'));select.value=typeof item.exposure?.[key]==='boolean'?String(item.exposure[key]):'';label.append(select);target.append(label);}
  }
  function comparisonAlternatives(item){return Array.isArray(item.comparison?.alternatives)?item.comparison.alternatives:[];}
  function renderComparison(item) {
    const target=byId('comparison');target.replaceChildren();const alternatives=comparisonAlternatives(item);
    if(!alternatives.length){target.append(node('p','Il confronto provider-neutral non è disponibile: completa la revisione e risolvi i blocchi. Non vengono usati i dati grezzi della revisione come sostituto.','notice'));return;}
    const caveat=node('section',undefined,'panel');caveat.style.gridColumn='1 / -1';caveat.append(node('h2','Confronto diagnostico provider-neutral'),node('p','Prezzi pubblici pre-checkout osservati: non sono prezzi esatti prenotabili né totali verificati al checkout. Tasse e scomposizioni non documentate restano UNKNOWN.'),node('p','Un campo con copertura asimmetrica resta conservato nella revisione, ma non è un argomento comparativo. UNKNOWN non significa assente o peggiore. Affidabilità descrive la prova, non la qualità.','field-help'));target.append(caveat);
    for(const alt of alternatives){const card=node('article',undefined,'card');card.append(node('h3',alt.label));const list=node('dl');for(const[key,value]of Object.entries(alt.fields||{})){
      list.append(node('dt',VALUE_LABELS[key]||key));const cell=node('dd');
      if(value.comparativeEligibility==='AUDIT_ONLY_NOT_COMPARABLE'){cell.append(node('span','AUDIT_ONLY_NOT_COMPARABLE — solo audit; copertura non comune.','badge critical'));const original=node('button','Consulta il dato nella revisione');original.type='button';original.onclick=()=>{alternativeId=alt.selectionId;byId('alternative-picker').value=alternativeId;byId('field-filter').value='all';renderFields(item);switchView('review');};cell.append(node('p','Il dato originale è conservato, ma non viene mostrato come vantaggio o svantaggio nel confronto.','field-help'),original);}
      else{cell.append(node('p',displayFieldValue(key,value,item.comparison.scenario?.currency),'value'),node('p',value.comparativeEligibility==='UNKNOWN_NOT_NEGATIVE_EVIDENCE'?'UNKNOWN — non è evidenza negativa.':'Campo comparabile nel set.','field-help'));}
      const reliability={HIGH:'Alta',MEDIUM:'Media',LOW:'Bassa',UNKNOWN:'UNKNOWN'}[value.reliability]||'Non documentata';cell.append(node('p','Affidabilità della prova: '+reliability,'field-help'));list.append(cell);
    }card.append(list);target.append(card);}
  }
  function selectedOptions() {
    const item=currentCase(),outcome=byId('outcome').value,target=byId('selected-alternatives');target.replaceChildren();
    const reason=byId('reason');reason.replaceChildren(option('','Scegli un motivo'));for(const[code,label]of REASONS)if(!OUTCOME_REASON[outcome]||code===OUTCOME_REASON[outcome])reason.append(option(code,label));
    if(outcome==='SELECT'||outcome==='TIE'){target.append(node('p',outcome==='TIE'?'Indica almeno due alternative equivalenti.':'Indica una sola alternativa.'));for(const alt of comparisonAlternatives(item)){const label=node('label',undefined,'choice-item'),input=node('input');input.type=outcome==='SELECT'?'radio':'checkbox';input.name='selected-alternative';input.value=alt.selectionId;label.append(input,document.createTextNode(alt.label));target.append(label);}}
    byId('blocking-control').classList.toggle('hidden',!['NONE_ADEQUATE','INSUFFICIENT_EVIDENCE'].includes(outcome));byId('blocking-label').textContent=outcome==='NONE_ADEQUATE'?'Aspetto documentato del compromesso (facoltativo; altrimenti valutazione complessiva)':'Quale informazione manca per scegliere?';
    const blocker=byId('blocking-field'),previous=blocker.value;blocker.replaceChildren(option('',outcome==='NONE_ADEQUATE'?'Compromesso complessivo — nessun dettaglio specifico':'Indica il dato mancante'));const seen=new Set();for(const{field}of allFields(item))if(!seen.has(field.key)){seen.add(field.key);if(outcome!=='NONE_ADEQUATE'||item.alternatives.every(alt=>alt.fields.find(candidate=>candidate.key===field.key)?.value?.status==='KNOWN'))blocker.append(option(field.key,field.label||field.key));}if([...blocker.children].some(entry=>entry.value===previous))blocker.value=previous;
  }
  function eligibilityMessage(item){const gate=item.eligibility;if(gate?.eligible===true)return null;const reasons=[...(gate?.issues||[]),...(gate?.eligibilityBlockers||[])];return reasons.length?'Confronto bloccato: '+reasons.map(value=>String(value).replaceAll('_',' ')).join('; '):'Confronto bloccato: l’idoneità dei dati non è stata verificata. Non sostituire i dati mancanti con ipotesi.';}
  function renderSavedJudgments(item){
    const target=byId('judgment-receipt');target.replaceChildren();const records=item.judgments||[];target.classList.toggle('hidden',!records.length);if(!records.length)return;
    target.append(node('h2','Risposte diagnostiche salvate'),node('p','Le risposte non vengono sovrascritte. Non sono conteggiate come giudizi ciechi umani o esperti.','outcome-box'));
    const choiceLabels={SELECT:'Una alternativa',TIE:'Pareggio',NO_GOOD_OPTION:'Nessuna alternativa adeguata',NONE_ADEQUATE:'Nessuna alternativa adeguata',INSUFFICIENT_EVIDENCE:'Dati insufficienti'};
    records.forEach((record,index)=>{const judgment=record.judgment||record,invalid=(item.invalidatedJudgmentIds||[]).includes(judgment.judgmentId),section=node('article',undefined,'panel');section.append(node('h3','Risposta '+(index+1)+' — '+(invalid?'NON VALIDA PER I DATI CORRENTI':'registrata')),node('p',invalid?'I dati sono cambiati dopo questa risposta. Lo storico resta leggibile, ma non vale per la versione corrente.':'La risposta è legata alla versione dei dati verificata al momento del salvataggio.','muted'));
      const selected=(judgment.selectedAlternativeIds||[]).map(id=>comparisonAlternatives(item).find(alt=>alt.selectionId===id)?.label||item.alternatives.find(alt=>alt.id===id)?.label||'Alternativa non presente nella versione corrente'),reasonCodes=judgment.reasonCodes||(judgment.reasonCode?[judgment.reasonCode]:[]),blocker=judgment.blockingField??judgment.blockingCondition??null;
      const rows=[['Esito',choiceLabels[judgment.choice||judgment.outcome]||'Esito non riconosciuto'],['Alternative indicate',selected.join(', ')||'Nessuna selezionata'],['Sicurezza nel giudizio',String(judgment.confidence)+' / 5'],['Motivo',reasonCodes.map(code=>REASONS.find(([value])=>value===code)?.[1]||String(code)).join('; ')],['Condizione o dato bloccante',blocker?(allFields(item).find(({field})=>field.key===blocker)?.field.label||(blocker==='hardConstraints'?'Requisito inderogabile dichiarato':String(blocker))):'Non prevista per questo esito'],['Versione dei dati',record.dataRevision===undefined?'Non disponibile':String(record.dataRevision)],['Registrazione',record.recordedAt||judgment.createdAtBucket||'Non disponibile'],['Ambito','Simulazione diagnostica sintetica; nessuna qualifica di esperto']];const list=node('dl');for(const[label,value]of rows)list.append(node('dt',label),node('dd',value));section.append(list);target.append(section);
    });
  }
  function renderJudgment(item) {
    const draft=reconcileDraft(item);renderExposure(item);renderComparison(item);
    byId('outcome').value=draft?.outcome||'';byId('confidence').value=draft?.confidence||'';byId('judgment-confirm').checked=draft?.confirmed===true&&!draft.requiresRereview;selectedOptions();
    if(draft){if([...byId('reason').children].some(entry=>entry.value===draft.reason))byId('reason').value=draft.reason;if([...byId('blocking-field').children].some(entry=>entry.value===draft.blockingField))byId('blocking-field').value=draft.blockingField;for(const input of document.querySelectorAll('input[name=selected-alternative]'))input.checked=draft.selectedIds.includes(input.value);for(const[key]of EXPOSURES)if(['true','false'].includes(draft.exposure[key]))byId('exposure-'+key).value=draft.exposure[key];}
    byId('draft-version-warning').classList.toggle('hidden',!draft?.requiresRereview);
    const sealed=item.currentJudgmentValid===true;renderSavedJudgments(item);
    byId('judgment-form').classList.toggle('hidden',sealed);byId('decision-lock').textContent=eligibilityMessage(item)||(!item.reviewConfirmed?'Completa prima la revisione della trascrizione e la sua conferma esplicita.':sealed?'Risposta salvata; una modifica materiale dei dati richiede una nuova verifica del binding.':'I controlli consentono questo confronto diagnostico. Nessuna preferenza è preselezionata.');
  }
  function renderEnabled(){const item=currentCase();document.querySelectorAll('button').forEach(button=>button.disabled=busy||button.d38StaleEditor===true);byId('proof-open').disabled=busy||!proofUrl;byId('proof-zoom').disabled=busy||!proofUrl;byId('reconsider-draft').disabled=busy||!draftRequiresRereview();byId('save-judgment').disabled=busy||draftRequiresRereview()||!item?.reviewConfirmed||item?.eligibility?.eligible!==true||!comparisonAlternatives(item).length||item?.currentJudgmentValid===true;const confirm=byId('confirm-review');if(confirm)confirm.disabled=busy||!byId('review-confirm')?.checked||allFields(item).some(({field})=>!reviewed(field));}
  function switchView(view){activeView=view;byId('review-view').classList.toggle('hidden',view!=='review');byId('decision-view').classList.toggle('hidden',view!=='decision');byId('review-tab').classList.toggle('active',view==='review');byId('decision-tab').classList.toggle('active',view==='decision');}
  function render(){const item=currentCase();if(!item){message('Identità del caso non valida.',true);return;}const picker=byId('case-picker');picker.replaceChildren();for(const entry of state.cases)picker.append(option(entry.caseId,entry.caseId+' · '+entry.alternatives.length+' alternative'));picker.value=caseId;if(!item.alternatives.some(alt=>alt.id===alternativeId))alternativeId=item.alternatives[0]?.id||'';const altPicker=byId('alternative-picker');altPicker.replaceChildren();item.alternatives.forEach((alt,index)=>altPicker.append(option(alt.id,(index+1)+' / '+item.alternatives.length+' — '+(alt.label||alt.id))));altPicker.value=alternativeId;renderScenario(item);renderFields(item);renderJudgment(item);byId('full-summary').classList.add('hidden');switchView(activeView);renderEnabled();}
  byId('case-picker').onchange=()=>{rememberDraft();caseId=byId('case-picker').value;alternativeId='';activeView='review';render();};byId('alternative-picker').onchange=()=>{alternativeId=byId('alternative-picker').value;renderFields(currentCase());};byId('field-filter').onchange=()=>renderFields(currentCase());byId('reload').onclick=load;byId('review-tab').onclick=()=>switchView('review');byId('decision-tab').onclick=()=>switchView('decision');byId('summary').onclick=renderSummary;byId('outcome').onchange=selectedOptions;
  byId('stop-demo').onclick=stopDemo;
  byId('reconsider-draft').onclick=reconsiderDraft;
  function openProofDialog(){if(!proofUrl)return;const preview=byId('proof-dialog-image');preview.src=proofUrl;preview.classList.remove('zoomed');byId('proof-dialog-title').textContent=byId('proof-caption').textContent;byId('proof-dialog').showModal();}
  byId('proof-zoom').onclick=openProofDialog;byId('proof-image').onclick=openProofDialog;byId('proof-open').onclick=()=>{if(proofUrl)window.open(proofUrl,'_blank','noopener,noreferrer');};byId('proof-image').onerror=()=>message('Prova non disponibile o formato non visualizzabile. Nessun campo è stato approvato.',true);byId('proof-dialog-close').onclick=()=>byId('proof-dialog').close();byId('proof-dialog-image').onclick=()=>byId('proof-dialog-image').classList.toggle('zoomed');byId('proof-dialog').addEventListener('close',()=>byId('proof-dialog-image').removeAttribute('src'));
  byId('save-exposure').onclick=()=>{const exposure={};for(const[key]of EXPOSURES){const value=byId('exposure-'+key).value;if(!['true','false'].includes(value)){message('Rispondi separatamente a tutte e tre le domande di esposizione.',true);return;}exposure[key]=value==='true';}action('RECORD_EXPOSURE',{exposure});};
  byId('judgment-form').onsubmit=event=>{event.preventDefault();const item=currentCase(),outcome=byId('outcome').value,selectedAlternativeIds=[...document.querySelectorAll('input[name=selected-alternative]:checked')].map(input=>input.value),confidence=Number(byId('confidence').value),reasonCode=byId('reason').value,blockingField=byId('blocking-field').value;
    if(draftRequiresRereview()){message('I dati sono cambiati. Rileggi la versione aggiornata e riesamina esplicitamente la bozza prima di inviarla.',true);return;}
    if(item.eligibility?.eligible!==true||!comparisonAlternatives(item).length){message(eligibilityMessage(item)||'Confronto provider-neutral non disponibile.',true);return;}if(!item.reviewConfirmed){message('La trascrizione deve essere confermata prima del confronto.',true);return;}if(!EXPOSURES.every(([key])=>typeof item.exposure?.[key]==='boolean')){message('Registra prima le tre risposte di esposizione.',true);return;}
    if(!['SELECT','TIE','NONE_ADEQUATE','INSUFFICIENT_EVIDENCE'].includes(outcome)||outcome==='SELECT'&&selectedAlternativeIds.length!==1||outcome==='TIE'&&selectedAlternativeIds.length<2){message('Indica un esito valido: una scelta oppure almeno due alternative per il pareggio.',true);return;}
    if(!Number.isInteger(confidence)||confidence<1||confidence>5||!REASONS.some(([code])=>code===reasonCode)||OUTCOME_REASON[outcome]&&reasonCode!==OUTCOME_REASON[outcome]){message('Indica sicurezza 1–5 e un motivo strutturato coerente con l’esito.',true);return;}if(outcome==='INSUFFICIENT_EVIDENCE'&&!blockingField){message('Indica il dato mancante necessario alla scelta.',true);return;}if(!byId('judgment-confirm').checked){message('È richiesta la conferma esplicita della risposta.',true);return;}
    action('RECORD_JUDGMENT',{judgment:{outcome,selectedAlternativeIds,confidence,reasonCode,blockingField:['NONE_ADEQUATE','INSUFFICIENT_EVIDENCE'].includes(outcome)?blockingField||null:null}});
  };
  load();
})();
</script>
</body>
</html>`;
  if (options.transcriptionOnly !== true) return html;
  // Separate presentation capability. The distinct diagnostic API independently
  // rejects every judgment/exposure request. Default synthetic HTML is unchanged.
  let result = html
    .replace('prova sintetica di revisione', 'revisione privata della trascrizione')
    .replace('Evaluation-only · solo fixture sintetiche · nessuna raccolta reale', 'Evaluation-only · trascrizione browser-assisted · DIAGNOSTIC_ONLY · nessuna custodia del collector')
    .replace(/Caso sintetico/g, 'Caso diagnostico').replace(/Seleziona caso sintetico/g, 'Seleziona caso diagnostico')
    .replace(/Prova sintetica/g, 'Prova originale').replace(/prova sintetica/g, 'prova originale')
    .replace('Nessun caso sintetico disponibile.', 'Nessun caso diagnostico disponibile.')
    .replace('Nessuna prova reale, credenziale o collegamento a servizi esterni.', 'Materiali privati locali. Nessuna credenziale o collegamento a servizi esterni. Il salvataggio è storico di trascrizione, non custodia verificata.')
    .replace('<button id="decision-tab" type="button">2. Esprimi un confronto diagnostico</button>', '')
    .replace(/  <section id="decision-view" class="hidden">[\s\S]*?\n  <\/section>\r?\n<\/main>/, '</main>')
    .replace('function rememberDraft(){', 'function rememberDraft(){return;')
    .replace('renderJudgment(item);byId', 'renderDiagnosticOverview(item);byId')
    .replace("byId('decision-tab').onclick=()=>switchView('decision');", '')
    .replace("byId('outcome').onchange=selectedOptions;", '')
    .replace("  byId('reconsider-draft').onclick=reconsiderDraft;", '')
    .replace(/  byId\('save-exposure'\)\.onclick=[\s\S]*?\r?\n  load\(\);/, '  load();')
    .replace(/  function switchView\(view\)\{[^\r\n]*\}/, "  function switchView(){activeView='review';byId('review-view').classList.remove('hidden');}")
    .replace(/byId\('reconsider-draft'\)\.disabled=[\s\S]*?;const confirm=/, 'const confirm=')
    .replace('Scenario fissato prima della raccolta', 'Scenario preventivo documentato nel dossier — limiti temporali nel riepilogo');
  // Group controls are present only in the diagnostic surface; synthetic
  // decision-review rendering above remains unchanged.
  result = result
    .replace('<option value="pending">Da verificare</option>', '<option value="pending" selected>Da verificare</option>')
    .replace('async function action(type,details={})', 'async function action(type,details={},shownBinding=null)')
    .replace('binding=displayedBinding();', 'binding=shownBinding||displayedBinding();')
    .replace("button.disabled=busy||button.d38StaleEditor===true", "button.disabled=busy||button.d38StaleEditor===true||button.d40Disabled===true")
    .replace("const filter=byId('field-filter').value;", "const filter=byId('field-filter').value;const visibleGroup=renderGroupToolbar(item,alt,filter,fields);")
    .replace("for(const field of alt.fields){if(filter==='pending'", "for(const field of alt.fields){if(!visibleGroup?.fieldKeys.includes(field.key))continue;if(filter==='pending'")
    .replace("const section=node('section',undefined,'field'),title=", "const section=node('section',undefined,'field');section.dataset.fieldKey=field.key;const title=")
    .replace("    const rows=allFields(item),done=", "    renderGroupConfirmation(item,alt,filter,visibleGroup,fields);\n    const rows=allFields(item),done=");
  const diagnostic = String.raw`
  const selectedGroups=new Map();
  function renderGroupToolbar(item,alt,filter,target){
    const groups=alt.reviewGroups?.[filter]||[],key=item.caseId+'|'+alt.id+'|'+filter;
    let index=groups.findIndex(g=>g.id===selectedGroups.get(key));if(index<0)index=0;
    const group=groups[index];if(!group){target.append(node('p','Nessun campo in questo filtro. Nessuna conferma disponibile.'));return null;}
    selectedGroups.set(key,group.id);
    const common=(alt.proofs||[]).filter(p=>group.evidenceRefs.includes(p.ref));byId('proof-list').replaceChildren();for(const proof of common)byId('proof-list').append(proofButton(proof));
    if(!common.some(p=>p.ref===selectedProof?.ref)){if(common.length)showProof(common[0]);else clearProof();}
    const bar=node('div',undefined,'toolbar'),picker=node('select');picker.id='review-group-picker';picker.setAttribute('aria-label','Gruppo di campi con prove comuni');
    groups.forEach((g,i)=>picker.append(option(g.id,'Gruppo '+(i+1)+' / '+groups.length+' — '+g.fieldKeys.map(k=>alt.fields.find(f=>f.key===k)?.label||k).join(' · '))));picker.value=group.id;
    picker.onchange=()=>{selectedGroups.set(key,picker.value);renderFields(currentCase());};
    for(const[delta,label]of[[-1,'Gruppo precedente'],[1,'Gruppo successivo']]){const button=node('button',label);button.type='button';button.d40Disabled=index+delta<0||index+delta>=groups.length;button.disabled=button.d40Disabled;button.onclick=()=>{if(button.d40Disabled)return;selectedGroups.set(key,groups[index+delta].id);renderFields(currentCase());};bar.append(button);}
    target.append(node('p','Gruppo '+(index+1)+' / '+groups.length+' · '+group.fieldKeys.length+' campi visibili · versione '+item.revision,'notice'),picker,bar);
    target.append(node('p',group.evidenceRefs.length?'Questi campi condividono gli stessi riferimenti. Leggi ciascun valore e il suo limite: condividere una prova non rende i dati equivalenti.':'Questi campi non hanno prove associate. Confermare UNKNOWN significa confermare che manca documentazione, non che il servizio sia assente.','field-help'));
    return group;
  }
  function renderGroupConfirmation(item,alt,filter,group,target){
    if(!group)return;
    const binding=displayedBinding(item),ids=[...group.fieldKeys],box=node('section',undefined,'panel');box.id='group-confirmation';
    box.append(node('h3','La conferma riguarda soltanto questi '+ids.length+' campi visibili'));
    const list=node('ul');for(const key of ids){const f=alt.fields.find(f=>f.key===key);list.append(node('li',(f.label||key)+' ['+key+']'));}box.append(list);
    box.append(node('p','Confermo la trascrizione, compresi gli UNKNOWN e i motivi mostrati. Il controllo dell’assistente è supporto separato: non è una mia conferma e non rende questi dati idonei al Golden.','field-help'));
    const button=node('button','CONFERMO PERSONALMENTE QUESTI '+ids.length+' CAMPI','primary');button.id='confirm-visible-group';button.type='button';
    button.onclick=async()=>{
      const visible=[...byId('fields').querySelectorAll('section.field')].filter(el=>!el.hidden&&!el.classList.contains('hidden')).map(el=>el.dataset.fieldKey);
      if(byId('field-filter').value!==filter||alternativeId!==alt.id||byId('review-group-picker').value!==group.id||JSON.stringify(visible)!==JSON.stringify(ids)){message('Il gruppo visualizzato è cambiato. Rileggi i campi prima di confermare.',true);return;}
      if(ids.some(k=>fieldEditors.has(item.caseId+'|'+alt.id+'|'+k))){message('Prima applica o annulla le correzioni aperte. Nessun campo è stato confermato.',true);return;}
      const saved=await action('REVIEW_GROUP',{alternativeId:alt.id,groupId:group.id,viewFilter:filter,fieldKeys:ids,confirmed:true,groupPolicy:alt.groupPolicy},binding);
      if(saved)byId('fields').scrollIntoView({block:'start'});
    };box.append(button);target.append(box);
  }
  function renderDiagnosticOverview(item){
    let panel=byId('diagnostic-overview');if(!panel){panel=node('section',undefined,'panel');panel.id='diagnostic-overview';byId('scenario').after(panel);}panel.replaceChildren(node('h2','Cinque osservazioni, non cinque alternative già idonee'));
    panel.append(node('p','Verifica soltanto la fedeltà della trascrizione. Nessuna scelta, giudizio cieco, replay o ammissione Golden è disponibile. UNKNOWN significa non documentato, non assente. Prezzo visualizzato, totale completo, capienza, letti e uso esclusivo restano distinti.','notice'));
    for(const text of item.context||[])panel.append(node('p',text,'field-help'));
    const cards=node('div',undefined,'cards');for(const alt of item.alternatives){const card=node('article',undefined,'card'),list=node('dl');card.append(node('h3',alt.label));for(const key of ['propertyName','roomName','displayedPrice','currency','completeTotal','rating','ratingScale','reviewCount','beds','capacity','exclusiveUse','mealPlan','breakfast','cancellation']){const field=alt.fields.find(f=>f.key===key);if(field)list.append(node('dt',field.label),node('dd',knownValue(field.value)));}card.append(list);const button=node('button','Controlla dati e prove');button.type='button';button.onclick=()=>{alternativeId=alt.id;byId('alternative-picker').value=alt.id;byId('field-filter').value='pending';renderFields(item);byId('fields').scrollIntoView();};card.append(button);cards.append(card);}panel.append(cards);
    const gallery=node('details');gallery.append(node('summary','Archivio completo delle prove, incluse immagini di contesto e tariffe non selezionate'));const links=node('div',undefined,'refs');for(const proof of item.caseProofs||[]){const button=node('button',proof.label||proof.ref);button.type='button';button.onclick=()=>{const address=proofAddress(proof);if(address)window.open(address,'_blank','noopener,noreferrer');};links.append(button);}gallery.append(node('p','Questa galleria conserva tutte le immagini. L’appartenenza alla galleria non attribuisce una prova a un campo: usa i collegamenti accanto ai valori.'),links);panel.append(gallery);
    const groupCount=item.alternatives.reduce((sum,alt)=>sum+(alt.reviewGroups?.all?.length||0),0);
    panel.append(node('p','Campi da leggere: '+allFields(item).length+'. Conferme di gruppo per una revisione iniziale completa senza correzioni: '+groupCount+'; poi un riepilogo e una conferma complessiva. Revisione individuale sempre disponibile. Nessuna approvazione di campi nascosti. Revisione umana: '+(item.reviewConfirmed?'TRASCRIZIONE CONFERMATA; ambito ancora DIAGNOSTIC_ONLY':'PENDING')+'.','notice'));
  }
`;
  result = result.replace('  function renderJudgment(item) {', diagnostic + '\n  function renderJudgment(item) {');
  if (result.includes('id="judgment-form"') || result.includes('id="decision-tab"')) throw Error('TRANSCRIPTION_RENDER_CAPABILITY_FAILED');
  return result;
}
