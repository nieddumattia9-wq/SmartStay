# D-0061 R1 — Integrità delle limitazioni sui letti e dei dettagli

Base: `3d94b9f45632260f65784d011c53366dc9f4f2b7`. 14 settembre 2026.
Solo evaluation, fixture inventate, trasporto simulato. Nessuna misura privata.

## Difetti riprodotti prima della correzione

I sei ingressi sono stati acquisiti mediante `providerCapture`, modificando i
payload prima della registrazione. Ogni esecuzione ha attraversato verifica,
normalizzazione, requisiti, kernel e policy effettivi: **1 kernel / 1 policy**.
La preparazione pura separata ha prodotto **0 / 0**. Originali invariati.
Il primo run ha osservato **2 PASS e 4 FAIL**, senza modificare le fixture
storiche. Le copie complete dei sei esperimenti restano conservate localmente;
il riepilogo pubblico con hash e mutazioni è in
`evidence/d0061-r1-initial-counterexamples.json`.

| Caso | Prima, sul codice pubblicato D-0061 | Dopo R1 |
|---|---|---|
| A: secondo letto non disponibile | SATISFIED, lower bound 4, usable | CONFLICTING; nessun conteggio positivo certificato; abstained |
| B: configurazione letti da confermare | SATISFIED, lower bound 4, usable | INSUFFICIENT_INFORMATION; abstained |
| C: error nella radice dei dettagli | ID verificato, quattro stelle consumate, usable | ID distinto da dettaglio non utilizzabile; niente stelle/servizi derivati; abstained |
| D: error nel record data | Come C | Come C |
| Controllo completo invariato | usable | usable |
| Controllo errore prebook | abstained | abstained; fatti dei dettagli indipendenti |

## Correzione circoscritta

`scripts/liteapi-observation-diagnostic-v1.mjs`, contratto osservazioni **@1.1**.
Il wire profile @1 e tutti gli originali restano invariati; nessuna migrazione.

`sleepingText` classifica clausole con inventario, negazione riferita ai letti,
condizione/incertezza, qualificazione implicita del referente precedente e altro
soggetto. Conserva ogni clausola in `sleepingInterpretation`. Quantità e posti
usano ancora `normalizeItalianBedInventory`: nessuna nuova formula o deduzione
di posti da capienza, unità, divani o letti a castello. Una qualificazione
incerta non diventa violazione documentata. L'assenza di letti supplementari
non annulla quelli base; «colazione non disponibile» non è una negazione dei
letti. La grammatica resta limitata, non un interprete universale del testo.

`inspectHotelDetail` separa `detailIdentityVerified`, `detailSemanticStatus` e
`detailUsable`. Controlla error/errori plurali (`errors`) sia in radice sia in
`data`, prima di produrre stelle, recensioni o servizi della struttura. Marcatori
assenti/null/[] sono distinti dagli errori non vuoti; forme non supportate sono
esplicitamente inutilizzabili. Payload originale, hash e percorsi dei marcatori
restano nel tracciato diagnostico. La tariffa valida non viene dichiarata
indisponibile a causa del guasto dei dettagli.

Non vengono eliminate alternative. Se tutte le prove necessarie sono incerte
o invalide, la policy parte e si astiene; questo non è un arresto del preparatore.
Con un insieme misto le proposte indipendenti complete restano valutabili.
La mancanza dei dettagli non diventa zero qualità: i fatti diventano UNKNOWN.

## Verifiche

Suite nuova: `tests/engine-v3/v3LiteApiObservationSemanticIntegrity.test.ts`.
Comprende i quattro controesempi, controlli positivi, varianti IT/EN, qualificazioni
implicite, condizioni estranee ai letti, error/errors nelle due sedi, marcatori
malformati, casi misti, originali immutati e contatori effettivi. I controlli
precedenti D-0061 e quelli REVIEWED/appendice restano presenti.

Primo candidato R1: risultati osservati nel clone Git isolato CurrentUser, con
sole dipendenze copiate offline e senza `.env` o file esclusi. Questa tabella
precede il successivo controllo LSI16 descritto sotto, non ne certifica il codice:

| Gate locale | Risultato |
|---|---:|
| Nuove regressioni R1 | 39/39 PASS |
| Mirati complessivi, incluse regressioni D-0051/R1, D-0052/R1/R2 e appendice | 563/563 PASS, zero skip |
| V3 canonica Windows CurrentUser | 2470/2470 PASS, zero skip |
| V2 | 196/196 PASS |
| Mapper/prebook/offer integrity preesistenti | 18/18 PASS |
| Lifecycle | 530 PASS; 17 skip preesistenti real-Valkey; zero fail |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript / build / analytics-beta | PASS |
| Smoke locale sintetico, senza provider | 18 controlli PASS |
| Windows PowerShell 5.1.26100.9444 parse | 13/13 PASS |
| Scansioni scope, segreti/privati/provenienza, diff/cached diff e protetti | PASS |

