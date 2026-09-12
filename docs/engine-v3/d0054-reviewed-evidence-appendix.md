# D-0054 — Appendice di prove per diagnostica REVIEWED

Base: `137238c9bdbe2e732d9232309700c085e5e5ac35`.
Perimetro: evaluation-only; implementazione e verifica con prove sintetiche.
Questo documento non autorizza raccolta, importazione, custodia, una misura reale,
giudizio cieco o Golden admission. Gli esiti privati precedenti, incluso D-0053,
restano associati al codice effettivamente misurato: non sono risultati D-0054.

## Percorso effettivo

`scripts/reviewed-evidence-appendix-v1.mjs` aggiunge un ingresso separato:

```text
richiesta REVIEWED originale
  → prepareObservedOfferDiagnostic
  → controlli journal/fonti/trasformazioni/applicabilità/esigenze R1
  → binding esatto dell'appendice e verifica puntuale delle nuove prove
  → nuova vista dei requisiti, senza modifica degli originali
  → reprojectObservedRequirementCandidate
  → computeObservedOfferDiagnosticV3
  → policy esistente: scelta, astensione oppure mancata esecuzione documentata
```

La separazione preparation/execution in `observed-offer-execution-v1.mjs`
riusa la medesima preparazione del percorso precedente. Non crea un DTO con valori
provvisori e non trasforma una richiesta REVIEWED in SYNTHETIC. Il kernel, i pesi,
le soglie, i ruoli e il comportamento pubblico non vengono modificati.

`createReviewedAppendixBinding(request)` esegue i controlli della base e restituisce
il binding senza invocare la policy. `prepareObservedOfferDiagnostic(request)`
permette inoltre di ispezionare la proiezione originale validata senza eseguirla.
`executeReviewedEvidenceAppendix(request, appendix, compute)` esegue invece il
raccordo e il callback del kernel locale compilato. Quest'ultima operazione, su
dati reali, richiede un incarico distinto: un controllo strutturale non è consenso
a una misura diagnostica.

Un'appendice vuota conserva l'input e il risultato del percorso precedente. Le
offerte non integrate rimangono nel set; lacune e violazioni non vengono nascoste
eliminando candidati. La copertura delle esigenze originali resta quella verificata
da R1: un'appendice non può disattivarle o aggiungere privacy obbligatoria.

## Contratto versionato

Versioni esportate dal modulo:

- `APPENDIX_VERSION = stayopti.reviewed-evidence-appendix@1`;
- `POINT_EVIDENCE_VERSION = stayopti.appendix-point-evidence@1`;
- `POINT_REVIEW_VERSION = stayopti.appendix-point-review@1`.

La busta contiene `version`, `id`, `classification: DIAGNOSTIC_ONLY`, `base`,
`evaluatedAt`, `integrations` e `proofs`. Gli ID delle integrazioni e delle prove
sono univoci; prove non riferite da alcuna integrazione sono rifiutate. I riferimenti
sono opachi e non costituiscono preferenze di ordinamento o scelta.

| Parte | Binding verificato |
|---|---|
| `base.caseId` | Identità del caso originale |
| `packetHash`, `journalHash`, `eventCount`, `source` | Packet, storico completo e binding restituito dai controlli REVIEWED |
| `projectionFingerprint`, `normalizationFingerprint` | Esatta proiezione confermata e normalizzazione già validata |
| `base.offers[]` | `alternativeId`, `offerBindingFingerprint` e intero `scope` originale |
| `integration` | `id`, `alternativeId`, `field`, `proofId`, `claim`, `temporal` |
| `proof` | `id`, `artifact`, `transcription`, `pointReview` |

Lo scope della prova deve uguagliare quello dell'offerta: identità della camera e
della tariffa, soggiorno e valuta, composizione degli ospiti e unità richieste.
Non basta che due record descrivano la stessa struttura. Le condizioni dei bambini
non cambiano gli adulti o le età della famiglia; locali interni, unità, posti letto,
uso esclusivo e bagno privato sono fatti diversi.

