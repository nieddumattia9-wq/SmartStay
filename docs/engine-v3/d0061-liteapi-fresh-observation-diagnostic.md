# D-0061 — Raccordo eseguibile di osservazioni LiteAPI, soltanto sintetico

Base: `34fa82087a8921ea4042b56a737dd93ffea59663`. Data: 14 settembre 2026.
Il rapporto privato D-0060 è stato letto; i suoi dati non sono fixture pubbliche.
Il lavoro non utilizza trascrizioni, custodie, approvazioni o feedback privati.

## Percorso effettivo

`captureSyntheticLiteApiPlan` → tentativi e byte originali →
`verifySyntheticLiteApiCapture` → `prepareLiteApiObservationDiagnostic` →
valutatori D-0051/R1 → proiezione dei fatti →
`computeObservedOfferDiagnosticV3` → policy esistente.

| Componente | File/API | Effetto |
|---|---|---|
| Governatore | `scripts/liteapi-diagnostic-governor-v1.mjs` | Prenota il contatore prima dello stub; selezione sigillata; hash e verifica della catena |
| Ingresso fresco @1 | `scripts/liteapi-observation-diagnostic-v1.mjs` | Scenario, risposta originale, scope e trasformazioni verificati; nessuna ricevuta HUMAN |
| Preparazione pura | `prepareLiteApiObservationDiagnostic` | Zero kernel/policy; distingue ingresso respinto e candidato preparato |
| Esecuzione separata | `executeLiteApiObservationDiagnostic` | Callback al kernel esistente; contatori effettivi e output distinto |
| Requisiti | `scripts/diagnostic-offer-requirements-v1.mjs` | Modo PROVIDER_OBSERVATION_DIAGNOSTIC, senza aggirare REVIEWED |
| Calcolo | `src/engine-v3/evaluation/observedOfferDiagnosticV3.ts` | Formule/ruoli immutati; nessuna distanza richiesta è rappresentata esplicitamente |

Formato osservazioni `stayopti.liteapi-fresh-observation-diagnostic@1`;
profilo wire limitato `liteapi-v3-roomTypes-rates-exact-retrieval@1`.
Richiesta e risposta sono byte base64, SHA-256 e lunghezza; originali conservati,
non HTML o screenshot ricostruiti. Il controllo dell'hash non autentica il
fornitore: qui l'origine rimane esplicitamente un trasporto simulato.

La selezione è fissata prima dei risultati mediante seed e hash degli ID opachi:
fino a cinque strutture, una tariffa collegata alla singola occupazione per
struttura. Gli ID servono al campionamento e ai binding, non al merito. Pool
originale, errori, limiti e alternative selezionate incomplete restano visibili.
Non è dichiarata completezza del mercato.

## Prezzi, ambito e tempi

| Osservazione | Trattamento |
|---|---|
| `taxesAndFees` omesso | Copertura sconosciuta; non viene convertito in elenco vuoto |
| `null` esplicito | Inclusione secondo la semantica documentata, senza inventare breakdown |
| `[]` esplicito | Lista vuota distinta da attestazione di inclusione completa |
| Componenti incluse/escluse | Conservate singolarmente; esclusi separati come dovuti in struttura |
| Valute diverse, basi non aggregate | Nessuna somma/conversione/moltiplicazione inventata; totale completo UNKNOWN |
| Remarks o importi simultanei incoerenti | Conservati; qualificazione commerciale necessaria, non selezione del prezzo favorevole |
| Prezzo ricerca e prebook diversi | Due osservazioni; non riscrittura della ricerca né ripristino di vecchi valori |
| POST riuscito, GET non corrispondente | Verifica non utilizzabile; la disponibilità della ricerca non la sostituisce |
| Scadenza esplicita scaduta/conflittuale | Non certifica prenotabilità corrente |
| Scadenza assente | `providerValidUntil:null`, nessun TTL10 minuti attribuito al fornitore |

La policy diagnostica preesistente **non richiede un `validUntil` futuro in ogni
caso**: un prebook esatto corroborato può essere valutato come osservazione
verificata, senza promettere disponibilità futura. Questa conseguenza è esposta,
non confusa con una garanzia di checkout. Una scadenza esplicita negativa non
viene ignorata. Cancellazione della tariffa e scadenza dell'offerta sono separate.