Le prime 39 esecuzioni conservate della nuova suite misurano ciascuna un kernel e una
policy effettiva; la preparazione esplicita è separata e produce zero chiamate.
Il test puro aggiuntivo esegue due preparazioni identiche con la policy bloccata.
I sei ingressi prima/dopo hanno SHA-256 identici. I quattro controesempi ora
producono astensione **dopo** la policy; nessun arresto del preparatore viene
etichettato come astensione. Nei due casi misti il candidato problematico resta
visibile e la scelta utilizza le alternative complete indipendenti.

È conservato anche un run intermedio 30/33: due assert del test misto usavano un
nome campo non canonico, corretto senza eliminare candidati o cambiare la policy;
il terzo rilevava che «piano non documentato» era classificato impropriamente come
conflitto. La grammatica ora distingue la mancata documentazione dalla negazione
di disponibilità. I successivi controlli su qualificazioni implicite e letti
supplementari portano il totale nuovo a 39. Nessuna prova storica viene riscritta.

Prima della pubblicazione un ulteriore controesempio LSI16, sul candidato R1 non
pubblicato, ha rilevato un controllo troppo largo del referente aggiuntivo:
«secondo letto non disponibile senza letto aggiuntivo» veniva ignorato e restava
usable. La regressione è stata prima eseguita e fallita; ora l'eccezione per i
letti supplementari richiede di interpretare **l'intera clausola**, non la sola
presenza di quella parola. Lo stesso input passa da SATISFIED/4/usable a
CONFLICTING/nessun conteggio certificato/abstained. Il run nuovo è **40/40 PASS**,
con 40 esecuzioni kernel/policy misurate, separato dal precedente39. Le prove
sono conservate senza sovrascritture; il JSON pubblico aggiunge un follow-up
esplicito e i sei recheck finali con gli stessi input originali.

Il primo tentativo di gate finale documentale è stato interrotto quando è emerso
LSI16: targeted563/mapper18/parse13 PASS ma V3 non conclusa. Non vale come gate
finale. La correzione del referente richiede un nuovo candidato isolato e tutti
i controlli finali; il consolidamento non può usare il PASS del vecchio codice.

**Nuovo candidato con il codice corretto LSI16: tutti i gate PASS.** Osservati
40/40 nuovi, 564/564 mirati, **V3 2471/2471** senza skip e V2 196/196. Restano
PASS mapper18, lifecycle530+17 skip, security29/release101/analytics31/capacity9/
beta4, TypeScript, build, analytics-beta, smoke18, parse13 in PowerShell5.1 e
scansioni scope/protetti. Questi sono i risultati del codice finale, non i2470
del candidato preliminare. SHA-256 modulo:
`92fcf06b5d8fc64d58caf5a56318b894777b2a137a0be203d9282a7af1610f8d`;
test:
`65f6117fc73b85a7e96caaacd7dc3db9fc52192505dab77cb96ef60a448c8e92`.
Il passaggio finale modifica soltanto tre documenti di reporting: codice, test
e prova JSON restano byte-identici, con ricontrollo sul tree finale da committare.

Il candidato viene ricongelato dopo questi soli aggiornamenti documentali e
ricontrollato con tutti i gate prima del commit; il tree committato deve coincidere
con quello finale testato. Nessun risultato locale è attribuito alla CI GitHub.
Non sono stati eseguiti provider reali, CI GitHub, Linux nativo, registry audit
di rete o i 17 test real-Valkey saltati. Gli smoke sono soltanto loopback locali.

## Limiti e passo successivo

R1 corregge la fedeltà semantica delle risposte simulate, non qualifica un account
o una risposta reale del provider. Restano separati forma raw effettiva, account,
costi, nazionalità e autorizzazione, ledger durevole, segreti/cleanup e custodia
del futuro launcher. MAX17 e sottolimiti non cambiano. Nessun prebook reale,
provider call, Bologna, conferma HUMAN, Golden o comportamento pubblico avanzato.

Il consolidamento pubblica soltanto software/test sintetici/documentazione sul
branch di lavoro. SHA locale/remoto, push effettivo e commit ancora pendenti sono
riportati alla consegna dopo readback; il PASS non li presume.
