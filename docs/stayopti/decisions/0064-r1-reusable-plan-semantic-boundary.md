# D-0064 R1 — Piano esplicito e confine semantico

Data: 2026-09-15. Base: b59fa3a9208d099dc677bf5d962225f5be656bd1.
Approvazione: indirizzo architetturale di Mattia, integrativo di D0064.

## Problema e decisione

Le richieste derivavano ancora da costanti Bologna dentro il meccanismo; il
confronto dei duplicati usava l'hash del record intero, respingendo varianti
equivalenti di city/country e metadati accessori. Inoltre la ricerca ricorsiva
di `error` attribuiva semantica di protocollo anche a estensioni non consumate.

Il contratto configurazione @1.1 separa la proposta dal meccanismo. La proposta
rimane quella già discussa; scenario, seed, host, quantità e timeout passano
esplicitamente dalla configurazione verificata alla richiesta e alla selezione.
Il profilo supporta solo le tre operazioni MAX3: i massimali difensivi, il
registro monouso e i sottolimiti non diventano configurazione arbitraria.
La stessa macchina può eseguire un altro piano ammesso soltanto con nuovi
binding e autorizzazione. Nessuna migrazione implicita di @1, inventari o sessioni.

Si autenticano prima i byte originali. Il confronto semantico del catalogo usa
solo ID esatto e città/paese normalizzati; altre differenze restano indicizzate,
con hash originali e nomi dei campi discordanti. Non sono fatti di merito.
Conflitti sui fatti di selezione escludono tutte le occorrenze dell'ID.
Gli errori nei contenitori envelope/data/roomTypes/rates continuano ad arrestare.

Il core numerico e la policy non vengono modificati. Formati commerciali e
decodifica provider restano negli adattatori. Prove metamorfiche attraversano
anche il contratto diagnostico esistente con due vocabolari sintetici: importi
in unità/minor units, rating piatto/intervallo, ordine e metadati diversi.
Le tracce restano diverse; uguali sono soltanto i contenuti decisionali.

## Alternative respinte e salvaguardie

Nessun mapper universale, modifica ai pesi, fallback permissivo su conflitti,
conversione valutaria implicita o sostituzione della verifica crittografica con
un hash semantico. Nessun motore inserito nella catena MAX3. Le prove con motore
sono test separati, interamente sintetici, non nuove acquisizioni production.

La proposta operativa deve essere nuovamente legata al commit finale. Vecchi
pacchetti, autorizzazioni, file D0037 e dati privati restano invariati. I test
locali, i limiti e il push effettivo sono rendicontati nel rapporto R1; non
attestano CI GitHub o autorizzazione del tentativo reale.

Supersedes: soltanto rigidità implementative D0064 @1, non il piano production
proposto, la storia della validazione o le autorità monouso precedenti.
