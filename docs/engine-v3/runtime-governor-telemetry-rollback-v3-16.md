# StayOpti V3-16 — Runtime Governor, telemetria e rollback

## Flusso fail-closed

Il Runtime Governor applica il seguente ordine:

1. verifica fingerprint, schema e binding dell'envelope V2;
2. verifica lo stato del kill switch; uno stato corrotto equivale a switch attivo;
3. in modalità `off` non consuma V3;
4. in `shadow` o `canary` classifica l'esecuzione V3;
5. valida risultato e binding V3 prima di qualsiasi confronto;
6. produce confronto e prova di divergenza solo se V3 è integro;
7. restituisce sempre V2 quando V2 è valido, altrimenti si astiene.

Lo stato di esecuzione V3 usa codici sicuri e non incorpora stack trace, messaggi raw o dati di richiesta nell'audit.

## Kill switch e rollback

`createV2SafetyKillSwitchV3` crea lo stato iniziale firmato. `engageV2SafetyKillSwitchV3` è idempotente e unidirezionale nel perimetro V3-16:

- incrementa la generazione una sola volta;
- non espone una funzione di reset automatico;
- trasforma uno stato corrotto in `automatic-fail-closed`;
- impedisce che V3 venga consumato anche per il confronto.

`verifyV2SafetyRollbackV3` accetta il rollback soltanto se:

- envelope V2 e kill switch sono validi;
- il kill switch è attivo;
- il risultato pubblico è lo stesso riferimento V2;
- l'azione è `serve-v2`;
- V3 non è stato consumato;
- l'audit dichiara V2 invariato.

## Telemetria aggregata

`createV2SafetyTelemetryAggregateV3` accetta soltanto audit validi e produce contatori aggregati:

- totale esecuzioni;
- azioni `serve-v2` e `abstain`;
- modalità off/shadow/canary;
- esiti di esecuzione V3;
- frequenza dei veto;
- esiti aggregati del comparator per ruolo.

Non vengono conservati case ID, solution ID, fingerprint di soluzione, output pubblico, provider, commissioni, markup o probabilità di click. L'aggregato dichiara esplicitamente l'assenza di dati case-level, identificatori di soluzione e dati commerciali, ed è protetto da fingerprint stabile.

## Test di gate

La suite V3-16 verifica:

- identità esatta dell'output V2 in shadow e canary;
- import failure, timeout ed eccezione V3;
- fingerprint V3 corrotto e binding di ruolo incoerente;
- veto di vincoli hard e integrità offerta;
- fail-closed su kill switch corrotto;
- rollback con kill switch attivo;
- astensione quando V2 è invalido;
- prova di divergenza senza autorità di promozione;
- determinismo al riordino dei binding;
- telemetria solo aggregata e rilevamento delle manomissioni;
- invarianti statiche senza side effect esterni.
