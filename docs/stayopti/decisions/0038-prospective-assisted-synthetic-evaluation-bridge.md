# D-0038 — Prova sintetica del raccordo prospettico e della revisione assistita

Data: 2026-09-06. Stato: implementazione evaluation-only da verificare e consolidare separatamente; nessun commit autorizzato.

## Autorità e perimetro

Implementa il piccolo collaudo dei §§4, 6 e 7 dell'audit finale integrato, identificato dallo ZIP SHA-256 `d9fa893952892e5a9d910c248b2ffde069f5aa722c4644affa9eab815774cf9f`.
Due casi interamente inventati: coppia, tre notti, cinque alternative; famiglia, sette notti, otto alternative. Nessuna offerta reale, engine execution, raccolta, API, Golden o qualifica esperto.

I 19 path preesistenti e tutti i file del sigillo D-0037 restano byte-identici. Per questo CURRENT_STATE e DECISION_LOG non vengono aggiornati incidentalmente: questa decisione nuova è il registro della fase, da indicizzare soltanto in un successivo consolidamento autorizzato. Nessun manifest associato alla custodia reale viene sostituito.

## Riuso e contratto

`prospectiveAssistedEvaluationV3.ts` usa wrapper Golden, hashing canonico e controlli manuali esistenti di UNKNOWN, pagamenti e condizioni. Un contratto setwise distinto conserva integralmente risposta e binding: non finge che SELECT/TIE/nessuna/dati insufficienti siano i task A/B GOLDEN_VALID del Golden P. Il renderer privato separato riprende schede, scenario, progressione e validazione locali, aggiungendo prove affiancate e tutte le alternative. Non entra nel bundle o nel runtime pubblico.

La custodia sintetica attraversa realmente il launcher D-0037: CodeManifest sintetico, Preflight, Import e Reopen, AES-256-GCM/Windows DPAPI CurrentUser. Ogni alternativa ha tre originali SVG sintetici leggibili, associati campo per campo e verificati byte per byte. Gli originali non sono screenshot di siti reali. Il nuovo manifest tecnico di test non modifica quello del pilot. Gli stati VERIFIED nella fixture sono affermazioni simulate, dichiarate tali anche nel descriptor: non attestano un browser reale.

Il runner crea solo nuove root `StayOpti-Synthetic-Review-*` sotto TEMP. Non accetta dossier, custodie reali o archivi arbitrari. Il launcher è Windows PowerShell 5.1, non pwsh. L'interfaccia usa esclusivamente loopback 127.0.0.1 con Host, Origin e token anti-CSRF; nessuna richiesta esterna o credenziale. I file compilati sono inventariati e ricontrollati prima della riapertura, insieme ai binding di input, archivio, descriptor, mappa, ricevuta, manifest e custodia.

## Sequenza e limiti temporali

Il piano scenario/selezione viene scritto esclusivamente, fsync, riletto e riconosciuto sul disco. Solo dopo questa sequenza è aperta l'osservazione e generata la prima offerta sintetica. Il riavvio non rigenera offerte o scenario. Modifiche al sigillo, file interrotti, eventi mancanti/duplicati o bytes compilati alterati sono rifiutati.

L'ordine locale prova il passaggio del software, non una certificazione temporale indipendente. observedAt UTC, datetime locale/IANA e finestra del set restano separati da importedAt/custodyStartedAt. leadTimeCalendarDays usa check-in locale meno data locale di osservazione; nessuna ora di check-in è inventata. Test di mezzanotte e DST impediscono di sostituire UTC o custodia a questa semantica. Nessuna attribuzione causale alla stagione.

## Revisione, comparabilità e risposta

Ogni campo richiede Corretto/Correggi/Non verificabile. Filtrare non approva. Il riepilogo mostra tutti i campi; conferma esplicita e impronta del contenuto sono registrate. Correzioni append-only conservano input e prove originali; invalidano il binding di giudizi precedenti e richiedono nuova revisione. La riapertura ricostruisce lo stato dagli eventi verificati, senza sovrascrivere la storia.

Trattamento, cancellazione/rimborsabilità, rating/scala/N, posizione, offerta e prezzo restano richiesti; servizio assente e UNKNOWN sono distinti. Copertura critica asimmetrica blocca il confronto. Un dato opzionale presente solo per alcune alternative resta disponibile in revisione ma non viene presentato come vantaggio comparativo: il confronto espone il marcatore di non comparabilità. Posizione testuale non diventa distanza numerica. Include tasse e costi non completa il breakdown fiscale. Prezzo pubblico precheckout non diventa bookability o totale checkout verificato.

