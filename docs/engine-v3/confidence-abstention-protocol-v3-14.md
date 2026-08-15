# StayOpti V3-14 — Confidence & Abstention Protocol

## Principio

La confidenza descrive la qualità del giudizio sul caso corrente, non una certezza generale sul viaggiatore. Non può essere derivata da un singolo score né usata come scorciatoia per trasformare il teacher in ground truth.

## Livelli

- `high`: copertura alta, nessuna incognita materiale e raccomandazione tracciabile.
- `moderate`: evidenza sufficiente a formulare una scelta, con limiti o incognite dichiarate.
- `low`: differenza non difendibile o informazione materiale mancante; astensione obbligatoria.
- `none`: nessuna scelta responsabile possibile; astensione obbligatoria.

Una raccomandazione richiede confidenza `moderate` o `high`, Best Choice selezionata e nessuna ragione di astensione. La confidenza `high` richiede copertura `high` e zero incognite materiali.

## Astensione

L'astensione è obbligatoria in presenza di:

- near tie non risolvibile con le evidenze disponibili;
- no-good-option;
- evidenza materiale mancante;
- conflitto tra hard constraint;
- ambiguità sul ruolo decisionale.

Quando il teacher si astiene, nessun ruolo può contenere un'opzione selezionata. L'astensione deve dichiarare una ragione diversa da `not-required`, i limiti e l'informazione che permetterebbe di decidere.

## Fail-closed

Il validatore rifiuta:

- selezioni di offerte invalide o incompatibili con hard constraint;
- bassa o nessuna confidenza senza astensione;
- confidenza alta con copertura inferiore ad alta o incognite materiali;
- output senza riferimenti alla Decision Science Library;
- PII, identificativi provider e campi commerciali vietati;
- promozione automatica a ground truth, ranking o policy pubblica;
- disagreement risolti o promossi automaticamente.

Il protocollo è esclusivamente offline e richiede revisione umana per ogni possibile uso successivo.
