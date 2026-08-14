# StayOpti V3-11D — Strict-off shadow loading

## Obiettivo

Quando `VITE_STAYOPTI_V3_SHADOW_MODE` non vale esattamente `shadow`, la pagina Results non deve importare, scaricare o avviare il runtime decisionale V3.

## Comportamento

- `off`: Results esegue soltanto il percorso pubblico V2; il callback di import V3 non viene chiamato.
- `shadow`: il runtime V3 viene importato dinamicamente dopo la costruzione del risultato V2 e resta non autorevole.
- un errore di import o di esecuzione V3 resta isolato e non modifica il risultato pubblico V2;
- nessuna trasmissione esterna, chiamata provider, booking o deploy;
- SPLIT resta disabilitato.

Il loader usa soltanto import di tipo verso il runtime pesante. Il riferimento dinamico al modulo decisionale vive nel loader e viene raggiunto esclusivamente nel ramo `shadow`.

## Evidenza regressiva

Il test usa un importer controllato e dimostra che:

- in `off` il conteggio degli import resta zero;
- in `shadow` l'import avviene esattamente una volta;
- Results non contiene più un import diretto del runtime V3;
- il serving engine dichiarato resta V2 e SPLIT resta bloccato.

Questa modifica riguarda soltanto caricamento ed esecuzione. Non cambia ranking, policy, output, fingerprint o versioni decisionali V2/V3.
