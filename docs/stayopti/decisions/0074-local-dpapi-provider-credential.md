# D-0074 — credenziale LiteAPI locale cifrata e riutilizzabile

Data: 2026-09-21. Base: `f33f4ea5169c4c5e409efbec6bfa06d868685d88`.
Autorizzazione di Mattia: implementazione e collaudo con chiavi inventate,
consolidamento selettivo sul branch di lavoro dopo i gate. Nessun nuovo pilota.

## Decisione e confine

La configurazione iniziale salva la Production Private API Key mediante DPAPI
CurrentUser, fuori dal repository e dalle custodie, in
`%LOCALAPPDATA%\StayOpti\credentials\liteapi\Production\private-api-key.dpapi`.
La directory e i file hanno ACL non ereditate, utente corrente e SYSTEM soltanto.
La root e il profilo sono fissi; link/reparse point e permessi inattesi fermano
il percorso. Non vengono corretti automaticamente permessi o file corrotti.

Il formato `stayopti.liteapi-private-api-key@1` usa DPAPI con entropy di dominio
e profilo. Sandbox e Production non sono intercambiabili; i launcher attuali
caricano esclusivamente Production. Il profilo Sandbox configurabile non
attiva un nuovo trasporto. Nessun fallback e nessuna ricerca di altre chiavi.

DPAPI protegge rispetto ad altri utenti, non da software ostile eseguito come
lo stesso utente o da un account/host compromesso. Si usa il contesto utente,
non LocalMachine: [ProtectedData, Microsoft](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata?view=netframework-4.8.1).
La validita commerciale della chiave non viene verificata dalla configurazione.

## Sequenza e riuso

Tutti i launcher MAX17/MAX3/MAX5 delegano a `invoke-liteapi-profile-runner.ps1`.
MAX17 perde la copia duplicata del prompt/processo, non i suoi controlli.

1. Preflight esistente: codice/inventario, configurazione, caso monouso e limiti.
2. Literal prevista, accettata manualmente per quel tentativo.
3. Apertura dell'archivio del solo profilo Production e decifrazione locale.
4. Processo Node con soli argomenti pubblici; chiave via pipe stdin anonima.
5. Ulteriori verifiche Node e governatore esistenti restano invariati.

Non esiste un prompt implicito di configurazione durante Acquire. Chiave assente,
corrotta, indecifrabile, profilo diverso o ACL insicure danno un errore locale
prima del trasporto. Preflight, Inventory e Simulate non leggono l'archivio.
Il caricamento del modulo Security usa esplicitamente il modulo integrato del
processo Windows PowerShell 5.1, senza modificare PSModulePath o profili di sistema.

Le scritture salvano soltanto ciphertext: file temporaneo nella stessa directory,
flush, pubblicazione atomica e lock esclusivo con eliminazione alla chiusura.
Configure non sovrascrive; Replace e Remove sono comandi espliciti.
L'eliminazione riguarda esclusivamente il file della credenziale selezionata,
non directory, risultati, marker o autorizzazioni. Non e una revoca provider ne
una cancellazione sicura dei backup. Nessuna scadenza automatica: la credenziale
rimane fino a sostituzione/rimozione, indipendente dalla retention delle prove.

Memoria: SecureString e BSTR eliminati/disposti in finally; buffer decifrati
azzerati. La stringa necessaria al canale Node e best-effort, non una promessa di
azzeramento di tutte le copie del runtime/GC. Nessun segreto in argomenti,
variabili d'ambiente, frontend, ricevute o output. Non abilitare debugger/tracing
di dati sensibili. Il canale stdin @1 trasporta anche metadati non segreti della
modalita; non costituiscono prova di validita della credenziale presso il provider.

Le nuove ricevute distinguono `credentialPersisted=true` nel separato archivio
DPAPI da `credentialInAcquisitionArtifacts=false`. Simulate dichiara
`NO_CREDENTIAL_USED`. HTTP 401/403 conserva l'esito e suggerisce controllo o
Replace: nessun retry, cancellazione automatica della chiave o riapertura del
caso consumato. Gli errori di processo non rivelano il contenuto dello stdin.

## Compatibilita e operativita

Nessuna ricevuta storica e reinterpretata. I nuovi inventari includono helper
PowerShell e lettore stdin condiviso; gli inventari vecchi non vengono rigenerati
per accettare codice diverso. Un futuro tentativo richiedera il suo checkpoint,
inventario, configurazione e autorizzazione: questo incarico non li prepara.
La configurazione della chiave, da sola, non autorizza nessuna acquisizione.

Da un terminale Windows, senza inserire la chiave nel comando:

```powershell
& "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\Mattia\SmartStay\scripts\manage-liteapi-credential.ps1' -Mode Configure -Profile Production
if ($LASTEXITCODE -ne 0) { throw 'Configurazione della credenziale non completata.' }
```

Digitare la chiave soltanto nel prompt protetto. Per sostituire o rimuovere,
riusare il comando con `-Mode Replace` o `-Mode Remove`. ExecutionPolicy riguarda
solo il processo figlio; nessuna modifica permanente. Il normale Configure
rifiuta una chiave gia esistente prima di richiederne un'altra.

## Prove e fallimenti conservati

