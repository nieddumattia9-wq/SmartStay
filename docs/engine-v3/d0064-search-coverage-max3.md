# D-0064 — Launcher diagnostico copertura MAX3

## Perimetro e richieste congelate

Launcher: `scripts/invoke-liteapi-search-coverage.ps1`, Windows PowerShell5.1.
Contratto: `stayopti.liteapi-search-coverage@1`. D0062/MAX17 non modificato.
Nuovo caso: `D0064_LITEAPI_BOLOGNA_COVERAGE_001`.

| Operazione | Host/metodo/percorso | Limite |
|---|---|---|
| CATALOG | api.liteapi.travel, GET /v3.0/data/hotels | countryCode=IT, cityName=Bologna, limit=100, offset=0, timeout=12 |
| CITY_RATES | api.liteapi.travel, POST /v3.0/hotels/rates | cityName=Bologna, countryCode=IT, limit=20 |
| ID_RATES | stesso host/POST Rates | hotelIds esatti, massimo20, senza cityName/countryCode |

Body comune Rates: checkin2027-01-10, checkout2027-01-17, EUR,
guestNationalityIT, occupancies `[{adults:2,children:[6,11]}]`, limit20,
offset0, timeout12, maxRatesPerHotel3, includeHotelData=true, roomMapping=true.
Contesto conservato: sette notti, una unità, budget1400 EUR, Balanced manuale,
preferenza di distanza NOT_REQUESTED. Nessun filtro monetario o di qualità.

Seed: `D0064_BOLOGNA_COVERAGE_001_HASH_SAMPLE_V1`. Ordinamento SHA-256 del JSON
canonico `[seed,id]`, spareggio sugli esatti byte/stringa dell'ID; primi20 del
pool verificato. Mai decodifica/trim/ricostruzione dell'identificatore. Country e
city normalizzati solo per la verifica IT/Bologna. Duplicati identici annotati;
duplicati con record discordanti esclusi con tutti i riferimenti. Record
incompleti esclusi dal pool con motivo, non cancellati dall'originale.

