# StayOpti Engine V3-11 - Shadow, Canary and Promotion Gate

## Stato iniziale

V3-11 aggiunge l'infrastruttura interna per confrontare V2 e V3, raccogliere regressioni, autorizzare un canary controllato e tornare immediatamente a V2. Non abilita V3 in pubblico.

Il controllo predefinito e congelato e il seguente:

- stage `off`;
- V2 unico motore pubblico;
- esecuzione V3 disabilitata;
- allocazione canary 0%;
- kill switch armato;
- approvazione manuale obbligatoria;
- promozione automatica vietata.

Il fingerprint del controllo rende visibile ogni modifica alla policy interna.

## Gate Nuitee Public Rates

La verifica sandbox post-patch del 14 agosto 2026 ha chiuso il gate esterno Public Rates. L'Evidence ZIP validato ha SHA-256 `442c1ffeba534932999f057275a94d04d035fb33e3211774ebbfdc8e9da960f3`.

La prova ha confermato:

- 24 record provider, 52 offerte utilizzabili e 52 offerte accettate dal mapper;
- Rates e presenter pubblico a EUR 461,78;
- `suggestedSellingPrice` a EUR 476,32 solo come riferimento diagnostico privato;
- POST Prebook a EUR 461,78 e GET Prebook a EUR 461,77;
- stessa camera, trattamento, rimborsabilita, valuta e tasse lungo la catena;
- pricing schema 2 con `offer-retail-rate` e `reference-only`;
- assenza di campi pricing riservati nell'output pubblico;
- zero booking, pagamenti, promo, deploy o mutazioni del repository.

Questo gate verde e necessario ma non sufficiente per attivare V3.

## Shadow sicuro

`runV3ShadowSafelyV3` restituisce sempre lo stesso oggetto pubblico V2 ricevuto in ingresso. In modalita `off` non esegue V3. In modalita `shadow` esegue V3 senza autorita pubblica e produce soltanto uno dei seguenti record interni:

- `shadow-comparison`, con decision diff e reason diff deterministici;
- `shadow-error`, con codice chiuso e senza testo grezzo dell'errore.

I record non ammettono PII, riferimenti booking, identificativi provider, prezzi, commissioni, margini o ricavi. Ogni record include versioni interne e fingerprint.

## Dashboard regressioni

Il dashboard aggrega soltanto metriche e codici macchina. Non conserva payload decisionali completi. Le soglie iniziali congelate per chiedere una revisione canary sono:

- almeno 1.000 osservazioni shadow;
- almeno 990 confronti validi;
- almeno 30 osservazioni per ogni gruppo di segmento osservato;
- error rate di esecuzione shadow non superiore a 0,5%;
- zero regressioni critiche.

Le regressioni critiche includono price integrity, Public Rates, vincoli rigidi, privacy, neutralita commerciale, determinismo e sicurezza della raccomandazione.

## Progressione dei gate

La massima fase eleggibile viene calcolata in ordine:

1. `shadow`: V3-10 reale e valido, Public Rates, invarianti, sicurezza e valutazione umana tutti verdi;
2. `canary`: tutti i gate shadow, dashboard shadow verde e monitoraggio pronto;
3. `public`: tutti i gate canary, almeno 500 osservazioni canary per 24 ore, zero regressioni critiche, regressioni di error rate e latenza entro soglia e rollback drill superato.

L'eleggibilita non e un'autorizzazione. Ogni passaggio richiede un token di approvazione manuale proveniente dal processo operativo autenticato. Il token non viene conservato: entra soltanto nel fingerprint dell'autorizzazione.

Il canary iniziale e limitato al 5%. L'assegnazione e deterministica tramite token opaco, non conserva il token e mantiene un gruppo V2 di controllo.

## Kill switch e rollback

Il kill switch forza V2 e richiede rollback in presenza di almeno uno dei seguenti segnali:

- trigger manuale;
- price integrity fallita;
- Public Rates fallito;
- regressione critica;
- regressione dell'error rate oltre soglia;
- regressione p95 della latenza oltre 100 ms.

Non esiste alcun percorso di auto-promozione o auto-modifica della policy di produzione.

## Prove ancora richieste

I test automatici del modulo usano dataset sintetici esclusivamente per verificare il comportamento del codice. Non costituiscono Golden Dataset reale, giudizio umano reale, traffico shadow reale o autorizzazione alla produzione.

Prima di attivare persino lo shadow operativo servono gli Evidence reali di V3-10 e dei gate esterni. Prima del canary servono almeno 1.000 osservazioni shadow reali. Prima del pubblico servono Evidence canary e rollback reali.

La card SPLIT resta fuori dal runtime core. Sara valutata separatamente soltanto dopo la dimostrazione del V3 single-stay e verra mostrata solo quando produce un risparmio realmente grande mantenendo opzioni valide e confrontabili.
