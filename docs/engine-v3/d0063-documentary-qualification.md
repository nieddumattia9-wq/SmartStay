# D-0063 — Prezzi, collegamento POST/GET e camera mappata

Correzione evaluation-only sulla base `71ddb32d31ee227f8d3c25950af2c71b835e347a`.
Nessuna modifica a V2 pubblico, kernel/policy, pesi, ruoli, selezione o MAX17.
Nessun Acquire, prebook reale, booking, pagamento o riuso dei marker monouso.

## Fonti ufficiali e qualificazione effettiva

Consultazione documentale del 15 settembre 2026, non chiamate API provider.
Sono stati controllati gli schemi della precisa operation incorporati nelle
pagine ufficiali, non soltanto corrispondenze testuali nell'intera pagina.

- [Revenue Management](https://docs.liteapi.travel/docs/revenue-management-and-commission): SSP è il minimo della vendita pubblica; un prezzo superiore è ammesso. Questa regola esplicita precisa la formulazione più abbreviata della guida Rates. Nessuna correzione automatica di un prezzo sotto SSP.
- [Struttura Rates](https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure): retail comprende commissione e componenti incluse; quelle escluse restano separate, con valuta e base originarie. Null, omissione e lista vuota non sono sinonimi. Non si raddoppia la commissione né si moltiplicano importi aggregati per ospiti/notti.
- [POST prebook](https://docs.liteapi.travel/reference/post_rates-prebook) e [GET prebook](https://docs.liteapi.travel/reference/get_prebooks-prebookid): negli schemi specifici consultati SSP è un oggetto money; currency descrive i prezzi/costi del contenitore. SSP numerico e sellingPriceToUser trovati nell'intero schema della pagina appartengono anche a un'altra operation (alternative), non sono una qualificazione del prebook. Il formato scalare osservato nel prebook rimane esplicitamente non qualificato, con numero e valuta del contenitore conservati separatamente. Non si usa quella valuta per fabbricare il money del SSP non supportato.
- [SDK ufficiale](https://github.com/liteapi-travel/nodejs-sdk): il POST può restituire un nuovo rateId rispetto alla ricerca. Non ne deriva l'equivalenza automatica di un successivo rateId GET. Nessuna fonte consultata specifica una conversione degli indici di occupazione fra POST e GET.
- [Hotel detail](https://docs.liteapi.travel/reference/get_data-hotel): camere con identità, capienza e bedTypes/bedRelation; AND indica compresenza, OR alternative, COMPLEX non è una somma semplice. hotelImportantInformation può contenere limitazioni importanti.

Queste fonti non certificano condizioni dell'account o completezza di una
specifica risposta reale. Non è stata chiesta una nuova attestazione commerciale.

## Modifica minima e tracce

`liteapi-offer-qualification-v1.mjs` espone funzioni pure:

- `qualifyDocumentaryPrices`: osservazioni separate per retail, prezzo prebook, sellingPriceToUser, SSP ai tre livelli e commissioni, con presenza/null, importi, valuta, ambito e origine. Comparazioni solo nel caso un componente/una offerta già verificato. Sotto SSP, valute incompatibili e fonti SSP contraddittorie bloccano la qualificazione; prezzo osservato invariato. sellingPriceToUser non certifica tasse né sostituisce il retail.
- `compareDocumentaryRetrieval`: tracce separate per sessione/offerta, occupazione, rateId, termini confrontabili e metadati commerciali. Le differenze non spiegate rimangono bloccanti; non sono automaticamente una variazione di prezzo. `commercialChange=null` quando il collegamento non è verificato.
- `qualifyHotelImportantInformation`: testo integrale più classificazione circoscritta. Oneri obbligatori o testo monetario non qualificabile bloccano il costo completo; istruzioni non economiche non diventano tasse ignote. Colazione opzionale/room-only, condizioni animali non richiesti e orari non vengono sommati. Un deposito resta separato: rimborsabilità non dichiarata non viene inventata; anche un deposito esplicitamente rimborsabile resta un possibile impegno di liquidità, non costo soggiorno. Un secondo onere nella stessa frase non eredita l'opzionalità/rimborsabilità del primo. Le varianti di prezzo del medesimo extra non sono automaticamente oneri diversi.
- `normalizeEnglishBedInventory` e `compareMappedRoom`: quantità numeriche o one–six; SINGLE/TWIN, DOUBLE/KING/QUEEN/SUPER-KING, SOFA/BUNK. Forme con bed(s), size, AND/comma e sequenze numeriche; OR conserva le alternative senza assegnarle. Divano/castello non certificano posti per elemento. Negazioni, condizioni e testo pertinente non supportato conservano UNKNOWN/CONFLICTING. Non è un interprete generale di descrizioni alberghiere.

Il normalizzatore osservazioni @1.2 usa queste funzioni; il wire storico rimane
identificato @1 per non riscrivere la selezione già sigillata, con versione del
qualificatore separata. Fiscalità per SEARCH, POST e GET rimane disponibile
anche quando una fase non certifica prenotabilità. Le due fonti tariffa/camera
rimangono nella traccia. Un errore di una struttura non elimina le altre.

La grammatica camere non usa larghezza del letto, capienza, nome della struttura
o servizi generici per inventare letti. I riferimenti al mappedRoomId rimangono
evidenziati anche quando il POST non ripete l'ID già restituito dalla ricerca.
Un'identità contraddittoria, una camera assente/ambigua o un record invalido non
confermano sistemazione. Descrizioni più generiche non equivalgono ad assenza.

## Prima / dopo sui medesimi input sintetici

| Caso | Prima | Dopo atteso e verificato dai test mirati |
|---|---|---|
| Controllo completo | usable | usable |
| Retail sopra SSP coerente | astensione impropria per disuguaglianza | usable, retail non cambiato |
| Inventario inglese esplicito | UNKNOWN / astensione | posti valutabili; controllo usable |
| Capienza camera incompatibile | usable | conflitto, astensione effettiva |
| Inventario camera incompatibile | usable | conflitto, astensione effettiva |
| Solo indice/rateId GET diversi | generico conflitto commerciale | collegamento irrisolto distinto dai termini; ancora non raccomandabile |
| Oneri importanti fuori dalle remarks | ignorati, usable | preservati e non qualificati; astensione effettiva |
| Retail sotto SSP | astensione | blocco preservato; nessun prezzo inventato |

Esiti iniziali conservati: 8 test, 2 PASS / 6 FAIL; 8 invocazioni kernel e 8
policy su fixture, 16 preparazioni pure. Non sono risultati della produzione.
I test nuovi contano le chiamate reali, preservano i byte e distinguono un solo
candidato (zero kernel/policy, nessuna astensione) da astensione calcolata.

## Validazione

Risultati del candidato finale isolato, Windows CurrentUser, 15 settembre 2026:

| Controllo | Risultato osservato |
|---|---|
| Nuove regressioni CQ01–CQ23 | 56/56 PASS |
| Nuove + documentary wire + observation/semantic/integrity | 179/179 PASS |
| Canonica Engine V3 | 2631/2631 PASS, zero skip |
| Engine V2 | 196/196 PASS |
| Lifecycle | 530 PASS, 17 skip preesistenti di integrazione con servizio Valkey reale, zero fail |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript / build / analytics-beta | PASS |
| Parsing Windows PowerShell 5.1 | 14/14 PASS |
| Smoke staging locale | 18 controlli PASS |
| Scansioni segreti, artefatti privati, provenienza e import pubblici | PASS sul perimetro della modifica |
| Diff e cached diff check | PASS |

Le 56 prove nuove producono 112 preparazioni pure, 55 invocazioni kernel e 55
policy, misurate su input sintetici. Un input singolo non avvia il motore;
un capture alterato è respinto. Il gate completo include veri launcher
PowerShell 5.1, DPAPI CurrentUser e trasporti loopback sintetici, non chiamate
provider. Dipendenze installate copiate offline; nessun file privato o `.env`
nel checkout isolato. Solo checkpoint Git di fixture/copie isolate, nessun
commit nel repository di lavoro.

Conservati anche tre fallimenti intermedi su clausole monetarie miste (CQ23)
e un controllo positivo inizialmente troppo prudente sulle varianti di prezzo
dello stesso extra (CQ12). Tutti corretti senza cambiare gli input delle prove.
Gli esiti storici della base e i risultati intermedi non vengono riscritti.
Un primo avvio tecnico della copia isolata con proprietario filesystem diverso
si era fermato sul controllo Git di ownership, prima dei gate; è stata creata
una nuova copia CurrentUser, senza disabilitare quel controllo.

Linux nativo/WSL, GitHub CI, audit online del registro dipendenze e verifica
dell'ambiente release remoto non eseguiti: non sono certificati da questi PASS
locali. Nessuna pubblicazione/release autorizzata. Dopo i gate cambiano solo
le tre note Markdown di rendicontazione; i byte software/test coincidono con
il candidato collaudato e sono verificati nel postflight.

## Perimetro e preparazione privata separata

Nove file: i due moduli wire/observation esistenti, il nuovo qualifier, il nuovo
test CQ, l'evidenza sintetica iniziale, questa relazione, D-0063, CURRENT_STATE
e DECISION_LOG. Nessun dato del candidato reale nelle fixture o nei documenti
pubblicabili. Sette path esclusi, diciassette file sigillati e l'ulteriore copia
privata già presente mantengono hash/dimensione/timestamp; altri file tracciati,
package/lock e configurazioni invariati. Staging vuoto.

Separatamente sono state eseguite tre letture autenticate/preparazioni private
pure, legate ognuna ai propri hash effettivi di codice; le prime due sono
derivazioni intermedie conservate, la terza usa il codice finale. Zero kernel,
policy, credenziali API o richieste provider. Il rapporto privato rimane esterno
al repository. Il confronto con l'inventario dell'audit precedente verifica
originali cifrati, marker, journal e preparazioni invariati. Nessuna equivalenza
fra preparazione riuscita, ammissibilità o raccomandazione.

## Distinzioni residue e passo successivo

1. Software corretto: soglia SSP, osservazioni fiscali separate, classificazione
   POST/GET, letti inglesi e confronto della camera, condizioni pertinenti.
2. Divergenze provider non spiegate: SSP scalare prebook fuori dallo schema
   specifico consultato, semantica di indice e rateId variati, eventuali metadati
   commerciali cambiati. Il blocco resta; nessuna conversione opportunistica.
3. Problemi di un candidato: prezzo sotto SSP, oneri/condizioni non qualificati
   e contraddizioni tariffa/camera non sono corretti scegliendo la fonte favorevole.
4. Copertura ricerca città: è una questione separata. La risposta ridotta non
   dimostra esaurimento dell'inventario. Minimo due candidati invariato.

Il codice modificato NON è compatibile con il vecchio inventario autorizzativo
byte-per-byte: ciò è voluto. Nessun inventario, configurazione, caso, approvazione
o marker privato viene aggiornato per assorbirlo. Eventuale uso futuro richiede
un nuovo percorso autorizzato, non il riavvio del tentativo concluso.

Stato consegna: nessun commit, push, fetch o aggiornamento di main. Le modifiche
restano locali; nessun nuovo commit da inviare creato in questa fase. Stato del
remoto non ricontrollato via rete; confronto con il solo riferimento locale
origin del work branch: 0 ahead / 0 behind, non una nuova verifica remota.
Ogni fase software conclusa deve dichiarare
espressamente push e commit ancora locali.
