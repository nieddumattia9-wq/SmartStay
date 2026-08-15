# StayOpti Engine V3-17D — Golden Controlled Live Capture Protocol

## Stato del checkpoint

V3-17D congela il protocollo che collega la campagna reale V3-17B all'intake
V3-17C. Il modulo genera scenari baseline provider-neutral, autorizza sessioni
piccole e converte soltanto esecuzioni live attestate nel formato capture
accettato da V3-17C.

Versione: `3.0.0-golden-controlled-live-capture.1`.

Il pacchetto di installazione non esegue ricerche live, non chiama provider e
non sostiene costi. Le chiamate arriveranno esclusivamente nel successivo
executor controllato e saranno dichiarate prima dell'esecuzione.

## Perché questo confine è necessario

V3-17B ha definito 120 baseline, 40 adversarial e 40 counterfactual. V3-17C sa
emettere receipt da capture valide. Mancava però un contratto operativo che
stabilisse:

- quali ricerche baseline eseguire;
- come distribuire destinazioni, date, durate, gruppi, budget e distanza;
- quante ricerche autorizzare per sessione;
- quali prove debba restituire l'executor live;
- come trattare fallimenti e tentativi ancora pendenti;
- come esportare esclusivamente successi reali verso V3-17C.

Senza questo confine, un mock o un piano avrebbe potuto assumere la stessa forma
di una capture reale.

## Matrice baseline

La matrice contiene fino a 120 scenari baseline non ancora receipted. Usa 20
destinazioni europee provider-neutral, sei volte ciascuna nella campagna vuota.
La distribuzione copre:

- lead time di 14, 30, 60, 120 e 210 giorni;
- soggiorni di 2, 3, 5, 7 e 10 notti;
- uno, due, tre e quattro adulti;
- configurazioni con zero, uno o due bambini, sempre tra 0 e 12 anni;
- budget totali derivati da cinque fasce per notte;
- raggi di 500 m, 1 km, 2 km, 5 km e 10 km;
- tutti i profili, segmenti e ruoli congelati nella campagna.

Le date sono materializzate da una `collectionAnchorDate` esplicita. Cambiare
l'anchor cambia i fingerprint di richiesta e del piano. Uno slot baseline che
ha già una receipt viene escluso dal piano successivo.

## Sessioni controllate

Una sessione autorizza al massimo dieci scenari. Ogni scenario è legato al
fingerprint del piano e al fingerprint esatto della richiesta. La selezione è
deterministica e indipendente dall'ordine degli ID forniti.

Una sessione vuota è valida ma vale zero evidenza. Una sessione pronta richiede
un executor esterno: il modulo V3-17D non contiene credenziali, adapter provider
o chiamate di rete.

## Esiti dell'executor

Ogni tentativo deve essere `captured` oppure `failed`.

Un fallimento conserva codice e fingerprint di audit, ma non produce capture e
non conta come evidenza. Un tentativo non ancora eseguito resta pending e conta
zero.

Un successo deve attestare:

- esecuzione di rete osservata;
- risposta reale osservata;
- nessun test double;
- snapshot sorgente conservato per audit;
- Public Rates verificati;
- decision fingerprint V2 e V3;
- audit witness;
- replay provider-neutral e challenge di astensione quando programmati;
- rimozione di PII, identità provider e segnali commerciali.

Solo un successo conforme viene trasformato in
`StayOptiGoldenRealEvidenceCaptureV3`. Il batch esportato resta legato al
fingerprint della campagna e deve comunque passare l'intake V3-17C.

## Gate ancora chiusi

V3-17D non raccoglie giudizi ciechi, outcome o metriche di regret. Non autorizza
claim statistici, promozione pubblica V3 o SPLIT. V2 pubblico non cambia.

Il prossimo checkpoint potrà integrare l'executor live con il backend reale e
produrre il primo piccolo batch di capture. Prima di quel passaggio saranno
esplicitati il numero massimo di chiamate e l'eventuale costo provider.
