# StayOpti — Windows/PowerShell Runner Guardrails

Versione: 2026-08-15 — v1  
Stato: fonte operativa obbligatoria per le prossime chat StayOpti  
Ambiente dell'utente: Windows, repository locale `C:\Users\Mattia\SmartStay`, Windows PowerShell 5.1

## Scopo

Questo documento impedisce che patch, collector e runner StayOpti vengano costruiti per tentativi successivi sull'ambiente dell'utente. Deve essere letto prima di preparare qualunque nuovo ZIP operativo.

Il principio vincolante è:

> Prima si identifica e si prova il metodo di esecuzione corretto; soltanto dopo si prepara una patch. Un errore del runner non deve essere scaricato sull'utente attraverso versioni ripetute.

## Preferenze operative di Mattia

- Consegnare normalmente un solo ZIP operativo e un solo blocco PowerShell da copiare.
- Ridurre al minimo assoluto le operazioni manuali richieste.
- Distinguere sempre un errore del sito/repository da un errore introdotto dal runner dell'assistente.
- Dopo un fallimento non inviare subito una nuova versione: prima fare causa radice, audit e controllo regressivo.
- Se lo stato reale del repository differisce da quello atteso, fermarsi e raccogliere Evidence; non indovinare.
- Non effettuare chiamate provider, booking, pagamento o deploy se non sono esplicitamente previste e dichiarate.

## Baseline Golden nota

- Engine V2 è il motore pubblico e deve restare protetto.
- Baseline Source Audit del 2026-08-14: Engine V2 `196/196 PASS`, typecheck PASS, build PASS, working tree pulito.
- La fase V3-17G ha chiuso correttamente il resume del Golden live batch con 9 ricevute cumulative.
- La diagnosi/repair V3-17H e V3-17I non ha prodotto una patch valida; l'ultimo HEAD osservato negli Evidence V3-17I v5 era `69df77e042cffa8e1f351b3429fdc1c2cb394dd2`, invariato prima/dopo.
- Prima di usare questi valori in futuro bisogna comunque verificare HEAD, branch e working tree correnti.

## Incidenti da non ripetere

### V3-17H — errore di raccolta PowerShell

Sintomo: `COLLECTOR_ERROR: Tipi di argomento non corrispondenti`.

Lezione: non usare collezioni .NET, `AddRange`, overload o conversioni implicite non provate su Windows PowerShell 5.1. Preferire array PowerShell semplici, parametri espliciti e serializzazione elementare.

### V3-17I v1 — assunzione non verificata su tsx

Lezione: non presumere posizione, disponibilità o forma di invocazione di `tsx`. Rilevare prima `node`, `npm`, eventuale `node_modules\.bin\tsx.cmd`, package scripts e dipendenze installate.

### V3-17I v2 — stderr Git mescolato ai percorsi

Lezione: con `$ErrorActionPreference = 'Stop'`, Windows PowerShell 5.1 può trattare stderr dei comandi nativi come `ErrorRecord`. Separare o normalizzare stdout/stderr e controllare sempre `$LASTEXITCODE`. Non usare l'output diagnostico come elenco di file.

### V3-17I v3 — parser fragile del riepilogo Node

Lezione: non dedurre PASS/FAIL da testo libero, conteggi parziali o regex dipendenti dalla versione. Quando possibile usare exit code più output strutturato; prima di applicare una patch validare il parser con fixture PASS, FAIL, skip e output misto.

### V3-17I v4 — ambiente ESM/CommonJS sbagliato

Sintomo: due test V2 fallivano con `ReferenceError: require is not defined in ES module scope`, mentre provider test e V3 passavano.

File coinvolti:

- `providerHotelTypeIntegrationV2.test.ts`
- `reviewCountProvenanceV2.test.ts`

Lezione: non correggere il test o iniettare loader prima di aver letto `package.json`, tutti i `tsconfig`, gli script npm, gli helper del repository e i due file completi. Il fatto che una suite parziale funzioni non prova che il comando riproduca la baseline Golden V2.

### V3-17I v5 — quoting Windows errato in NODE_OPTIONS

Sintomo: il percorso dello shim passato a Node perdeva tutti i backslash:

`C:\Users\Mattia\...` diventava `C:UsersMattia...`

Node non poteva quindi caricare lo shim. Era un errore del runner dell'assistente, non del sito.

