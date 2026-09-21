# D-0073 R1 — titoli, esenzioni e condizioni indipendenti

Base verificata: `33df2d9632dcda3de79e36c44f805d659a2c0355`.
Riparazione evaluation-only richiesta da Mattia, senza acquisizioni, nuova
preparazione privata o binding reale. Il rapporto e la misura D-0073 originali
restano associati al codice con cui furono prodotti.

## Controesempi prima della correzione

Tre test attraverso `prepareAuthenticatedHistoricalCommercialV3`, con nuovi
journal cifrati interamente inventati, falliscono sul checkpoint precedente:

| Prova sintetica | Prima | Risultato richiesto |
|---|---|---|
| `childAllowed=true`, titolo `Children and extra beds`, contenuto `No rollaway/extra beds available` | Ammissione UNKNOWN per il solo titolo | Titolo informativo; ammissione SUPPORTED; divieto dei letti extra conservato, inventario esistente indipendente |
| `Service animals are exempt from fees/restrictions.` | Costo UNKNOWN per presunto onere | Esenzione limitata al soggetto indicato, non costo generale; controllo completo resta SUPPORTED |
| `Pets are allowed, and a mandatory service fee is payable by all guests.` | Costo SUPPORTED; quota generale assorbita dal token pets | Clausole distinte; costo UNKNOWN perché onere obbligatorio non quantificato |

Esito iniziale: 0 PASS / 3 FAIL per le tre asserzioni sostanziali, non per
infrastruttura. Input, log ed exit code sono conservati nell'evidence locale R1.

## Correzione circoscritta

L'adattatore storico passa esplicitamente a `@1.1`; la classificazione delle
condizioni espone `stayopti.historical-property-conditions@1.1`. Il contratto
matrice @1 mantiene compatibilità additiva con un dettaglio opzionale di
interpretazione. Nessuna modifica ad A02, ranking, letti o regole monetarie.

- Etichette nominali complete e codici di sezione sono conservati come titoli,
  non dichiarazioni mancanti. Il nome del campo non basta a neutralizzare una
  restrizione: anche un campo `name` con `Children are not allowed` resta contenuto.
- Le esenzioni inglesi esplicite di service/assistance animals da fees, charges
  o restrictions sono riconosciute soltanto nella grammatica completa dichiarata.
  Non diventano esenzioni degli ospiti o degli animali ordinari. Negazioni,
  condizioni e forme non supportate restano incerte, senza conferma fittizia.
- Congiunzioni/separatori sono divisi soltanto davanti a clausole indipendenti
  riconoscibili, conservando il testo completo. Un antecedente if/when/unless
  non viene rimosso. Uno scope monetario composto non risolto resta UNKNOWN,
  anziché sparire perché la frase contiene pets.
- HTML è interpretato dal lettore inerte esistente. Ogni condizione conserva
  puntatore, hash, tempo, scope e campo originale, oltre alla clausola interpretata.
  Nessun testo viene eseguito e nessuna condizione nascosta viene eliminata.

## Verifiche e limiti

Regressioni positive/negative attraverso journal autenticati sintetici:
titoli e contenuti, negazioni e condizioni, esenzioni circoscritte, oneri
indipendenti in entrambi gli ordini, HTML, dati originali/provenienza immutati,
altre offerte indipendenti e zero kernel/policy.
Risultati locali Windows osservati:

| Verifica | Risultato |
|---|---|
| Tre controesempi iniziali | 0/3 PASS prima; 3/3 PASS dopo |
| Estensione mirata + regressioni D-0073 | 59/59 PASS sul primo candidato corretto |
| Ulteriore obbligo `must be paid` | FAIL riprodotto, poi PASS; il caso resta nella suite |
| Gate V3 canonico sul candidato definitivo | 3322/3322 PASS, zero skip; comprende 27 nuove regressioni e le 33 D-0073 |
| V2 canonico | 242/242 PASS |
| TypeScript e build | PASS |
| Windows PowerShell 5.1 / DPAPI CurrentUser | PASS su fixture sintetiche, incluso nel gate V3 |

Il candidato isolato definitivo è `54dfae4183769ccb1f32212dd5a3ffbabe4bc0cb`:
nessun input escluso o privato nel checkout. V2/typecheck/build erano già PASS
su `ed1c252c27ccbe228d8a4034ef6a0ac851326d0b`; il solo delta software successivo
è l'aggiunta di `must` al fallback prudenziale mjs e della relativa regressione.
I sorgenti/dipendenze/configurazioni dei gate invariati sono verificati per hash;
il V3 completo è rieseguito sul candidato definitivo, non riattribuito.
Il controllo aggiuntivo impedisce di dipendere soltanto dalle parole mandatory
o compulsory. Se lo scope resta ambiguo, non quantifica né applica l'onere:
mantiene UNKNOWN invece di confermare il costo completo.

