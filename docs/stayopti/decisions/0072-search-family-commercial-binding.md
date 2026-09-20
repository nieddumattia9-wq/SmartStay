# D-0072 — contesto familiare della ricerca fino al binding A02

Data: 2026-09-20. Base `e3622ae2a535acd80099a4e0f9a9ff630e747aa1`.
Autorizzazione esplicita Mattia: implementazione, test sintetici e pubblicazione
sul solo branch di lavoro. Non cambia alcuna formula, peso, ruolo o attivazione.

## Controesempio e correzione

`tests/engine-v3/fixtures/a02-family-before.json` conserva la riproduzione
effettiva sul codice precedente, con hash sorgente: due adulti, due bambini
6/11, camera sintetica con due matrimoniali/quattro posti. Metadati ripristinati,
input V2 e decisione perdevano le età; A02 era SUPPORTED_AT_OBSERVATION ma
il binding rifiutava DECISION_CHILD_AGE_BINDING_UNREPRESENTABLE.

Ora il produttore TripOptimizer conserva le età originarie e **lo stesso array
di assegnazioni effettivamente inviato** nella richiesta. La sua funzione di
allocazione è estratta in `utils/searchRoomAssignments.ts`, senza cambiare
l'algoritmo round-robin né la classificazione pubblica: 0–12 anni, coerente con
GuestsSelector e `server/validation/requestValidation.js`. Input invalidi non
sono filtrati per ottenere una composizione valida. Il core comune non assume
una soglia universale; A02 mantiene il proprio limite storico 0–17.

`utils/searchParty.ts` definisce `stayopti.search-party@1`: sorgente originale
separata dalla proiezione semantica; età KNOWN/UNKNOWN/PARTIAL/INVALID e
assegnazione KNOWN/UNKNOWN/INVALID. Molteplicità preservate, nessun default
positivo. Nella singola camera [6,11] e [11,6] coincidono, [6,6] resta una coppia.
Per più camere gli ordinali della richiesta e i relativi adulti/età restano
distinti. Mancanza di assegnazione non autorizza a ricostruirla dalle offerte.

## Chiamanti realmente collegati

1. TripOptimizer → createStoredSearchMeta → serializzazione e
   normalizeStoredSearchMeta. Gli originali `searchParty` non sono riscritti.
2. Results → buildSmartStayFrontendRuntimeV2 → SmartStayEngineV2SearchInput.
   L'effetto di ranking dipende anche da searchParty (oltre a date/valuta): un
   cambio delle sole età non riutilizza il contesto precedente.
3. adaptV2SearchResultToDecisionV3 → context.party canonico, scope dei peer,
   inputFingerprint e decisionFingerprint. Nessun peso usa le nuove età.
   Il validatore controlla la nuova estensione e il fingerprint ricalcolato.
4. A02 autenticazione byte → normalizzazione → validazione pura → binding →
   runIndependentDecisionShadowV3 e replay effettivi. L'ingresso usa ancora i
   due protocolli **inventati**, non una certificazione provider LIVE.

Il packet `synthetic-commercial-packet@1.1` seleziona esplicitamente
`stayopti.offer-commercial-evidence@1.1`. Solo questa versione confronta le
età della singola unità come multinsieme mediante la funzione comune.
Originali/eventi conservano ordine e hash; il fingerprint semantico riconosce
le equivalenze, quello di provenienza continua a distinguerle. Le età della
decisione provengono dalla ricerca, mai dalla tariffa.

## Compatibilità e limiti

- Metadati/input senza searchParty e decisioni senza context.party mantengono
  il contratto storico, senza aggiunta di età. Il validatore commerciale @1 e
  il validator rates-prebook-get-prebook conservano la semantica precedente.
  Il digest congelato del secondo resta verificato dalle regressioni CE.
- Nessuna migrazione di packet, ricevute, manifest, progressi o risultati.
  I nuovi binding familiari esigono la versione commerciale esplicita; vecchie
  prove non vengono promosse cambiando un campo di una ricevuta.
- **Multicamera non rappresentabile nel binding A02 attuale**: lo scope wire
  espone età aggregate e units, non l'assegnazione. La decisione la conserva;
  il binding rifiuta COMMERCIAL_ROOM_ASSIGNMENT_UNREPRESENTABLE. Nessun
  appiattimento fittizio, nemmeno con liste globali identiche.
