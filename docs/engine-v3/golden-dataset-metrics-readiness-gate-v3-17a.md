# StayOpti V3-17A — Metrics & Readiness Gate

## Metriche congelate

Il gate calcola esclusivamente sui casi e sui giudizi marcati `eligible`:

- normalized regret medio V2 e V3;
- miglioramento regret di V3 sul V2;
- pairwise win rate V3 separato per umani ed esperti;
- expected calibration error V2 e V3 su dieci bin;
- precisione dell'astensione;
- robust-choice rate;
- instability rate;
- massimo gap di regret tra segmenti;
- massimo provider-dependence gap sui replay provider-neutral;
- regressioni critiche.

## Soglie di performance

- normalized regret V3 ≤ 0,20;
- miglioramento regret sul V2 ≥ 0,02;
- win rate V3 ≥ 0,55 sia per umani sia per esperti;
- ECE V3 ≤ 0,10 e non peggiore del V2;
- precisione astensione ≥ 0,80;
- robust-choice rate ≥ 0,80;
- instability rate ≤ 0,10;
- gap di regret tra segmenti ≤ 0,10;
- provider-dependence gap ≤ 0,05;
- zero regressioni critiche.

## Stati del gate

- `collection-required`: manca almeno un volume minimo;
- `measurement-required`: i volumi esistono ma una metrica non è calcolabile;
- `failed`: campione sufficiente ma almeno una soglia non è rispettata;
- `passed`: tutti i volumi e tutte le metriche rispettano i criteri.

Soltanto `passed` abilita `statisticalClaimAllowed`. Anche in quel caso V3-17A non abilita V3 pubblico, non promuove automaticamente la policy e non abilita SPLIT.

## Regole anti-gaming

- diagnostica legacy sempre esclusa;
- label motore nascoste;
- confronto nello stesso ruolo;
- duplicati evaluator rifiutati;
- evidenze e adjudication fingerprinted;
- ordine input irrilevante al replay;
- mutazioni dataset o gate rilevate dal fingerprint;
- una singola regressione critica blocca il gate;
- click e commissioni non entrano nelle metriche decisionali.
