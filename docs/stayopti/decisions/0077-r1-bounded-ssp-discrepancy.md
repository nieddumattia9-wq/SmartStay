# D-0077 R1 — discordanza SSP limitata e proposta locale

2026-09-28. Candidato locale per revisione, da `79c203e96f9c211a9b4e2864c9cf8c07bcdcbfe5`.
Nessun commit/push autorizzato in questo intervento. Sonda soltanto; A02 Production HOLD.

## Prima e dopo (dati inventati)

La regressione iniziale conserva retail 880 EUR, commissione 80 EUR,
SSP tariffa 920,01 EUR e SSP offerta 920 EUR. Il preparatore storico produce
`STOP / SSP_SOURCES_CONFLICT`, `facts.ssp=null`. Input, sorgenti iniziali,
assert fallito e log sono conservati nell'Evidence locale separato.

L'adesione esplicita a `stayopti.liteapi-ssp-probe@1.2` consente una
`LIMITED_ONE_CENT_DISCREPANCY` soltanto con:

- selezione esatta della struttura/offerta, una tariffa e una unità richieste;
- occupazione/date coerenti secondo il decoder documentale esistente;
- denaro interpretabile in centesimi, valuta della richiesta, ambito totale
  soggiorno della stessa componente, riferimenti allo stesso record;
- entrambe le osservazioni tariffa/offerta presenti; eventuali SSP della
  sessione prebook qualificati anch'essi, mai scartati per convenienza.

L'oggetto MONEY accetta amount/currency e il metadato documentale source.
Annotazioni monetarie ulteriori non interpretate (es. basi per notte/persona
o quantità), NULL, valute assenti/diverse e quantità esplicite non singole
restano non qualificati. Non si estende questa regola a un campo generico,
a un aggregato di camere o a un SSP prebook collocato in una risposta ricerca.
Un SSP opzionale omesso conserva il suo stato: non viene fabbricata la coppia
necessaria per beneficiare della classificazione di discordanza.

`facts.ssp` non diventa falsamente concorde: resta null se le fonti differiscono.
`facts.sspResolution.sources` conserva originali, hash, pointer e qualifiche;
`differenceMinorUnits` conserva la differenza. `localProposal`/`localTarget`
usano il maggiore dei due SSP, senza aggiungere retail o commissioni.
`providerReturnedSsp=false`, `valuesDeclaredEqual=false`, causa non accertata.
Non si attribuisce la discordanza ad arrotondamenti del provider.

## Controlli successivi e confine storico

Il candidato margin resta una derivazione condizionata, non una promessa.
La seconda Rates deve restituire esattamente il target locale: un centesimo
sotto **o sopra** ferma la sonda. Il controllo separato contro **ogni** SSP
applicabile resta rigoroso, senza epsilon. Nessun `max(retail, SSP)` diventa
prezzo osservato. Cambiamento dello SSP minore a massimo invariato, perdita
di una fonte, cambio di valuta, condizioni, occupazione o identità fermano
la sequenza. Il prebook usa solo il token della nuova osservazione.

`EXACT_LOCAL_TARGET_RETURNED_NOT_PREBOOK_VERIFIED` e
`EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED` distinguono il target locale
dall'uguaglianza dei valori del provider. Un eventuale SSP aggiuntivo prebook
è controllato nella sua sede, non trasferito alla vecchia osservazione.

Solo per @1.2, il singolo motivo `SSP_SOURCES_CONFLICT` viene riclassificato
nella decisione della sonda quando la verifica circoscritta è riuscita.
La qualificazione originale in `facts.fiscal` rimane intatta. Anche il
riepilogo finale usa quella riclassificazione: non ripropone implicitamente
il medesimo conflitto come nuovo blocco. L'eventuale totale condizionale
mantiene la regola documentale `NULL_ALL_INCLUDED`, usa soltanto il retail
effettivamente osservato e resta null con altre lacune/condizioni fiscali.
Gli elenchi di componenti non vengono certificati esaustivi o sommati al target.
Questo non certifica checkout, freschezza futura, sistemazione o ammissibilità A02.

@1 e @1.1 mantengono esattamente il comportamento precedente, incluso STOP
per la discordanza sintetica di un centesimo. Nessuna migrazione di piani,
autorizzazioni, inventari o ricevute. Il journal continua a vincolare la
versione nel piano/hash; il formato inventario @1.1 non cambia. Il nuovo
dispatch ammette @1.2 nello stesso meccanismo, senza duplicare trasporto,
prompt, custodia, contatori MAX3 o selezione. Non è stato creato un caso reale.

## File e prove

- `scripts/liteapi-ssp-probe-v1.mjs`: dispatch e risoluzione esplicita,
  proposta, confronti Rates/prebook, qualificazione finale coerente.
- `scripts/liteapi-ssp-probe-plan-v1.mjs` e
  `scripts/liteapi-ssp-probe-capture-v1.mjs`: allowlist additiva delle versioni.
