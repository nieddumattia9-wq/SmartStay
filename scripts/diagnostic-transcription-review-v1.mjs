import { createHash } from 'node:crypto';

// Evaluation-side transcription only. This is neither a custody nor a judgment contract.
export const VERSION = 'stayopti.diagnostic-transcription-review@1';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = code => { throw Error(code); };
const hash = value => sha256(json(value));
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function normalizeObservedField(raw) {
  if (!raw || !['OBSERVED','UNKNOWN','DERIVED'].includes(raw.kind) || !Array.isArray(raw.evidence)) fail('REVIEW_SOURCE_FIELD_INVALID');
  const unknown = raw.kind === 'UNKNOWN' || raw.value === null || typeof raw.value === 'string' && raw.value.trim().toUpperCase() === 'UNKNOWN';
  return { status: unknown ? 'UNKNOWN' : 'KNOWN', value: unknown ? null : structuredClone(raw.value),
    reliability: unknown ? 'UNKNOWN' : 'LOW', unknownReason: unknown ? raw.reason || 'Non documentato nelle prove associate.' : null,
    reason: unknown ? raw.reason || 'Non documentato nelle prove associate.' : null, evidenceRefs: [...raw.evidence] };
}
const LABELS = {propertyName:'Nome pubblicato',category:'Categoria',stars:'Stelle dichiarate',rating:'Rating pubblicato (valore/struttura originale)',ratingScale:'Scala massima del rating',reviewCount:'Numero recensioni',qualityRating:'Valutazione qualità separata',location:'Posizione testuale',distance:'Distanza dichiarata (riferimento originale)',roomName:'Camera / unità selezionata',rateName:'Nome tariffa',beds:'Disposizione letti dichiarata',area:'Superficie dichiarata',capacity:'Capienza dichiarata, non prova dei posti letto',exclusiveUse:'Uso esclusivo dell’alloggio',occupancy:'Ospiti richiesti',stay:'Date soggiorno',currency:'Valuta',displayedPrice:'Prezzo visualizzato — non totale completo',priceUnit:'Unità del prezzo',completeTotal:'Totale completo verificato',taxDisplay:'Dicitura fiscale osservata',taxesIncluded:'Imposte incluse documentate',taxesExcluded:'Imposte escluse documentate',payNow:'Importo da pagare subito',payAtProperty:'Importo da pagare in struttura',paymentTiming:'Momento/condizioni del pagamento',paymentRecipient:'Destinatario del pagamento',deposit:'Deposito separato',mealPlan:'Trattamento',breakfast:'Colazione (campo originale distinto)',refundable:'Rimborsabilità',refundability:'Rimborsabilità (campo originale distinto)',cancellation:'Condizioni di cancellazione',cancellationDeadline:'Scadenza cancellazione dichiarata',deadlineTimezone:'Fuso della scadenza',roomServices:'Servizi della camera',propertyServices:'Servizi della struttura',availability:'Disponibilità osservata',checkIn:'Orario check-in dichiarato',checkOut:'Orario check-out dichiarato',childrenPolicy:'Condizioni bambini',importantConditions:'Condizioni importanti',discounts:'Sconti',budgetFit:'Verifica budget — non certificata',scenarioNeeds:'Interpretazione documentata dei requisiti',selection:'Criterio di selezione (solo audit)',advertising:'Indicazione promozionale (solo audit)',rateMarketing:'Dicitura commerciale (solo audit)',childPriceCondition:'Condizioni prezzo bambini',includedRateServices:'Servizi inclusi nella tariffa',roomRateSourceId:'Identità tariffa nella fonte'};
const CRITICAL = new Set(['roomName','occupancy','stay','beds','capacity','exclusiveUse','completeTotal','taxesIncluded','taxesExcluded','mealPlan','breakfast','ratingScale','cancellation']);
LABELS.roomCapacity=LABELS.capacity; CRITICAL.add('roomCapacity');
export function normalizeOffers(offers, proofIds) {
  const ids = new Set(proofIds);
  return offers.map((offer,index) => {
    if (!offer.fields || !offer.offerId) fail('REVIEW_OFFER_INVALID');
    return { id: offer.offerId, label: `Alternativa ${index+1}`, fields: Object.entries(offer.fields).map(([key,raw]) => {
      const value = normalizeObservedField(raw);
      if (value.evidenceRefs.some(ref => !ids.has(ref))) fail('REVIEW_PROOF_REFERENCE_INVALID');
      return {key,label:LABELS[key] || key,critical:CRITICAL.has(key),value,reviewStatus:'PENDING',
        sourceKind:raw.kind,originalField:`offers.json/${index}/fields/${key}`,
        help: (raw.kind === 'DERIVED' ? 'Interpretazione del dossier, non un fatto osservato indipendente. ' : '') +
          (CRITICAL.has(key) ? 'Campo critico: UNKNOWN resta un limite anche dopo la conferma della trascrizione. ' : '') +
          'Controlla il valore sulle immagini collegate. Corretto significa trascrizione fedele, non certificazione del soggiorno. '+(raw.reason || ''),
        transformation:'Wrapper UNKNOWN canonico; tipo e unità conservati. Nessuna conversione di oggetti, importi o posti letto.',
      };
    }), proofs:[], audit:{displayedPosition:offer.displayedPosition ?? null,selectionStatus:'FIRST_DISTINCT_SHOWN_INCLUDING_ADS_NOT_ELIGIBILITY'}};
  });
}
export function validatePacket(packet) {
  if (packet?.schemaVersion !== VERSION || !['REAL_BROWSER_ASSISTED','SYNTHETIC_TEST'].includes(packet.mode) || packet.classification !== 'DIAGNOSTIC_ONLY' || packet.humanReview !== 'PENDING' || packet.custodyCreated !== false) fail('REVIEW_PACKET_SCOPE_INVALID');
  if (!/^[A-Z0-9_]+$/.test(packet.caseId) || !validHash(packet.sourceArchiveSha256) || !Array.isArray(packet.proofs) || !packet.proofs.length || !Array.isArray(packet.alternatives) || !packet.alternatives.length) fail('REVIEW_PACKET_INVALID');
  const refs = new Set();
  for (const proof of packet.proofs) {
    if (!/^[A-Za-z0-9_-]+$/.test(proof.ref) || refs.has(proof.ref) || !validHash(proof.sha256) || !/\.(jpg|jpeg|png)$/i.test(proof.path)) fail('REVIEW_PROOF_INVALID');
    refs.add(proof.ref);
  }
  const altIds = new Set();
  for (const alt of packet.alternatives) {
    if (!/^[A-Za-z0-9_-]+$/.test(alt.id) || altIds.has(alt.id) || !Array.isArray(alt.fields) || !alt.fields.length) fail('REVIEW_ALTERNATIVE_INVALID');
    altIds.add(alt.id);const keys = new Set();
    for (const field of alt.fields) {
      if (!/^[a-zA-Z0-9_]+$/.test(field.key) || keys.has(field.key) || field.reviewStatus !== 'PENDING') fail('REVIEW_FIELD_INVALID');
      keys.add(field.key); validateValue(field.value, refs);
    }
    if (!Array.isArray(alt.proofs) || alt.proofs.some(p=>!refs.has(p.ref))) fail('REVIEW_PROOF_REFERENCE_INVALID');
  }
  return packet;
}
function validateValue(value, refs) {
  if (!value || !['KNOWN','UNKNOWN'].includes(value.status) || !Array.isArray(value.evidenceRefs) || value.evidenceRefs.some(ref=>!refs.has(ref)) || new Set(value.evidenceRefs).size !== value.evidenceRefs.length) fail('REVIEW_VALUE_INVALID');
  if (value.status === 'UNKNOWN' && (value.value !== null || !String(value.reason || value.unknownReason || '').trim())) fail('REVIEW_UNKNOWN_REASON_REQUIRED');
  if (value.status === 'KNOWN' && (value.value === null || value.value === undefined || !value.evidenceRefs.length || typeof value.value === 'string' && /^unknown$/i.test(value.value.trim()))) fail('REVIEW_KNOWN_REQUIRES_EVIDENCE');
  const inspect = v => { if (typeof v === 'number' && !Number.isFinite(v)) fail('REVIEW_VALUE_INVALID'); if (v && typeof v === 'object') for (const [key,item] of Object.entries(v)) { if (['__proto__','constructor','prototype'].includes(key)) fail('REVIEW_VALUE_INVALID'); inspect(item); } };
  inspect(value.value);
}
export function initialReview(packet, codeHash) {
  validatePacket(packet);if (!validHash(codeHash)) fail('REVIEW_CODE_BINDING_INVALID');
  return {packetHash:hash(packet),codeHash,revision:0,caseId:packet.caseId,alternatives:structuredClone(packet.alternatives),reviewConfirmed:false,humanReview:'PENDING',lastEventHash:null};
}
export function fingerprint(state) { return hash({packetHash:state.packetHash,codeHash:state.codeHash,fields:state.alternatives.map(alt=>({id:alt.id,fields:alt.fields.map(field=>({key:field.key,value:field.value}))}))}); }
// Presentation grouping only: exact common evidence set, no value/quality inference.
export const GROUP_POLICY = 'stayopti.diagnostic-visible-proof-groups@1';
export function reviewGroups(alt, filter='all') {
  if (!['all','pending','critical'].includes(filter)) fail('REVIEW_GROUP_FILTER_INVALID');
  const buckets=new Map(), groups=[];
  for (const field of alt.fields) {
    const signature=JSON.stringify([...field.value.evidenceRefs].sort());
    if (!buckets.has(signature)) buckets.set(signature,[]);
    buckets.get(signature).push(field);
  }
  for (const [signature, fields] of buckets) for (let offset=0;offset<fields.length;offset+=5) {
    const chunk=fields.slice(offset,offset+5), fieldKeys=chunk.filter(f=>filter==='all'||filter==='critical'&&f.critical||filter==='pending'&&f.reviewStatus==='PENDING').map(f=>f.key);
    if (fieldKeys.length) groups.push({id:hash({policy:GROUP_POLICY,alternativeId:alt.id,keys:chunk.map(f=>f.key)}),fieldKeys,evidenceRefs:JSON.parse(signature)});
  }
  return groups;
}
export function applyReview(state, action, packet) {
  if (!['REVIEW_FIELD','REVIEW_GROUP','CORRECT_FIELD','CONFIRM_REVIEW'].includes(action?.type)) fail('REVIEW_ACTION_NOT_AUTHORIZED');
  const keys=['type','caseId','expectedRevision','contentFingerprint',...(action.type==='CONFIRM_REVIEW'?['confirmed']:action.type==='REVIEW_GROUP'?['alternativeId','groupId','viewFilter','fieldKeys','confirmed','groupPolicy']:['alternativeId','fieldKey',action.type==='CORRECT_FIELD'?'value':'reviewStatus'])];
  if(Object.keys(action).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(action,key)))fail('REVIEW_ACTION_SCHEMA_INVALID');
  if (action.caseId !== state.caseId || action.expectedRevision !== state.revision || action.contentFingerprint !== fingerprint(state)) fail('DEMO_DISPLAYED_VERSION_STALE');
  const next=structuredClone(state);
  if (action.type === 'CONFIRM_REVIEW') {
    if (action.confirmed !== true || next.alternatives.some(a=>a.fields.some(f=>f.reviewStatus==='PENDING'))) fail('REVIEW_CONFIRMATION_INCOMPLETE');
    next.reviewConfirmed=true; next.humanReview='TRANSCRIPTION_REVIEWED_DIAGNOSTIC_ONLY';
  } else if (action.type === 'REVIEW_GROUP') {
    const alt=next.alternatives.find(a=>a.id===action.alternativeId);
    const group=alt && reviewGroups(alt,action.viewFilter).find(g=>g.id===action.groupId);
    if (!group || action.groupPolicy!==GROUP_POLICY || action.confirmed!==true || !Array.isArray(action.fieldKeys) || JSON.stringify(action.fieldKeys)!==JSON.stringify(group.fieldKeys)) fail('REVIEW_VISIBLE_GROUP_MISMATCH');
    // Only the explicit visible set changes review status. UNKNOWN and all proof
    // metadata remain byte-equivalent; this is not a human decision judgment.
    for (const field of alt.fields) if (group.fieldKeys.includes(field.key)) field.reviewStatus='CORRECT';
    next.reviewConfirmed=false;next.humanReview='PENDING';
  } else {
    const alt=next.alternatives.find(a=>a.id===action.alternativeId), field=alt?.fields.find(f=>f.key===action.fieldKey);
    if (!field) fail('REVIEW_FIELD_NOT_FOUND');
    if (action.type==='REVIEW_FIELD') {
      if (!['CORRECT','UNVERIFIABLE'].includes(action.reviewStatus)) fail('REVIEW_STATUS_INVALID');
      if (action.reviewStatus==='UNVERIFIABLE') field.value={...field.value,status:'UNKNOWN',value:null,reliability:'UNKNOWN',reason:'Non verificabile secondo revisione umana delle prove associate.',unknownReason:'Non verificabile secondo revisione umana delle prove associate.'};
      field.reviewStatus=action.reviewStatus;
    } else {
      validateValue(action.value,new Set(packet.proofs.map(p=>p.ref)));
      if (JSON.stringify(action.value.evidenceRefs)!==JSON.stringify(field.value.evidenceRefs)) fail('REVIEW_EVIDENCE_REBIND_FORBIDDEN');
      field.value={...structuredClone(action.value),unknownReason:action.value.status==='UNKNOWN'?action.value.reason:null,reliability:action.value.status==='UNKNOWN'?'UNKNOWN':'LOW'};
      field.reviewStatus='PENDING';
    }
    next.reviewConfirmed=false;next.humanReview='PENDING';
  }
  next.revision++; return next;
}
export function reviewView(packet,state) {
  const alternatives=structuredClone(state.alternatives);
  for (const alt of alternatives) {
    alt.reviewGroups=Object.fromEntries(['all','pending','critical'].map(filter=>[filter,reviewGroups(alt,filter)]));
    alt.groupPolicy=GROUP_POLICY;
    alt.proofs=alt.proofs.map(p=>({...packet.proofs.find(x=>x.ref===p.ref),url:`/api/proof/${packet.caseId}/${p.ref}`,path:undefined}));
  }
  return {selectedCaseId:packet.caseId,cases:[{...state,synthetic:packet.mode==='SYNTHETIC_TEST',classification:'DIAGNOSTIC_ONLY',scenario:packet.scenario,temporal:null,context:packet.context,caseProofs:packet.proofs.map(p=>({ref:p.ref,label:p.label,url:`/api/proof/${packet.caseId}/${p.ref}`})),alternatives,contentFingerprint:fingerprint(state),eligibility:{eligible:false,issues:['Sola revisione della trascrizione autorizzata. Totali completi, scale rating e requisiti non verificati restano bloccanti.']},comparison:null,judgments:[],exposure:null}]};
}