- Le età non certificano capienza, letti, condizioni bambini, completezza
  fiscale, freschezza o prenotabilità. Restano tutti i controlli A02 su costi,
  condizioni, ambito, originali autenticati e tempi. RoomId/versione offerta
  restano più dettagliati nelle prove che nel DTO storico; restrizioni o
  pagamento non rappresentabili mantengono i rifiuti precedenti.
- I test positivi dichiarano quattro posti e conservano prezzo, tasse,
  trattamento, cancellazione e disponibilità dei controlli completi. Non
  aggiungono una deroga familiare, nuove soglie o un'attestazione umana.

## Verifica e rendiconto

Prove nuove attraverso metadati ripristinati, frontend/V2, decisione e binding:
entrambi i protocolli, shadow/replay effettivi, permutazioni, molteplicità,
assenza bambini, incompletezza/invalidità, sostituzioni dopo preparazione e
binding, scope multicamera, compatibilità storica. I collegamenti React e le
dipendenze sono controllati staticamente; non si dichiara una sessione browser.
I risultati finali Windows isolati sono riportati nell'addendum dopo i gate.
Una prima compilazione del nuovo test ha rilevato un nome errato dell'assert
di replay; corretto usando il contratto effettivo, senza cambiare il prodotto.
La revisione del candidato ha inoltre riprodotto un rifiuto improprio dovuto
al solo ordine delle chiavi JSON dell'assegnazione (fingerprint invariato ma
validazione falsa). Il validatore finale confronta i campi, non l'ordine delle
chiavi; un record camera malformato è invece rifiutato. Controesempio conservato
separatamente dai risultati del candidato corretto.

Solo Git remoto e audit dipendenze del gate possono usare rete. Zero provider,
acquisizioni, credenziali o decifrazioni private. Main, sette esclusi, diciassette
sigillati e copia privata aggiuntiva rimangono invariati. Ogni fase deve riportare
push effettivo, SHA remoto e commit ancora locali, non inferirli dal PASS.

### Gate finali osservati

Candidato isolato `a3be50a85d0aa1d52aa868420ea653b33016dfa6`, Windows PowerShell
5.1 CurrentUser. Regres­sioni mirate **175/175**, incluse **32** nuove familiari,
A01, A02 e R06/temporali. `npm.cmd run release:ci`: **exit 0**, V2 **242/242**,
V3 **3262/3262**, zero fail/skip in entrambe. Lifecycle **665 PASS / 17 skip
Valkey preesistenti**; security **29**, release **101**, analytics **31**,
capacity **9**, beta **4** PASS. TypeScript, build, analytics-beta, audit root e
server-production (zero vulnerabilità) e smoke locale **18** controlli PASS.
La suite include i launcher sintetici Windows/DPAPI; nessuna chiamata provider.
Risultati locali, non CI GitHub. Il candidato intermedio decb603 aveva 3261
test V3: quel risultato non è attribuito al software finale.

Prima del commit si confrontano gli hash sorgente/test con il candidato
verificato, si eseguono scansione mirata di segreti/dati privati e controlli
Git; soltanto questo rendiconto viene completato dopo i test. I 25 path protetti
mantengono hash, dimensione e timestamp. Staging selettivo, niente file ignorati,
acquisizioni, allegati o dati reali. Pubblicazione e SHA remoto sono verificati
in consegna dopo il push non-force, senza modificare main.

### Inventario della modifica (18 file)

- Ricerca/metadati: `src/utils/searchParty.ts`, `src/utils/searchRoomAssignments.ts`,
  `src/utils/searchMeta.ts`, `src/components/TripOptimizer/TripOptimizer.tsx`,
  `src/pages/Results/Results.tsx`.
- V2/V3: `src/engine-v2/frontend/smartStayFrontendAdapterV2.ts`,
  `src/engine-v2/orchestrator/smartStayEngineV2.ts`,
  `src/engine-v3/adapter/v2CompatibilityAdapterV3.ts`,
  `src/engine-v3/contract/stayOptiDecisionV3.ts`.
- A02: `src/engine-v3/contract/commercialEvidenceV3.ts`,
  `src/engine-v3/evaluation/syntheticCommercialProtocolsV3.ts`,
  `src/engine-v3/evaluation/boundCommercialEvidenceV3.ts`.
- Test/prove sintetiche: `tests/engine-v3/v3FamilyCommercialBinding.test.ts`,
  `tests/engine-v3/fixtures/familyCommercialSyntheticV3.ts`,
  `tests/engine-v3/fixtures/a02-family-before.json`.
- Documentazione: questo record, `docs/stayopti/CURRENT_STATE.md`,
  `docs/stayopti/DECISION_LOG.md`.
