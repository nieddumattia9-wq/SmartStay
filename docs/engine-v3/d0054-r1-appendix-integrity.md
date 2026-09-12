# D-0054 R1 — Integrità delle prove integrate REVIEWED

Data: 2026-09-12. Base riprodotta:
`ec3e5a756ae1de824a73a38e62a6cefa1b809b99`.
Perimetro: software evaluation-only e fixture sintetiche, senza nuova misura
privata, raccolta, custodia, modifica della policy o ammissione Golden.

## Tre difetti conservati prima della correzione

Il file `evidence/d0054-r1-synthetic-before.json` conserva estratti pertinenti e
hash degli input/output effettivi, versione del codice e risultato iniziale:
**0 PASS, 3 FAIL, exit code 1**. Sono fallimenti delle nuove asserzioni di
sicurezza sul percorso REVIEWED fino al kernel e alla policy, non una simulazione
del solo decoder. Le fixture e le prove storiche D-0054 non vengono riscritte.

| Controesempio sintetico | Prima della correzione | Risultato misurato in R1 |
|---|---|---|
| Nella stessa prova finanziaria esiste anche una voce `availability.unavailable`, ma il chiamante integra soltanto costo e bookability | Entrambe APPLIED; disponibilità VERIFIED_BOOKABLE; policy eseguita, decisione usable | Selezione incompleta respinta prima della policy. Se tutte le voci sono valide e integrate, il conflitto è valutato dalla policy |
| Inventario posti osservato alle 12:01, con scadenza esplicita 12:01:30 e valutazione alle 12:02 | Sleeping APPLIED e SATISFIED; decisione usable | Prova INSUFFICIENT per `SOURCE_VALIDITY_EXPIRED`; non risolve lo sleeping UNKNOWN necessario alla raccomandazione |
| Nuova prova applicabile `0 units`, contro una unità storica | Decoder KNOWN 0, integrazione REJECTED dal contratto numerico; nella vista attiva rimane 1; sistemazione SATISFIED e decisione usable | KNOWN 0 è un fatto corrente valido; il confronto con le unità richieste produce DOCUMENTED_VIOLATION prima della selezione |

Tutti gli orari della riproduzione sono UTC del 2099-09-01. I controlli positivi
mantengono identici gli altri dati: prova finanziaria completa e non
contraddittoria, scadenza futura alle 12:10 e una unità offerta soddisfacente.
Nessun prezzo o nome del dossier reale è utilizzato.

## Correzione del contratto e del percorso

`scripts/reviewed-evidence-appendix-v1.mjs` esporta ora
`stayopti.reviewed-evidence-appendix@1.1`. Il nome del file resta stabile; il
binding della versione non accetta implicitamente un documento @1. La base
originale continua ad attraversare `prepareObservedOfferDiagnostic` prima di
qualunque integrazione: journal, trasformazioni delle fonti, applicabilità e
copertura delle esigenze essenziali restano obbligatori.

### Una prova multi-entry non è un menu di fatti favorevoli

Nel formato supportato tutte le voci condividono fonte, osservazione e scope
esatto della stessa offerta. `completeProofSelections` richiede una selezione che
copra ogni voce per quella offerta. Non deduce valori dal JSON ancora non
validato: ne verifica soltanto la completezza strutturale della selezione.
Ogni voce selezionata attraversa poi gli stessi controlli di byte, ricevuta,
trasformazione, ambito e tempo già richiesti alla prova singola.

- Una voce omessa o attribuita a un'altra offerta produce
  `APPENDIX_MULTI_ENTRY_SELECTION_INCOMPLETE`.
- La presenza nominale di una voce non basta: una voce selezionata ma respinta
  produce `APPENDIX_MULTI_ENTRY_VALIDATION_FAILED`. Non vengono applicate
  soltanto le altre voci favorevoli.
- In entrambi i casi il callback del kernel non viene invocato: **ingresso non
  eseguito**, non astensione del motore.
- Una prova integralmente valida che documenta insieme bookability positiva e
  indisponibilità lascia invece un conflitto effettivo nella vista attiva. Il
  kernel e la policy lo valutano e possono produrre un'**astensione effettiva**.

Il formato non permette di fondere scope diversi dentro la stessa `entries`.
Prove indipendenti restano distinte; non si introduce una priorità commerciale,
un filtro di candidati o una regola generale «vince l'ultima voce».

### Scadenza esplicita per ogni fatto consumato

`verifyTemporal` rispetta `validUntil` per tutti i campi. Se la scadenza precede
`evaluatedAt`, la nuova prova è insufficiente e non viene applicata. L'uguaglianza
resta inclusiva, come nella semantica già adottata: `validUntil === evaluatedAt`
non è ancora scaduta. Non cambia alcun timestamp storico.

Solo i fatti finanziari continuano a richiedere un intervallo documentato. Per
un fatto statico `validUntil: null` rimane ammesso: non si inventano durata,
TTL o certificazione indipendente di freschezza. Il test sui posti letto
dimostra che una prova scaduta non può eliminare l'UNKNOWN originario richiesto.

### Zero offerto non significa documento malformato

Il contratto evaluation `validateDiagnosticOfferRequirements` ammette ora un
numero intero **non negativo** per `unitsOffered`. Il numero di unità richieste
rimane almeno uno; valori negativi, frazionari e trasformazioni incompatibili
con la fonte restano respinti. Locali interni, capienza, letti e privacy non sono
dedotti dal numero di unità e mantengono i propri controlli.

