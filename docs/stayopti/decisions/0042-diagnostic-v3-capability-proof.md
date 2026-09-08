# D-0042 — Prerequisiti dimostrati e calcolo diagnostico V3

2026-09-08. Fonte software: `ca27f05255d50da1e890fcb4a6b40facb40bbefb`,
branch `codex/evaluation-d0036-d0041`. Incarico: prova sintetica, correzione del
solo preparatore, commit/push sul branch di lavoro. Nessuna esecuzione reale.

## Decisione e rettifica D-0041

`critical` nella trascrizione indica un requisito di quella revisione, non una
prova del comportamento del motore. L'assessment @2 separa questi rilievi in
`transcriptionCompletenessFindings`. `dataBlockers=[]` accompagnato da
`NOT_EXECUTED_ON_CANONICAL_REAL_INPUT` NON significa dati idonei. Restano
`comparisonExecutable=false`, il mapping reale assente e il contesto distanza
non rappresentato fedelmente. Input/feedback e relativi fingerprint non cambiano;
non si riscrivono preparazioni, progressi, revisioni o manifest preesistenti.

Best Over Budget non mappato impedisce un confronto di tutti i ruoli, NON da
solo il confronto parziale di Best Choice. Nessuna modifica a ranking, curve,
soglie, validatori, gate Golden o runtime. La revisione conclusa resta conclusa;
feedback umano esposto, benchmark cieco, esecuzione e Golden sono cose diverse.

## Prova riproducibile, non un adapter reale

`diagnosticCapabilityProbeV3.ts` genera tre alloggi interamente inventati, con
prezzi e rating distinti. Non legge dossier e non accetta input reali. Sei
varianti attraversano davvero:

`SmartStayEngineV2SearchInput -> evaluateSmartStaySearchV2 ->
adaptV2SearchResultToDecisionV3 -> validateStayOptiDecisionV3 ->
createIndependentV3ComparableDecisionV3`.

La funzione finale e il suo errore vengono osservati, non sostituiti da un
risultato fittizio. La prova è PASS quando rileva correttamente anche un rifiuto.
Gli assert non pretendono che tutti i casi producano una raccomandazione.

| Variante | Validator canonico | Calcolo / affidabilità | Output indipendente |
|---|---|---|---|
| Controllo completo | valido | 3 candidati usable, utility/regret/robustness calcolabili | recommended / best-choice |
| Totale completo UNKNOWN, importo mostrato noto | valido | importo fallback osservato, cost completeness `reported-tax-status-unknown`; confidence ridotta; 3 usable nella robustness, soluzioni incomplete | errore: nessuna soluzione selezionata feasible |
| Scala rating UNKNOWN | valido | rating non normalizzabile omesso (`null`, flag false); osservazione conservata separatamente; minore evidence, altri dati ancora utilizzabili | recommended, non rifiuto universale |
| Entrambi UNKNOWN | valido | stessi due trattamenti, confidence ulteriormente ridotta | stesso errore di feasibility |
| Solo il candidato robusto ha totale UNKNOWN | valido | 2 soluzioni feasible ma il robust winner resta incomplete | errore; nessuna sostituzione opportunistica del vincitore |
| Nessuna offerta bookable | valido | reliability ineligible e candidati V3 ineligible | astensione `no-feasible-solution` |

Questi esiti sono della fixture, non percentuali generalizzabili. Il controllo
completo ha bookability esplicitamente vera **come fatto inventato del test**:
non prova bookability delle offerte pubbliche reali. Tutte le date sono fisse,
come pure capturedAt/bookingReferenceAt; nessuna dipendenza dall'orologio corrente.

### Funzioni/regole responsabili

- `src/utils/hotelOfferSelection.ts::hasPublicOfferId/createCandidate` richiede
  riferimenti pubblici `offer-N` o il formato hash ammesso. Un ID malformato
  esclude l'offerta prima della policy: è un requisito tecnico, non un merito.
