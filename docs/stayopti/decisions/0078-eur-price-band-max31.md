# D-0078 — fascia commerciale EUR e campione finito MAX31

Decisione di Mattia, 29 settembre 2026. Base software:
`4a9cb644b3c247a5ad5421a1a8e04a0d1469e4ba`.
Solo evaluation-only; nessuna attivazione del prodotto o modifica al merito.

## Regola e compatibilità

Nuove versioni: `stayopti.liteapi-ssp-probe@1.4` (componente puro riusato),
`stayopti.public-price-policy@2`, `stayopti.public-price-perspective@2`,
`stayopti.band-comparison-max31@1` e journal separato. MAX11 e sonda MAX3
storici non ricevono questa politica. Le versioni SSP @1–@1.3 restano esatte.

Per EUR, una tariffa e una unità, importi riferiti all'intero soggiorno:

- S è la soglia qualificata. R1 conserva le singole fonti e accetta soltanto
  la discrepanza già delimitata di un centesimo; il maggiore è un riferimento
  locale prudenziale, non un nuovo SSP attribuito al provider.
- Il prezzo P realmente restituito è accettabile se **S ≤ P ≤ S+5 EUR**.
- S+1 EUR è solo l'obiettivo del calcolo locale, non un prezzo garantito né
  una condizione di uguaglianza. Il limite +5 è una scelta commerciale locale.
- Conversione e confronti in centesimi interi, nessun epsilon o FX implicito.
  Importi con precisione non supportata e fonti non comparabili restano bloccati.
- Il candidato margin usa una sola volta il metodo razionale già documentato,
  con sei decimali percentuali; retail meno commissione rimane una **base
  derivata**, mai un netto attestato. Nessuna modifica del default account.

La fascia non si applica alle variazioni fra Rates e prebook: il prezzo
osservato scelto deve rimanere identico. Un aumento di 0,01 EUR al prebook è
bloccante anche dentro la fascia. Soglie, occupazione e condizioni conservano
controlli propri; nessuna autorizzazione a un aumento al checkout.

## Collegamenti effettivi

`stay-price-band.ts` è il meccanismo comune indipendente dal provider; `.mjs`
è il build controllato usato dal launcher. Estrazione/qualifica degli SSP
restano nell'adattatore documentale. La nuova versione riusa R2: prima tutte
le condizioni osservate, poi una sola corrispondenza e nessun concorrente
irrisolto. Prezzi e ordine non disambiguano tariffe.

Il lettore MAX31 autentica journal e originali prima della reinterpretazione,
ricostruisce il prefisso delle richieste e la selezione. Solo le sue emissioni
possono arrivare al preparatore commerciale; cambiare l'origine o ricalcolare
hash di un oggetto del chiamante non emette una preparazione valida.
L'adattatore conserva SEARCH, ogni REQUOTE, alternative escluse, motivi,
fonti, prezzi originali, tariffe precedenti e token nuovi. Una equivalenza
osservata fra due Rates non dichiara continuità dei token.

La prospettiva @2 conserva separatamente retail, tutte le soglie, intenzione
commerciale, prezzo effettivamente accettato e verifica. Il prezzo portato a
V2/V3 è il costo qualificato della vera osservazione, **non** S+1 o S+5.
La soglia di dieci proprietà è metadato di questo pilota autenticato, legato
al fingerprint dell'intero set. I consumatori storici conservano le proprie
soglie. Meno di dieci complete: `PILOT_SAMPLE_INCOMPLETE`, motore zero.

Il percorso verificato è l'A02 indipendente già esistente: preparazione pura,
input V2, decisione V3, binding dell'intero set, shadow e replay. Non è una
misura della role-policy intent, del sito pubblico o un'ammissione Golden.
Prezzo nella fascia non certifica costo completo, letti, famiglia, attualità,
checkout o prenotabilità futura. Le condizioni sostanziali A02 restano attive.
Una nuova fonte SSP del prebook non cambia automaticamente quelle già note:
le fonti precedenti restano stabili e la nuova viene qualificata separatamente.

## Piano finito — non autorizzato all'acquisizione

Il piano concreto e i riscontri commerciali restano privati. Il meccanismo non
contiene città, date, famiglia o hotel storici. Profilo e scenario sono sigillati
prima dei risultati; budget/Balanced restano input decisionali, non filtri Rates.

