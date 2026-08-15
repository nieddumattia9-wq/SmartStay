# StayOpti V3-16 — V2 Safety Kernel

## Stato e perimetro

V3-16 introduce un kernel di sicurezza additivo per l'esecuzione diagnostica di V3 in modalità `off`, `shadow` e `canary`. Non collega V3 al risultato pubblico, non modifica V2 e non autorizza promozioni automatiche.

V2 resta l'unica autorità di serving. Il gate è deliberatamente più forte di una semplice preferenza di fallback:

- con envelope V2 valido, il governor restituisce lo stesso oggetto `publicOutput` ricevuto da V2;
- con envelope V2 mancante o corrotto, il governor restituisce `null` e si astiene;
- V3 non viene mai usato come risultato pubblico in V3-16;
- import failure, timeout, eccezione, output V3 invalido e binding incoerente attivano veto hard;
- `SPLIT` resta disabilitato.

## Contratto V2

`createV2PublicDecisionEnvelopeV3` lega tramite fingerprint stabile:

- versione della policy V2;
- output pubblico V2;
- quattro ruoli comparabili: Best Choice, Saving, Upgrade e SPLIT;
- identificatore locale e fingerprint della soluzione selezionata per ogni ruolo.

Il comparator non pubblica identificatori: l'audit conserva solo ruolo, esito del confronto e uguaglianza del fingerprint. I confronti sono sempre omologhi, quindi Choice viene confrontato con Choice, Saving con Saving, Upgrade con Upgrade e SPLIT con SPLIT.

## Registry dei veto hard

Il registry è versionato, immutabile e include almeno:

- V2 pubblico invalido;
- kill switch attivo;
- modalità off o V3 non eseguito;
- import failure, timeout ed eccezione V3;
- risultato V3 corrotto o binding non verificabile;
- Best Choice mancante;
- vincolo hard, integrità offerta o dominanza non rispettati;
- presenza di segnali commerciali proibiti;
- prova di divergenza insufficiente;
- promozione pubblica disabilitata.

Ogni veto conduce a `serve-v2` quando V2 è valido. Nessun veto può essere trasformato in consenso implicito a servire V3.

## Prova di divergenza

Una divergenza V2/V3 è solo evidenza candidata. Per essere marcata `complete-candidate` deve provare:

- evidenza collegata alla selezione V3;
- candidato comparabile, con vincoli e integrità coerenti;
- assenza di dominanza per Best Choice;
- risparmio e perdita entro tolleranza per Saving;
- premio, guadagno e valore marginale sopra soglia per Upgrade.

Anche una prova completa mantiene `promotionAuthority: false`. Il kernel non converte mai la prova in serving pubblico.

## Invarianti congelate

- `publicV2Changed: false`
- `publicV3Enabled: false`
- `automaticPromotionAllowed: false`
- `splitEnabled: false`
- nessuna chiamata provider, prenotazione o pagamento
- nessuna modifica analytics o deploy
- nessun uso di commissioni, markup, probabilità di click o valore economico utente
- nessun output teacher promosso a ground truth
