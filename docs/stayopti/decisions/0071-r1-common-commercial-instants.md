# D-0071 R1 / A02 — semantica temporale comune senza arrotondamento

Data: 2026-09-20. Base: `c3733cef02ba20d02214334eb936156491be218b`.
Approvatore: Mattia, correzione temporale A02 prima della chiusura del lotto.
Ambito: sintetico/evaluation-only; nessuna acquisizione o attivazione LIVE.

## Difetto riprodotto prima della correzione

`tests/engine-v3/fixtures/a02-temporal-before.json` conserva risultati, hash
del codice originale e manifest degli ingressi sintetici. La fixture è
`commercialPacket('synthetic-session@1')`, con `validUntil` sostituito in tutti
i record prima di risigillare gli originali. Tre preparazioni autentiche,
zero invocazioni kernel/policy; non dati di un'acquisizione privata.

| Scadenza futura | Prima: preparazione / binding | Dopo |
| --- | --- | --- |
| `2099-08-01T10:10:00.123Z` | SUPPORTED_AT_OBSERVATION / accettato | invariato |
| `2099-08-01T10:10:00.123000Z` | EXPIRED, PROVIDER_EXPIRY_INVALID / rifiutato | SUPPORTED_AT_OBSERVATION / verificato |
| `2099-08-01T10:10:00-00:00` | SUPPORTED_AT_OBSERVATION / accettato | INVALID, PROVIDER_EXPIRY_UNINTERPRETABLE / rifiutato |

Il comparatore R06 riportava già SAME_INSTANT per i primi due e
INSUFFICIENT_INFORMATION per l'offset sconosciuto. Il parser separato A02
accettava solo 1–3 decimali e assegnava i fallimenti sintattici alla scadenza.
Il primo run delle regressioni produce 111 PASS / 14 FAIL su 125 test:
110 controlli A02/R06 precedenti conservati, 15 nuove regressioni iniziali.

## Correzione e chiamanti effettivi

- Unica sorgente semantica `server/shared/explicit-instant.ts`: stessa grammatica
  R06 e comparatore storico, con ordinamento esatto e rappresentazione canonica
  aggiuntivi. Il `.mjs` è il suo artefatto ES2022 controllato byte per byte da un
  test tramite `typescript.transpileModule` (target/module ES2022, newline LF).
  Serve i consumatori JavaScript già esistenti, senza TypeScript a runtime o
  nuovi loader: compatibilità del backend Node 20 conservata. I consumer TS
  compilano la stessa sorgente con le configurazioni canoniche invariate.
- `commercialEvidenceV3.ts` riusa questa semantica per osservazione, verifica,
  valutazione, scadenza e recupero. Una scadenza valida anteriore a evaluatedAt
  è EXPIRED/PROVIDER_EXPLICIT_EXPIRY; a parità esatta di istante non è superata.
  Un timestamp non interpretabile è INVALID, con freshness UNKNOWN, non un fatto
  di scadenza accertata. Assenza di scadenza resta UNKNOWN, senza promozione TTL.
- `commercialTermsMeaningV3` e `boundCommercialEvidenceV3` preservano le frazioni
  significative nelle condizioni e nel binding effettivo alla decisione.
  Canonicalizzazione e confronto non riscrivono i timestamp originali.

La rappresentazione usa secondi interi e cifre frazionarie, non millisecondi
floating-point. Si eliminano soltanto zeri finali insignificanti; per ordinare
si pareggiano le lunghezze con zeri. `.123456788`, `.123456789` e `.123456790`
sono distinti. Gli offset espliciti, calendario, forme/minuti e limiti della
grammatica restano quelli R06. Nessun fuso è dedotto da `-00:00` o da una data
locale. Le condizioni non temporali e la tolleranza monetaria non cambiano.
Testi di cancellazione non interpretabili mantengono il confronto letterale
preesistente: non ricevono un certificato di equivalenza temporale.