### Catena contenuto → trasformazione → revisione puntuale

`artifact` contiene `ref`, `mediaType`, `base64` e `sha256`. Il modulo decodifica i
byte, verifica base64 canonica e SHA-256. Non apre file, URL o archivi e non offre
un nuovo collector. Il chiamante deve conservare i byte originali privatamente.

`transcription` contiene `content` JSON e il relativo SHA-256. Per `text/plain` e
`application/json`, il testo deve coincidere con i byte UTF-8 dell'artefatto. Una
prova visiva richiede invece `method: POINT_TRANSCRIPTION_OF_VISUAL_SOURCE` e
`sourceRegion`: non è presentata come copia testuale identica dell'immagine.

Il JSON trascritto contiene la versione della prova, `scope`, `field`, `statement`,
`sourceRef`, `sourceKind`, `observationId`, `observedAt`, `timeSource`, `validUntil`,
`applicability`, `continuity` e `temporal`. La continuità ammessa è
`SAME_HISTORICAL_RATE`, con fingerprint dell'offerta e della proiezione e una base
documentata. Nuova camera, tariffa o versione dell'offerta non viene sostituita
silenziosamente: il relativo raccordo non è implementato in questo formato.
Una stessa prova può contenere `entries[]` con `field`, `statement` e `temporal`
distinti e univoci: questo permette di legare costo e prenotabilità agli stessi
byte, senza duplicare o fabbricare due certificazioni indipendenti. Le voci non
possono ridefinire fonte, ambito, istante o scadenza: ammettono esclusivamente
`field`, `statement` e `temporal`. Metadati aggiuntivi sono respinti, non fusi.

`pointReview` lega hash dell'artefatto, hash della trascrizione e fingerprint del
contenuto osservativo. Registra attore, istante, metodo
`SOURCE_CONTENT_AND_EXACT_OFFER_SCOPE_CHECK`, `scopeBasis`, `meaningBasis` e
`limitations`; `receiptSha256` è calcolato sul corpo senza lo stesso hash.
Per una base reale l'attore richiesto è `HUMAN`; soltanto una base di fixture
`packet.mode: SYNTHETIC_TEST` accetta un attore `SYNTHETIC_TEST`.

Questa è una nuova verifica puntuale delle sole prove aggiunte, separata dalla
conferma generale già conclusa. Un flag, una ricevuta autoattribuita o un hash
corretto non autenticano indipendentemente la fonte, la persona o il fatto. Il
software verifica la catena, l'ambito e il significato supportato; la veridicità
della prova e della revisione resta responsabilità del processo autorizzato.
L'output esplicita `independentSourceAuthentication: false`.

## Campi e grammatica circoscritta

`claim.state/value` deve coincidere con il risultato del decoder del contenuto,
non soltanto con la volontà del chiamante. `claim.reason` deve essere esplicito.
Il valore materializzato attraversa anche il contratto dei requisiti esistente.

| Campo | Contenuto ammesso e limite |
|---|---|
| `completeTotal` | Frase completa con base, tasse obbligatorie, costi obbligatori e totale in valuta coerente; somma verificata in unità monetarie minori |
| `availability.bookability` / `availability.unavailable` | Verifica della precisa tariffa; non basta una disponibilità pubblica osservata |
| `unitsOffered`, `internalRooms`, `capacityGuests` | Normalizzatori numerici/testuali bounded già esistenti, ciascuno con la propria semantica |
| `sleeping` | Inventario italiano supportato oppure inventario esplicito completo con tipo, quantità e posti per letto; divani e castelli senza posti documentati restano incerti |
| `privateBathroom`, `exclusiveUse` | Interprete scoped esistente: affermazione, negazione, conflitto e condizione restano distinti |
| `children.admitted`, `minimumAge`, `adultPricingFromAge`, `extraBedsAvailable` | Sotto `children`, grammatica preesistente delle condizioni; tariffazione adulta non modifica la composizione degli ospiti |
| `ratingScale` | Denominatore esplicito positivo della scala; non inventa né sostituisce il rating osservato |

