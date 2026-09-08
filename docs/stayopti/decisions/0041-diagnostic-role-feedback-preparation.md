# D-0041 — Raccordo preparatorio del feedback diagnostico

Autorizzazione: incarico dell'8 settembre 2026. Solo evaluation-side, nessun
motore eseguito, journal scritto, dato reale nel repository o modifica dei gate.

Il modulo separato `scripts/diagnostic-role-feedback-bridge-v1.mjs` riusa il
validatore e il reducer D-0039/D-0040 per verificare tutta la trascrizione e la
conferma finale. Rifiuta binding, riferimenti, hash o versioni incoerenti.
R2 sostituisce R1 come feedback corrente: R1 resta storia, non una seconda label.

Le osservazioni revisionate, i contesti formulati dopo l'osservazione, il feedback
umano riportato dall'assistente e i futuri output V3 sono separati. Due contesti
non aumentano il denominatore: un solo caso. Nessuna attribuzione cieca o esperta.
Il fingerprint dei dati preparatori esclude le preferenze di risposta. La
conferma della trascrizione non colma UNKNOWN né certifica i fatti sul mercato.

Il risultato è una preparazione versionata, NON un secondo input eseguibile del
motore. Il bridge prospettico esistente è solo sintetico; l'adapter V2→V3 richiede
searchInput/result canonici; il replay esterno non può essere ottenuto inventando
licenze, etichette comportamentali o semantica dei prezzi. Nessuno viene bypassato.

Il prezzo mostrato non riempie il totale completo; nessuna scala rating è
presunta. La distanza è convertita soltanto da una dicitura esplicita in m/km
dal centro: una distanza da un monumento resta non mappata. La preferenza forte
non diventa limite hard o tolleranza universale. “Best Over Budget” resta una
label umana, non una traduzione automatica del ruolo worthwhile-comfort-upgrade.

Il report separa missing critici da lacune software: mapping reale al V3,
semantica della preferenza di distanza e protocollo di confronto dei ruoli.
Nessun punteggio o accordo V3/Mattia è calcolato. I pesi non si adeguano al feedback.

CURRENT_STATE e DECISION_LOG sono path preesistenti protetti: questo record
separato conserva la decisione senza riscriverli. Prove sintetiche mirate e
inventario/hash dei materiali si trovano nel pacchetto privato di consegna.
