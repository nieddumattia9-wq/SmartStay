# StayOpti V3-17F — Golden Pilot Receipt Checkpoint

## Stato congelato

V3-17F registra nel contratto del motore le prime tre receipt reali accettate
dal batch intake V3-17C dopo il pilot sandbox V3-17E v2.

- archivio Evidence SHA-256:
  `263185686c0f5622e235e2724d61338e0ea2ebcf010a814d9dd3e03fd30125a7`;
- repository sorgente:
  `185d93060577a383505de1a220016568c0a914dc`;
- batch fingerprint: `fnv1a32-d7439093`;
- campaign fingerprint risultante: `fnv1a32-053c4b56`;
- receipt reali: 3 baseline;
- challenge di astensione valutabili: 1;
- replay provider-neutral: 2;
- prossimo slot non raccolto: `golden-collection-case-slot-004`.

## Perché il checkpoint è necessario

I collector live sono esterni e read-only. Senza un checkpoint cumulativo ogni
nuova sessione ripartirebbe da una campagna vuota, pur avendo Evidence valide.
Il checkpoint ricostruisce invece la stessa campagna con le tre receipt già
acquisite, permettendo ai prossimi batch di proseguire da 3/200.

## Informazioni conservate

Sono conservati soltanto:

- identificativi interni Golden;
- fingerprint di snapshot, decisioni, replay e bundle;
- attestazioni booleane richieste dal contratto;
- binding SHA-256 all'archivio Evidence esterno;
- conteggi di readiness.

Non vengono inclusi nel repository:

- risposte provider grezze;
- offerId, prebookId o identificativi della struttura;
- nomi, indirizzi, email o telefoni;
- commissioni, markup o altri segnali commerciali;
- giudizi umani, misure di regret o claim statistici.

## Gate

Il checkpoint è valido solo se:

1. le tre receipt ricostruiscono una campagna V3-17B valida;
2. il fingerprint della campagna coincide con il risultato V3-17E;
3. il replay del checkpoint è deterministico;
4. nessuna receipt duplicata o mutata viene accettata;
5. il conteggio riparte da tre casi reali e non da zero;
6. V2 pubblico, V3 pubblico e SPLIT restano invariati e spenti.

## Limite

Tre receipt non soddisfano il Golden Dataset. Restano da raccogliere 197 casi,
inclusi 40 avversariali e 40 controfattuali, oltre ai giudizi ciechi umani ed
esperti. V3-17F non autorizza claim statistici, canary o promozione pubblica.