La vista decisionale usa la proiezione canonica separata, ordine semantico non provider, label neutrali e nessun consiglio di motore. Le label non costituiscono una prova di cecità. La conoscenza dei dati, il riconoscimento del caso e la conoscenza di consigli AI sono tre esposizioni distinte; il revisore dei dati non può cancellare la propria esposizione. La risposta ha scelta, riferimenti, motivo strutturato, confidence 1–5, eventuale campo bloccante, versione, impronta e storico. Nessun testo libero nel giudizio.

Tutti i click della demo restano HUMAN_SIMULATION/sintetici. La categoria esposta è diagnostica, non giudizio umano reale, esperto o blind confermativo. Il demo non chiama V2/V3 e non implementa deblind. Il Golden P, i suoi validatori/ledger A/B e le relative soglie restano invariati e sottoposti a regressione.

## Uso minimo

Usare il launcher `scripts/invoke-prospective-assisted-evaluation-demo.ps1` da Windows PowerShell 5.1, con ExpectedHead e inventario hash consegnati nel pacchetto. Start prepara due fixture se la root non esiste; sulla stessa root riapre. PrepareOnly verifica senza server. Inspect verifica le fixture senza interfaccia. Non cambiare la root per riprendere.

Aprire soltanto l'indirizzo 127.0.0.1 stampato. Nessun JSON da modificare. Il pulsante di chiusura salva gli eventi già confermati e arresta il server; Ctrl+C non conferma un editor incompleto. Le fixture TEMP non sono un archivio durevole di dati reali e nessun risultato TEMP viene promosso come prova di custodia reale sul PC dell'utente.

## Passo successivo separato

Questa prova non abilita automaticamente il primo caso reale. Servono autorizzazione specifica, scenario approvato prima dell'osservazione, fonte/limiti e identità del caso, binding a una nuova custodia effettiva e qualificazione del feedback. Con Mattia unico revisore, il suo successivo giudizio resta esposto/diagnostico. Dopo quel caso misurare carico e problemi prima di autorizzare il lotto di dieci. Le 18 schede restano ricerca candidata; RC2 non equipara ascensore ad accessibilità, L-C1/L-C2 non trasformano risultati non significativi in assenza d'effetto, L03 richiede la rettifica bibliografica già documentata. Nessuna variazione di pesi o ranking.

## Riparazione D-0038-R1 — binding visualizzato e continuità, 2026-09-06

La revisione del primo pacchetto ha dimostrato tre difetti: il server costruiva
il binding delle azioni dalla propria versione corrente anziché da quella vista
dal client; l'esito «nessuna adeguata» richiedeva una violazione hard contraddetta
dall'eligibility; il rendering ricostruiva prova aperta e bozza decisionale.
Questa correzione è autorizzata soltanto sui componenti D-0038 e su fixture.

Ogni azione di revisione, correzione, conferma, esposizione e giudizio deve ora
trasmettere revisione e fingerprint mostrati. Il server li verifica prima di
qualsiasi evento: una versione obsoleta restituisce HTTP locale 409 senza
salvare né aggiornare automaticamente il binding. Occorre rileggere i progressi.
La singola azione «Non verificabile» su un dato noto valida prima le due
transizioni interne (correzione a UNKNOWN e revisione); non è un rebinding di una
richiesta obsoleta. Un'interruzione fra i due eventi non approva la correzione.

«Nessuna adeguata» significa che nessuna proposta giustifica il compromesso:
richiede TRADEOFF_NOT_JUSTIFIED, con dettaglio opzionale su un campo documentato
per tutto il set. Non impone una violazione inesistente. Pareggio e dati
insufficienti restano distinti; campi critici, vincoli essenziali e Golden non
vengono allentati.

La prova rimane aperta se caso, alternativa e riferimento sono ancora validi.
Le bozze nella pagina restano durante aggiornamenti non materiali. Se cambia
il contenuto, la bozza non viene inviata con il vecchio binding: un avviso
richiede rilettura e riesame esplicito, poi una nuova conferma. Le bozze non
confermate non sono giudizi persistiti e la loro conservazione nella pagina non
promette recupero dopo chiusura del browser. Le 85/136 conferme individuali
restano un limite dichiarato: nessuna approvazione automatica o di campi nascosti.

La prova regressiva passa dall'effettivo launcher PS5.1 all'API con due client,
verificando rifiuti e immutabilità degli eventi; la UI viene verificata anche
nel browser locale. Il nuovo pacchetto usa un inventario e una root sintetica
distinti. I progressi del vecchio codice non sono migrati o sovrascritti.
Risultati esatti e controlli effettivamente eseguiti sono nel report del nuovo
ZIP; il primo ZIP e D-0037 rimangono immutati. Nessun consolidamento Git.
