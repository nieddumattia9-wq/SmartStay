# D-0063 — Qualificazione documentale di prezzi, recupero e camera mappata

15 settembre 2026. Base `71ddb32d31ee227f8d3c25950af2c71b835e347a`, branch
`codex/evaluation-d0036-d0041`. Correzione evaluation-only autorizzata dopo
l'audit privato della prima acquisizione; nessuna nuova acquisizione autorizzata.

## Decisione

Separare le osservazioni monetarie dalla qualificazione del prezzo pubblico e
del costo completo. La soglia SSP non impone uguaglianza col retail; non diventa
un prezzo sostitutivo. Schemi di altri endpoint non qualificano automaticamente
SSP scalare o `sellingPriceToUser` nel prebook. Nessuna valuta fabbricata.

Separare identità della sessione, indice di occupazione, rateId e condizioni
commerciali nel confronto POST/GET. Una differenza opaca non prova un rincaro,
ma resta un collegamento non verificato. Il GET legge la sessione esistente.

Conservare le qualificazioni dei letti e interpretare un vocabolario inglese
circoscritto. Confrontare la tariffa con la camera effettivamente collegata da
mappedRoomId: capienza e inventario sono due fatti distinti; le alternative OR
non si sommano. Le condizioni generali della struttura restano visibili con
ambito e limiti, senza sommare extra o depositi al prezzo del soggiorno.

Rifiutati: correzione 0→1, equivalenza automatica rateId, max(retail,SSP), nuova
formula di ranking, inferenza di letti dalla capienza, approvazioni HUMAN e
riuso dell'autorizzazione monouso. Nessun cambiamento della selezione o della
soglia minima di due candidati. Il nuovo modulo entra nell'inventario
transitivo del launcher: l'inventario storico non viene rigenerato o alterato.

## Evidenza e limiti

Otto riproduzioni iniziali: 2 PASS, 6 FAIL con kernel/policy sintetici reali.
Conservate in `../../engine-v3/evidence/d0063-initial-counterexamples.json`.
Il rapporto `../../engine-v3/d0063-documentary-qualification.md` distingue i gate
locali, le tre preparazioni private pure separate e le divergenze ancora irrisolte.
Gate finali isolati: 56 nuovi / 179 mirati, V3 2631, V2 196, PS5.1 parse14,
TypeScript/build e altri gate offline PASS; lifecycle17 skip di integrazione
preesistenti espliciti. Nessuna attribuzione a Linux nativo o GitHub CI.
Nessuna pubblicazione è autorizzata da questa fase; commit/push non eseguiti.