Fonti documentali già considerate in D-0060, non nuove chiamate provider:
[Rates](https://docs.liteapi.travel/reference/post_hotels-rates),
[struttura e tasse](https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure),
[POST prebook](https://docs.liteapi.travel/reference/post_rates-prebook),
[GET prebook](https://docs.liteapi.travel/reference/get_prebooks-prebookid).
Il mapper pubblico non è usato come prova di completezza o prenotabilità.

## Scenario e fatti consumati

Il caso inventato ha un soggiorno familiare, bambini con età esplicite, una unità,
Balanced manuale e posti letto/capienza essenziali. Nessun requisito esplicito di
privacy è aggiunto: rimane distinta l'idoneità contestuale già presente nel V3.
Nazionalità/account della fixture sono soltanto valori sintetici.

La relazione richiesta→offerId→occupancyNumber→prebookId→GET è conservata. Ogni
echo restituito supportato viene controllato; gli echo assenti non sono creati.
La quota per un'occupazione documentata non moltiplica i letti. Il decoder dei
posti usa soltanto clausole italiane limitate già supportate, presenti nella
descrizione della tariffa; divano/castello non documentato resta UNKNOWN. Le
quantità non dimostrano privacy, dimensioni o comfort. Testi fuori grammatica
restano osservazioni, non nuovi fatti. Servizi e privacy usano i valutatori scoped
esistenti e conservano negazioni/limitazioni dell'offerta.

Le risposte dettagli sono applicate solo alla proprietà esatta. Rating senza
scala qualificata non entra nel calcolo; eventuali stelle documentate sono una
prova distinta. Nessuna scala o coordinata è precompilata. Il catalogo facilities
resta preservato; ID di servizi non mappati non sono trattati come affermazioni.

`semantics:not-requested`, `kilometers:null`: nessun punteggio location inventato,
nessun vincolo di distanza, nessuna esclusione automatica dai peer di mercato.
La policy conserva le formule esistenti per dimensioni disponibili. Le precedenti
preferenze forti mantengono invariati regola e calcoli.

Con zero o una alternativa: `NOT_EXECUTED`, zero invocazioni, output null.
Con almeno due: diagnostica effettiva; una scelta ammissibile o un'astensione
misurata non si confondono con un rifiuto del preparatore. Non vengono dichiarati
robustezza completa, regret, giudizio cieco o ammissione Golden.

## Limiti di acquisizione provati offline

| Tipo | Host e percorso | Cap |
|---|---|---:|
| Ricerca | api.liteapi.travel `/v3.0/hotels/rates` POST | 1 |
| Dettagli | api.liteapi.travel `/v3.0/data/hotel` GET | 5 |
| Facilities | api.liteapi.travel `/v3.0/data/facilities` GET | 1 |
| Prebook | book.liteapi.travel `/v3.0/rates/prebook` POST | 5 |
| Recupero | book.liteapi.travel `/v3.0/prebooks/{id}` GET | 5 |

Totale17; sottocap non trasferibili. Retry0, redirect0, concurrency1, pagination0.
Timeout consumato prima della risposta; nessun ID di prebook indovinato, polling
o sostituzione di candidati. Input/checkpoint mutato o tentativo di ripresa non
supportato viene respinto. Il governatore è solo in memoria: **non certifica una
ripartenza durevole sicura di produzione né autorizzazione reale monouso**.

## Riproduzione e prove

Da un checkout pulito del commit pubblicato con dipendenze locali già presenti:

```powershell
npm.cmd run test:engine-v3
if ($LASTEXITCODE -ne 0) { throw 'Gate V3 fallito' }
```

Non usare questo comando come autorizzazione provider: i nuovi test impiegano
esclusivamente fixture inventate, senza rete esterna. Le prove interessate sono
`v3LiteApiObservationDiagnostic`, `v3LiteApiObservationIntegrity`,
`v3LiteApiDiagnosticGovernor` e `v3ObservedOfferNoDistanceRequested`, oltre alle
regressioni canoniche.

Risultati realmente osservati su candidato Git isolato, dipendenze copiate
offline e nessun `.env` copiato (14 settembre 2026):

| Controllo | Esito locale |
|---|---:|
| Nuove regressioni D-0061 | 107/107 PASS |
| Mirati inclusi D-0051/R1, D-0052/R1/R2, appendice/rating | 524/524 PASS, zero skip |
| V3 canonica, Windows CurrentUser effettivo | 2431/2431 PASS, zero skip |
| V2 | 196/196 PASS |
| Mapper/prebook/offer-integrity esistenti | 18/18 PASS |
| Lifecycle | 530 PASS; 17 skip preesistenti real-Valkey, zero fail |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript / build / analytics-beta gate | PASS |
| Smoke staging locale, senza provider | 18 controlli PASS |
| Parsing Windows PowerShell 5.1.26100.9444 | 13/13 PASS |
| Diff/cached diff, scansioni mirate segreti/privati/provenienza | PASS |

Il primo gate V3 nella sandbox aveva **2426 PASS / 5 FAIL**: i cinque percorsi
di custodia/launcher preesistenti incontravano il rifiuto DPAPI CurrentUser. Un
probe sintetico differenziale, senza store o sessioni reali, ha riprodotto il
rifiuto del protettore nella sandbox e il PASS nel processo CurrentUser effettivo.
Lo stesso SHA/tree candidato e gli stessi byte, senza cambiare i file sigillati
o impostazioni Git globali, hanno quindi superato tutti i 2431 test. Il primo
fallimento resta conservato; non è un PASS parziale né un risultato CI GitHub.
Il consolidamento ricontrolla il candidato finale e i byte pubblicati; modifiche
successive richiedono una nuova verifica, non il riuso implicito di questi esiti.

| Prova di esecuzione | Kernel / policy effettivi | Risultato |
|---|---:|---|
| Preparazione pura LP01 | 0 / 0 | Nessuna decisione |
| Cinque candidati completi LP15, 17 tentativi stub | 1 / 1 | `usable` |
| Componenti fiscali non qualificabili LP03 | 1 / 1 | `abstained`, candidati conservati |
| Zero/una alternativa LP08 | 0 / 0 | `NOT_EXECUTED`, non astensione |
| Checkpoint/scenario alterato LP12 | 0 / 0 | Ingresso respinto |

Gli errori intermedi e i controesempi sono conservati nel riepilogo
`evidence/d0061-development-checks.json`. Nessun test ha richiesto credenziali o
chiamate provider. Gli smoke locali non sono una prova di disponibilità esterna.
Non sono stati eseguiti CI GitHub, gate Linux nativo, registry audit di rete o
test contro un account/provider reale; i 17 test real-Valkey restano non eseguiti.

## Minimo passo prima di un launcher operativo

Non basta sostituire lo stub con `fetch`. Occorrono, con autorizzazione separata:

1. Qualifica della forma raw GET/prebook effettiva e dei campi usati, host booking,
   account, margini/prezzo vendibile, costi d'uso e nazionalità reale. Le forme
   sintetiche non certificano API, termini o account odierni.
2. Launcher locale con branch/HEAD/inventario espliciti, scenario sigillato,
   autorizzazione monouso, ledger atomico durevole e lock, trasporto senza redirect
   o retry, timeout/pacing reali. Credenziale richiesta solo in memoria dopo il
   preflight; cleanup nel finally. Nessuna di queste autorizzazioni è implicita.
3. Conservazione privata delle risposte con redazione/cifratura, retention e
   destinazione approvate; nessun log reale nel repository. Interruzione o timeout
   non devono consentire una seconda creazione del prebook già tentato.
4. Autorizzazione production che elenchi scenario/date/famiglia/età/unità/valuta,
   budget/profilo/assenza distanza, nazionalità, account/ambiente, criterio/seed,
   cap1+5+1+5+5, host, timeout/pacing e conseguenze delle cinque possibili sessioni
   commerciali. Nessun `/rates/book`, pagamento, margine o addon automatico.

Restano necessari i dati realmente mancanti dell'offerta (prezzo completo,
verifica commerciale, sistemazione ecc.). Il sandbox sarà una prova tecnica,
non validazione del mercato reale. Nessun dossier storico è stato rimisurato.