11 nuovi test, solo fixture inventate: processi distinti con DPAPI reale,
assenza del secondo prompt, no overwrite, Replace/Remove, corruzione, profilo
scambiato/assente, ACL/link/lock, invalid replacement, tre rami dei launcher,
autorizzazione negata con archivio corrotto, errore 401 senza retry e marker
consumato immutato dopo Replace. Il processo Node simulato usa il lettore stdin
reale e verifica assenza della chiave da argomenti, ambiente e output.
Le regressioni esistenti del cleanup e dei launcher verificano ora lo stesso
runner condiviso, senza duplicare implementazioni. Le suite di acquisizione
restano responsabili dei loro contatori, checkpoint e marker.

Primi esiti conservati: 2 PASS/9 FAIL per caricamento implicito del modulo
Security dal percorso ereditato da PowerShell 7; successivamente 5 PASS/6 FAIL
per null convertito in stringa vuota nell'overload File.Replace e per il setup
del test ACL che richiedeva privilegi SACL non necessari. Correzioni: modulo
Windows 5.1 esplicito, `[NullString]::Value` per backup nullo, modifica della sola
DACL della fixture mediante .NET. Nessuna asserzione o controllo allentato.
La verifica successiva ha 34/34 PASS (11 nuovi e 23 regressioni di boundary),
zero skip, con PowerShell 5.1 e DPAPI CurrentUser effettivi.
Il primo gate completo sul candidato isolato registra V3 3332 PASS / 1 FAIL:
CL01 cercava ancora il prompt e la pipe nel wrapper MAX17. Il test e aggiornato
per verificare la delega reale, il prompt nella gestione separata, la pipe e il
cleanup nel runner condiviso, e l'ordine preflight/autorizzazione/caricamento.
Non si ripristina un secondo prompt segreto durante Acquire. Log iniziale
conservato, senza riscrivere gli esiti delle prove precedenti.

### Gate finali realmente eseguiti

Checkout Windows isolato e pulito, candidato
`211a98d855b0cb6f61fd4a92cd71e15282612692`, senza modifiche estranee, credenziali
o prove private. File software/test corrispondenti byte per byte al tree finale;
dopo i gate cambiano soltanto queste registrazioni Markdown.

| Verifica | Esito locale |
| --- | --- |
| `npm.cmd run release:ci`, tramite Windows PowerShell 5.1 | PASS, exit 0 |
| Engine V2 | 242/242 PASS |
| Engine V3 (inclusi launcher e nuovi test DPAPI) | 3333/3333 PASS, 0 skip |
| Lifecycle | 665 PASS, 17 skip espliciti Valkey preesistenti, 0 FAIL |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript, analytics-beta gate, build | PASS |
| Audit dipendenze dentro release:ci | PASS: root e server-production, 0 vulnerabilita |
| `npm.cmd run audit:security` separato | PASS sul primo candidato; package, lockfile e script audit invariati e verificati sul finale |
| Parser Windows PowerShell 5.1 | 19/19 PASS |
| Creazione/verifica manifest con lo stesso SHA esplicito | PASS, nessun deploy |
| Smoke locale | 18 controlli PASS |

Le prove usano chiavi inventate, store di fixture isolati e trasporti sintetici.
La configurazione vera della chiave rimane un'operazione locale di Mattia.
Le connessioni esterne di validazione sono limitate all'audit del registro npm;
nessuna API LiteAPI. Questi risultati non sono un'esecuzione della CI GitHub.

25 file protetti, main, modifiche estranee e materiali storici restano esclusi.
Nessuna chiave reale letta/configurata, chiamata provider, acquisizione reale,
preparazione privata, esecuzione del motore sui dati privati o deploy.
La pubblicazione e i commit eventualmente ancora locali sono rendicontati dopo
lettura diretta del remoto, separatamente dai risultati Windows locali/CI.

## Inventario selettivo

Solo 19 file; nessun file di credenziale, configurazione di caso o prova privata.

| Responsabilita | File |
| --- | --- |
| Archivio, gestione e canale nuovi | `scripts/liteapi-credential-store.ps1`, `scripts/manage-liteapi-credential.ps1`, `scripts/liteapi-credential-channel.mjs` |
| Delega e riuso launcher | `scripts/invoke-liteapi-profile-runner.ps1`, `scripts/invoke-liteapi-controlled-acquisition.ps1` |
| Chiusura del codice negli inventari futuri | `scripts/liteapi-controlled-plan-v1.mjs`, `scripts/liteapi-search-coverage-plan-v1.mjs`, `scripts/liteapi-hotel-detail-plan-v1.mjs` |
| Stdin e rendicontazione | `scripts/run-liteapi-controlled-acquisition.mjs`, `scripts/run-liteapi-search-coverage.mjs`, `scripts/run-liteapi-hotel-detail-enrichment.mjs` |
| Regressioni sintetiche | `tests/engine-v3/v3LiteApiCredentialStore.test.ts`, `tests/engine-v3/v3LiteApiControlledBoundary.test.ts`, `tests/engine-v3/v3LiteApiControlledLauncher.test.ts`, `tests/engine-v3/v3LiteApiSearchCoverageLauncher.test.ts`, `tests/engine-v3/v3LiteApiHotelDetailsLauncher.test.ts` |
| Documentazione | questa decisione, `docs/stayopti/CURRENT_STATE.md`, `docs/stayopti/DECISION_LOG.md` |
