# StayOpti Engine V3-10B — Real-case blind review bridge

## Scopo

V3-10 aveva già congelato protocollo, soglie e metriche, ma mancava il ponte tra la decisione V2 realmente usata dal frontend e una valutazione umana cieca riproducibile. V3-10B aggiunge quel ponte senza cambiare ranking, card o comportamento pubblico.

L’entry point già introdotto da V3-11C, `buildSmartStayFrontendRuntimeV2`, restituisce l’esatto `searchInput` effettivo, il relativo risultato V2 e la view pubblica costruita da quel medesimo risultato dopo l’eventuale risoluzione automatica della preferenza. V3-10B riusa questo ponte senza duplicarlo o cambiare la view pubblica.

## Pacchetto cieco

`createRealCaseBlindReviewBundleV3` riceve casi acquisiti da ricerche autorizzate con Evidence già legata tramite fingerprint alla precisa decisione V3 e produce due oggetti separati:

- `blind-review-packet.json`: contesto di viaggio e due opzioni sinistra/destra, senza etichetta V2/V3, token selezione linkabili, identità del provider, identità della struttura, PII o riferimenti di prenotazione;
- `sealed-assignments.json`: associazione V2/V3, fingerprint decisionali, fingerprint shadow e segnali di sicurezza. Questo file non deve essere consegnato ai valutatori.

La randomizzazione sinistra/destra è deterministica rispetto a caso e soglie congelate. La manomissione di packet o assignment invalida il fingerprint. Ogni caso viene calcolato usando:

1. l’esatta decisione V2 del frontend;
2. l’orchestrazione indipendente V3-11B;
3. il confronto shadow interno con Public Rates `verified` per una raccomandazione oppure `not-applicable` per un’astensione decision-bound;
4. la proiezione cieca dei soli fatti utili al giudizio.

Una dichiarazione testuale `verified` non è sufficiente: Evidence mancante, manomessa o riferita a una decisione diversa, una referenza di prenotazione o un errore shadow vengono rifiutati fail-closed.

### Astensioni e prova tariffaria

Una raccomandazione V3 continua a richiedere la catena decision-bound `Rates → Prebook → GET Prebook`, con token della soluzione e totali coerenti entro la tolleranza congelata. Questo requisito non è stato ridotto.

Quando V3 si astiene o non trova una soluzione fattibile, non esiste invece una tariffa selezionata da sottoporre a Prebook. In quel solo caso il collector deve produrre `v3-abstention-no-selected-rate`: una prova con chiavi chiuse e fingerprint separato, legata sia alla decisione V3 sia alla sua proiezione comparabile, con stato non-raccomandazione e token selezione obbligatoriamente nullo. Solo questa prova restituisce `not-applicable`.

`not-applicable` consente al caso di entrare nella valutazione cieca dell’astensione, ma non rende V3 pronta per il pubblico: i gate di promozione e il kill switch continuano a richiedere Public Rates `verified` per qualunque raccomandazione servita.

## Review HTML offline

`renderBlindReviewHtmlV3` crea un unico file HTML locale. Il valutatore inserisce soltanto un token opaco, sceglie `utente` o `esperto`, esamina le alternative e scarica un JSON con scelte `left`, `right` o `tie`. L’HTML:

- non contiene gli assignment V2/V3;
- non carica script, font o dati dalla rete;
- non invia analytics;
- non abilita V3 pubblica;
- non modifica il repository o i risultati mostrati dal prodotto.

## CLI offline

Dopo `npm install`:

```text
npm run v3:blind-review -- create --input <real-cases.json> --output <directory>
```

L’input usa lo schema `3.0.0-real-case-capture-input.1` e contiene una lista di `StayOptiRealCaseBlindReviewSourceV3`. I dati grezzi non vengono copiati nell’output.

Dopo aver chiuso la raccolta dei giudizi:

```text
npm run v3:blind-review -- deblind --packet <blind-review-packet.json> --assignments <sealed-assignments.json> --responses <responses.json> --output <blind-evaluation-set.json>
```

Il risultato usa lo schema V3-10 esistente `3.0.0-blind-evaluation.1` ed è quindi direttamente compatibile con `evaluateV3AgainstV2Offline`.

## Cosa non dimostra

Il codice e i test sintetici provano contratti, isolamento e riproducibilità; non costituiscono casi reali, giudizi umani o prova di superiorità V3. Il gate resta chiuso finché non sono raccolti almeno:

- 200 casi Golden, inclusi 40 avversariali e 40 controfattuali;
- 300 giudizi umani e 100 esperti;
- gli oracle label e gli outcome necessari alle metriche V3-10;
- tutte le soglie quantitative già congelate.

Solo un V3-10 reale con esito `pass` rende la policy candidata eleggibile allo shadow operativo. Canary, pubblico e SPLIT restano disabilitati.

## Confini operativi

- zero chiamate provider aggiunte;
- zero booking;
- zero analytics esterni;
- zero deploy;
- V2 pubblico invariato;
- V3 non autorevole e non pubblica;
- nessuna auto-promozione;
- SPLIT disabilitato.