Log, exit code e hash dei fallimenti iniziali e dei gate finali sono conservati
separatamente. Nessuna asserzione indebolita. 25 file protetti e modifiche estranee
preservati, staging vuoto, diff whitespace PASS. Nessuna chiamata esterna,
nessuna CI GitHub dichiarata, nessuna nuova preparazione privata. Il gate completo
release:ci/audit non è rieseguito o dichiarato per questa revisione locale: non
viene eseguita alcuna pubblicazione.

Grammatica intenzionalmente limitata: nessun interprete linguistico generale,
nessuna attestazione di animali al seguito, adempimento o costo pagabile.
Le prove insufficienti rimangono tali. Nessuna nuova applicazione alla matrice
privata storica: il prima/dopo qui riguarda esclusivamente fixture sintetiche.
Commit/push non eseguiti in questa revisione; checkpoint di partenza invariato.

## Consolidamento conclusivo autorizzato — 2026-09-21

La successiva istruzione di Mattia autorizza commit selettivo e push non-force
soltanto su `codex/evaluation-d0036-d0041`. Le indicazioni di mancata pubblicazione
sopra descrivono la precedente fase locale e non vengono riscritte.

I sei file iniziali coincidono per SHA-256 con la ricevuta di quella fase.
Adapter, contratto e test coincidono anche byte per byte con il candidato
isolato `54dfae4183769ccb1f32212dd5a3ffbabe4bc0cb`, figlio di `33df2d9`.
Il checkout di prova non include i file locali esclusi; non viene pubblicato il
suo commit tecnico. Il commit di consegna contiene lo stesso software e gli
aggiornamenti di rendicontazione seguenti, non un nuovo comportamento.

### Inventario selettivo

| File | Contenuto |
|---|---|
| `scripts/liteapi-historical-commercial-v1.mjs` | Qualificazione circoscritta di titoli, esenzioni e clausole indipendenti; traccia originale |
| `src/engine-v3/contract/historicalCommercialEvidenceV3.ts` | Dettaglio interpretativo opzionale e additivo |
| `tests/engine-v3/v3HistoricalPropertyConditions.test.ts` | 27 regressioni attraverso il preparatore autenticato sintetico |
| `docs/stayopti/decisions/0073-r1-scoped-property-conditions.md` | Decisione, controesempi, risultati e limiti |
| `docs/stayopti/CURRENT_STATE.md` | Checkpoint operativo documentato |
| `docs/stayopti/DECISION_LOG.md` | Registrazione append-only della correzione e del consolidamento |

### Gate di pubblicazione effettivamente eseguiti

Il comando completo richiesto da D-0035 mancava nella precedente fase locale:
viene eseguito adesso, non sostituito da un insieme parziale di test già verdi.

| Verifica locale Windows sul candidato isolato | Esito |
|---|---|
| `npm.cmd run release:ci` | PASS, exit 0 |
| `npm.cmd run audit:security`, separatamente | PASS; zero vulnerabilità root/all e server/production |
| V2 / V3 nel release gate | 242/242 e 3322/3322 PASS, zero skip |
| Lifecycle | 665 PASS, 17 skip Valkey opt-in preesistenti, zero fail |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript / build / gate analytics-beta | PASS |
| Smoke locale | 18 controlli PASS |
| Parsing Windows PowerShell 5.1 | 17/17 PASS |
| Creazione e verifica manifest, SHA candidato esplicito | PASS; nessun deploy |
| Perimetro, scansione diff per segreti/materiali privati, whitespace | PASS; sei file, nessun materiale privato aggiunto |

Il primo comando aggiuntivo di verifica del manifest aveva indicato come root
la cartella del manifest anziché il checkout contenente `dist`: errore ENOENT
del runner, dopo parsing e creazione già riusciti. Il log è conservato; il
controllo con root corretta passa. Nessun file applicativo o test è stato
modificato per questo errore. Gli esiti iniziali dei controesempi restano
separati: SHA-256 stdout dei tre FAIL
`122b34912dc14ba796f5ae593ec8285adfc439ce060f0f7cae1b14c1ab52b179`,
del caso aggiuntivo must-be-paid
`5ffb5bdcd91f8923a3f29d733c3885e096afcde53f3980ad18cd36f94781fdf8`.

Le sole chiamate esterne della validazione sono gli audit dipendenze; quelle
del consolidamento sono le operazioni Git autorizzate. Nessun provider,
acquisizione, preparazione privata, binding reale o motore su dati privati.
I test canonici comprendono le loro esecuzioni sintetiche preesistenti:
non sono una misura privata né una CI GitHub.

Restano preservati 25 file protetti, modifiche estranee e i quattro output della
precedente preparazione privata verificati per hash. Quest'ultima **non è stata
ricalcolata con R1**. Nessuna migrazione di ricevute, inventari o scadenze.
Il rapporto di consegna registra SHA locale/remoto, push e commit pendenti dopo
lettura diretta del remoto; il PASS locale da solo non attesta sincronizzazione.
Main resta fuori dal refspec. La grammatica rimane intenzionalmente limitata e
non certifica applicabilità o importo degli oneri irrisolti.
