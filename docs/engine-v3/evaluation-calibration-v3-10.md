# StayOpti Engine V3-10 — Evaluation & Calibration

## Stato

V3-10 introduce un protocollo offline versionato per verificare se il V3 decide meglio del V2. Non dichiara che il V3 sia già superiore: il codice non contiene risultati umani o prestazioni inventate. Un risultato può essere prodotto soltanto fornendo un Golden Dataset valido e giudizi ciechi effettivamente raccolti.

Il V2 pubblico resta invariato. Il V3 resta shadow-only, la presentazione pubblica è disabilitata e il gate di coerenza delle tariffe pubbliche resta un prerequisito esterno. Nessun esito V3-10 può modificare o promuovere automaticamente una policy in produzione.

## Soglie congelate prima dei risultati

`createEvaluationCalibrationPlanV3` non accetta osservazioni né override delle soglie. Costruisce un piano deterministico con `resultsObserved: false` e un fingerprint dedicato alle soglie. Ogni mutazione successiva rende il piano invalido.

Soglie iniziali del protocollo:

- almeno 200 casi Golden, di cui almeno 40 avversariali e 40 controfattuali;
- almeno 300 giudizi umani e 100 giudizi esperti, entrambi in cieco;
- almeno 20 decisioni di astensione valutabili e 100 replay provider-neutral;
- normalized regret V3 non superiore a 0,20 e miglioramento sul V2 di almeno 0,02;
- pairwise win rate V3 almeno 0,55 sia per gli umani sia per gli esperti;
- expected calibration error V3 non superiore a 0,10 e nessuna regressione sul V2;
- precisione dell’astensione almeno 0,80;
- robust-choice rate almeno 0,80 e instability rate non superiore a 0,10;
- gap massimo di regret tra segmenti non superiore a 0,10;
- provider-dependence gap non superiore a 0,05;
- zero regressioni critiche.

Queste soglie sono obiettivi iniziali congelati per rendere falsificabile l’esperimento, non risultati osservati.

## Golden Dataset

Lo schema `3.0.0-golden-dataset.1` richiede casi opachi e privi di PII o campi commerciali. Ogni caso contiene:

- tipo `baseline`, `adversarial` o `counterfactual`;
- segmenti per profilo, destinazione, lead time, durata e coverage;
- utilità oracle congelata e osservazioni comparabili V2/V3;
- confidence prevista, correttezza, qualità, costo e astensione;
- stabilità V3 sotto perturbazioni ammesse;
- replay provider-neutral senza identificare il provider;
- eventuali regressioni critiche tramite codici chiusi.

Il builder ordina deterministicamente i casi, rifiuta ID duplicati, valori fuori dominio, PII, riferimenti di prenotazione, identificativi provider e campi di commissione. Il fingerprint rileva modifiche successive.

## Valutazione cieca

Lo schema `3.0.0-blind-evaluation.1` separa giudizi `human` ed `expert`. Le alternative sono presentate come lato sinistro e destro con assegnazione V2/V3 esplicita solo nel record offline; il giudice sceglie `left`, `right` o `tie`. Gli evaluator sono rappresentati esclusivamente da token pseudonimi.

I giudizi possono essere più di uno per caso. ID duplicati, casi inesistenti, label non cieche, PII e campi commerciali vengono rifiutati.

## Metriche

`evaluateV3AgainstV2Offline` calcola:

- normalized decision regret V2 e V3 e relativo miglioramento;
- pairwise win rate umano, esperto e combinato, con tie valutato 0,5;
- expected calibration error su dieci bin;
- precisione, coverage e omissioni dell’astensione;
- robust-choice rate e instability rate;
- report di errore per profilo, destinazione, lead time, durata e coverage;
- fairness gap come massimo divario di regret V3 tra gruppi con campione sufficiente;
- dipendenza da provider tramite replay neutralizzati;
- denaro risparmiato senza perdita di qualità, separato per valuta;
- qualità guadagnata per unità monetaria extra, separata per valuta;
- regressioni critiche.

Le valute non vengono sommate tra loro. Il risparmio è contato solo se la qualità V3 non scende oltre la tolleranza congelata; il quality gain è contato solo quando costo e qualità aumentano entrambi.

## Esiti e promozione

L’esito è:

- `insufficient-data` se manca qualunque campione minimo o segmento richiesto;
- `fail` se il campione è sufficiente ma almeno una soglia non è rispettata;
- `pass` soltanto se tutti i gate sono verdi e non esistono regressioni critiche.

Anche con `pass`, l’unico stato ottenibile è `eligible-for-v3-11-shadow-gate`. I campi `productionPromotionAllowed`, `automaticPromotionAllowed` e `publicV3Enabled` restano sempre `false`.

## Confini espliciti

- zero chiamate live a provider;
- zero booking;
- zero analytics esterni;
- zero deploy;
- nessuna auto-modifica della produzione;
- nessuna modifica alle card pubbliche Best Choice, Best Cheapest/Best Sensible Saving o SPLIT;
- nessuna pubblicazione di percentuali finché non derivano da osservazioni reali validate.
