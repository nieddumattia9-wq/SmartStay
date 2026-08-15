# V3-17D — Guida operativa alle sessioni live controllate

## Scopo

Questa guida prepara l'esecuzione del futuro collector reale. V3-17D produce
un piano e un export verificabile; non effettua autonomamente ricerche live.

## Creazione del piano

1. Usare la campagna V3-17C più recente e pulita.
2. Scegliere una `collectionAnchorDate` valida.
3. Generare il piano dalla campagna corrente.
4. Verificare che il piano includa soltanto baseline senza receipt.
5. Conservare il fingerprint del piano insieme all'audit della sessione.

La matrice è provider-neutral: non contiene provider preferiti, credenziali,
commissioni o markup. Destinazione, date, ospiti, budget e distanza sono i soli
input necessari al search scope.

## Apertura di una sessione

Una sessione può contenere da zero a dieci scenari. Per una raccolta reale si
raccomanda di iniziare con un batch piccolo, così da verificare costi, failure
mode e completezza delle prove prima di aumentare il volume.

Non riutilizzare un fingerprint di piano dopo che la campagna ha acquisito
nuove receipt. Rigenerare il piano sulla campagna aggiornata.

## Contratto dell'executor futuro

L'executor dovrà usare il backend e gli adapter già autorizzati dal progetto,
senza inserire nel payload V3-17D:

- API key o token;
- nome, ID o slug provider;
- email, telefono, indirizzo o altri identificatori diretti;
- commissioni, markup, revenue o segnali di click;
- giudizi umani, outcome o metriche statistiche.

Le credenziali restano nell'ambiente operativo esistente. Lo snapshot grezzo
resta in un'area audit protetta; nel ledger entrano solo fingerprint e
attestazioni minimizzate.

## Trattamento degli esiti

Per ogni scenario autorizzato registrare un solo tentativo.

Se ricerca, Public Rates, V2, V3, audit witness, replay o challenge falliscono,
registrare `failed` con il codice appropriato. Non fabbricare il fingerprint
mancante e non promuovere il tentativo a capture.

Se lo scenario non è stato eseguito, lasciarlo pending. Failed e pending valgono
sempre zero evidenza.

Un successo deve includere tutte le attestazioni live e deve dichiarare
`testDoubleUsed: false`. L'export produce quindi il batch per V3-17C, che resta
il solo punto autorizzato a emettere receipt.

## Sequenza di verifica

1. validare piano e sessione;
2. eseguire il collector esterno entro il limite autorizzato;
3. validare ogni tentativo;
4. costruire l'export;
5. applicare l'intake V3-17C;
6. verificare receipt, parent commit e working tree;
7. rigenerare il piano sulla campagna aggiornata.

## Costi e chiamate esterne

Il pacchetto V3-17D installa solo codice e test: zero chiamate provider e zero
costi. Il futuro executor live potrà consumare chiamate provider; prima di
consegnarlo verrà indicato il tetto massimo di ricerche e l'eventuale costo.

## Stato prodotto

Anche con sessioni reali riuscite, il Golden Dataset Gate resta chiuso finché
non sono completati casi derivati, giudizi umani ed esperti e misure congelate.
V3-18 e V3-19 restano bloccati.
