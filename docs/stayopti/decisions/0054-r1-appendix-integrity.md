# D-0054 R1 — Completezza delle prove e fatti correnti non raccomandabili

Data: 2026-09-12. Approvatore: istruzione esplicita di Mattia per D-0054 R1.
Base: `ec3e5a756ae1de824a73a38e62a6cefa1b809b99`.
Stato: correzione evaluation-only sintetica; gate locali finali PASS.
Commit/push selettivi subordinati all'ultima verifica del tree e del remoto.

## Contesto e prove

L'audit successivo ai 289 test D-0054 ha mostrato tre lacune del raccordo, non
una necessità di modificare la policy: selezione favorevole di voci della stessa
prova, scadenza documentata ignorata per fatti non finanziari e rifiuto numerico
di zero unità che lasciava attiva l'idoneità storica.

Le tre riproduzioni attraversano REVIEWED, kernel e policy effettivi. Prima della
correzione le tre nuove asserzioni falliscono (0/3 PASS, exit code 1), con una
decisione usable in tutti i casi. Input, estratti degli esiti, hash e natura della
prova sono conservati in
`docs/engine-v3/evidence/d0054-r1-synthetic-before.json`. Le evidenze storiche
D-0054 e le misure private precedenti non vengono riscritte o rietichettate.

## Decisione

Versionare l'appendice come `stayopti.reviewed-evidence-appendix@1.1` e applicare
tre riparazioni prima della selezione:

1. Una prova multi-entry riferita allo stesso scope deve essere selezionata e
   validata integralmente. Una voce omessa genera
   `APPENDIX_MULTI_ENTRY_SELECTION_INCOMPLETE`; una voce nominalmente selezionata
   ma respinta genera `APPENDIX_MULTI_ENTRY_VALIDATION_FAILED`. Entrambi sono
   rifiuti dell'ingresso con zero invocazioni del kernel, non astensioni V3.
   Una contraddizione integralmente valida resta invece un fatto conflittuale
   consumato dai valutatori e dalla policy.
2. Ogni scadenza esplicitamente documentata limita l'utilizzo del fatto, anche
   per sistemazione o privacy. Una prova scaduta è insufficiente. I fatti
   statici senza scadenza non ricevono una durata inventata; solo i fatti
   finanziari mantengono il requisito preesistente dell'intervallo documentato.
3. Zero unità offerte è un valore fattuale rappresentabile, non un documento
   malformato. Il contratto evaluation ammette interi non negativi, mantenendo
   le unità richieste almeno a uno e verificando invariati fonte e ambito.
   Il confronto preesistente della sistemazione produce DOCUMENTED_VIOLATION;
   non si inventa un booleano di indisponibilità e non si seleziona un vincitore
   per poi sostituirlo. Gli altri candidati rimangono valutabili.

## Motivazione, alternative respinte e conseguenze

L'integrità dei byte non basta quando il chiamante può omettere dal consumo il
fatto sfavorevole contenuto negli stessi byte. Copertura e validazione integrale
sono quindi proprietà dell'ingresso; l'astensione appartiene alla policy soltanto
quando questa viene realmente eseguita su fatti rappresentabili.

Respinti: integrare automaticamente claim non revisionate; trattare un errore
di selezione come giudizio del motore; ignorare tutte le prove multi-entry;
applicare durate arbitrarie ai fatti statici; conservare una vecchia quantità
positiva dopo una prova corrente di zero; eliminare l'offerta; sostituire privacy,
capienza o bookability al requisito delle unità.

La modifica non altera esigenze originarie, pesi, soglie, ruoli, preferenze o
runtime pubblico. REVIEWED non attraversa SYNTHETIC; gli UNKNOWN storici e i
controlli di significato/applicabilità restano protetti. Non cambia la Product
Constitution. La correzione prospettica di EA48 è esplicita perché l'asserzione
precedente conservava il comportamento errato; gli artefatti iniziali rimangono.

## Rischi, salvaguardie e limiti

Il formato multi-entry corrente condivide lo scope tra tutte le voci: documenti
con ambiti diversi non vengono fusi implicitamente. La grammatica resta bounded;
non è un interprete universale né una certificazione indipendente della fonte.
La revisione puntuale è distinta dalla conferma generale e non viene inventata.
Non si introducono migrazioni implicite di appendici, progressi o custodia.

Tutte le prove della fase sono sintetiche. Nessuna misura Bologna, raccolta,
chiamata provider, custodia, giudizio cieco o Golden admission. Sette path esclusi,
diciassette file D-0037 e materiali privati rimangono fuori dal candidato.

## Validazione, pubblicazione e reversibilità

Gate finali locali osservati: 28/28 nuovi, 317/317 mirati combinati,
V3 2224/2224, V2 196/196; lifecycle 530 PASS/17 skip preesistenti;
security 29, release 101, analytics 31, capacity 9, beta 4 PASS.
TypeScript, build, analytics-beta, smoke sintetico loopback e parsing reale
PowerShell 5.1 13/13 PASS. Scansioni selettive e controlli byte-identici PASS.
Le nuove prove attraversano REVIEWED e policy, con invarianti e positivi;
una selezione incompleta produce zero invocazioni, non una falsa astensione.
Il rapporto documenta gli hash prima/dopo e la risigillatura esclusivamente
documentale successiva ai test. CI, registry-network audit e Linux non eseguiti:
non sono sostituiti da una simulazione o da un vecchio PASS.

Il rapporto `docs/engine-v3/d0054-r1-appendix-integrity.md` descrive il prima/dopo,
il contratto e le istruzioni minime future, non un'autorizzazione alla misura.
Dopo PASS è consentito un commit selettivo e push non-force solo sul branch di
lavoro; la consegna deve registrare remoto diretto, SHA e commit ancora locali.
Nessun push su main o riscrittura della storia. Un eventuale ritiro richiede una
successiva modifica esplicita, preservando prove e versioni precedenti.

Supersedes: soltanto le tre semantiche difettose del raccordo D-0054 @1 e le
asserzioni che le consideravano corrette. Nessuna evidenza storica è annullata;
nessuna promozione o autorizzazione reale è concessa.