Il valutatore `evaluateAccommodation` conserva il confronto preesistente tra
unità offerte e richieste. Un'offerta corrente di zero unità diventa quindi
`DOCUMENTED_VIOLATION`, non un valore inventato di bookability o un generico
giudizio negativo sulla struttura. Il valore storico resta nella base immutabile;
la vista attiva contiene il nuovo fatto con la sua prova e il suo tempo.
Le altre offerte indipendenti rimangono presenti e valutabili.

L'asserzione storica EA48, che pretendeva il rifiuto di zero e conservava uno,
era precisamente parte del difetto: viene corretta apertamente, non rinominata
come prova valida precedente. EA54 distingue ora il rifiuto atomico della prova
multi-entry da un'astensione della policy. Gli esiti storici rimangono conservati.

## Prova e limiti del checkpoint

Validazione effettiva sul candidato finale isolato Windows, con dipendenze già
installate copiate offline e nessun file escluso dal futuro commit:

| Controllo | Risultato locale |
|---|---|
| Nuove regressioni R1 | 28/28 PASS |
| D-0054 conservate, con EA48/EA54 corretti esplicitamente | 76/76 PASS |
| Mirati combinati D-0050, D-0051/R1, D-0052/R1/R2 e D-0054/R1 | 317/317 PASS, zero skip |
| Suite canonica V3 | 2224/2224 PASS, zero skip |
| Suite V2 | 196/196 PASS, zero skip |
| Lifecycle | 530 PASS, 17 skip di integrazione preesistenti, zero FAIL |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript, build, analytics-beta | PASS |
| Parsing Windows PowerShell 5.1.26100.9444 | 13/13 PASS |
| Smoke runtime sintetico, solo loopback locale | PASS |
| Scansioni diff: segreti, artefatti privati, raw-ID/token; whitespace | PASS |
| Sette esclusi, diciassette sigillati, ulteriore copia privata, altri tracked | Byte-identici |

La suite canonica ha eseguito anche i percorsi sintetici Windows/DPAPI esistenti;
non certifica custodia reale. Nessuna nuova CI, esecuzione Linux o verifica del
registry di dipendenze è dichiarata: la rete autorizzata riguarda soltanto Git.
I risultati software PASS non implicano il PASS di servizi esterni non eseguiti.
Il reseal finale riguarda soltanto i tre documenti di rendicontazione, confrontati
con i byte software/test del tree isolato già verificato; nessuna modifica al
codice dopo questi gate viene assorbita implicitamente.

`evidence/d0054-r1-synthetic-after.json` registra sette casi riproducibili:
selezione incompleta (zero invocazioni), contraddizione completa, letti scaduti,
letti attuali, zero unità, una unità e zero con un'altra offerta completa. Sei
invocazioni primarie della policy e sei ripetizioni di riproducibilità effettive;
nessuna invocazione per l'ingresso rifiutato. Contiene gli hash del codice, degli
input/output e le prove consumate. Tutti gli originali restano invariati.
Il sorgente esatto dei primi tre test falliti e i log integrali sono conservati
fuori dal repository; hash, estratti e ricetta riproducibile restano nel verbale
pubblico iniziale, riferito al commit precedente e non riscritto.

Per ripetere la suite dal checkout pulito del commit pubblicato:
`npm.cmd run test:engine-v3`. Il runner canonico compila e raccoglie anche
`v3ReviewedEvidenceAppendixIntegrity.test.ts`; non occorre alcun dossier reale.

La grammatica rimane circoscritta. Una ricevuta puntuale documenta la revisione,
ma un hash e un attore dichiarato non autenticano indipendentemente fonte o
persona. R1 non aggiunge una CLI di raccolta, un collector, una custodia, una
prova di booking o un'autorizzazione alla misura reale. Non certifica robustezza
completa, regret, concordanza umana o idoneità Golden. Pesi, soglie, ruoli,
preferenza di distanza, pubblico V2 e runtime pubblico restano fuori dal diff.

## Minimo passo futuro per un'appendice reale

1. Richiedere l'autorizzazione distinta per le sole nuove prove e l'eventuale
   misura. Questa fase non legge o applica il dossier privato.
2. Conservare la richiesta REVIEWED originale e ricavarne il binding con il
   codice esatto; creare un nuovo documento @1.1, senza migrare quello @1.
3. Conservare gli artefatti e la loro trascrizione puntuale. Per ogni prova
   multi-entry includere tutte le voci del medesimo scope, anche negative,
   incerte o contraddittorie. Non omettere il fatto sfavorevole dal contenuto.
4. Registrare una revisione umana reale delle sole nuove prove, con ambito,
   continuità tariffaria, tempi e scadenza esplicita quando documentata. Non
   ripetere la conferma generale né fabbricare un attore HUMAN.
5. Solo dopo autorizzazione alla misura, usare
   `executeReviewedEvidenceAppendix` con il kernel locale compilato; conservare
   privatamente nuovo input/output e hash. Un rifiuto prima del callback deve
   essere riportato come non esecuzione, non come astensione V3.

Consolidamento consentito soltanto dopo i gate e sul branch
`codex/evaluation-d0036-d0041`, mediante staging selettivo e push non-force.
La consegna riporta SHA locale/remoto, stato effettivo del push e commit ancora
locali. Main, sette path esclusi, diciassette file sigillati D-0037 e materiali
privati non sono destinazioni della correzione.

Inventario selettivo (10 file): i due script `reviewed-evidence-appendix-v1.mjs`
e `diagnostic-offer-requirements-v1.mjs`; i due test `v3ReviewedEvidenceAppendix`
e `v3ReviewedEvidenceAppendixIntegrity`; le due evidenze sintetiche R1 prima/dopo;
questo rapporto, la decisione R1, `CURRENT_STATE.md` e `DECISION_LOG.md`.
Non sono inclusi kernel, pesi, ranking, fixture storiche o dati privati.
