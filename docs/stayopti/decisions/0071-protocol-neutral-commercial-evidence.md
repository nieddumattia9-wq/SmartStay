# D-0071 / A02 — evidenza commerciale indipendente dal protocollo

Data: 2026-09-20. Decisione di prodotto approvata esplicitamente da Mattia.
Base della seconda modifica: `1bc9af7ec9f5cef49364a925b0561bb38ad464f0`
(A01); base comune della richiesta: `fdca9e3457cfe1bf9757dfe092e47362627733be`.
Perimetro: prima integrazione evaluation-only, esclusivamente sintetica.

## Prima e dopo

Il controesempio conservato in `tests/engine-v3/fixtures/a02-historical-counterexample.json`
proviene dall'esecuzione del validatore effettivo sul checkpoint iniziale:
stessi importi e stessa decisione, `rates-prebook-get-prebook` verified,
`search-quote-verification` failed; mancanza di prova unverified, incremento
di un euro e divergenza del recupero failed. Non si risolve rinominando la literal.

Ora esiste un ingresso separato, con versione esplicita, che autentica tutti
gli originali prima di interpretarli, costruisce fatti comuni e li qualifica.
Una ricerca seguita da una verifica commerciale può soddisfare gli stessi
requisiti della sequenza ricerca/creazione sessione/recupero, quando i fatti
documentati coincidono. Il recupero resta un evento di lettura, non una
seconda verifica né un rinnovo della validità commerciale.

## File, responsabilità e chiamanti raggiunti

| Componente | Responsabilità |
| --- | --- |
| `contract/commercialEvidenceV3.ts` | Contratto `stayopti.offer-commercial-evidence@1`, validazione semantica pura, riuso `createStayOfferIntegritySnapshotV3` e relativo validatore. Nessun nome di endpoint/provider. |
| `evaluation/syntheticCommercialProtocolsV3.ts` | Due ingressi wire supportati, verifica SHA-256 di manifest e byte originali, normalizzazione, preparazione immutabile. |
| `evaluation/boundCommercialEvidenceV3.ts` | `stayopti.bound-commercial-evidence@1`, binding verificato a decisione/soluzione/offerta/scope/condizioni/importi; non accetta copie di un oggetto o flag costruiti dal chiamante. |
| `orchestrator/independentDecisionEngineV3.ts` | Dispatch esplicito verso nuovo validatore oppure validatore storico, consumato da safety e shadow indipendente effettivi. |
| `evaluation/realCaseBlindReviewV3.ts` | Rifiuto esplicito della nuova origine sintetica: non diventa una fonte reale blind/Golden. Percorso storico invariato. |

Nessun indice pubblico, mapper LIVE, trasporto, launcher o contratto storico
di acquisizione cambia. Non si abilita V3 sul sito. Il nuovo ingresso non
accetta una risposta LIVE etichettata come fixture.

## Contratti e prove

Il packet `synthetic-commercial-packet@1` include origine SYNTHETIC_ONLY,
profilo, scope atteso, evaluatedAt, record id/operazione/capturedAt/body/SHA-256
e manifest SHA-256 dell'intero contenuto (senza il campo digest stesso).
Le hash verificano integrità, non provenienza da un provider reale o verità.
I profili sono protocolli **inventati e dichiarati**, non documentazione LiteAPI:

- `synthetic-session@1`: SEARCH, CREATE_SESSION, READ_SESSION; record `data`,
  importi maggiori in `price.amount`, `status`, sessionId e verificationRecordId.
- `synthetic-attested-quote@1`: LIST, VERIFY; record `quote`, importi minori
  interi in `money.minor` (contratto sintetico a due decimali), `verdict`.
  Nessuna sessione o GET richiesta per questo protocollo.

Entrambi portano scope completo, condizioni, componenti, osservazioni contrarie,
tempi e valore `enumerated-all-compulsory-stay-charges` soltanto quando la
risposta del protocollo sintetico dichiara un elenco esaustivo. Il normalizzatore
non inferisce tale completezza da un prezzo, lista vuota, hash, esito HTTP o
flag del consumatore. Dati omessi diventano UNKNOWN dove rappresentabili;
contenitori non supportati sono rifiutati prima della preparazione.
Metadati aggiuntivi irrilevanti e formattazione non cambiano i fatti, ma
rimangono nei byte originali con digest diversi. Errori e osservazioni contrarie
in tutti i record sono consumati, senza selezione dei soli fatti favorevoli.

Scope comune: identità opache struttura/offerta/versione/camera, soggiorno,
adulti, età bambini, unità, valuta. Ogni evento deve corrispondere esattamente;
gli ID del protocollo non entrano nel merito della struttura. Una componente
mantiene categoria, obbligatorietà/opzionalità/deposito, inclusione/esclusione,
base totale-soggiorno-per-tutti-gli-ospiti, valuta e pagamento in struttura.
Solo componenti obbligatorie escluse, quantificate e nella stessa valuta,
si sommano; extra opzionali e depositi non vengono sommati. Nessun cambio valuta.
Tasse e fee restano distinte nella proiezione canonica.

Il nucleo confronta prezzo, valuta e condizioni senza alterare i pesi o i ruoli.
La soglia monetaria è la stessa del percorso storico: 0,02. Aumento oltre
soglia, condizioni mutate, indisponibilità e divergenza del recupero non
producono verifica positiva. Il binding non modifica l'importo della decisione.
Una scadenza esplicita scaduta blocca; scadenza mancante = UNKNOWN, mai TTL
interno promosso a garanzia provider. `SUPPORTED_AT_OBSERVATION` non significa
disponibilità corrente garantita.

