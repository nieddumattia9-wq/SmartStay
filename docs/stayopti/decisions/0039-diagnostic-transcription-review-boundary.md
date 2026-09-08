# D-0039 — Revisione diagnostica separata dalla demo sintetica

## Perimetro

Ingresso `stayopti.diagnostic-transcription-review@1`, evaluation-only, per la sola trascrizione browser-assisted. Non è importazione, custodia D-0037, giudizio, replay o Golden. Il renderer D-0038 conserva il comportamento sintetico predefinito; la capacità opzionale `transcriptionOnly` elimina i controlli decisionali. L'API indipendente ammette soltanto revisione del campo, correzione e conferma completa della trascrizione.

Le cinque osservazioni non attestano idoneità, rappresentatività o esaurimento dell'inventario. Il percorso non calcola preferenze. Conserva tipi, unità, differenze tra campo osservato e derivato e UNKNOWN case-insensitive. Rating numerico/strutturato e campi colazione/trattamento o cancellazione/rimborsabilità non vengono appiattiti né equiparati implicitamente. Ogni campo conserva il percorso originale, le prove e il limite. Non inferisce totali completi, scale, tasse, posti letto o uso esclusivo.

## Binding e persistenza

Archivio e materiali originali vengono verificati prima della preparazione privata; pacchetto normalizzato e codice effettivo hanno binding SHA-256 separati. Il launcher verifica i byte del codice e di Node prima di avviare il server. Le prove sono locali, allowlisted e ricontrollate prima della risposta. Nessuna URL sorgente viene aperta. L'ascolto è limitato a loopback con controllo Host, Origin e nonce anti-CSRF.

Ogni azione contiene revisione e fingerprint effettivamente mostrati; la verifica precede la scrittura. Eventi numerati, append-only, hash concatenati, file atomici e un solo proprietario del percorso impediscono sovrascrittura e sovrapposizione dei processi. Cambiamenti di codice/pacchetto rifiutano la ripresa: nessuna migrazione implicita. Un'interruzione non gestita lascia il lock e/o un pending: fermarsi, non rimuoverli automaticamente. Il journal non è cifrato: è materiale preparatorio privato autorizzato, non prova di custodia.

Le correzioni invalidano la conferma complessiva e richiedono una nuova verifica del campo. UNKNOWN verificato rimane UNKNOWN. Nessuna approvazione di campi nascosti; il conteggio effettivo delle conferme è visibile. Bozze e prove riusano la continuità R1; azioni obsolete non vengono ribindate automaticamente. Nessun riconoscimento/esposizione viene dedotto.

## Verifiche e limiti

Regressioni del renderer sintetico, nuova API con client concorrenti, rigetto dei binding obsoleti, integrità dei file, riapertura dello storico e vero launcher Windows PowerShell 5.1 con fixture sintetiche. Sul caso reale soltanto lettura e visualizzazione, nessuna azione umana simulata. Questo percorso non invoca DPAPI e non certifica il filesystem CurrentUser dell'utente.

Le prove temporali documentano orologio e log locali; né hash né dichiarazioni producono autenticazione indipendente o custodia retroattiva. Il log di congelamento e quello di osservazione restano distinti.

Documento dedicato: CURRENT_STATE e DECISION_LOG appartengono al baseline protetto di questa attività e non vengono modificati. Nessun dato reale in questo documento o nei test; nessun commit autorizzato.