Esempi esclusivamente inventati della grammatica nuova:

```text
Complete stay cost: base 180.00 EUR + mandatory taxes 20.00 + mandatory fees 0.00 = 200.00; all mandatory charges quantified
Selected rate verification: bookable
Selected rate verification: not bookable
Selected rate verification: unavailable
Complete sleeping inventory: DOUBLE count 1 places each 2; SOFA count 1 places each UNKNOWN
Rating scale: 0-10
```

Queste stringhe illustrano il parser, non sono certificati e non vanno fabricate
per ottenere una raccomandazione. Se una trascrizione puntuale le usa, la fonte
deve sostenere ogni componente e il revisore deve averne verificato il significato.
Un generico «tasse incluse» non quantifica automaticamente il costo completo.
Condizioni, testo non supportato e `UNKNOWN` case-insensitive producono incertezza,
non false conferme. La rimborsabilità testuale resta fuori da D-0054.

Costo, prenotabilità e indisponibilità richiedono `RATE_VERIFICATION_RECORD`, non
`PUBLIC_OBSERVATION` o `PROPERTY_DOCUMENT`. Tutti i campi richiedono `OFFER_SCOPED`,
salvo `ratingScale`, che può essere `PROPERTY_WIDE` con collegamento documentato.
La scala richiede inoltre `ratingObservationBinding`: `claimSha256` della precisa
claim `ratingObserved` originale, `observedValue`, relazione
`SCALE_OF_THIS_PUBLISHED_OBSERVATION` e `basis` documentata. La stessa struttura
non dimostra che due fonti di recensioni usino la stessa scala.
Le osservazioni generiche originali sono conservate anche quando non certificano
la tariffa.

## Tempo, conflitti e vista integrata

Ogni integrazione lega `priorClaimSha256` alla claim storica. Il significato
temporale è incluso nel contenuto revisionato, non aggiunto dopo la revisione.

| Relazione | Condizione minima |
|---|---|
| `RESOLVE_UNKNOWN` | La claim originale è UNKNOWN |
| `CORROBORATE_SAME_CONTEXT` | Lo stesso istante osservativo della claim originale; una discordanza rimane conflitto |
| `DOCUMENTED_SUCCESSOR` | Istante successivo dimostrabile rispetto alla claim originale e continuità della stessa tariffa |

`retiredObservations` può ritirare dalla sola vista attiva un campo dedicato di
privacy originariamente UNKNOWN, con hash esatto. Non ritira un'intera lista
servizi né cancella una negazione nota. `retiredAvailability` può indicare claim
storiche di disponibilità puntualmente legate e precedenti a un successore; non
cancella un'altra nuova prova contraddittoria. Tutto resta nello storico restituito.

Due integrazioni dello stesso fatto devono concordare su significato, istante,
validità e relazione; altrimenti la vista integrata conserva `CONFLICTING`.
Ordinamento, ID o massimo timestamp non sono una regola di verità. Una nuova
condizione esplicita di privacy non viene ignorata come semplice testo non
supportato: qualifica il fatto attivo come incerto o conflittuale rispetto a una
precedente affermazione nello stesso contesto; non lascia una falsa conferma.

Le prove finanziarie richiedono un `validUntil` documentato che copra
`evaluatedAt`. Un intervallo mancante o scaduto è insufficiente. Per un costo e una
prenotabilità positivi utilizzabili insieme, il raccordo richiede inoltre prove
integrate con uguali hash dell'artefatto originale, `sourceRef`, `observedAt` e
`observationId`, della medesima tariffa. Un nuovo
record di prenotabilità non rinnova automaticamente il vecchio prezzo.

Non è introdotta una tolleranza temporale arbitraria né una certificazione
indipendente della freschezza. Gli istanti delle claim storiche restano invariati;
il nuovo `evaluatedAt` rappresenta l'istante della valutazione, non una ricattura.
Centro della fonte e selected-location restano distinti e non sono integrabili
tramite questa appendice.