## Separazione delle fasi e compatibilità

`prepareSyntheticCommercialEvidenceV3` non invoca motore/policy e restituisce
originali autenticati, fatti e assessment. Lo stato può essere INVALID,
INCOMPLETE, CONFLICTING, EXPIRED o SUPPORTED_AT_OBSERVATION. Un arresto o
assessment negativo non è un'astensione del motore. Le preparazioni sono
immutabili; copie serializzate non sono certificazioni riutilizzabili: occorre
riautenticare gli originali tramite lo stesso ingresso, non migrare ricevute.

Il factory di binding esige una preparazione emessa dall'ingresso supportato,
la rivalida e confronta il risultato con decisione, scope, offerta selezionata,
snapshot di camera/trattamento/cancellazione, costo e componenti fiscali già
note. Il consumatore verifica
nuovamente il binding. Solo dopo si attraversa il consumatore shadow reale,
che esegue autonomamente il V3 e il replay deterministico. Non vengono
accettati booleani `verified=true` o callback di fiducia del chiamante.

Il vecchio payload mantiene esattamente chiavi, literal, fingerprint e regole.
`deriveLegacyBoundPublicRateConsistencyV3` conserva il corpo originale:
SHA-256 con LF `a09ca79bf4aa1877861cd4e9d5214f9074562d5efbe7752b5c80eda8779495d9`.
Un test verifica questa identità oltre alle regressioni storiche. Un vecchio
documento non viene reinterpretato come prova comune; la nuova versione non
può essere ottenuta cambiando il nome di una proprietà.

## Limiti espliciti e passo successivo

- I due ingressi sono sintetici. Nessuna firma/provider LIVE autenticato è
  simulata come reale; per aggiungerne uno servono adattatore qualificato e
  verifica delle sue evidenze, non un cambio di etichetta.
- Il DTO storico della decisione conserva il numero, non le età dei bambini.
  La preparazione conserva/confronta le età, ma il binding familiare restituisce
  `DECISION_CHILD_AGE_BINDING_UNREPRESENTABLE`. Non modifica il gruppo né lo
  riduce a soli adulti. Un successivo raccordo decisionale esplicito è necessario.
- Versione offerta e roomId sono vincolati tra originali autenticati; la
  decisione storica espone offerId e snapshot, non quei due identificativi.
  La corrispondenza verificata al consumer riguarda identità e fatti che esso
  effettivamente conserva, senza attestare la presenza di campi inesistenti.
- Restrizioni aggiuntive non rappresentabili nel DTO sono rifiutate nel binding.
  Pagamento noto nella prova ma non nella decisione non viene ignorato.
- I bundle reali blind/Golden rifiutano questa origine sintetica. Nessuna nuova
  ammissione, robustezza completa, prova di mercato o autorità umana è implicita.

Il passo successivo non è una nuova acquisizione: decidere e verificare il
raccordo di un produttore reale e l'eventuale estensione del contesto decisionale
per età/versioni/roomId, senza alterare i documenti storici.

## Verifica locale

58 regressioni mirate PASS sul candidato Windows compilato con la configurazione
ufficiale: ingressi equivalenti, consumatore shadow reale, invarianti, negativi,
contraffazione, tempi, componenti e dispatch storico. CE02 esegue due shadow
reali (uno per protocollo), ciascuno con creazione V3 e replay; la preparazione
resta a zero invocazioni. Nessuna esecuzione privata. Il candidato isolato finale
`47e3bdc72420ef68570fbbf4a4d3080d9a5c6482` supera `release:ci` eseguito tramite
Windows PowerShell 5.1: V2 242/242, V3 3212/3212, lifecycle 665 PASS / 17 skip
Valkey preesistenti, security 29, release 101, analytics 31, capacity 9, beta 4.
TypeScript, build, analytics-beta, audit dipendenze e smoke locale PASS. Il gate
comprende i launcher sintetici reali Windows/DPAPI, non una prova Linux sostitutiva.
Risultati locali, non GitHub CI. I primi errori di firma/types del test sono stati
corretti prima dei gate; nessuna asserzione è stata allentata. Le verifiche dei
candidati intermedi sono conservate e non attribuite al candidato finale.

Riproduzione: `npm.cmd run test:engine-v3` (runner ufficiale, include i test CE)
e `npm.cmd run release:ci` per tutti i gate, su checkout pulito senza i file
privati/esclusi. Il software e i test consolidati sono byte-identici al candidato
verificato; soltanto il rendiconto Markdown viene completato dopo i gate.
Pubblicazione autorizzata esclusivamente sul branch di lavoro, con verifica
diretta successiva dello SHA remoto e dei commit ancora locali. Nessun deploy.

Durante la revisione dello sviluppo è stato conservato un ulteriore controesempio:
24 di tasse incluse nella decisione e 29 nella prova, a totale invariato, erano
accettati dal primo binding candidato. Il test effettivo ha riprodotto il problema;
il binding finale rifiuta `DECISION_COST_COMPONENT_MISMATCH`. La fixture positiva
ora conserva esplicitamente le 24 tasse note, anziché ometterne il dettaglio.
Nessuna soglia o asserzione precedente è stata indebolita. Le nuove regressioni
coprono anche componenti equivalenti con ID/ordine diversi e istanti espliciti
di cancellazione equivalenti fino al consumatore finale.
