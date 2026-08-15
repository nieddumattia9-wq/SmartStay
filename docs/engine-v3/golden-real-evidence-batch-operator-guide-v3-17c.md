# V3-17C — Guida operativa per batch di evidenze reali

## Scopo

Questa guida descrive il passaggio tra una sessione di raccolta controllata e
il ledger V3-17B. Il modulo V3-17C verifica e firma semanticamente le prove; non
esegue la ricerca al posto dell'operatore.

## Prima della sessione

1. Usare la campagna V3-17B pubblicata e conservarne il fingerprint.
2. Selezionare solo slot senza receipt.
3. Per un derivato, includere il parent baseline nello stesso batch o
   verificare che il parent sia già nel ledger.
4. Preparare una `collectionWindowId` univoca e auditabile.
5. Non includere cookie, token, nomi utenti, email, telefoni o indirizzi.

## Durante la sessione controllata

Per ogni baseline conservare fuori dal payload applicativo lo snapshot grezzo
necessario all'audit e calcolare:

- fingerprint dell'esecuzione reale;
- fingerprint dello snapshot sorgente;
- fingerprint della verifica Public Rates;
- fingerprint della decisione V2;
- fingerprint della decisione V3;
- fingerprint dell'audit witness.

Se lo slot richiede il replay provider-neutral o una challenge di astensione,
eseguirli nella stessa finestra controllata e registrarli separatamente.

Per adversarial e counterfactual non effettuare una nuova ricerca spacciandola
per parent. Applicare la trasformazione documentata allo snapshot baseline,
registrare il fingerprint di derivazione e mantenere identico il
`sourceSnapshotFingerprint` del parent.

## Prima dell'intake

Applicare il firewall privacy e commerciale:

- rimuovere identificatori diretti;
- rimuovere identità e codici provider;
- rimuovere commissioni, markup e segnali di monetizzazione;
- non aggiungere preferenze dei valutatori;
- non aggiungere outcome, regret, calibrazione o giudizi;
- non usare output teacher come verità.

Tutte le attestazioni booleane del contratto devono descrivere fatti verificati,
non intenzioni future.

## Esito dell'intake

Un batch vuoto restituisce `no-evidence`, zero receipt e zero incremento dei
contatori. Un batch valido ma incompleto restituisce
`partial-real-collection`. `real-case-plan-complete` significa soltanto che i
200 slot reali hanno una receipt valida; non significa che il Golden Dataset
abbia superato i gate statistici.

Ogni receipt deve comparire nel ledger della campagna aggiornata. La readiness
deve essere ricalcolata dal fingerprint della nuova campagna. Il batch e la
campagna devono essere riproducibili invertendo l'ordine delle capture.

## Errori che bloccano il batch

Il batch viene rifiutato integralmente in presenza di:

- fingerprint campagna vecchio o estraneo;
- slot sconosciuto o già receipted;
- `captureId` duplicato;
- due capture sullo stesso slot;
- snapshot baseline riutilizzato su due baseline;
- derivato senza parent reale o con snapshot diverso dal parent;
- Public Rates, audit witness, replay o challenge mancanti;
- prova non programmata su uno slot;
- PII, identità provider o segnali commerciali;
- preferenze cieche o misure outcome premature.

Non è previsto un successo parziale: correggere il batch e rieseguirlo.

## Sequenza successiva

1. Pubblicare e verificare V3-17C.
2. Integrare un collector reale controllato che produca il formato capture.
3. Eseguire batch progressivi con receipt e audit evidence.
4. Completare assegnazioni e giudizi ciechi.
5. Misurare i gate congelati in V3-17A.

Fino al completamento del punto 5, V3 non è autorizzato al pubblico e lo split
resta disabilitato.
