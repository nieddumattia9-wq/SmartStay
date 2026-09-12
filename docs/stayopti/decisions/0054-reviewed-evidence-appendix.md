# D-0054 — Appendice versionata di prove sul percorso REVIEWED

Data: 2026-09-12. Approvatore: istruzione esplicita di Mattia per D-0054.
Base: `137238c9bdbe2e732d9232309700c085e5e5ac35`.
Stato: implementazione evaluation-only e verifica sintetica; consolidamento
condizionato ai gate e alla verifica effettiva del remoto del branch di lavoro.

## Contesto e problema

Una trascrizione confermata può essere incompleta senza essere errata. Le sue
fonti, il journal e le trasformazioni originali non devono essere riscritti per
inserire prove acquisite successivamente. Il percorso REVIEWED precedente verifica
correttamente l'origine dei dati, ma non offre una certificazione retroattiva delle
lacune: un hash valido non prova costo completo, prenotabilità o privacy.

Serve una derivazione eseguibile, non una seconda preparazione scollegata dal
kernel. Occorre conservare ciò che era UNKNOWN nello storico e permettere che una
nuova prova applicabile risolva il solo fatto nella nuova vista, senza cancellare
contraddizioni note, obblighi originali o contesto della precisa tariffa.

## Decisione e perimetro

Aggiungere `stayopti.reviewed-evidence-appendix@1` come ingresso separato, puro e
senza I/O. La base attraversa prima i controlli REVIEWED esistenti di packet,
journal, fonti, significato delle trasformazioni, applicabilità e copertura R1.
L'appendice lega versione della base, stato finale dello storico, fingerprint e
identità completa delle offerte. Il risultato è una nuova proiezione tracciabile
che usa il kernel diagnostico e la policy esistenti, non l'ingresso SYNTHETIC.

L'estrazione della preparazione e della riproiezione dei requisiti rende riusabile
lo stesso percorso senza modificare la semantica dell'esecuzione precedente. Le
API di preparazione non eseguono la policy; il callback del kernel è esplicito.
Appendice vuota significa parità con il percorso precedente, non migrazione.

Ogni prova mantiene artefatto originale, trascrizione, ambito, tempo dichiarato,
fonte e revisione puntuale. I relativi hash sono concatenati senza riferimenti
circolari. La grammatica bounded deriva il valore dal contenuto e confronta la
claim richiesta; applicabilità e significato non sono dedotti dal solo checksum.
Una revisione `SYNTHETIC_TEST` è ammessa soltanto per una base di fixture; su una
base reale è necessaria una distinta revisione puntuale `HUMAN`, mai fittizia.
Non è richiesta una nuova conferma generale della vecchia trascrizione.

I campi sono limitati a costo completo, prenotabilità/indisponibilità, unità,
locali/capienza/posti letto, privacy, condizioni bambini e scala rating. Non sono
introdotti requisiti utente, parser universali o una revisione della rimborsabilità.
Le offerte non integrate restano visibili con le loro lacune. L'esito di ogni
integrazione è APPLIED, REJECTED, INSUFFICIENT o CONFLICTING, con motivo.

## Tempo e fiducia

Le relazioni RESOLVE_UNKNOWN, CORROBORATE_SAME_CONTEXT e DOCUMENTED_SUCCESSOR
richiedono il binding alla claim precedente e continuità documentata della stessa
tariffa. Il ritiro riguarda soltanto osservazioni puntuali ammesse nella nuova
vista; lo storico non viene modificato. Nessun ordinamento o timestamp massimo
costituisce una regola generale «vince l'ultimo».

Costo/prenotabilità richiedono verifica tariffaria e intervalli documentati validi
all'istante della nuova valutazione; il loro uso congiunto richiede un contesto
osservativo coerente. Un prezzo storico non viene rinfrescato da una nuova
disponibilità. Tariffe nuove o continuità non dimostrata restano non applicabili.

Il controllo dimostra integrità, trasformazioni supportate e collegamenti, non
autenticazione indipendente della fonte, prova crittografica dell'identità umana,
custodia retroattiva o garanzia della futura prenotazione. Questi limiti devono
restare visibili nella documentazione, nella ricevuta puntuale e nell'output.

## Rationale, alternative respinte e salvaguardie

Il beneficio di prodotto è chiedere soltanto l'integrazione effettivamente
necessaria, senza ripetere una revisione già conclusa o nascondere l'incertezza.
Raccomandabilità, calcoli diagnostici e Golden restano tre autorizzazioni e tre
livelli di prova differenti.

Respinti: modificare la trascrizione o il suo manifest; convertire REVIEWED in
SYNTHETIC; fidarsi di un flag normalized/verified; riutilizzare una prova generica
come certificato tariffario; usare latest-wins; cancellare negazioni specifiche;
inventare posti di divani/castelli, quantità, totale, coordinate o bookability;
forzare un vincitore; rendere il feedback umano parte dell'input decisionale.

Le regressioni R1/R2 su bisogni essenziali, scope, negazioni, conflitti, nomi neutri
e trasformazioni restano obbligatorie. Nessuna modifica a pesi, soglie, ruoli,
Maximum Comfort, Upgrade, distanza o comportamento pubblico. Centro della fonte
non diventa selected-location e Best Over Budget non diventa Upgrade.

## Validazione, conseguenze e reversibilità

La prova sintetica deve raggiungere la policy con un caso completo, preservare le
lacune dei casi parziali e rifiutare identità, byte, significato o tempi errati.
Vuoto, applicazione ripetuta, ordine e integrità degli originali devono essere
deterministici. La parità precedente e i gate canonici sul candidato finale sono
necessari prima della pubblicazione. Le prove locali non sono dichiarate CI.
Il rapporto `docs/engine-v3/d0054-reviewed-evidence-appendix.md` descrive contratto,
API, esempi inventati, limiti e il minimo percorso futuro autorizzabile.

Validazione locale isolata: 76/76 nuovi test, 289/289 mirati, V3 2196/2196,
V2 196/196; lifecycle 530 PASS/17 skip preesistenti; security 29, release 101,
analytics 31, capacity 9, beta 4 PASS. TypeScript, build, analytics-beta, smoke
loopback 18 controlli e PowerShell 5.1 parse 13/13 PASS. I difetti di sviluppo
privacy condizionata e override dei metadati sono preservati prima/dopo; il primo
giro completo non è sostituito alla verifica finale. Nessuna CI o registry audit
di rete è dichiarato. Il rapporto documentale finale è risigillato senza cambiare
il codice e i test verificati. SHA e commit pendenti dopo il push sono registrati
nella consegna effettiva. Il consolidamento
è selettivo e non-force soltanto su `codex/evaluation-d0036-d0041`; main resta
invariato. Sette path esclusi, diciassette file D-0037 sigillati e tutti i materiali
privati restano protetti. Nessuna raccolta, misura reale, custodia o Golden.

La misura privata D-0053 e il relativo codice rimangono storici: questa fase non
li riesegue o rietichetta. Nessuna nuova prova reale è applicata. Eventuale ritiro
del raccordo richiede una modifica successiva esplicita, senza riscrivere cronologia
Git o artefatti privati.

Supersedes: nessuna evidenza o decisione precedente; estende prospetticamente il
solo ingresso diagnostico REVIEWED. Non modifica la Product Constitution.