- `tests/engine-v3/v3SspSourceDiscrepancy.test.ts`: regressioni inventate,
  integrazione nella sequenza e launcher reale in modalità Simulate.
- questo rapporto, CURRENT_STATE e DECISION_LOG: consegna e limiti.

Controlli: uguaglianza, un centesimo in entrambi gli ordini, importi maggiori,
scope/valute/quantità mancanti o incompatibili, prezzi sotto/sopra target,
cambio di condizioni o della fonte minore, prebook contraddittorio, integrità,
nessun fallback, metadati innocui e diversa geografia/valuta supportata.
Regressioni legacy sonda e MAX11 incluse. Gli originali sintetici non sono
mutati dalla qualificazione. Windows PowerShell 5.1/DPAPI esclusivamente su
materiali inventati: nessuna credenziale Production letta e nessuna richiesta
provider. I test loopback non sono acquisizioni reali.

Evidence: `%TEMP%/stayopti-d0077-r1`. Il primo harness aveva un import ESM
Windows privo di file URL: errore ambientale conservato e corretto, senza
loader o shim. Il controesempio di dominio poi fallisce come previsto.
Prima iterazione del candidato: 109/111 PASS; due assert segnalano il motivo
SSP residuo nel riepilogo fiscale. Correzione applicativa, assert mantenuti.
Esito finale sul candidato isolato: **114/114 PASS**, nessuno skip; compilazione
completa dei test tramite tsconfig.tests.json, TypeScript e build PASS.
Windows PowerShell 5.1.26100.9444 / Node 24.18.0. Il test @1.2 attraversa
Inventory/Preflight/Simulate, journal autenticato e rifiuto del caso sintetico
consumato; @1.1 e MAX11 sono verificati separatamente. Dati/hash degli input
testati e log stdout/stderr sono conservati. Nessuna suite completa motore,
lifecycle pubblico o release ripetuta: non modificati quei percorsi, né
dipendenze, trasporto, store o gestione della credenziale. Non è un PASS della
CI GitHub né un gate di pubblicazione: commit/push non autorizzati.

Nessuna riesecuzione del caso consumato, accesso agli originali cifrati,
modifica dell'account, invocazione motore o promessa di raggiungere il target.
La diagnosi privata è separata e non sostituisce il risultato storico STOP.

## Addendum: revisione finale e consolidamento autorizzato

Incarico successivo del 28 settembre 2026: pubblicare selettivamente questi
sette file e preparare un nuovo tentativo; non avviare Acquire. Non modifica
retroattivamente il perimetro della consegna precedente.

Revisione del diff e delle regressioni completata senza ulteriori modifiche
funzionali. I sette hash della consegna coincidono e i quattro input
software/test sono byte-identici al candidato collaudato. Verificati runtime
Node con hash dell'inventario, 984 file baseline non modificati (incluse
dipendenze sorgente, manifest e lockfile) e assenza di variazioni nei file
delle dipendenze installate dopo il collaudo, esclusa la cache generata .tmp.
Riutilizzati esplicitamente **114/114**, compilazione test, TypeScript/build,
PS5.1/DPAPI sintetico. Rieseguiti soltanto i gate pubblicazione pertinenti:
**security 29/29**, **release 101/101**, Windows PowerShell 5.1. Nessun nuovo
risultato attribuito alla CI remota o a un'esecuzione monolitica release:ci.
Evidence nuova separata: `%TEMP%/stayopti-d0077-r1-consolidation`.

Le sole ulteriori modifiche sono questo addendum e la rendicontazione in
CURRENT_STATE/DECISION_LOG. L'inventario consegnato identifica il commit
pubblicato e il remoto effettivamente verificato; main e modifiche estranee
non entrano nello staging.

Il nuovo piano privato @1.2 conserva hotel/scenario/seed approvati ma contiene
solo l'identità del nuovo caso, non prezzi o token precedenti. Il target e il
margin candidato derivano dalla nuova DISCOVERY, con sigillo prima della
REQUOTE. MAX3 e sottolimiti restano 1/1/1; arresti e assenza di retry immutati.
Inventory e Preflight vengono eseguiti sul commit definitivo, senza credenziale
Production o creazione della custodia. Il consenso finale è la literal nuova,
da inserire manualmente: soltanto dopo il launcher recupera la chiave D0074.

Il blocco operativo distingue: literal non accettata senza traccia di avvio;
errore preliminare senza caso/marker; avvio registrato senza risultato;
risultato presente da leggere con assessment/contatori. Non deduce consumo
dal solo exit code, non cancella marker, non ritenta. Una custodia futura
avrà i propri 14 giorni; quella storica non viene toccata o rinnovata.
Prontezza tecnica della sonda non garantisce raggiungimento del target o
prontezza A02, che resta HOLD.