- `src/utils/stayCost.ts::getComparableOfferAmount` usa totalKnownCost se noto,
  altrimenti price. `classifyStayCostCompleteness(null,...)` mantiene lo stato
  fiscale sconosciuto. Il solo `totalKnownCost=null` non è un blocco universale:
  `taxesIncluded=true` può classificare reported-complete. NON mappare una
  dicitura generica «Include tasse e costi» a una certezza fiscale non provata.
- `src/engine-v2/reliability/reliabilityGate.ts` mantiene warning
  `cost-tax-status-unknown` / `review-evidence-limited`; `no-bookable-offer` è un
  vero blocco. `qualityEngine.ts::isValidReviewScore/normalizeReviewScore` assume
  un rating canonico 0–10, NON scopre la scala della fonte. L'omissione sicura
  preserva null; non divide, moltiplica o presume la scala dal valore.
- `v2CompatibilityAdapterV3.ts::createSingleSolution` richiede bookable,
  importo/valuta/date e `reported-complete` per `feasibility=feasible`.
- `stayOfferIntegrityV3.ts::stateForTotal` rappresenta il prezzo incompleto
  come estimated e l'integrità come provisional. La compatibility map conserva
  anche zero tecnici per componenti fiscali numerici mancanti: NON sono prova
  di tasse assenti, né una rappresentazione sufficiente del totale reale.
- `decisionRobustnessV3.ts::createCandidateEvaluation` accetta provisional:
  esclude incomplete/conflicting, non ogni soluzione con feasibility incomplete.
  Perciò utility e robustness possono risultare calcolabili senza output finale.
- `independentDecisionEngineV3.ts::createIndependentV3ComparableDecisionV3`
  richiede una sola soluzione feasible per il robust winner e candidato usable;
  genera l'errore osservato. È un disallineamento tra strati da segnalare, non
  da aggirare filtrando a posteriori il vincitore o cambiando l'output in PASS.
- `stayOptiDecisionV3.ts::validateStayOptiDecisionV3` accetta rappresentazioni
  valide ma incomplete. Rifiuta versioni non canoniche (controllo negativo).

## Distanza dal sito al V3: numeri rappresentabili, semantica diversa

`DistanceSelector.tsx` dice **Maximum distance**, scelte 0.5, 1, 2, 5, 10 km e
Any. **3 km non è una scelta di questo controllo** (un valore non elencato viene
visualizzato come Any); non viene aggiunta qui. `TripOptimizer.tsx` salva
`maxDistanceKm` tramite `createStoredSearchMeta`; `Results.tsx` legge il valore
effettivo e lo passa come `maximumDistanceKm` al frontend runtime V2, quindi
all'orchestratore. Il tipo numerico del contratto accetta anche 3: la prova lo
esercita senza fingere che sia selezionabile oggi nello slider.

`locationEngine.ts::createDistanceConstraint` confronta la distanza riconciliata
con il massimo; una distanza provider non verificata lascia withinLimit unknown.
`calculateDistanceFitScore` usa anche un fit graduato. Il fit graduato NON rende
soft il vincolo: `smartStayEngineV2.ts::createExclusionReasonCodes` produce
distance-limit-exceeded/unverified e l'esclusione dal ranking V2.

La fixture usa coordinate inventate e distanze coerenti rispetto al punto
selezionato, non confonde la distanza dichiarata da un centro con un monumento.
Con cap1 sono fuori 2 candidati; con cap3 ne è fuori 1. La V3 compatibility
riceve score e constraints, ma l'eligibility usata per robustness è
`reliabilityGate.eligible && selectedOffer.bookable`: **non trasferisce quella
esclusione V2**. Il report mantiene separati rankBand V2, constraint, feasibility
e status V3; tutti e tre restano usable nella robustness in questa fixture.
Nessuna conclusione che questo percorso attui già una preferenza forte con
eccezioni motivate. Non sfruttare tale differenza per simulare la semantica R2.

