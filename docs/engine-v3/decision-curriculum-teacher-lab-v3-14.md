# StayOpti V3-14 — Decision Curriculum & Teacher Lab v1

## Stato e confini

V3-14 trasforma la Decision Science Library V3-13 in un curriculum offline, versionato e riproducibile. Non modifica il comportamento pubblico V2, non abilita V3, non modifica ranking, pesi, soglie, split, provider, prenotazioni, pagamenti o analytics.

Un output teacher è sempre `candidate-supervision-only`: non è ground truth, non è una policy pubblica e richiede revisione umana. Le etichette di V2 e V3 restano nascoste durante il giudizio teacher e vengono unite soltanto nella fase di disagreement analysis.

## Schema del curriculum

Il curriculum è legato tramite versione e fingerprint alla Decision Science Library V3-13. Il fingerprint del curriculum lega il contenuto canonico di:

- lezioni;
- casi;
- giudizi teacher;
- disagreement set;
- versioni degli schemi e confini di applicazione.

Ogni lezione dichiara obiettivo, casi, profili, ruoli, claim scientifici e criteri di successo. Ogni caso dichiara contesto, opzioni, hard constraint, integrità dell'offerta, dimensioni, limiti, claim e test V3-13.

## Copertura dei casi

La fixture v1 contiene tutti i cinque profili approvati:

- Maximum Comfort;
- Comfort;
- Balanced;
- Savings;
- Maximum Savings.

Copre casi sintetici controllati, adversarial, counterfactual, near tie, no-good-option, errori storici redatti e SPLIT. I casi reali possono essere aggiunti soltanto in forma redatta, senza PII, identificativi provider o dati commerciali vietati.

I ruoli restano separati: Best Choice, Best Sensible Saving, Worthwhile Comfort Upgrade, SPLIT e astensione. Il risparmio non sostituisce Best Choice; un upgrade non è automaticamente conveniente; SPLIT resta una proposta separata con saving e switching friction espliciti.

## Giudizio teacher

Per ogni caso il teacher registra:

- Best Choice;
- Best Sensible Saving;
- eventuale Worthwhile Comfort Upgrade;
- eventuale SPLIT;
- sacrificio principale;
- variabile decisiva;
- counterfactual che cambierebbe la scelta;
- confidenza, copertura e incognite materiali;
- astensione e motivazione;
- riferimenti ai claim e limiti.

Le opzioni invalide o che falliscono un hard constraint non possono essere selezionate. I casi counterfactual devono indicare il caso base e le variabili cambiate.

## Disagreement set

Il disagreement set confronta separatamente teacher, V2, V3 e giudizio umano. Ogni osservazione conserva stato, opzione e confidenza disponibile. Il disaccordo resta esplicito e non viene risolto automaticamente.

Una revisione umana può annotare il caso, ma non promuove da sola alcuna risposta a ground truth. Qualsiasi futuro uso per training, ranking o policy richiede una fase successiva con gate dedicati, evidenza tracciata e autorizzazione esplicita.