## Compatibilità, limiti e salvaguardie

Il contratto strutturale A02 @1 resta valido; cambia la corretta interpretazione
temporale del nuovo percorso, identificata da questo checkpoint. I fingerprint
semantici ora includono l'istante canonico preciso, non il precedente numero di
millisecondi. Non si riscrivono assessment, ricevute o risultati storici e non si
rigenera un inventario di custodia. Il validatore legacy e il suo dispatch
rimangono byte-identici; CE ne verifica anche il digest congelato.

`DECISION_CHILD_AGE_BINDING_UNREPRESENTABLE` rimane operativo. L'estensione
familiare è un incarico distinto, non viene aggirata modificando la composizione.
Nessun peso, ruolo, soglia, fonte LIVE, protocollo acquisitivo o gate Golden cambia.
Gli esiti di preparazione non sono decisioni o astensioni del motore.

## Validazione e pubblicazione

Regressioni mirate finali: 128/128 PASS, incluse 18 nuove prove temporali,
58 A02 e 52 R06. Comprendono entrambi gli ingressi autenticati, binding/consumer
effettivo, uguaglianza e differenze sub-millisecondo, offset sconosciuto,
cronologia, originali immutati, build comune e regressioni legacy/famiglia.
Gli errori intermedi del candidato (controllo di cancellazione fuori perimetro
e risoluzione della dipendenza nel test) restano nei log; sono stati corretti
senza modificare fixture/assert storici. I gate completi del candidato finale
sono riportati nell'addendum seguente dopo esecuzione, non presunti.

Autorizzati soltanto commit selettivo e push non-force sul branch
`codex/evaluation-d0036-d0041` dopo PASS. Main, file protetti e materiali privati
non appartengono al commit. Risultati locali Windows distinti dalla CI GitHub;
nessun rollback o riscrittura della storia. Stato remoto verificato direttamente
nel rendiconto finale, non dedotto dalla copia origin/main.

### Gate finali osservati

Candidato isolato `4bccb8b3126d3dbb8f3846ff505217dd02ebaf12`, comando canonico
`npm.cmd run release:ci` eseguito da Windows PowerShell 5.1: exit 0.
V2 **242/242**, V3 **3230/3230**, lifecycle **665 PASS / 17 skip Valkey
preesistenti**, security 29, release 101, analytics 31, capacity 9, beta 4 PASS.
TypeScript, build, analytics-beta, audit dipendenze (zero vulnerabilità root e
server-production) e smoke locale 18 controlli PASS. Le regressioni R06 pubbliche
e i launcher sintetici Windows/CurrentUser sono inclusi; nessuna prova LIVE.
Il source/test tree pubblicato deve coincidere con questi hash; solo il presente
rendiconto Markdown è completato dopo il gate. Git whitespace e scansione mirata
segreti/artefatti privati sono verificati prima dello staging selettivo.

Il controllo di preservazione ha bloccato un'ipotesi iniziale che coinvolgeva
`tsconfig.tests.json`: originale ripristinato (hash, dimensione e timestamp)
prima dei test della correzione. Nessun manifest storico è stato aggiornato.
La soluzione finale non modifica configurazioni/runner sigillati. Conservati
anche gli errori del controllo esterno (nome cartella log con `:` e risoluzione
locale TypeScript), distinti da regressioni applicative; nessun test aggirato.
I 25 file protetti verificati comprendono sette esclusi, diciassette sigillati
D-0037 e una copia HTML privata preesistente. Tutti rimangono fuori dal commit.

Pubblicazione: autorizzata sul solo branch di lavoro; SHA locale/remoto,
staging e commit ancora locali vengono verificati direttamente dopo il push.
Le sole operazioni esterne dei gate sono audit del registry npm e Git remoto;
zero provider, acquisizioni, credenziali o decrittazioni private. Nessun esito
locale è presentato come CI GitHub.