## Esiti e limiti

| Esito dell'integrazione | Significato |
|---|---|
| `APPLIED` | Trasformazione valida applicata alla nuova vista; non prova da sola raccomandabilità |
| `REJECTED` | Prova, binding, ambito o trasformazione non validi; motivo preciso, nessuna applicazione |
| `INSUFFICIENT` | Contenuto incerto/non supportato oppure requisito temporale non dimostrato |
| `CONFLICTING` | Contraddizione non risolta conservata come tale |

Binding/schema della busta errati interrompono l'ingresso prima del kernel. Le
integrazioni singolarmente respinte sono invece rendicontate senza eliminare le
altre offerte. `consumedFacts` distingue claim proposta, claim attiva e
`consumedAsKnownFact`; `temporalGaps` espone le fusioni temporali non ammesse.
La proiezione conserva base, osservazioni storiche, nuove prove e provenienza.

I requisiti della raccomandazione restano quelli esistenti: costo completo
applicabile, prenotabilità e sistemazione adeguata, oltre a copertura e idoneità.
Costo senza prenotabilità, o viceversa, non rende raccomandabile il candidato.
Una lacuna rappresentabile può lasciare calcolabili alcune dimensioni e produrre
un'astensione effettiva; esigenze non rappresentabili possono impedire la policy.
Le due condizioni non sono sinonimi. Nessuna robustezza completa, regret,
confronto umano, equivalenza Best Over Budget/Upgrade o Golden è dichiarata.

## Minimo passo per una futura integrazione reale

1. Ottenere un incarico distinto per le sole prove necessarie e per la successiva
   eventuale misura. D-0054 non acquisisce né applica materiali reali.
2. Conservare packet, journal confermato, normalizzazione e prove precedenti
   immutabili. Verificare il codice effettivo e preparare il binding mediante
   `createReviewedAppendixBinding` con la richiesta REVIEWED originale.
3. Per le sole offerte interessate conservare nuovi artefatti originali privati e
   redigere trascrizioni puntuali: campo, fonte, ambito, camera/tariffa, soggiorno,
   ospiti, valuta, unità, istante e continuità. Non adattare gli originali al parser.
4. Registrare una revisione umana reale delle nuove prove e delle trasformazioni,
   con limiti espliciti e hash nella sequenza artefatto → trascrizione → contenuto
   → ricevuta. Non ripetere la revisione generale già conclusa e non usare un
   attore sintetico per materiale reale.
5. Preparare l'appendice come nuovo documento DIAGNOSTIC_ONLY. Una nuova versione
   della tariffa non collegabile deve restare fuori da questo ingresso, non essere
   rinominata come quella storica.
6. Solo con autorizzazione alla misura, invocare l'API pura
   `executeReviewedEvidenceAppendix` con il kernel locale compilato
   `computeObservedOfferDiagnosticV3`; salvare nuovi input/output e hash
   privatamente senza sovrascrivere misure precedenti.

Non esiste una CLI D-0054 di acquisizione, importazione o custodia. La preparazione
non deve essere confusa con un comando operativo reale già autorizzato. Le prove
sintetiche riproducibili e i comandi canonici di verifica sono nel repository;
non richiedono compilazione manuale dei dati da parte del viaggiatore.

## Verifica del checkpoint

Verifica effettiva su checkout Git isolato e pulito, Windows CurrentUser, Node
24.18.0 e PowerShell 5.1.26100.9444; nessuna dipendenza dai file esclusi del PC.
Il tree del codice verificato è `d7c9db301ced7958a0199b39fb349829970c9074`.
I successivi paragrafi di risultato sono una modifica soltanto documentale:
il consolidamento risigilla il candidato verificando codice/test byte-identici.

