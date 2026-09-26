# D-0077 — Sonda offline Rates / margin / SSP

Data: 2026-09-26. Base e840031b04b97e0dc670ae8827f3054961a3ecff,
branch codex/evaluation-d0036-d0041. Modifiche locali; commit/push non autorizzati.
Production HOLD. Nessuna modifica a core, policy, pesi, account, MAX11 o ricevute.

## Conclusione di fattibilità

La percentuale per ricerca è documentata, l'allineamento esatto di qualsiasi
offerta all'SSP non è garantito. È giustificato un esperimento finito che
misura l'importo realmente restituito, non un comando che prometta SSP esatto.

Fonti ufficiali consultate il 26 settembre 2026:

- [Revenue Management and Commission](https://docs.liteapi.travel/docs/revenue-management-and-commission):
  `margin` ammette decimali e, se omesso, usa il default dell'account;
  `additionalMarkup` ha un significato diverso. SSP è una soglia pubblica;
  sono ammessi prezzi superiori. L'esempio 15% non è una legge generale.
- [Rates](https://docs.liteapi.travel/reference/post_hotels-rates):
  il parametro numerico modifica il markup della singola richiesta;
  ricerca per hotelId e roomMapping sono documentati. Non è descritto un
  input per imporre un importo SSP assoluto alla singola offerta.
- [Prebook](https://docs.liteapi.travel/reference/post_rates-prebook):
  usa l'offerId ottenuto dalla ricerca; il body documentato non offre un
  parametro per riscrivere prezzo o margin. È una verifica/sessione commerciale,
  non un pagamento o una prenotazione conclusa.
- [Struttura delle Rates](https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure):
  retail, commissione e SSP sono dati distinti. La commissione esplicita può
  sostenere un calcolo candidato; il risultato della sottrazione non è un
  netto esplicitamente restituito dal provider.

Non sono state trovate specifiche sufficienti per garantire precisione massima
di margin, arrotondamento monetario o stabilità della base tra due ricerche.
Non viene quindi aggiunta una certificazione software di tali proprietà.
Le informazioni del pannello (request override, hotel rules assenti,
Customer-Managed e servizio Managed separato) sono comunicazioni di Mattia:
nessuna ispezione del pannello, retrodatazione o attivazione di servizi.

## Un solo esperimento minimo: massimo 3 tentativi

Una struttura fissata prima dei risultati; nessuna selezione per prezzo,
commissione, esito favorevole o preferenza umana. Stesso scenario già approvato.
La sonda è distinta dal confronto A02 tra almeno due strutture.

1. **DISCOVERY — una POST Rates.** hotelIds contiene l'unico ID pianificato;
   limit1, offset0, maxRatesPerHotel3, roomMapping/includeHotelData true,
   timeout provider12s. Nessun margin esplicito: default account invariato.
   Fra le offerte restituite, selezione hash/seed fissata prima dei prezzi.
   Mancanza di dati o ambiguità nella selezionata: stop, non sostituzione.
2. **REQUOTE — una seconda POST Rates**, stessi parametri e hotelId,
   con un solo `margin` candidato. Per la precisa offerta singola/unità,
   stessa valuta e commissione esplicita coerente: B = retail − commissione;
   m = 100 × (SSP / B − 1). B è una derivazione condizionata, non un netto
   provider. Si conservano fonti, ipotesi, frazione esatta, percentuale inviata
   e residuo di arrotondamento. Sei decimali percentuali HALF_UP sono una scelta
   locale del test, non una precisione attribuita al provider.
   Ogni offerta potrebbe richiedere m diverso: nessun 15% universale.
3. **PREBOOK — al massimo una POST**, solo se la nuova osservazione è
   univocamente collegabile per hotel/camera/occupazione/condizioni e il retail
   restituito coincide esattamente con il suo SSP, rimasto uguale al target.
   Il body usa il **nuovo offerId originale** e usePaymentSdk=false;
   timeout provider30s, client35s. Non si modifica o ricostruisce il token.

Client Rates20s, pacing1s, concorrenza1, nessun retry/redirect/paginazione o
ciclo di aggiustamento. Errori/timeout consumano il tentativo. Sottolimiti
DISCOVERY1/REQUOTE1/PREBOOK1 non trasferibili. Nessun detail, GET prebook,
booking, pagamento, kernel o policy nel probe. Nessun riuso di un caso consumato.

Retail inferiore al nuovo SSP resta bloccante. Retail superiore di un centesimo
non realizza la scelta SSP senza ricarico e ferma questa sonda, pur non essendo
per questo una violazione della soglia pubblica. SSP cambiato, camera ambigua,
condizioni cambiate, valuta incompatibile e scadenza esplicita non valida
producono stop e conservazione di entrambe le osservazioni. Una nuova Rates
non acquisisce la continuità commerciale della vecchia per la somiglianza dei
campi. Il controllo prebook resta sulla nuova osservazione.

## Implementazione locale effettiva

- `scripts/liteapi-ssp-probe-v1.mjs`: contratto @1, preparazione pura del
  candidato e qualificazione di nuova Rates/prebook. Zero trasporto/motore.
- `scripts/simulate-liteapi-ssp-probe-v1.mjs`: solo trasporto loopback inventato,
  con le primitive esistenti HTTP, journal one-shot, AES-GCM e DPAPI. Origine
  reale rifiutata; nessun Acquire, chiave o switch LIVE. Verifica del journal
  prima della lettura; ricostruzione della derivazione e dei request binding.
- `tests/engine-v3/fixtures/sspProbeSyntheticV1.mjs`: documenti inventati.
- `tests/engine-v3/v3SspMarginProbe.test.ts`: regressioni e prove end-to-end
  della sonda offline. Nessun payload commerciale privato.
- Questo rapporto, CURRENT_STATE e DECISION_LOG: ambito e risultati.

L'attuale codice non modifica l'account e non invia additionalMarkup, margin0
come interpretazione di ricarico zero, o una percentuale fissa per tutte le
offerte. Solo il calcolo esplicitamente documentato può produrre una candidata.
EUR/USD/GBP a due decimali, singola unità e camera mappata non ambigua sono il
perimetro della sonda. Altre rappresentazioni restano non supportate, non corrette
silenziosamente. Gli identificatori restano opachi.

MAX11 continua a costruire una sola SEARCH senza margin e a interrompersi sul
retail sotto SSP (`comparisonRequest`, `comparisonPrebookStop`). Il suo lettore
consuma il proprio journal e non viene adattato a questo nuovo registro.
`comparison-public-price-proof-v1.mjs` rimane synthetic-only per la prova
separata: nessun campo LiteAPI viene promosso a tale attestazione.

In D-0076 `qualifyPublicPricePerspectiveV3` sa già consumare la normale quota
transazionale verificata quando importo e scope coincidono con la proposta.
La regressione PP4 lo dimostra tramite preparatore/consumatore/binding/replay
esistenti. Questo non rende il risultato del nuovo probe una preparazione A02:
il probe non emette quella capability e non è un nuovo ingresso del motore.

## Verifiche e limiti

Evidenze locali fuori dal repository: `%TEMP%/stayopti-d0077`.
Il candidato isolato parte dall'archive del checkpoint, con i soli quattro
file software/test nuovi; dipendenze locali già installate, nessun download.

Prima esecuzione conservata: compilazione PASS, 30/81 test PASS, 51 FAIL.
50 fallimenti erano il blocco sandbox di realpath sui controlli Windows del
journal, non errori di pricing. Il fallimento MP08 ha rilevato che due stringhe
temporali identiche ma non interpretabili non possono certificare equivalenza
temporale. Il probe ora richiede SAME_INSTANT; il comparatore R06 storico è
immutato. Codice iniziale, manifest e log non sono sovrascritti.

Seconda esecuzione: 80/81 PASS; il solo PP17 CLI non trovava un checkpoint Git
valido nel checkout archive. Ripristinati esclusivamente i metadati locali del
checkout di test, senza commit; eccezione safe.directory limitata al processo,
nessuna modifica alla configurazione Git globale. Poi 39/39 PASS (38 nuovi e
PP17). I 46 test D-0076 già PASS restano applicabili ai loro moduli invariati.
Il successivo controllo ha rilevato MP18 (39/40 PASS): l'helper temporale
storico attraversa contenitori oggetto, non l'array data delle Rates. Il nuovo
adattatore gli passa ora una vista della sola struttura/offerta selezionata,
con le scadenze esterne ancora presenti. Helper storico e originali immutati;
conservati anche questo sorgente e log iniziali. Il controllo conclusivo
`closed` passa **41/41**: 40 nuovi test più PP17. Insieme ai 46 precedenti
D-0076 pertinenti sono 87 controlli distinti PASS, non una suite V3 completa.
Il manifest `closed-code-manifest.json` identifica i quattro file nuovi.
Nessun controllo allentato per ottenere PASS.

Le scadenze sono qualificate con la grammatica conservativa del helper
documentale riusato: forma non supportata resta insufficiente, non viene
reinterpretata come validità. L'assenza di scadenza non ne crea una.

La regressione completa di prezzo e binding usa dati sintetici; il probe non
chiama kernel/policy. Prove Windows PS5.1/DPAPI su nuove fixture, non accesso a
custodie private. TypeScript e build passati localmente. Nessuna attribuzione
alla CI GitHub e nessuna nuova suite V2/lifecycle estranea al delta.

Anche un prebook con prezzo corrispondente non dimostra checkout pagato,
esaustività delle componenti fiscali, adeguatezza della camera o validità
attuale perpetua. Liste componenti non diventano costo completo solo perché
sommabili. Scadenze assenti restano UNKNOWN; nessun TTL fabbricato.

## Unico prossimo passo

Predisporre per autorizzazione separata **questa sola sonda MAX3 di prezzo**
su un ID preselezionato: nuovo piano/literal/registro e collegamento operativo
alle protezioni del launcher, senza riutilizzare MAX11 o vecchie autorizzazioni.
Il codice consegnato è volutamente solo offline, non un comando production
pronto. L'esperimento servirebbe a verificare sul conto reale percentuale,
arrotondamento e prezzo restituito; può fermarsi senza prebook. Non riapre il
pilota A02 né risolve gli altri prerequisiti Production HOLD.

## Completamento operativo autorizzato — 27 settembre 2026

Questa sezione supera soltanto il precedente limite alla pubblicazione e al
launcher: l'incarico successivo autorizza un profilo operativo separato e il
push del software dopo collaudo. Non autorizza l'invio della sonda. I risultati
offline e i fallimenti precedenti restano evidenze della loro versione.

### Confine e inventario del delta

Il piano `stayopti.liteapi-ssp-probe@1.1` conserva il calcolo e i tre sottolimiti
del precedente @1, che resta solo sintetico. Aggiunge origine esplicita,
scopo del test funzionale e riferimento/hash/puntatore al documento dell'hotel
preselezionato. Il preflight verifica i byte di quel documento, l'identificatore
esatto e i riferimenti documentali delle condizioni, non soltanto un booleano.
Hash e puntatori dimostrano integrità e collegamento, non un'approvazione
commerciale del provider. La valutazione dell'ambito delle fonti resta esplicita
nella scheda privata. Gli originali storici non vengono decifrati o migrati.

L'annidato comparisonPlan riusa il contratto dello scenario e i costruttori
documentali: **non** concede MAX11. Il wrapper @1.1 sovrascrive esplicitamente
la richiesta con hotelIds singolo/limit1; il journal consente solo
DISCOVERY1/REQUOTE1/PREBOOK1. I valori del caso non sono incorporati nel core.

File nuovi del completamento:

- `scripts/liteapi-ssp-probe-plan-v1.mjs`: inventario ricorsivo del codice,
  runtime Node e dirty path preservati; controlli checkpoint/staging/evidenze;
  nuova literal legata a piano e inventario. Nessuna rigenerazione storica.
- `scripts/liteapi-ssp-probe-capture-v1.mjs`: profilo journal autonomo, sequenza
  unica riusata anche dal simulatore, trasporto HTTP esistente, riserva prima
  dell'invio, lettura autenticata prima dell'interpretazione. Namespace separato
  da MAX11 e dal primo simulatore @1; nessuna ripresa di tentativi consumati.
- `scripts/run-liteapi-ssp-probe.mjs` e `invoke-liteapi-ssp-probe.ps1`:
  Inventory/Preflight/Simulate/Acquire, quest'ultimo solo dopo nuova literal.
  Il runner condiviso D0074 recupera la Production DPAPI salvata **dopo** il
  preflight e l'accettazione; stdin protetto, cleanup best-effort. Nessun nuovo
  prompt di configurazione, nessun fallback, nessuna chiave in configurazione.
- `tests/engine-v3/v3SspProbeOperational.test.ts`: collaudo end-to-end inventato.

Modifiche circoscritte ai due moduli della prima sonda: dispatch @1/@1.1 e
riuso della sequenza. Il test D0074 aggiunge la nuova ready-status e verifica
che l'inventario copra il codice della credenziale. Lo store, il trasporto e il
core del journal non cambiano. Il totale da consolidare comprende i sette
file del lotto locale precedente più questi cinque file e il test D0074:
**13 file**, elencati nell'inventario della consegna; nessun file pubblico V2/V3.

### Arresti e significato del risultato

Nuovo registro `liteapi-ssp-price-probe-max3`, nuovo caso e autorizzazione.
I tentativi sono riservati durevolmente prima dell'invio, inclusi timeout e
401; doppio avvio/interruzione non permettono ripetizione o azzeramento.
Pacing1s, concorrenza1, Rates client20s/provider12s, prebook client35s/provider30s,
32MiB, nessun retry/redirect/pagina. Il calcolo candidato è sigillato prima
della seconda Rates; la lettura autenticata ricostruisce i binding delle
richieste e del token esatto. Nessun detail, facilities, GET prebook o motore.

HTTP204 e assenza documentata 2001 chiudono senza offerta; formato ignoto ed
errori non diventano zero risultati. SSP diverso, sotto/sopra target, condizioni
mutate o ambiguità fermano prima della sessione. Un errore semantico prebook
resta ABORTED con creazione consumata; non è una conferma del prezzo.
`COMPLETE` significa sequenza conclusa: leggere sempre assessment e motivi.
L'uguaglianza sintetica del prezzo non dimostra comportamento dell'account,
esaustività fiscale, sistemazione, checkout o ammissibilità A02.

### Collaudo del completamento

Checkout isolato da e840031b con i soli dieci file software/test candidati;
dipendenze locali, Windows PowerShell **5.1.26100.9444**, Node **24.18.0**.
Manifest, sorgenti e log separati sotto `%TEMP%/stayopti-d0077-operational`.
Prima prova: **82/83 PASS**; unico errore nel test che interpretava stdout
misto JSON/messaggio di cleanup. Corretto il test per leggere il file JSON
prodotto dal launcher, non eliminato il cleanup né allentato il gate.
Seconda prova: **84/84 PASS**. Controllo finale: **84/84 PASS**, includendo
dispatch storico e alterazioni di inventario con hash ricalcolato, sul candidato
finale esatto; il manifest identifica tutti i dieci file software/test.

Copertura: 40 regressioni iniziali del probe, nuovo profilo, regressioni MAX11
e D0074; DPAPI CurrentUser reale esclusivamente su materiale inventato.
Il test del prompt usa il runner condiviso reale con un child sintetico e uno
store isolato: preflight negato/literal negata precedono la lettura; chiave
inventata attraversa stdin, non argv/output, e un 401 non produce retry.
Il nuovo launcher esegue realmente Inventory/Preflight/Simulate; nessuna
modalità Acquire reale o credenziale Production è stata usata dall'agente.

TypeScript e build PASS. Lifecycle **665 PASS / 17 skip** preesistenti;
security **29/29**, release **101/101**, tutti su Windows. Il primo lancio
lifecycle mancava della junction alle dipendenze server nel checkout isolato:
fallimento ambientale conservato, risolto riusando node_modules già installati,
senza download o cambiamenti al prodotto. Nessuna suite completa del motore o
audit online ripetuta senza delta ai relativi moduli/dipendenze. Non è una
nuova esecuzione monolitica di release:ci né un risultato della CI GitHub.

### Condizioni esterne e consegna

Il [listino standard](https://docs.liteapi.travel/reference/api-pricing-usage-costs)
è condizionato a ToS/fair use e look-to-book. Il tetto 0 EUR non misura il saldo
né garantisce la fatturazione dell'account. I [termini](https://liteapi.travel/terms/)
distinguono il servizio ai viaggiatori dagli usi non concessi dei dati: la
scheda privata qualifica il solo test funzionale finito del protocollo, senza
motore, benchmark competitivo, dataset o redistribuzione. Non viene dichiarata
una nuova lettera o licenza provider. Le conferme su nazionalità, tetto e
conservazione vengono riusate nel loro ambito; l'invio resta subordinato alla
nuova literal. Nessun vecchio tentativo o autorizzazione consumata è riaperto.

Configurazione privata, inventario e preflight sono prodotti solo sul commit
finale pubblicato. La custodia nuova ha durata14giorni dall'inizio effettivo,
responsabilità esplicita e nessuna cancellazione automatica. Non rinnova le
scadenze vecchie. Una sonda tecnicamente pronta non rimuove **A02 Production
HOLD** e non promette il raggiungimento di SSP. La consegna riporta lo SHA
locale/remoto direttamente verificato, staging e commit pendenti.