Fonti ufficiali già qualificate nella preparazione (nessuna API interrogata):
[Catalog](https://docs.liteapi.travel/reference/get_data-hotels),
[Rates](https://docs.liteapi.travel/reference/post_hotels-rates),
[parametri Rates](https://docs.liteapi.travel/docs/rate-request-parameters-guide).
`limit` non garantisce20 strutture disponibili; `offset` non scorre soltanto
risultati disponibili. `maxRatesPerHotel` limita le tariffe prima del room mapping.
Timeout provider12s distinto dal timeout client20s; non è una scadenza commerciale.

## Controlli del percorso effettivo

- 3 tentativi massimi, CATALOG1/CITY1/ID1, pacing1000ms, concorrenza1.
- Nessun retry, redirect, altra pagina, dettaglio, facilities o prebook.
- Reserve prima dell'invio; eventi HMAC concatenati, pubblicazione atomica
  no-replace con flush, lock e marker monouso separati. Crash: nessuna ripresa.
- Originali request/response AES-256-GCM, chiave DPAPI CurrentUser. Il SEAL del
  pool e della richiesta derivata è cifrato prima di CITY_RATES.
- Configurazione, branch, HEAD, inventario transitivo, Node e staging verificati
  prima dell'autorità e prima degli invii. Nessun bypass production con fixture.
- Catalogo vuoto valido: CITY poi ID saltato. UnID: richiesta esatta su unID.
  Catalogo malformato/error: arresto. Rates204: nessun contenuto, altro braccio
  consentito. Ogni altro errore HTTP/semantico/trasporto o redirect: arresto.
- Credenziale soltanto dopo literal: `Read-Host -AsSecureString`, pipe stdin
  anonima, nessun ambiente/argomento/file. Cleanup in finally, best effort sulla
  memoria gestita. Eventuale eco della credenziale non è conservata.
- Root production nuova `%LOCALAPPDATA%\StayOpti\private-evidence\liteapi-search-coverage`.
  Retention14giorni dall'inizio, Mattia responsabile, nessuna cancellazione
  automatica. Nessuna ispezione di altre custodie da questo launcher.

Il riepilogo conserva indici, fingerprint non identificativi ed esclusioni di
ogni riga/offerta; gli ID originali restano nella custodia cifrata. I link
all'occupazione sono contati separatamente dall'accettazione completa del wire.
Overlap e differenze sono accompagnati dai tempi reali dei due invii/risposte.
Il risultato non certifica inventario esaurito, prezzo completo o prenotabilità.
`readCoverageOriginals` è una riapertura esplicita in sola lettura per una futura
diagnosi, non una modalità di ripresa delle richieste.

## Uso operativo

Le modalità reali esistenti sono Inventory, Preflight, Simulate, Acquire.
Argomenti comuni obbligatori: ExpectedHead, ExpectedBranch. Preflight/Acquire:
ConfigPath, ConfigSha256, InventoryPath, InventorySha256. OutputPath deve essere
nuovo, esterno al repository e con directory padre esistente. Simulate richiede
inoltre SimulationPath/Sha256, origine sintetica e root sotto TEMP.

1. Dopo il commit finale: Inventory con HEAD/branch espliciti e nuovo OutputPath.
2. Configurazione separata, hash dei byte effettivi; Preflight con entrambi gli
   hash. Non crea sessione né richiede API key, usa solo un probe DPAPI inventato.
3. Solo dopo nuova autorizzazione MAX3: Acquire con gli stessi argomenti;
   inserimento manuale literal e successiva chiave protetta. Mai riusare D0062.
4. Non rimuovere marker/lock dopo errori. Acquisizione e successiva diagnosi
   sono distinte; questo launcher non invoca motore/policy in alcuna modalità.

La configurazione privata definitiva e il comando con i suoi hash sono prodotti
sul commit effettivo, non incorporati nel codice per evitare binding circolari.

## Collaudo e pubblicazione

Risultati locali del candidato isolato, 2026-09-15:

| Controllo | Esito effettivo |
|---|---|
| D0064 mirati | 35/35 PASS, nessuno skip |
| Engine V3 completo | 2666/2666 PASS, nessuno skip |
| Engine V2 | 196/196 PASS |
| Lifecycle | 530 PASS, 17 skip preesistenti real-Valkey, zero FAIL |
| Security / release | 29/29 e 101/101 PASS |
| Analytics / capacity / beta | 31/31, 9/9, 4/4 PASS |
| TypeScript / build / analytics-beta / staging locale | PASS |
| Parsing reale Windows PowerShell5.1 | 15/15 PASS |

Checkout isolato da HEAD sorgente, senza sette path esclusi, HTML privato,
credenziali o dossier; soltanto dipendenze locali già installate. D0063 e tutti
gli altri eseguibili preesistenti restano byte-identici. Dopo i gate sono
aggiornate soltanto le righe documentali dei risultati, con controllo del diff
finale, inventario e scansione segreti/artefatti privati. Nessuna suite online
di audit del registry npm o qualifica CI è dichiarata. Acquisizioni production0.

Consolidamento: un commit selettivo dei14 file della fase sul solo branch
`codex/evaluation-d0036-d0041`; la ricevuta finale riporta SHA/push/verifica
diretta del remoto e commit ancora locali. Il push non autorizza Acquire.

Fallimenti iniziali conservati in `evidence/d0064-initial-validation.json`.
Un primo checkout di prova ha inoltre rilevato cinque righe vuote terminali
nei nuovi file; sono state rimosse prima del candidato finale e dei gate,
senza variazioni logiche. Il checkout fallito non è stato pubblicato.
I test Windows partono realmente con powershell.exe5.1, verificano avvio/exit e
output; nessun ENOENT/log vuoto può diventare PASS. Il blocco prompt distribuito
è eseguito con risposte sintetiche al Read-Host: non è una prova di chiave reale.
Le altre prove attraversano il vero launcher, parser Node, registro, server
localhost e DPAPI, compresi concorrente/crash/timeout e lettura byte-identica.

Limiti: nessuna qualifica dell'account LIVE o della copertura reale, nessuna CI
GitHub rivendicata. Nessuna equivalenza tra questa simulazione e custodia reale.
Pesi, ruoli, pubblicoV2, sigilloD0037, sette path esclusi e progressi preservati.
