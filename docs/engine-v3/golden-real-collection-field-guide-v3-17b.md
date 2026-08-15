# StayOpti V3-17B — Real Collection Field Guide

## Case collection order

1. acquisire lo snapshot reale e conservarne la versione immutabile;
2. verificare prezzo pubblico, valuta, tasse, camera, occupazione e condizioni;
3. eseguire V2 e V3 sulla stessa evidenza e sullo stesso ruolo;
4. neutralizzare provider, PII e segnali commerciali dal dataset analitico;
5. produrre la ricevuta legata allo slot assegnato;
6. per i casi derivati, conservare baseline e trasformazione falsificabile;
7. per gli slot dedicati, produrre replay o sfida di astensione verificabili.

## Blind evaluator assignment

- usare soltanto pseudonimi fingerprinted, mai nome, email o telefono;
- registrare consenso alla versione congelata del protocollo;
- attestare indipendenza del valutatore;
- mostrare alternative dello stesso ruolo;
- nascondere label engine, provider e ordine interno V2/V3;
- impedire allo stesso valutatore di ricevere due volte lo stesso caso;
- non registrare la preferenza nel claim di assegnazione.

La preferenza `V2`, `V3`, `tie` o `abstain` entra soltanto nella fase successiva
di blind judgment. Il claim V3-17B dimostra che l'assegnazione è valida, non che
il giudizio esiste.

## Evidence that must fail closed

- snapshot sintetico presentato come reale;
- Public Rates non verificati;
- fingerprint mancante o mutata;
- provider o commissione nel payload analitico;
- PII o identificatore diretto;
- teacher output usato come ground truth;
- esito o measurement prematuro;
- duplicato di caso, slot, claim o valutatore sullo stesso caso;
- replay o astensione dichiarati senza prova dedicata.

## Initial expected result

La fixture pubblicata contiene zero ricevute e zero claim. Il suo esito corretto
è `real-case-collection-required`. Questo è un risultato onesto e non un errore
del runner: V3-17B installa l'infrastruttura con cui raccogliere il campione,
senza fabbricare i dati che il gate dovrà misurare.
