# StayOpti V3-15 — Replay & Role-Aware Explanation

## Determinismo

Ogni esecuzione conserva:

- `policyVersion`;
- fingerprint della configurazione;
- fingerprint dell'input canonico;
- fingerprint dell'intero risultato;
- candidati ordinati e contributi per dimensione;
- ruoli e metriche separate.

L'ordine di candidati ed evidence ID non modifica il risultato. Il replay è valido soltanto se input, versione, configurazione e risultato producono gli stessi fingerprint.

## Decision thesis per ruolo

Ogni ruolo espone:

- chiave del titolo;
- soluzione selezionata oppure stato di astensione/non applicabilità;
- sacrificio principale;
- variabile decisiva;
- counterfactual che cambierebbe la scelta;
- evidence ID;
- uncertainty code;
- metriche economiche e di esperienza pertinenti al ruolo.

La Best Choice spiega la semantica del profilo e del budget. Saving spiega il risparmio insieme alla perdita ammessa. Upgrade spiega costo aggiuntivo e marginal value. Un ruolo non applicabile non viene riempito con una scelta forzata.

## Protezioni

La spiegazione è evidence-linked ma resta offline. Non contiene percentuali di confidenza pubbliche, non usa output teacher come ground truth e non autorizza promozione, deploy o modifica del motore pubblico.

Il validatore rifiuta fingerprint alterati, Choice dominate, Saving fuori tolleranza, Upgrade sotto soglia marginale, penalità inventate per dati mancanti, SPLIT abilitato e qualunque apertura dei firewall pubblico o commerciale.
