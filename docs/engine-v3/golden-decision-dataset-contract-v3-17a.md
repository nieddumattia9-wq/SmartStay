# StayOpti V3-17A — Golden Decision Dataset Contract

## Perimetro

V3-17 richiede un campione reale prima di qualsiasi affermazione statistica sulla superiorità di V3. V3-17A congela il contratto, la tassonomia, i volumi minimi e i firewall necessari alla raccolta. Non inventa casi, giudizi umani o giudizi esperti.

I 15 giudizi già disponibili vengono registrati come inventario `legacy-diagnostic`, restano esclusi da conteggi e metriche e non possono diventare prova statistica o ground truth.

## Volumi minimi congelati

- 200 casi Golden statisticamente eleggibili;
- 40 casi avversariali;
- 40 casi controfattuali;
- 300 giudizi umani ciechi;
- 100 giudizi esperti ciechi;
- 20 astensioni valutabili;
- 100 replay provider-neutral.

Il mancato raggiungimento anche di un solo volume mantiene il gate in `collection-required`.

## Contratto dei casi

Ogni caso contiene soltanto identificatori pseudonimi e fingerprint:

- eligibility `eligible` oppure `diagnostic-only`;
- tipo baseline, adversarial o counterfactual;
- origine reale o derivazione esplicita;
- profilo, segmento e ruolo decisionale;
- parent case obbligatorio per avversariali e controfattuali;
- fingerprint delle evidenze sorgente;
- misurazione indipendente opzionale e fingerprinted.

I casi baseline eleggibili devono provenire da snapshot reali. I casi avversariali e controfattuali devono essere legati a un baseline eleggibile. I casi diagnostici usano origine `legacy-diagnostic` e non possono contenere misurazioni statistiche.

## Giudizi ciechi

Ogni giudizio deve:

- riferirsi allo stesso ruolo del caso;
- distinguere umano ed esperto;
- usare un evaluator pseudonimo;
- mantenere nascoste le label V2/V3;
- essere legato all'assegnazione tramite fingerprint;
- consentire V2, V3, tie oppure astensione;
- impedire duplicati dello stesso evaluator sullo stesso caso e ruolo.

Non vengono conservati nomi, email, telefoni, indirizzi, identità provider, commissioni, markup o probabilità di click.

## Stato iniziale onesto

Il fixture V3-17A contiene soltanto l'inventario dei 15 giudizi diagnostici correnti. Il suo esito atteso è `collection-required`, con `statisticalClaimAllowed: false` e `publicV3PromotionAllowed: false`.
