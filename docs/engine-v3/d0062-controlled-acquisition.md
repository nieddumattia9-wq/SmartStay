# D-0062 — Acquisizione LiteAPI controllata, solo collaudo offline

Base: `4e6467cdb9a5c8d6cf76ccefbccca938a3237da8`, branch
`codex/evaluation-d0036-d0041`. Questo documento riguarda software di valutazione,
non il provider pubblico, il sito o una prenotazione. La proposta D-0060 resta
non accettata: nessuna credenziale reale o richiesta provider in questo collaudo.

## Percorso e confini

`invoke-liteapi-controlled-acquisition.ps1` (Windows PowerShell **5.1**) chiama
`run-liteapi-controlled-acquisition.mjs`. Le modalità effettive sono:

| Modalità | Effetto |
|---|---|
| `Inventory` | Legge branch/HEAD e la chiusura delle dipendenze eseguibili; produce un nuovo inventario esplicito, non cambia codice o sessioni. |
| `Preflight` | Controlla hash dei materiali, checkpoint, codice, staging, modifiche dichiarate, destinazione e configurazione. Prova DPAPI solo con byte inventati in memoria. Zero store, provider o prompt della chiave. |
| `Simulate` | Stesso launcher, registro e trasporto HTTP su un server IPv4 loopback creato dal processo; fixture marcata sintetica, cartella temporanea nuova, vera AES-GCM/DPAPI CurrentUser. Nessuna chiave richiesta. |
| `Acquire` | Solo dopo preflight completo, literal esatta digitata dall'utente e chiave via `Read-Host -AsSecureString`; acquisizione production MAX17, mai kernel/policy. Non eseguita in D-0062. |

La preparazione pura `prepareLiteApiProviderObservation` usa il verificatore del
capture ed il profilo documentario prima del normalizzatore condiviso D-0061/R1.
Non trasforma l'origine in SYNTHETIC o REVIEWED. Un'origine production con hash
ricalcolati dal chiamante non basta: serve il capture immutato prodotto dal
trasporto controllato, oppure la riapertura esplicita del registro autenticato.
`readAuthenticatedAcquisitionCapture` verifica prima DPAPI/HMAC e i riferimenti;
non riprende trasmissioni e non esegue il motore. Non viene chiamato nel preflight.
L'esecuzione sintetica della policy è provata separatamente nei test; non è una
modalità di esecuzione privata del launcher.

## Piano immutabile e ripetizioni

1 Rates, fino a 5 dettagli, 1 facilities, 5 POST prebook e 5 GET del prebook già
creato: totale massimo17, sottolimiti non trasferibili. Il dizionario facilities
non dimostra il possesso di servizi da parte di una struttura. Il GET recupera
la medesima sessione, non una seconda verifica indipendente della disponibilità.
Host/metodi/percorsi ammessi sono costruiti dal programma; nessun URL, proxy,
header, callback di trasporto o journal sostitutivo è iniettabile in production.
Identificativi opachi sono codificati nei percorsi/query, mai analizzati per merito.

Una sola occupazione e una sola tariffa per struttura sono campionate tramite
seed/versione fissati prima dei risultati. Le offerte non interpretabili restano
nel capture; nessun rimpiazzo per migliorare il campione. Non è una ricerca esaustiva.
Pacing minimo1000ms, concurrency1, retry0, redirect0, pagination0. Timeout locale
15s, eccetto POST prebook30s. Non sono scadenze commerciali.

Il registro usa file append-only autenticati, pubblicazione atomica no-replace,
fsync, lock e marker monouso separati per caso/autorizzazione. La riserva è scritta
**prima** dell'invio. Crash, errore di scrittura o interruzione non restituiscono
il tentativo. I contatori production sono tentativi riservati di trasmissione,
non attestazioni di ricezione dal provider; il server loopback misura separatamente
le richieste locali effettivamente ricevute. Un prebook in timeout può aver avuto effetto remoto: non viene
ricreato né recuperato con un ID indovinato. Anche reset, risposta parziale o
interruzione dopo un POST senza ID utilizzabile lasciano l'effetto incerto; un
errore HTTP/semantico non viene presentato come ricevuta di rollback. Le altre offerte indipendenti possono
proseguire entro i cap; 401/403, redirect, errori di integrità o checkpoint fermano
il tentativo. Nessuna ripresa automatica. Non cancellare i marker per riprovare.
Non si pretende resistenza a cancellazione deliberata di tutto il registro da
parte del proprietario, rollback del disco o guasti hardware: richiedono un audit,
non una nuova autorizzazione dedotta dal software.

## Originali, credenziale e conservazione

