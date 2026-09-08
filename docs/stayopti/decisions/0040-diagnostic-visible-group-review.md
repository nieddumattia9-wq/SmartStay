# D-0040 — Conferma esplicita del gruppo visibile

## Decisione e perimetro

Approvazione: richiesta esplicita di Mattia del 7 settembre 2026. La sola
revisione diagnostica D-0039 aggiunge `REVIEW_GROUP`. Nessun cambiamento a
ranking, collector, custodia D-0037, gate Golden o giudizi. Il rapporto AI
resta supporto separato: nessuna azione AI viene tradotta in conferma umana.

Gruppi deterministici di massimo cinque campi condividono esattamente il set
dei riferimenti alle prove. I campi privi di riferimenti hanno gruppi separati,
con avviso esplicito. Non si fondono valori, UNKNOWN, motivazioni o affidabilità.
La suddivisione è presentazione, non una nuova equivalenza semantica.

## UI, API e storico

- Un solo gruppo visualizzato, con tutti i suoi valori, limiti e prove locali
  affiancate e ingrandibili. Corretto, Correggi e Non verificabile restano
  disponibili per ogni campo. Il riepilogo completo resta disponibile.
- Il pulsante elenca i campi e richiede una conferma personale esplicita.
  Le correzioni ancora aperte impediscono la conferma del gruppo.
- Il filtro iniziale è Da verificare: dopo un salvataggio esplicito mostra
  i campi ancora pendenti. Nessun avanzamento produce approvazioni.
- `groupPolicy`, `groupId`, `viewFilter`, `fieldKeys`, `confirmed`,
  `expectedRevision` e `contentFingerprint` viaggiano nell'azione e nello storico.
  Revisione/fingerprint sono quelli effettivamente mostrati, non aggiornati
  dal server. Stale viene rifiutato prima dell'append con messaggio italiano.
- L'API ricalcola il gruppo e l'esatto sottoinsieme del filtro; rifiuta campi
  extra, omessi, duplicati, appartenenti ad altri gruppi o ad altre alternative.
  Non può certificare l'attenzione umana né un browser arbitrariamente alterato.
- UNKNOWN confermato rimane missing; confermare la trascrizione non attesta
  completezza, adeguatezza, custodia, giudizio cieco, esperienza o Golden.
- Lo storico concatenato resta append-only. Le correzioni invalidano la
  conferma complessiva; nessun evento precedente viene sovrascritto.

## Compatibilità e continuità

Il contratto del packet resta @1; la politica gruppi è
`stayopti.diagnostic-visible-proof-groups@1`. Il binding al nuovo codice
impedisce di riaprire uno storico della versione precedente. I pacchetti e i
progressi vecchi restano intatti e utilizzabili con il loro codice: nessuna
migrazione o trasferimento di conferme è implicito. L'eventuale nuova revisione
usa un percorso di progressi distinto, mai una copia del journal precedente.

## Prove e limiti

Test sintetici del dominio e del client realmente emesso collegato all'API
locale: gruppi filtrati, campi nascosti, client obsoleto, correzione, conferma
complessiva, storico e riapertura. Launcher reale Windows PowerShell 5.1,
regressioni D-0038 e controllo browser solo su fixture. Le prove DOM portabili
non sono presentate come osservazioni del browser o della custodia reale.

Il numero di conferme è calcolato dal packet nel report privato: non è una
costante del formato. Ridurre i click non riduce i campi da leggere né autorizza
conferme senza controllo. Aperture/zoom delle immagini e correzioni sono
operazioni aggiuntive variabili.

CURRENT_STATE e DECISION_LOG fanno parte dei 19 path protetti: questo record
separato documenta la modifica senza riscriverli. Validazioni e inventario
puntuale sono nel pacchetto privato di consegna. Nessun commit autorizzato.
