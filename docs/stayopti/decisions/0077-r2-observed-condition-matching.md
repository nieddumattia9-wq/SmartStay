# D-0077 R2 — confronto REQUOTE per condizioni osservate (@1.3)

Data: 2026-09-29. Candidato **locale**, base
`d4f97d784a329de2bf8d01aa7c2dfce894304f50`, branch
`codex/evaluation-d0036-d0041`. Nessun commit/push autorizzato in questo lotto.

## Prima / dopo

Controesempio interamente inventato: tre tariffe della stessa camera, una
sola equivalente per trattamento e cancellazione. Il vecchio @1.2 risponde
`NEW_OBSERVATION_MATCH_MISSING_OR_AMBIGUOUS` prima di confrontare le condizioni.
Assert iniziale fallito e documenti originali sintetici conservati in
`%TEMP%/stayopti-d0077-r2-20260929/before-counterexample.json`.
RC01 conserva il comportamento precedente come regressione permanente.

| Ingresso sintetico | @1.2 | @1.3 |
| --- | --- | --- |
| Tre varianti, una equivalente | STOP per tre camere coincidenti | Una corrispondenza osservata; poi controlli monetari e prebook |
| Nessuna / due equivalenti | STOP | STOP, indipendentemente dal prezzo |
| Una equivalente e una potenzialmente equivalente ma incerta | STOP | STOP con incertezza esplicita, non esclusione silenziosa |
| Trattamento certamente diverso, tempo cancellazione non interpretabile | Non arriva al confronto se più varianti | Differenza indipendente documentata; tempo irrisolto conservato |
| Unica equivalente ma prezzo sotto / sopra il target | STOP | STOP prima del prebook, senza aggiustamento del margin |

## Meccanismo e perimetro

Opt-in `stayopti.liteapi-ssp-probe@1.3`. @1, @1.1 e @1.2 conservano il
dispatch precedente, senza migrare piani, sigilli o ricevute. Nessun valore
predefinito cambia versione. Il nuovo modulo è incluso automaticamente dalla
chiusura ricorsiva dell'inventario esistente; non è stato rigenerato alcun
inventario operativo o storico.

1. Autenticazione/integrità e decoder esistenti restano a monte. Identità,
   camera mappata e occupazione devono essere qualificabili. Un record malformato,
   duplicato, incoerente o con camera ignota resta nella traccia come irrisolto.
2. Si conserva l'intera proiezione di condizioni precedente. Il comparatore R06
   resta quello effettivo, con istanti espliciti equivalenti e precisione integra.
   Si espongono inoltre boardType e condizioni di pagamento/restrizioni ai
   rispettivi ambiti tariffa, offerta e struttura: non si sostituisce un ambito
   con un altro. Commissioni, retail, SSP e target non sono criteri di selezione.
3. La qualificazione circoscritta distingue differenze osservate interpretabili
   da campi mancanti, null, UNKNOWN, forme non supportate e tempi ambigui.
   Una differenza certa in un campo indipendente può escludere la variante;
   l'incertezza resta comunque registrata. Se non esiste una differenza certa,
   una variante irrisolta impedisce di dichiarare unica quella restante.
4. Solo una variante equivalente e nessuna potenziale concorrente irrisolta
   permette il passaggio ai controlli monetari. La traccia contiene tutti i
   candidati, errori primari/secondari, termini confrontati, differenze,
   incertezze, puntatori, hash richiesta/risposta, istante e binding originale.
5. SSP R1 resta distinto in entrambe le fonti; un centesimo resta una discrepanza
   ammessa soltanto nello scope @1.2 già previsto. Il massimo è una proposta
   locale, non un nuovo SSP provider. Nessuna tolleranza sul prezzo sotto una
   soglia; target esatto, stabilità di entrambe le soglie e controlli prebook
   rimangono separati. Si invia soltanto il token della variante della nuova
   risposta, senza certificare continuità con il vecchio token.

La stessa qualificazione di condizioni è usata nel successivo confronto
prebook, evitando un secondo confronto incoerente. Trasporto, journal,
custodia, prompt e limiti 1/1/1 sono riutilizzati senza modifiche.

## Informazione mancante e limiti della grammatica

È equivalenza delle **condizioni osservate**, non attestazione di completezza:
campi opzionali assenti su entrambi i lati restano elencati come mancanti.
Una transizione presente/assente è irrisolta, non una differenza commerciale
inventata. Trattamento e cancellazione devono essere interpretabili per
certificare la corrispondenza. NRFN e RFN, con finestra RFN documentata, sono le
forme considerate; una finestra priva di offset non riceve un fuso inventato.
Testi e restrizioni sono conservati e confrontati, non trasformati in consenso.
Non è un interprete universale delle condizioni: campi sconosciuti rilevanti,
forme non supportate e differenze non risolvibili richiedono STOP.
Il confronto non certifica imposte complete, camera adeguata, checkout, futura
disponibilità, continuità commerciale o ammissione A02.

## Verifiche realmente eseguite

Copia isolata del checkpoint più i quattro file software/test candidati;
nessun lavoro estraneo importato nel candidato. Windows PowerShell
5.1.26100.9444, Node v24.18.0:

- Compilazione completa con il compilatore locale e `tsconfig.tests.json`: PASS.
- Test compilati ufficiali delle tre suite SSP precedenti più la nuova:
  **148/148 PASS**, zero skip (49 nuove prove, 99 regressioni).
- `tsc -b --force` e `npm.cmd run build`: PASS.
- Launcher reale Inventory → Preflight → Simulate @1.3, con trasporto loopback
  sintetico e DPAPI CurrentUser: PASS. Tre tentativi, uno per tipo; replay
  autenticato uguale, token esatto, zero chiamate provider/kernel/policy.
- Sei permutazioni, zero/due corrispondenze, dati incerti/contraddittori,
  pagamento nei diversi ambiti, tasse, occupazione, cancellazione, corruzione,
  prezzi sotto/sopra target e SSP, scadenze: PASS.
- **33 confronti di output storico** (@1/@1.1/@1.2, preparazione/REQUOTE/prebook)
  contro il sorgente del commit base: identici; nessun materiale reale usato.
- Diff/staging e preservazione: inventario finale separato con hash effettivi.

Fallimenti intermedi conservati, non occultati: sandbox `EPERM realpath`
(116/140), ownership Git del checkout temporaneo (137/140), poi una query
`timeout` omessa dalla nuova fixture HTTP (147/148). Corretto il runner soltanto
nel processo di test e il messaggio simulato secondo la richiesta reale; nessun
controllo del launcher o assert indebolito. Il controesempio di dominio precede
la correzione. Log, baseline, sorgenti collaudati e patch sono in TEMP, separati
dai materiali storici. Risultati **locali**, non CI GitHub.

Nessuna suite completa motore/public lifecycle/release ripetuta: nessun delta
su quei percorsi, sul trasporto o sulle dipendenze. Nessuna pubblicazione richiesta.

## Inventario selettivo (7 file)

- `scripts/liteapi-ssp-probe-v1.mjs`: dispatch @1.3 e matching prima dell'unicità.
- `scripts/liteapi-ssp-requote-conditions-v1.mjs`: qualificazione e confronto puro.
- `tests/engine-v3/fixtures/sspRequoteConditionsSyntheticV1.mjs`: soli originali inventati.
- `tests/engine-v3/v3SspRequoteConditions.test.ts`: regressioni e launcher effettivo.
- Questo rapporto.
- `docs/stayopti/CURRENT_STATE.md`.
- `docs/stayopti/DECISION_LOG.md`.

Nessun dato commerciale privato pubblicabile incluso. Main, 25 file protetti,
modifiche estranee e ricevute storiche preservati. Nessuna lettura della chiave,
decifrazione storica, preparazione del caso _003 o nuova acquisizione.
Il caso _002 resta consumato e il suo STOP non è riscritto né ricalcolato qui.
**A02 Production HOLD.** Correggere la falsa ambiguità non promette che una
tariffa raggiunga il target o superi gli altri arresti.

Stato Git finale: HEAD base invariato, staging vuoto, modifiche solo locali.
Commit/push non eseguiti; nessuna verifica remota nuova o pretesa sincronizzazione.

## Addendum — consolidamento selettivo autorizzato (2026-09-29)

Il successivo incarico autorizza commit/push dei soli sette file sopra elencati.
Le dichiarazioni di lavoro locale nelle sezioni precedenti descrivono la prima
consegna e restano conservate. La revisione finale non ha richiesto correzioni
funzionali: condizioni prima dell'unicità, concorrenti irrisolti bloccanti, prezzo
e ordine estranei alla scelta; controlli monetari e dispatch storico invariati.

Corrispondenza prima degli aggiornamenti documentali: sette hash identici alla
consegna, quattro file software/test identici al checkout isolato collaudato,
981 altri file tracciati di sorgente/dipendenza invariati, runtime SHA verificato.
Inventariati 15.525 file nelle dipendenze installate: nessuna scrittura successiva
alla compilazione originale. Riutilizzati quindi 148/148, 33 confronti legacy,
compilazione ufficiale, TypeScript, build e launcher PS5.1/DPAPI sintetico.
Evidenza della corrispondenza e hash dei log conservati separatamente in
`%TEMP%/stayopti-d0077-r2-consolidation-20260929/reuse-inputs.json`.

Gate di pubblicazione rieseguiti sul medesimo checkout isolato con Windows
PowerShell 5.1.26100.9444: `npm.cmd run test:security` **29/29 PASS**;
`npm.cmd run test:release` **101/101 PASS**, exit 0, nessuno skip.
Nessuna ripetizione di suite estranee e nessuna attribuzione alla CI GitHub.
Durante questo consolidamento cambiano soltanto i tre documenti di rendiconto.
Il controllo finale comprende diff/staged diff, inventario selettivo, riscontro
diretto del remoto, staging vuoto, commit pendenti e preservazione dei 25 file.

La diagnosi monetaria richiesta nello stesso incarico è una derivazione privata
separata, non inclusa nei sette file. Non importa dati commerciali nel software,
non ricalcola il caso storico con @1.3 e non cambia le soglie o il margin.
Nessun nuovo piano/caso, inventario operativo, literal, accesso alla chiave,
decifrazione storica, chiamata provider o kernel/policy. A02 Production HOLD.
Lo SHA effettivamente pubblicato e lo stato del push vengono forniti alla
consegna: il superamento dei gate locali da solo non attesta sincronizzazione.