Root operativa fissa:
`%LOCALAPPDATA%\StayOpti\private-evidence\liteapi-controlled-acquisition`.
La nuova directory è `cases/<caseId>`; esistenza precedente, alias, link o
reparse point vengono rifiutati. Nessuna custodia storica viene aperta.
I body HTTP ricevuti restano byte-identici in record cifrati AES-256-GCM, con
SHA-256, metadati e chiave protetta tramite Windows CurrentUser DPAPI. I pochi
header conservati sono espliciti; non si dichiara di aver catturato tutto il wire
TLS. Risposte parziali sono separate da body completi e non normalizzate come
successi. Se la risposta riecheggia la credenziale, quei byte non vengono
persistiti: si conserva solo una ricevuta di mancata conservazione con hash.
Non viene presentata una copia oscurata come originale integro.

Il contesto autorizzato privo di segreti rimane nel manifest privato autenticato;
i record con identificativi provider e body sono cifrati. I riepiloghi non
stampano nomi, ID, URL, body o chiavi. La credenziale passa mediante pipe anonima
stdin, mai command line, `.env`, registro, file temporanei o ambiente persistente.
Cleanup indipendente in `finally`, anche dopo errore nell'avvio/chiusura del figlio.
SecureString/BSTR sono liberati; stringhe JS/.NET sono eliminabili soltanto
best-effort e la terminazione del processo resta parte della pulizia.

Durata e responsabilità **devono essere confermate**, non sono quelle delle
vecchie custodie. Il verbale riporta inizio e scadenza calcolata dalla durata
approvata. Nessuna cancellazione automatica o rinnovo implicito. La retention
privata non estende la validità commerciale del provider.

## Proposta production da completare, non approvata

`d0062-production-proposal.json` contiene il singolo nuovo caso D-0060:
Bologna,10–17 gennaio2027,7notti,2adulti e bambini6/11anni,1unità,
Balanced manuale,1400EUR, capienza/posti adeguati, **nessun limite di distanza**.
Non eredita continuità con vecchie tariffe o feedback.

Prima di poter ottenere una literal utilizzabile occorre confermare soltanto:

1. Scenario nuovo e nazionalità tariffaria (attualmente `null`).
2. Account production previsto, riferimento alle condizioni applicabili e tetto
   economico del tentativo; nessuna gratuità dedotta dal piano generale.
3. Significato `PUBLIC_CONSUMER_PAYABLE_OFFER_RETAIL` sostenuto dalle condizioni
   dell'account. Una tariffa netta non diventa prezzo pubblico; niente override di
   margin/markup, voucher o SDK. Prezzi suggeriti diversi restano una lacuna.
4. Possibilità di **cinque creazioni di sessioni prebook** ed eventuali conseguenze
   transitorie/commerciali del fornitore. Zero booking/pagamenti, non promessa di
   assenza di qualsiasi effetto remoto.
5. Percorso CurrentUser fisso, durata privata, responsabile Mattia e consapevolezza
   dell'assenza di cancellazione automatica. Non è una modifica alla custodia precedente.

La conferma genera una nuova configurazione privata ed un hash esplicito; non si
compilano i `null` per far passare il preflight. Il tetto economico è un vincolo
da verificare sulle condizioni dell'account, non un contatore di fatturazione
indipendente disponibile al collector.

## Invocazione reale disponibile (non eseguita)

Il launcher supporta `-Mode`, `-ExpectedBranch`, `-ExpectedHead`, `-ConfigPath`,
`-ConfigSha256`, `-InventoryPath`, `-InventorySha256`, `-OutputPath`; per la sola
simulazione anche `-SimulationPath` e `-SimulationSha256`.
Gli hash e i percorsi devono essere quelli dei file effettivamente approvati,
non ricavati dal runner per assorbire modifiche a sessioni preesistenti.

La sequenza è `Inventory` con checkpoint esplicito → revisione del nuovo
inventario/config → `Preflight` con entrambi gli hash → solo con autorizzazione
distinta `Acquire` sugli stessi byte. `Acquire` ripete il preflight prima del
prompt, chiede la literal, poi la chiave. Ogni invio ricontrolla il codice.
Il preflight della proposta pendente è eseguibile oggi ma produce HOLD, non una
richiesta della credenziale. Nessun comando con valori fittizi viene presentato
come pronto per production. La consegna include il comando concreto di collaudo
e gli esiti osservati, distinti da eventuale CI GitHub.
Il confronto con Git ammette soltanto l'equivalenza testuale LF/CRLF del checkout
Windows; l'inventario approvato continua a vincolare i byte realmente eseguiti,
compresi i terminatori. Non sono ammessi filtri che cambino il codice.

## Verifiche e limiti del checkpoint

Collaudo locale del candidato isolato completo: tree iniziale
`ae9415ec0fac2fa719cdea65da5d19dd6484aa39`. Node24.18.0,
Windows PowerShell5.1.26100.9444, vero DPAPI CurrentUser su sole fixture.
I dodici file software/test sono vincolati dall'hash SHA-256
`de1a085a5ae0fa9c112205dd2df1a42bf891e59bf7e39868fd4675cad65b916b`
della lista ordinata `[{path,sha256},...]` nello scope congelato. Dopo questi
gate cambiano soltanto i documenti di rendiconto: un secondo candidato con il
tree finale deve superare gli stessi controlli prima della pubblicazione.