Lezione: non inserire un percorso Windows quotato in `NODE_OPTIONS` senza una prova reale nello stesso ambiente. Non usare `NODE_OPTIONS` come correzione improvvisata del test runner. Un controllo locale Linux non convalida quoting, `.cmd`, stderr o semantica di Windows PowerShell 5.1.

## Protocollo obbligatorio prima di un nuovo runner

1. Leggere questa fonte e gli Evidence dell'ultimo tentativo.
2. Verificare branch, HEAD, working tree, staged diff e unstaged diff.
3. Rilevare versioni e percorsi reali di PowerShell, Git, Node, npm e tsx.
4. Leggere `package.json`, lockfile, tutti i `tsconfig`, configurazioni test e script/helper già presenti.
5. Per problemi V2 leggere integralmente i test interessati e le loro catene di import.
6. Identificare il comando canonico già previsto dal repository. Non inventare un secondo ambiente di esecuzione.
7. Se il comportamento dipende da Windows, non considerare sufficiente una prova fatta soltanto su Linux.
8. Validare separatamente quoting, gestione stderr, exit code e parser prima di includerli nel runner operativo.
9. Eseguire prima un preflight non mutante. Se fallisce, nessuna patch deve partire.
10. Applicare modifiche soltanto con HEAD atteso e working tree nello stato previsto.
11. Dopo la modifica eseguire test regressivi mirati, suite completa richiesta, typecheck/build quando pertinenti e `git diff --check` più `git diff --cached --check`.
12. Commit/push soltanto se autorizzati dal pacchetto e dopo PASS completo.
13. Verificare nuovamente HEAD e working tree alla fine e dichiarare in Evidence qualunque mutazione.

## Regole PowerShell 5.1

- Usare sintassi compatibile con Windows PowerShell 5.1, non solo PowerShell 7.
- Preferire file ASCII o UTF-8 controllato; evitare caratteri invisibili e quoting multilivello non necessario.
- Per eseguibili `.cmd`, usare il percorso risolto e argomenti separati; evitare una command-line monolitica costruita come stringa.
- Non usare `Invoke-Expression`.
- Non usare `npx` se potrebbe installare dipendenze; preferire il binario locale già presente.
- Non impostare globalmente `NODE_OPTIONS`, `PATH` o variabili del profilo utente.
- Salvare e ripristinare ogni variabile di processo temporaneamente modificata.
- Controllare `$LASTEXITCODE` dopo ogni comando nativo importante.
- Non chiamare `.Trim()` o altri metodi su valori potenzialmente `$null`.
- Evitare overload .NET ambigui e collezioni tipizzate non necessarie.
- Scrivere Evidence fuori dal repository, preferibilmente sotto `%TEMP%`, e creare il solo ZIP finale in Downloads.

## Criterio di stop

Non chiedere a Mattia di eseguire una nuova versione se manca anche una sola di queste condizioni:

- causa radice specifica e dimostrata;
- differenza chiara tra errore applicativo ed errore del runner;
- metodo di invocazione coerente con i file reali del repository;
- preflight progettato per fallire prima di qualunque patch;
- verifica che il pacchetto non introduca una variante già fallita;
- spiegazione breve di cosa verrà eseguito e di cosa resterà escluso.

Se una correzione richiede ancora supposizioni sull'ambiente, preparare un collector read-only e fermarsi.

## Stato del comando canonico Engine V2

Il comando esatto che riproduce la baseline Golden V2 sul PC Windows deve essere ricavato dall'Evidence del collector V3-17J. Fino a quel momento non è autorizzato inventare loader, shim o nuove combinazioni di flag.

Quando l'audit sarà completato, aggiornare questa sezione con:

- comando canonico completo;
- percorso dell'eseguibile realmente usato;
- versioni Node/npm/tsx;
- package script o helper di origine;
- comportamento ESM/CommonJS verificato;
- risultato del preflight read-only.

## Checklist per la prossima chat

La nuova chat deve dichiarare esplicitamente, prima di produrre un runner:

- di aver letto questa fonte;
- quale Evidence più recente ha analizzato;
- quale causa radice sta correggendo;
- perché il nuovo metodo non ripete V3-17H o V3-17I v1-v5;
- quali azioni sono read-only e quali mutano il repository;
- quali chiamate esterne sono possibili;
- quale condizione interrompe il runner prima della patch.

In assenza di queste dichiarazioni, il runner non è pronto per essere consegnato.