| Gate locale | Esito osservato |
|---|---|
| Nuovi D-0054 / mirati complessivi D-0041, D-0050, D-0051/R1, D-0052/R1/R2 | 76/76 / 289/289 PASS |
| Engine V3 canonica completa | 2196/2196 PASS, zero skip/fail |
| Engine V2 canonica | 196/196 PASS |
| Lifecycle | 530 PASS, 17 skip preesistenti espliciti, zero fail |
| Security / release | 29/29 / 101/101 PASS |
| Analytics / capacity / beta | 31/31 / 9/9 / 4/4 PASS |
| TypeScript / build / analytics-beta | PASS |
| Smoke sintetico staging loopback locale | PASS, 18 controlli |
| Parsing Windows PowerShell 5.1 reale | 13/13 PASS |
| Scansioni scoped segreti, artefatti privati, token e provenienza | PASS |
| Whitespace Git, sette esclusi e diciassette sigillati | PASS |

La suite V3 include i test effettivi del launcher Windows/DPAPI sintetico; non
certifica una custodia reale. Non sono stati eseguiti Linux nativo, audit del
registry delle dipendenze o nuova CI GitHub. Il workflow corrente non si avvia
automaticamente su questo push di work branch. `release:ci` nella sua interezza
include rete registry: non viene impropriamente dichiarato eseguito offline.

La prima esecuzione completa (2189 V3 PASS) precedeva il controllo finale dei
metadati `entries`. Non è usata come prova del codice finale. Il controesempio
scaduto è stato poi riprodotto, riparato e verificato insieme alle nuove
regressioni nel secondo giro completo 2196/2196. I due difetti concretamente
eseguiti durante lo sviluppo, privacy condizionata e override della scadenza,
sono conservati in `evidence/d0054-initial-synthetic-findings.json`. Il file
distingue esecuzioni prima/dopo da rilievi statici già corretti al primo probe.
Le correzioni delle nuove fixture e degli enum dei test sono documentate in
`evidence/d0054-test-development.json`, senza riscrivere fixture storiche o
attribuire il loro errore al motore.

### Risultati significativi

| Caso sintetico | Risultato del percorso effettivo |
|---|---|
| Appendice completa e coerente | Policy eseguita, decisione `usable`, tutte e tre le offerte conservate |
| Solo costo completo / sola prenotabilità | Lacuna complementare preservata, astensione effettiva |
| Tutte le offerte complete ma realmente oltre il budget della fixture | Astensione, non vincitore fabbricato |
| Esigenza essenziale originaria non rappresentabile | Policy non eseguita, nessuna falsa astensione attribuita al motore |
| UNKNOWN storico e inventario posti esplicito | Nuova vista valutabile; UNKNOWN originale intatto |
| Privacy condizionata contro affermazione nello stesso contesto | Conflitto consumato dal kernel, non bagno falsamente privato |
| Prova finanziaria scaduta / metadati della voce che tentano di sostituirla | Insufficiente / respinta, nessuna nuova prenotabilità certificata |
| Scala riferita a diversa osservazione o senza legame puntuale | Respinta; rating conservato ma omesso dal calcolo |
| Appendice vuota, ripetuta, integrazioni riordinate | Parità precedente e determinismo |

### Inventario e sincronizzazione

Dieci file: due moduli (`observed-offer-execution-v1.mjs` e
`reviewed-evidence-appendix-v1.mjs`), fixture e test D-0054, due ricevute sintetiche
di sviluppo, questo rapporto, decisione D-0054, CURRENT_STATE e append-only
DECISION_LOG. Nessun kernel/policy, dato reale, archivio, manifest privato o
file sigillato è incluso nella modifica. La copia privata preesistente del
rapporto resta separatamente esclusa e byte-identica, oltre ai sette path noti.

Per riprodurre con dipendenze locali già installate su Windows:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:engine-v3
```

Pubblicazione selettiva non-force soltanto su `codex/evaluation-d0036-d0041`.
La consegna registra SHA locale/remoto osservati, push effettivo e commit
pendenti; non li deduce da `origin/*`. Main non è una destinazione autorizzata.