| Controllo locale | Risultato osservato |
|---|---|
| Nuovi test D-0062 |104/104 PASS: wire38, journal30, boundary23, launcher13 |
| Mirati con regressioni precedenti |668/668 PASS, zero skip |
| Engine V3 canonica |2575/2575 PASS, zero skip |
| Engine V2 |196/196 PASS |
| Mapper LiteAPI esistente |18/18 PASS |
| Parsing PS5.1 |14/14 file PASS |
| Lifecycle |530 PASS,17 skip espliciti preesistenti per Valkey reale |
| Security / release / analytics / capacity / beta |29/101/31/9/4 PASS |
| TypeScript, build, analytics-beta, smoke locale18 controlli |PASS |
| Scansioni diff segreti/artefatti privati/provenienza, scope19 e diff-check |PASS; nessun artefatto privato o file ignorato nello scope |

Il test completo CL04 misura17 richieste loopback,34 record cifrati,36 eventi,
riapertura autenticata e preparazione pura di5 candidati, con kernel/policy0.
CL11 conserva byte incompleti cifrati senza normalizzarli; CL12 dimostra l'effetto
remoto incerto del POST interrotto e GET0/retry0. CL13 esercita davvero un
checkout CRLF con commit LF, preservando il rifiuto di codice alterato anche
quando il chiamante cambia inventario/eccezioni. Non viene inventato un FAIL
storico per quest'ultimo rischio di checkout. Il controllo distinto DW01 invoca
una volta il kernel/policy su dati sintetici completi e ottiene `usable`;
preparazione0/0, zero/una alternativa senza esecuzione e casi incompleti/conflicti
con astensione effettiva rimangono separati.

Comandi di collaudo realmente eseguiti: `npm.cmd run test:engine-v3`,
`npm.cmd run test:engine-v2`, `npm.cmd run typecheck`, `npm.cmd run build` e
gli altri script canonici indicati nella tabella. I test launcher creano fixture
isolate, invocano il vero `.ps1` e rimuovono soltanto i propri temporanei sintetici.
Non usare queste fixture come configurazione production.

Per il preflight della proposta, i parametri reali sono i seguenti; prima
assegnare alle variabili lo SHA pubblicato dichiarato nella consegna, una nuova
destinazione di inventario esterna al repository e i percorsi/hash verificati.
L'inventario è una nuova preparazione, non una migrazione di sessioni esistenti.

```powershell
& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\invoke-liteapi-controlled-acquisition.ps1 -Mode Inventory -ExpectedHead $D0062Commit -ExpectedBranch 'codex/evaluation-d0036-d0041' -OutputPath $NewInventoryPath
if ($LASTEXITCODE -ne 0) { throw 'Inventory fallito: fermarsi' }
& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\invoke-liteapi-controlled-acquisition.ps1 -Mode Preflight -ExpectedHead $D0062Commit -ExpectedBranch 'codex/evaluation-d0036-d0041' -ConfigPath $ProposalPath -ConfigSha256 $ProposalSha256 -InventoryPath $NewInventoryPath -InventorySha256 $InventorySha256
if ($LASTEXITCODE -ne 0) { throw 'Preflight fallito: fermarsi' }
```

Il template non contiene `Acquire` e non chiede chiavi. La proposta con `null`
deve restituire `HOLD_CONFIGURATION_PENDING`, autorizzazione assente e zero
custodia/provider. Solo una futura configurazione effettivamente completata e
approvata consente il comando `Acquire` con gli stessi parametri vincolati.
Acquisizione e successiva misura privata richiedono autorizzazioni distinte.

Questi sono risultati locali, non GitHub CI o Linux nativo. Audit del registry
delle dipendenze online, verifica environment production e Valkey reale non
sono eseguiti né dichiarati PASS. Dipendenze/lockfile e workflow sono invariati;
il workflow corrente non è avviato automaticamente dal push sul work branch.
Il push viene effettuato soltanto dopo il gate finale e verificato con
`git ls-remote`; SHA, esito e commit ancora locali sono obbligatori nella consegna.
Nessun PASS locale sostituisce tale verifica.

Vedere `d0062-documentary-wire-profile.md` per fonti ufficiali, forme supportate e
distinzioni fiscali. Vedere `evidence/d0062-development-checks.json` per i primi
fallimenti conservati e la rettifica. I gate finali e la sincronizzazione sono
riportati dopo il collaudo del tree isolato; nessun risultato sintetico certifica
l'account, un'offerta attuale o la custodia reale del PC dell'utente.

Main,7path esclusi,17file D-0037 e materiali privati restano invariati.
Nessuna nuova revisione, importazione, applicazione privata, Golden, modifica a
pesi/ruoli/runtime pubblico. Questa fase non autorizza l'acquisizione proposta.
