# D0064 R1 — Raccordo riutilizzabile e prove di equivalenza

## Prima e dopo

| Rigidità osservata su b59fa3a | Correzione circoscritta |
|---|---|
| Un secondo caso sintetico valido fallisce CASE_OR_ORIGIN | @1.1 valida struttura e capacità; il caso concreto vive nella proposta/configurazione hash-bound |
| Due righe stesso ID/IT/Bologna, ma casing o metadati diversi: zero ID eleggibili | Confronto dei soli fatti di selezione; un ID eleggibile, due originali e differenze conservati |
| Un campo error dentro metadati non consumati è trattato come errore provider | Semantica limitata ai contenitori del contratto; gli errori reali restano bloccanti |

`liteapi-search-coverage-proposal-v1.mjs` contiene la proposta Bologna, non
permessi di esecuzione. `validateCoverageMechanismPlan` verifica il piano;
`coverageRequest` e `selectCoverageCatalog` ricevono il piano esplicito dal
percorso di acquisizione. Il registro usa il tetto di capacità MAX3 condiviso.
Il limite totale non è trasferibile fra operazioni. Destinazione e composizione
familiare non sono più replicate nel trasporto/selezione/registro.

Profilo deliberatamente limitato: una unità, Balanced manuale e nessuna
preferenza di distanza; non è un nuovo framework arbitrario. Città, date,
valuta, nazionalità, ospiti, budget e seed possono variare in piani nuovi
separatamente confermati. I valori production proposti non vengono cambiati.
Catalogo<=100, ID<=20, finestra Rates<=20, tariffe<=3 e richieste 1+1+1.

## Confine effettivo adattatore/core

| Responsabilità | Funzione/file effettivo | Verifica |
|---|---|---|
| Byte e protocollo provider | `readDocumentaryResponse`, `decodeDocumentaryOffer`, `documentaryCommercial` in liteapi-documentary-wire-v1.mjs | Originali/hash prima della lettura; importi e scope restano provider-specifici |
| Fatti verificati | `prepareLiteApiProviderObservation` in liteapi-observation-diagnostic-v1.mjs; `reprojectObservedRequirementCandidate` | Scope, valuta, applicabilità, UNKNOWN, requisiti e unità precedono il kernel |
| Calcoli | `computeObservedOfferDiagnosticV3` e dipendenze V2 condivise | Nessun import LiteAPI/provider nella chiusura transitiva; nessuna lettura dei campi wire |
| Policy | `runPersonalUtilityRolePolicyV3` | Pesi, soglie, ruoli e codice invariati |
| Acquisizione MAX3 | run-liteapi-search-coverage.mjs e closure inventariata | Nessun import kernel/policy; zero invocazioni anche nella simulazione |

La firma del kernel mantiene contenitori opachi `observations`/`provenance`
per audit; possono conservare le osservazioni originali, ma non vengono usati
per interpretare JSON LiteAPI o decidere il merito. I fatti normalizzati e
la loro affidabilità sono la superficie decisionale. Non si dichiara un nuovo
formato di trasporto pubblico né una validazione universale di altri provider.

## Equivalenze e differenze sostanziali

- CA01: dodici trasformazioni di ordine/casing/metadati sul catalogo; stesso
  pool/campione, hash originali differenti. ID opachi mai trim/decodificati.
- CA04: otto varianti di importi numerici/stringhe decimali e metadati, attraverso
  capture verificato e adattatore documentale effettivo; scelta e dimensioni
  invarianti. Nove chiamate effettive della policy, incluse il controllo.
- CA05: due provider **inventati solo nei test**, sei varianti ciascuno;
  vocaboli/strutture/unità differenti convergono dopo verifica dei byte.
  Dodici kernel e ventiquattro chiamate policy: la preferenza forte sintetica
  già esistente esegue anche la selezione di riferimento. Non viene modificata.
- CA06: valuta incompatibile e rating fuori intervallo respinti; capienza o
  condizioni negative restano bloccanti; scala semanticamente diversa cambia
  la dimensione qualità. Nessuna equivalenza artificiale.
- CA07: controllo transitivo delle dipendenze del kernel e della closure MAX3;
  i parser commerciali non entrano nel core e il motore non entra nel launcher.
- CWL08: vero launcher PS5.1/DPAPI con un secondo piano inventato, altra città,
  date/ospiti/valuta/nazionalità/seed/quantità, stesso MAX3 e rifiuto della ripresa.

I test sintetici non certificano compatibilità commerciale di un altro provider.
Le varianti numeriche seguono la grammatica decimale già implementata; nessuna
conversione di ID, occupancyNumber, currency o rateId viene introdotta.

Fonti ufficiali ricontrollate in sola lettura: [Catalog](https://docs.liteapi.travel/reference/get_data-hotels),
[Rates](https://docs.liteapi.travel/reference/post_hotels-rates),
[struttura Rates](https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure).
Il catalogo elenca strutture, non disponibilità; i parametri di ricerca e le
occupazioni sono preservati, senza dedurre esaurimento o completezza commerciale.

## Validazione e limiti

Esiti iniziali conservati in `evidence/d0064-r1-initial-validation.json`.
La prima compilazione dei nuovi test ha rilevato tre accessi nullable negli
assert. Il successivo 97 PASS/6 FAIL ha individuato assunzioni del test sul
conteggio della policy (una invece delle due effettive con preferenza forte)
e sul prefisso degli errori. Nessuna correzione del motore è stata necessaria;
i test ora intercettano le chiamate reali e verificano i motivi esatti.

Il candidato isolato 7b682e5e099fbebd8d8c975fdca8339b1162d0e6 (parent b59fa3a,
tree 6cf0b8b15ee25462b7d61968aefbab3afc800aff) ha superato i gate locali
il 2026-09-15. I byte del software pubblicabile sono confrontati con quel
candidato; dopo i test si aggiornano soltanto i risultati documentali.

| Verifica locale effettiva | Esito |
|---|---|
| Mirati MAX3/architettura + regressione commerciale | 103/103 PASS; inclusi anche nel gate finale |
| Engine V3 canonica Windows | 2678/2678 PASS, zero skip |
| Engine V2 | 196/196 PASS |
| Lifecycle | 530 PASS, 17 SKIP esistenti per Valkey reale non disponibile |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript, build, analytics-beta, staging locale | PASS |
| Parsing Windows PowerShell 5.1 | 15/15 PASS |
| Launcher MAX3 reale, CurrentUser DPAPI | PASS su sole fixture; 47 controlli MAX3/architettura |

Il test specifico di prompt usa una SecureString sintetica; nessuna credenziale
production caricata. Nessuna esecuzione Linux nativa, CI GitHub o audit online
delle dipendenze è attestata da questi risultati. Le scansioni circoscritte del
diff, lo scope del commit e i riferimenti remoti sono verificati separatamente
nel verbale di pubblicazione. Stato push alla scrittura pre-commit: non ancora
eseguito; SHA finale, push effettivo e commit pendenti saranno indicati nella
consegna. Nessuna acquisizione reale.

Limite residuo: le righe Rates duplicate continuano a seguire le verifiche del
raccordo esistente; la nuova equivalenza del catalogo non dichiara equivalenti
offerte commerciali diverse. Le forme provider non supportate non vengono
certificate da questi test. Il campione MAX3 rimane una prima pagina delimitata,
non una misura dell'inventario completo o della qualità delle strutture.

Le conferme su scenario/costi/retention restano utilizzabili nel loro ambito;
il nuovo HEAD richiede nuovi file operativi e una nuova literal MAX3 non accettata.