Il raccordo mancante è esattamente tra `postObservationContexts.distancePreference`
del preparatore e il contratto eseguibile scelto. Settare maximumDistanceKm=1/3
introdurrebbe un limite dichiarato hard; ometterlo cancellerebbe la preferenza;
aggiungere 0.8 km o un'altra tolleranza inventerebbe una regola. Sono tutte
alternative respinte. Il riferimento della distanza va anch'esso verificato.

## Ruoli e confronto parziale

Il V2 corrente assegna best-choice, best-sensible-saving e
worthwhile-comfort-upgrade; la presentazione tiene separate offerte fuori budget
e convenienza dell'upgrade. Un vecchio reason code best-over-budget-fallback nel
dataset storico NON crea un contratto corrente Best Over Budget.

Il candidato offline `personalUtilityRolePolicyV3.ts::runPersonalUtilityRolePolicyV3`
espone bestChoice, bestSensibleSaving, worthwhileComfortUpgrade, split (disabled).
La seconda prova usa input tipizzati e dimensioni esplicitamente inventate, non
una conversione arbitraria della trascrizione. Il validator passa; Best Choice
è selezionato anche senza upgrade applicabile. Con totalCost=null/integrity
partial i candidati sono incomplete, la policy si astiene: nessun totale inventato.
Questo candidato è marcato `offline-policy-candidate-only`, non è automaticamente
il medesimo runtime del percorso compatibility/robustness.

È dunque possibile confrontare **solo Best Choice**, dichiarando copertura
parziale e ruolo aggiuntivo UNMAPPED, dopo aver scelto/versionato il percorso,
costruito input fedeli e verificato i suoi gate. La funzione independent può
attribuire un ruolo relativo al V2 in base al costo; passando null nella prova
non si simula una selezione V2 né si confonde quel ruolo con un portfolio D15.
Nessun confronto reale è reso eseguibile da questa fase.

## Minimo passo successivo

Definire un raccordo diagnostico reale e il suo ambito **Best Choice only**,
con matrice campo→input/versione/provenienza e semantica approvata della
preferenza di distanza. Se il percorso scelto richiede un totale verificato o
bookability non documentati, mantenere l'astensione/il blocco: non inventarli.
È già possibile un'analisi sintetica di sensibilità con rating omesso o prezzi
provvisori, NON un confronto fedele di R2. Nessuna nuova revisione dei dati è
richiesta qui. Non esiste ancora un comando reale sicuro: si consegna solo
il comando della prova sintetica, non una riga di esecuzione Bologna fittizia.

## Esecuzione e validazione

Da Windows PowerShell 5.1 nel repository, usando il Node già installato:

```powershell
$proofPath = Join-Path $env:TEMP ('StayOpti-D0042-' + [guid]::NewGuid().ToString('N'))
& 'C:\Program Files\nodejs\node.exe' '.\scripts\run-diagnostic-capability-proof.mjs' '--synthetic-proof' $proofPath
if ($LASTEXITCODE -ne 0) { throw 'Prova sintetica non completata' }
$proofPath
```

Il runner riusa tsc locale + CommonJS del runner canonico, esegue i test mirati,
rifiuta input reali/output esistenti/output nel repository, esporta risultati,
input inventati, moduli effettivamente caricati con SHA e checksum. Nessun
loader, shim, npx, rete o cambiamento all'ambiente persistente.

La consegna documenta exit code, conteggi della suite canonica isolata,
preservazione dei 7 path esclusi e dei 17 file D-0037, commit/push e SHA remoto.
Il PASS dei test prova i comportamenti osservati, NON l'ammissione del caso.
Nessuna nuova fonte canonica o revisione dei pesi. Eventuali interventi futuri
sui disallineamenti individuati richiedono incarico e regressioni separati.
