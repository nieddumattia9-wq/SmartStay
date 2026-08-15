# StayOpti V3-17B — Golden Real Collection Campaign

## Scope

V3-17B rende eseguibile la raccolta del Golden Decision Dataset reale senza
trasformare un piano, una fixture o un'assegnazione vuota in prova statistica.
Il checkpoint resta offline e non modifica V2 pubblico, V3 pubblico, booking,
pagamenti, analytics o deploy.

## Frozen campaign

- 200 slot di casi: 120 baseline reali, 40 avversariali e 40 controfattuali;
- copertura deterministica dei cinque profili, cinque segmenti e tre ruoli;
- ogni caso derivato è legato a uno slot baseline reale;
- 20 slot richiedono una sfida di astensione valutabile;
- 100 slot richiedono replay provider-neutral;
- 300 assegnazioni cieche umane e 100 esperte;
- ordine V2/V3 deterministico e bilanciato, non visibile al valutatore;
- nessun risultato, preferenza o measurement incluso nel piano.

Gli slot pianificati valgono zero casi raccolti. Le assegnazioni pianificate
valgono zero giudizi. Solo ricevute di evidenza reali e claim di valutatori
indipendenti possono avanzare la readiness della campagna.

## Real-case receipt

Ogni ricevuta deve provare:

- snapshot di ricerca reale conservato per audit;
- decisione V2 e decisione V3 legate a fingerprint stabili;
- Public Rates verificati;
- derivazione esplicita per avversariali e controfattuali;
- evidenza dedicata per astensione o replay quando richiesta dallo slot;
- rimozione di identificatori diretti, identità provider e segnali commerciali;
- stato `unmeasured`: la raccolta non anticipa l'adjudication.

Duplicati di slot, casi o ricevute sono rifiutati. Un caso baseline non può
inventare una derivazione; un caso derivato non può esistere senza derivazione.

## Readiness states

1. `real-case-collection-required`: manca almeno una quota di evidenza reale;
2. `blind-evaluator-assignment-required`: i casi sono completi ma mancano
   valutatori indipendenti e consenzienti;
3. `ready-for-blind-judgments`: campione e assegnazioni sono pronti, ma i
   giudizi raccolti sono ancora zero.

Nessuno stato V3-17B supera il Golden Dataset Gate, autorizza claim statistici,
promuove V3 o abilita SPLIT. Queste decisioni restano affidate al gate V3-17A
dopo raccolta, adjudication e misurazione reali.
