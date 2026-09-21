# D-0073 — preparazione commerciale storica autenticata, primo lotto

Data: 2026-09-21. Base `41bea03927d8f13ec7a4908fe6f2e905a8d2854f`.
Autorizzazione Mattia: ingresso storico, matrice pura, test sintetici, successiva
derivazione privata e pubblicazione selettiva sul branch evaluation. Non include
binding reale, esecuzione privata del motore, acquisizione o LIVE.

## Decisione e confini

`stayopti.historical-commercial-matrix@1` è un contratto diagnostico additivo,
non una nuova interpretazione di A02 @1/@1.1. Questi contratti, preparatori,
binding e ricevute restano byte-identici. Un documento storico non viene
rinominato SYNTHETIC_ONLY. La versione commerciale provider può essere UNKNOWN;
observationId e impronte locali sono identità probatorie, mai revisioni commerciali.

`scripts/liteapi-historical-commercial-v1.mjs` legge soltanto le due custodie
esplicitamente indicate, tramite i lettori preesistenti AES-GCM/journal/DPAPI.
Autentica entrambi i set prima dell'interpretazione; ricostruisce e confronta il
source binding storico dei dettagli. Non apre uno store, non crea directory,
non richiede credenziali, non rinnova retention e non importa prebook esterni.
Non espone un ingresso raw, callback di fiducia o funzione mark-authenticated.
L'origine deriva dal journal verificato; un protector iniettato è ammesso
soltanto per journal sintetici, mai per REAL.

L'adattatore mantiene tutte le varianti, record/hash/puntatori e tempi; riusa
decode SEARCH, qualificazione fiscale/SSP, confronto camere e HTML inerte.
Non usa la selezione MAX17 di una tariffa per struttura. Il core
`contract/historicalCommercialEvidenceV3.ts` consuma fatti comuni, senza nomi
di provider o endpoint, riusando età D-0072 e istanti R06. La preparazione
`evaluation/authenticatedHistoricalCommercialV3.ts` accetta soltanto il
produttore autenticato fisso; oggetto immutabile/WeakSet distinto dal sintetico.
Una copia serializzata è un rapporto, non una nuova attestazione accettabile.

## Controlli realmente consumati

- SSP qualificato solo nel suo ambito: sotto minimo = VIOLATED, valute non
  confrontabili = UNKNOWN, assenza e NOT_APPLICABLE restano distinti. L'adattatore
  non inventa una non-applicabilità quando la fonte tace e non riscrive il prezzo.
- Costo completo separato dal prezzo pubblico: il null fiscale documentato
  conserva il significato all-included; un elenco di componenti, da solo, non
  dimostra esaustività. Depositi/optional non sono sommati; nessun FX.
- Capacità, inventari e concordanza restano distinti. Titoli generici non
  cancellano letti documentati; divani ignoti/OR/negazioni non diventano posti.
- childAllowed, ammissione testuale e condizioni familiari vengono consumati.
  Un flag negativo generico non certifica da solo la tariffa: resta incerto,
  conflittuale davanti a prosa contraria. Un divieto esplicito applicabile è
  distinto. Gratuità di un bambino non è un limite massimo di bambini ammessi.
- Documento al check-in, accompagnamento e richieste accessorie non alterano
  inventario/tasse; condizioni pendenti restano requisiti futuri, senza raccogliere
  documenti personali o dichiarare assolta la condizione. Soglie gruppi camere
  sono valutate rispetto alle unità richieste. Extra pet/breakfast conservano scope.
- Calendario con campo esplicito GMT/UTC può essere adattato a ISO, preservando
  l'originale e tutta la precisione; senza fuso non viene inventato un istante.
  Deadline non interpretabile, scadenza effettiva e scadenza assente restano distinte.

## Limiti intenzionali

È preparazione, non decisione/astensione. Rates attesta osservazione, non verifica
commerciale: in questo lotto verification/retrieval restano NOT_OBSERVED. Un
dettaglio successivo non aggiorna prezzo, disponibilità o expiry. Nessun kernel
o policy è invocato dal nuovo ingresso. Il futuro binding reale resta separato,
con prova di continuità/versione, condizioni e verifica commerciale adeguate.

Grammatica bounded inglese e HTML supportato, non interprete universale. Forme
non supportate sono conservate con motivo; una nota non sostituisce un requisito
verificato. Le richieste multicamera restano non rappresentabili da questo
ingresso, non vengono appiattite. Un set dettagli con source binding incompatibile
è rifiutato, non ricucito per nome. Mancanza totale dettagli è invece preparabile
con UNKNOWN di camera. Policy, pesi, ruoli e runtime pubblico invariati.

## Verifica e pubblicazione

