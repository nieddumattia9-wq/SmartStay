# D-0062 — profilo documentale LiteAPI, evaluation-only

Versione: `stayopti.liteapi-documentary-wire@1`. Fonti ufficiali consultate il 14 settembre 2026; nessuna chiamata ai provider API per queste verifiche. Le fixture sono inventate e derivate dagli schemi, non copie delle risposte di una struttura o di un account reale.

## Confine del raccordo

`scripts/liteapi-documentary-wire-v1.mjs` legge byte e hash del capture controllato; non invia richieste, non crea custodia e non invoca kernel/policy. `prepareLiteApiProviderObservation` richiama internamente `verifyControlledCapture`, quindi riusa il nucleo di preparazione D-0061 senza rinominare il capture come sintetico. L'origine `SYNTHETIC_LOCAL_TRANSPORT` resta tale. Una verifica di hash, da sola, non certifica l'origine di una risposta produzione.

La preparazione restituisce zero invocazioni. Soltanto un successivo chiamante autorizzato può invocare il kernel sul risultato preparato; il launcher di acquisizione non lo esegue. Zero o una alternativa non sono un'astensione della policy: l'ingresso mantiene il motivo di mancata esecuzione.

## Schemi consultati e trasformazioni circoscritte

| Fonte ufficiale | Dato documentato | Trattamento implementato |
| --- | --- | --- |
| [Rates](https://docs.liteapi.travel/reference/post_hotels-rates) | `data[].hotelId`, `roomTypes[].offerId`, `rates[]`, `occupancyNumber`, adulti/bambini, `childrenAges` | Un solo componente per l'occupazione richiesta. Selezione deterministica per hash; nessuna selezione per prezzo o ordine restituito. Tutta la risposta originale resta nel capture, anche per strutture non campionate. |
| [POST prebook](https://docs.liteapi.travel/reference/post_rates-prebook) | `data.prebookId`, hotel, date, valuta, `price`, `roomTypes[].rates[]` | Collegamento alla richiesta catturata con `offerId` e `usePaymentSdk:false`; confronto del record con la successiva lettura della stessa sessione. Nessun echo assente viene aggiunto alla risposta. |
| [GET prebook](https://docs.liteapi.travel/reference/get_prebooks-prebookid) | Sessione commerciale e componenti restituiti | `prebookId`, identità, occupazione, date, valuta e fatti commerciali devono restare coerenti. Il GET non è qualificato come verifica indipendente né come seconda disponibilità. |
| [SDK ufficiale](https://github.com/liteapi-travel/nodejs-sdk) | Il prebook può restituire un nuovo `rateId` | Il nuovo identificativo viene preservato, non sostituito con quello della ricerca. Deve rimanere coerente con il GET collegato. |
| [Struttura rates e prezzi](https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure) | `retailRate.total`, `offerRetailRate`, `taxesAndFees`, prezzo di vendita suggerito | Importi in valuta come documentati, senza conversione centesimi o cambio. Il formato oggetto e l'array singleton di `offerRetailRate` sono distinti e supportati. Importi incompatibili non diventano un totale completo. |
| [Hotel detail](https://docs.liteapi.travel/reference/get_data-hotel) | `data.id`, stelle, recensioni, servizi, camere e relative caratteristiche | Verifica distinta di identità e validità semantica. Errori in root/data impediscono l'uso di stelle o servizi. Servizi effettivi della struttura conservano il percorso preciso del membro e l'hash dei byte. |
| [Facilities](https://docs.liteapi.travel/reference/get_data-facilities) | Catalogo di identificativi e nomi | È un catalogo, non la prova che ogni struttura possieda quei servizi. Non genera fatti di possesso. |

Identificativi offerta/sessione sono opachi: non vengono decodificati, abbreviati, normalizzati per maiuscole/minuscole o sostituiti dal nome. Il limite locale di 32.768 caratteri è una protezione del profilo, non una lunghezza promessa dal provider. Gli identificativi nei path sono codificati come componenti URL. `mappedRoomId` numerico e testuale restano verificabili; l'assenza non viene colmata con un identificativo inventato.

## Fisco, prezzo e istante della verifica

- `taxesAndFees:null` ha la semantica documentata di tasse/costi inclusi, senza scomposizione degli inclusi. Non equivale a campo omesso o array vuoto: questi restano non documentati nel profilo.
- `included:false` identifica componenti da pagare in struttura; l'importo aggregato si aggiunge una volta al retail. Nessuna moltiplicazione automatica per ospite o notte. Una diversa base di calcolo esplicita non supportata resta una lacuna.
- Valute diverse, componenti ambigue, aggiustamenti, remark o condizioni commerciali non qualificati impediscono di attestare il totale completo. Osservazioni e testo originali rimangono disponibili.
- Il prezzo di vendita suggerito è distinto dal costo retail. Una differenza non viene inventata come margine o tassa e non produce un falso conflitto fattuale: blocca la qualificazione del prezzo consumer nel profilo corrente. La semantica dell'account rimane un requisito distinto dalla coincidenza numerica degli importi: il piano richiede `PUBLIC_CONSUMER_PAYABLE_OFFER_RETAIL` con riferimento alle condizioni commerciali; una stringa libera o una base netta non può superare la verifica. Nelle fixture la dichiarazione è esclusivamente sintetica e non certifica un account reale.
- Un prebook riuscito e riletto è un'osservazione commerciale delimitata al suo istante, non pagamento, prenotazione conclusa, garanzia futura o attestazione gratuita dell'operazione.
- Non è stata identificata nei contratti consultati una durata provider universale utilizzabile come `validUntil`. Il codice non inventa TTL di dieci minuti: conserva l'assenza. Se sono presenti `expiresAt`/`validUntil`, scadenza, conflitti e valori non interpretabili impediscono la certificazione.

## Limiti deliberati

Non è un decoder universale di LiteAPI. Una camera/tariffa non riconducibile in modo univoco all'occupazione e alla sessione resta esplicitamente non verificata. Non si reinterpretano le condizioni commerciali libere per ottenere una raccomandazione.

Le informazioni strutturate delle camere contenute in hotel detail sono preservate. `bedTypes` e `bedRelation` non vengono sommati indiscriminatamente: alternative `OR`, combinazioni `COMPLEX` o ambiguità non certificano posti letto. La grammatica circoscritta già verificata sul nome della precisa tariffa rimane attiva; una denominazione non interpretabile conserva `UNKNOWN`. `maxOccupancy` non è un inventario dei letti; il numero dei componenti di occupazione non è il numero dei locali interni.

Nessuna scala del rating viene dedotta dal solo numero. Nessuna distanza o coordinata viene inventata quando la distanza è `not-requested`. Stelle, recensioni, disponibilità, qualità e completezza rimangono dimensioni separate.

## Verifiche locali mirate

`tests/engine-v3/v3LiteApiDocumentaryWire.test.ts`: controlli sul percorso puro e, dove dichiarato, sul kernel reale con dati sintetici. Copertura: contenitori documentati, identificativi opachi, assenza di echo, conflitti POST/GET, null/omissioni fiscali, importi aggregati, dettaglio con errore, riferimenti dei servizi, assenza di TTL, integrità, ordine, zero/una alternativa e rifiuto di basi prezzo account non qualificate. Il rapporto di fase contiene il conteggio finale realmente osservato.

Le 85 regressioni D-0061/R1 mirate sono state eseguite localmente con esito PASS; TypeScript PASS. Questi risultati non certificano un account produzione, i byte di una futura risposta live o un'esecuzione GitHub CI. Il rapporto di fase riporta separatamente i gate finali e le prove del vero launcher PowerShell 5.1/DPAPI su sole fixture.
