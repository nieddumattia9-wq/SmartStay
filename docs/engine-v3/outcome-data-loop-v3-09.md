# StayOpti Engine V3-09 — Outcome Data Loop

## Stato

- Motore V3: `3.0.0-alpha.9`.
- Decision contract: `3.0.0-decision.9`.
- Outcome Data Loop: `3.0.0-outcome-data-loop.1`.
- Event schema: `3.0.0-outcome-event.1`.
- Applicazione runtime: `contract-only`.
- Raccolta: `disabled-by-default`.
- Presentazione pubblica: disabilitata.
- Ranking pubblico: V2 invariato.

V3-09 definisce il ciclo verificabile:

`decisione → scelta → recheck/handoff → attribuzione → feedback post-stay → dataset offline → valutazione → shadow → promozione controllata`.

Non abilita telemetria pubblica, non effettua chiamate a provider o booking e non modifica la policy di produzione.

## Eventi minimi

Lo schema chiuso ammette solo:

1. `decision-shown`: fingerprint della decisione, versioni engine/policy/schema, stato, option token pseudonimi, confidence e coverage;
2. `choice-recorded`: raccomandazione accettata, opzione diversa o abbandono, con motivo enumerato e tempo decisionale a bucket;
3. `recheck-recorded`: esito recheck e stato handoff senza riferimenti provider;
4. `booking-attributed`: attribuzione tramite decision-link token consentito, senza booking ID;
5. `post-stay-feedback`: soddisfazione, scelta ripetibile, regret e causa, problema principale, saving senza perdita di qualità, qualità per euro e metriche Split.

Non esistono campi testuali liberi. Hotel ID, offer ID, booking ID, provider ID, destinazione e dati personali non appartengono allo schema outcome.

## Privacy e consenso

La raccolta richiede un record di consenso esplicito e valido. Sono gate bloccanti:

- consenso negato o ritirato;
- Do Not Track;
- Global Privacy Control;
- consenso scaduto;
- subject/consent token non coerenti;
- PII o campi fuori schema;
- fingerprint alterato.

I token sono pseudonimi opachi, limitati allo scopo outcome. La policy vieta cross-session tracking. Il contratto congela 30 giorni per eventi raw e 180 giorni per aggregati pseudonimizzati.

## Attribution senza dati eccedenti

L'attribution usa esclusivamente un `decisionLinkToken` pseudonimo e consentito. Il payload registra stato, confidence e verifica recheck, ma non contiene:

- riferimento di prenotazione;
- provider o account provider;
- dati viaggiatore;
- hotel/offerta raw;
- dati di pagamento.

## Cancellazione

`deleteOutcomeSubjectDataV3` elimina tutti gli eventi raw collegati al subject token e restituisce una receipt pseudonima con conteggi e obbligo di ricostruire il dataset derivato. I test verificano che nessun evento del soggetto resti nello store fornito.

## Dataset e apprendimento

`buildOfflineOutcomeDatasetV3`:

- accetta solo eventi validi e consentiti;
- rifiuta ID duplicati e sequenze temporali incoerenti;
- pseudonimizza il decision-link prima di creare record;
- misura acceptance, scelta diversa, abbandono, attribution, post-stay, regret, saving senza perdita di qualità e Split false-positive;
- produce soltanto un dataset `offline-evaluation-only`.

Il dataset non aggiorna alcuna policy. Ogni policy candidate deve seguire, nell'ordine:

1. valutazione offline;
2. shadow mode;
3. promotion gate controllato con canary e rollback.

## Invarianti

- `productionSelfModificationAllowed = false`.
- consenso esplicito obbligatorio;
- DNT e GPC bloccanti;
- PII vietato;
- raw booking/provider reference vietati;
- retention versionata;
- cancellazione eseguibile;
- fingerprint su consenso, evento, piano, dataset e receipt;
- Decision Trace verificato privo di PII;
- V2 pubblico, card e SPLIT pubblici invariati;
- public V3 resta bloccato finché public-rates/price consistency e i gate successivi non sono verdi.

## Scope futuro

V3-10 userà il dataset solo per Evaluation e calibrazione offline. Le future card Best Choice, Best Cheapest e SPLIT non vengono attivate in questa fase. Per SPLIT vengono soltanto predisposte metriche outcome: saving netto, recheck/handoff, false-positive e regret rispetto alla migliore soluzione single-stay.