Regressioni sintetiche e gate isolati conclusi sul candidato software/test
`e0451e63bd047052c2c257f8215d8a57a35691b0`, clone locale senza file esclusi,
con dipendenze fisiche e byte originali dei contratti legacy. Dopo questo
checkpoint vengono completati soltanto questi documenti di rendiconto.

| Verifica Windows locale | Esito effettivo |
|---|---|
| Nuovo ingresso storico | 33/33 PASS, incluso Windows PowerShell 5.1 / DPAPI CurrentUser su journal sintetici |
| Mirati storico + A02 + temporali + famiglia D-0072 | 141/141 PASS, zero skip |
| Engine V2 canonico | 242/242 PASS |
| Engine V3 canonico | 3295/3295 PASS, zero skip |
| Lifecycle | 665 PASS, 17 skip Valkey preesistenti, zero FAIL |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript, build, analytics-beta, dependency audit | PASS |
| Smoke locale provider-free | PASS, 18 controlli |
| Comando esatto `npm.cmd run release:ci` in Windows PowerShell 5.1 | exit 0 |

I primi tentativi rimangono conservati: sandbox EPERM realpath prima di lettura;
poi errore del candidato per valore undefined nella serializzazione semantica,
corretto eliminando il campo di provenienza dalla chiave, senza allentare il
serializzatore. Il rifiuto del collegamento di custodie estranee è ora esplicito
prima della ricostruzione del source binding. Nessuna prova storica riscritta.
Un primo typecheck aveva rilevato import Node statici nel contesto di compilazione
browser: corretti al confine evaluation senza cambiare tsconfig o dipendenze.
Il primo worktree isolato aveva anche CRLF nei contratti sigillati e junction
node_modules, legittimamente respinti dai controlli storici. Il clone finale usa
byte esatti e directory fisiche: nessuna asserzione o controllo link allentato.
Una regressione aggiuntiva verifica il puntatore esatto delle remarks dell'offerta,
distinto da quello delle remarks della prima tariffa. Gli esiti iniziali non sono
stati reinterpretati come PASS.

La preparazione privata autorizzata è stata eseguita una volta sullo stesso
software verificato, con autenticazione CurrentUser e confronto dei materiali
prima/dopo. Il rapporto separato conserva tutte le varianti e i limiti originali:
zero invocazioni kernel/policy, nessuna acquisizione e nessun rinnovo retention.
Hash di sorgenti, closure compilata e input sono nel manifest privato, senza
attribuire l'esecuzione storica precedente a questo nuovo codice.

Riproduzione: runner ufficiale `npm.cmd run test:engine-v3`, oppure compilazione
`tsconfig.tests.json` ed esecuzione mirata del test v3AuthenticatedHistoricalCommercial.
Il gate Windows PS5.1/CurrentUser usa journal nuovi esclusivamente sintetici.
Il test sul qualifier puro non attesta autenticità: lo fa soltanto il produttore
che apre journal verificati. Nessuna asserzione di CI GitHub deriva dai PASS locali.

Software da consolidare: due nuovi moduli TypeScript, adattatore mjs, fixture e
test sintetico, questo record, CURRENT_STATE e DECISION_LOG. Materiali derivati
reali e rapporti privati restano esterni. Ogni fase riporta push effettivo e
commit ancora locali. Main e i 25 path protetti restano invariati; nessun
inventario storico viene aggiornato al nuovo HEAD.

## Utilizzo del primo lotto

`prepareAuthenticatedHistoricalCommercialV3({ coverage: { root, registryRoot },
details: { root, registryRoot } })` è l'ingresso Node evaluation, eseguito dalla
root del checkout verificato dopo compilazione. I percorsi devono indicare i
singoli casi autorizzati e i rispettivi registri. `details` può essere omesso:
non si cercano altre custodie e la camera rimane UNKNOWN. Nessuna API key.
`syntheticProtector` appartiene soltanto ai test e non è accettato per REAL.

Il risultato `PREPARED_DIAGNOSTIC_MATRIX` contiene autenticazione, tutti i fatti,
gli esiti per dimensione e i requisiti futuri. Non equivale a ammissibilità né a
una preparazione emessa dal validatore commerciale A02. Il qualifier comune è
invocabile da solo per test semantici ma dichiara di non attestare autenticità.
Un futuro ingresso di verifica commerciale/binding richiede un incarico distinto.

Pubblicazione autorizzata soltanto sul branch `codex/evaluation-d0036-d0041`,
con staging selettivo di otto file e controllo diretto del remoto. Il rendiconto
di consegna registra SHA locale/remoto, push e commit ancora locali; questi PASS
sono locali Windows, non esiti CI GitHub o autorizzazione LIVE.