| Operazione | Limite | Richiesta |
|---|---:|---|
| SEARCH | 1 | POST api.liteapi.travel/v3.0/hotels/rates; città del piano, limit200, offset0, maxRatesPerHotel3, includeHotelData/roomMapping; timeout provider12s/client20s |
| REQUOTE | 10 | Stesso endpoint, un solo hotelId per richiesta, limit1, unico margin candidato; stessi ospiti/date e massimo3 tariffe; timeout12s/20s |
| HOTEL_DETAIL | 10 | GET api.liteapi.travel/v3.0/data/hotel; hotelId esatto, language=en, timeout provider4s/client20s |
| PREBOOK | 10 | POST book.liteapi.travel/v3.0/rates/prebook; offerId esatto dell'osservazione accettata, usePaymentSdk=false; timeout30s/client35s |
| Totale | **31** | Sottolimiti non trasferibili, concorrenza1, pacing≥1000ms, risposta≤32MiB |

Pool di massimo200 record; hash del seed + hotelId, tie-break ID. Primi dieci
ID unici sigillati dopo SEARCH e **prima** delle risposte successive. Una
tariffa per struttura scelta per hash di seed/hotel/offerId, non per prezzo,
esito, posizione nella risposta o vicinanza a SSP. Nessuna sostituzione di
strutture/tariffe: la finestra del provider non è l'intero mercato.
Duplicati, formati non interpretabili e finestre inattese restano nella traccia.

Per ogni struttura nell'ordine sigillato:

1. Se P iniziale è già nella fascia e gli altri controlli osservabili passano,
   non effettuare REQUOTE. Non occorre inventare una commissione per questo ramo.
2. Altrimenti, soltanto se l'impedimento è il prezzo, una REQUOTE col margin
   derivato per quella specifica struttura. Nessuna percentuale universale.
3. Corrispondenza unica per condizioni, soglie invariate, prezzo nella fascia.
   Un'incertezza, una differenza o un prezzo fuori fascia escludono quella
   proposta; nessun secondo aggiustamento o rimpiazzo.
4. Dettaglio esatto, controllo dei conflitti documentati della sistemazione,
   quindi al massimo un prebook. L'informazione insufficiente resta tale per A02.

Con tutte le osservazioni iniziali già ammissibili: fino a21 tentativi, non31.
Con dieci REQUOTE necessarie: fino a31. Nessun GET prebook, facilities, catalogo,
pagina aggiuntiva, booking o pagamento. Recupero di sessione non richiesto.
Errori HTTP/applicativi/trasporto, redirect, integrità o checkpoint fermano
l'esecuzione. 204/2001 documentati significano assenza di risultati, non errore
convertito artificialmente in successo. STOP di qualificazione è conservato
per la singola proposta; si può esaminare il resto del campione già fissato.

Ogni tentativo è riservato durevolmente **prima** dell'invio. Timeout/prebook
con effetto remoto incerto consumano il sottolimite. Doppio avvio, ripartenza,
checkpoint/config/inventory alterati non azzerano contatori o marker. Custodia
separata AES-GCM/DPAPI CurrentUser, 14 giorni dal futuro inizio, nessuna rimozione
automatica o rinnovo delle scadenze storiche.

## Comandi e separazione delle autorità

Launcher esistente di gestione credenziale riusato senza modificarlo:
`scripts/invoke-liteapi-band-comparison.ps1`, modalità Inventory, Preflight,
Simulate, Acquire. Avvio con processo Windows PowerShell5.1 e
`-NoLogo -NoProfile -ExecutionPolicy Bypass -File`; nessuna policy permanente.
Preflight non legge la chiave e non crea custodia. Dati sintetici consentono
soltanto Simulate, non una literal che possa sbloccare lo store Production.
Su un futuro piano reale completo, la literal specifica precede il recupero
DPAPI D-0074 e il trasferimento protetto su stdin. Nessuna chiave in CLI/log.

`scripts/run-authenticated-commercial-comparison.mjs` rimane separato; Prepare
richiede esplicitamente il file policy@2 per MAX31 e conta motore zero.
Execute richiede la propria autorizzazione e ricostruisce il binding/replay.
Un inventario nuovo non migra né riapre i casi consumati.

## Validazione e limiti

Controllo iniziale inventato @1.3: S1150/P1152 → STOP exact-target; il risultato
rimane corretto per la versione storica. Nuova politica: P902/S900 è accettato
pur differendo dall'obiettivo901, con successivo prebook identico e costi provati.
Prove incluse: estremi della fascia, sotto SSP, centesimo R1 in entrambi gli
ordini, conflitti più grandi, valuta/scope, concorrenza di varianti, prezzi e
condizioni mutate al prebook, alternative incomplete, sample9 e sample10,
autenticazione, originali invariati, determinismo e lanciatore reale PS5.1.

Candidato verificato in clone locale isolato sullo stesso branch/base, senza
index/prototipo e file privati preesistenti. Windows PowerShell **5.1.26100.9444**,
Node24.18.0; runner ufficiali, nessun risultato attribuito alla CI GitHub:

| Verifica rieseguita sul codice finale | Esito locale |
|---|---|
| V3 completo, inclusa compilazione canonica e 55 prove nuove | **3648/3648 PASS**, zero skip |
| V2 | **242/242 PASS** |
| Lifecycle | **665 PASS**, 17 skip preesistenti |
| Security / release | **29/29**, **101/101 PASS** |
| TypeScript / build | PASS, exit0 |
| Equivalenza diretta @1–@1.3 rispetto al checkpoint base | **44/44 output identici** |
| PS5.1 Inventory/Preflight/Simulate e DPAPI | PASS su originali inventati, zero richieste provider |
| Identità candidato/inventario, diff e 25 file protetti | verificati; nessuna modifica protetta |

Le prove end-to-end misurano 31 invii localhost nel ramo con dieci REQUOTE,
21 richieste pianificate nel ramo diretto, zero motori nella preparazione.
La fixture A02 completa produce un confronto raccomandato con contatori
V2=1, costruzioniV3=3 (comprese ricostruzioni), binding=1, shadow=1, replay=1.
Il campione di nove non avvia i motori. Doppio avvio, 32esimo tentativo,
timeout senza retry, interruzione e alterazione degli originali restano bloccati.
La gestione condivisa D-0074 è invariata e coperta dalle regressioni con chiavi
inventate; il nuovo launcher sintetico non può aprire lo store Production.

Fallimenti iniziali conservati: assert di tassonomia aggiornato al corretto
`PILOT_SAMPLE_INCOMPLETE` (senza allentare motore-zero); esempio SSP scalare del
prebook non supportato, mantenuto come prova negativa e distinto dal controllo
money-object documentale; record roomTypes malformato escluso che interrompeva
la normalizzazione, ora conservato con fonte/hash e ragione esplicita. Prima
esecuzione V3 isolata: sette rifiuti per junction delle dipendenze e un hash del
validatore storico differente per CR finale introdotto dal checkout CRLF.
Risolto **solo l'ambiente** con copie fisiche e byte LF originali invariati;
nessuna modifica del validatore, del relativo hash atteso o delle asserzioni.
La ripetizione completa finale è quella PASS sopra, non una somma di run parziali.

Nessuna chiamata provider, lettura della chiave Production, decifrazione storica
o esecuzione privata del motore durante questo sviluppo. Documenti/inventario
finali sono consegnati separatamente dalle evidenze sintetiche intermedie.

Production/A02 resta HOLD: oltre a un nuovo piano e alla futura literal servono
copertura documentata dell'uso tecnico dei dati e della conservazione per questo
confronto finito, e poi almeno dieci offerte sostanzialmente qualificate dalle
risposte. Il listino standard/tetto0 e l'autorizzazione alla retention14 già
forniti non sono una nuova verifica delle condizioni dell'account/fair use.
Nessuna lettera personalizzata o contatto esterno viene imposto o effettuato.

## Inventario della fase

File software/test (nessun dato acquisito):

- `server/shared/stay-price-band.ts` e `.mjs`;
- `scripts/liteapi-ssp-probe-v1.mjs`;
- `scripts/liteapi-band-comparison-plan-v1.mjs`;
- `scripts/liteapi-band-comparison-capture-v1.mjs`;
- `scripts/liteapi-band-comparison-acquire-v1.mjs`;
- `scripts/bounded-profile-execution-v1.mjs`;
- `scripts/run-liteapi-band-comparison.mjs`;
- `scripts/invoke-liteapi-band-comparison.ps1`;
- `scripts/bounded-acquisition-journal-core-v1.mjs` (capability subjectKinds additiva);
- `scripts/liteapi-comparison-plan-v1.mjs` (parametri fidati dell'inventario);
- `scripts/liteapi-comparison-facts-v1.mjs`;
- `scripts/run-authenticated-commercial-comparison.mjs`;
- `src/engine-v3/contract/historicalCommercialEvidenceV3.ts` (scope additivo, qualificatore storico invariato);
- `src/engine-v3/contract/publicPricePerspectiveV3.ts`;
- `src/engine-v3/contract/authenticatedCommercialSetV3.ts`;
- `src/engine-v3/evaluation/authenticatedCommercialPreparationV3.ts`;
- `tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs`;
- `tests/engine-v3/fixtures/d0078-initial-policy-control.json`;
- `tests/engine-v3/v3StayPriceBand.test.ts`;
- `tests/engine-v3/v3BandComparisonMax31.test.ts`.

Documenti: questo rapporto, CURRENT_STATE e voce append-only DECISION_LOG.
Main, 25 protetti, index/prototipo preesistenti e ricevute storiche esclusi.
Ogni fase conclusa deve riportare push e commit ancora locali; la sincronizzazione
verrà attestata soltanto dal readback diretto del branch remoto autorizzato.
