# D-0046 — diagnostica finita della policy basata sull'intento

## Protocollo congelato prima dell'esecuzione

Versione `stayopti.synthetic.intent-policy-robustness@1`. Le otto famiglie e le ampiezze sono dichiarate in `tests/engine-v3/fixtures/intentRobustnessSyntheticV3.ts`; nessun valore deriva da Bologna o da feedback umano. Il runner conserva gli input completi, SHA-256 individuali, protocollo e inventario del codice prima di chiamare il valutatore. Il controllo usa costo completo EUR, prezzi delle singole offerte, date/occupazione e condizioni inventati e dichiarati. L'asse prezzo conserva il differenziale fra rate plan e le penali monetarie. L'UNKNOWN fiscale/costo non elimina il prezzo visualizzato, ma impedisce di considerarlo un totale completo.

Famiglie: Balanced, premium con dormitorio economico, esperienza uguale a costi diversi, equivalenza esatta, distanza forte, Maximum Savings, F3 con due offerte e cancellazione nello stesso giorno, mercato sintetico automatico con dieci strutture. Perturbazioni: budget ±10%, costi completi −2%/+2%/+60%, rating −0,2 su scala sintetica /10 documentata, recensioni ×0,1, distanza +0,05 km e 4 km, unità condivisa documentata, flessibilità non rimborsabile, costo completo UNKNOWN, scala rating UNKNOWN, deterioramento delle evidenze. Il requisito privato con prima evidenza rimossa è dichiarato stress composto, non stimatore causale di un solo attributo. Cambi di preferenza, contesto utente e controlli di identità hanno denominatori separati dai cambi nei dati. Le eccezioni di distanza sono specifiche, sostenute da riferimenti già determinabili nel contratto, oppure intenzionalmente non supportate.

Proprietà attese: i confronti realmente lontani dalle soglie restano coerenti; attraversare una soglia può escludere o far astenere; privacy/categoria non sono certificate dalle recensioni; preferenze manuali conservate; costo inferiore favorito a parità di esperienza; incompletezza non trasformata in bassa qualità. Un risultato inatteso va registrato, non corretto modificando policy o fixture per ottenere PASS.

## Percorso e limiti

Ogni scenario ricalcola `runIntentRolePolicyBridgeV3` → intent V2/risoluzione del profilo → binding dell'offerta effettivamente valutata → ammissibilità → `runPersonalUtilityRolePolicyV3`. Sono conservati input/configurazione, target, snapshot, condizioni, dimensioni, motivi, scelta ed equivalenze. Il bridge continua a costruire internamente diagnostica storica per compatibilità, ma questo modulo non ne legge né esporta vincitori, punteggi, sensitivity o regret. Il risultato della nuova policy non viene sostituito. Il budget ±10% interno del bridge resta il precedente controllo limitato, non una certificazione.

Le classi equivalenti sono insiemi di coppie alternativa/offerta, associate mediante una corrispondenza esplicita di esperimento. Gli ID restano lookup; la corrispondenza non entra nella decisione. Un cambio del rappresentante grafico non è un cambio di merito. Un'altra offerta della medesima struttura è una diversa soluzione e viene segnalata, non confusa con stabilità.

## Regret: cosa viene misurato e cosa no

Non viene definito un regret cardinale di soggiorno. La perdita diagnostica di appartenenza alla classe scelta dalla policy è 0 se la soluzione di riferimento è ancora nella classe, 1 se resta ammissibile ma ne esce. È una misura discreta e limitata: non esprime intensità della perdita, soddisfazione o frequenza di mercato. Non massimizza `personalUtilityScore`: Comfort applica una fascia di esperienza e Maximum Savings può scegliere un costo minore anche con utility inferiore.

Le differenze firmate di costo (EUR), esperienza (punti), utility (punti) e copertura dell'evidenza (quota) rispetto alle vere scelte sono componenti separate, mai sommate. Valori negativi sono possibili e non indicano un errore: la policy non ottimizza tutte le componenti simultaneamente. Per ogni membro della classe baseline si conserva il risultato. Inammissibilità, offerta non più valutata, astensione e mancata esecuzione danno `null`, non zero. Sono riportati denominatori, scenari non misurati e motivi. Nessuna media omette silenziosamente questi casi.

Saving e Upgrade conservano metriche, motivi, equivalenze ed esito separato del validatore; i controlli aggiuntivi verificano ammissibilità, direzione del costo, limiti delle perdite e guadagni/marginalità previsti dalla policy. I ruoli non vengono forzati.

È una griglia finita, non tutte le interazioni, una probabilità di stabilità, una validazione statistica, un regret post-stay o un gate Golden. Nessuna robustezza completa certificata. Nessuna esecuzione reale o attivazione pubblica. Persistono i limiti D-0044 sul room fit e sul termine storico di classification confidence nell'intento. Pesi, soglie e ranking sono fuori dal perimetro.

## Riproduzione

Nel checkout isolato e identificato dall'inventario della consegna, con dipendenze già disponibili, Windows PowerShell 5.1:

```powershell
& 'C:\Program Files\nodejs\node.exe' '.\scripts\run-intent-robustness-diagnostic-proof.mjs' --synthetic-proof 'NUOVA_DIRECTORY_ESTERNA_AL_REPOSITORY'
if ($LASTEXITCODE -ne 0) { throw 'D0046_SYNTHETIC_PROOF_FAILED' }
```

Il runner non accetta input reali. Non sovrascrive output esistenti. Compila con il metodo canonico tsc/CommonJS del repository, congela gli input, esegue la diagnostica e i test mirati. Gli hash sono evidenza locale di immutabilità, non certificazione temporale indipendente. Non richiede né usa DPAPI o custodia; il gate completo conserva le prove Windows reali dei launcher esistenti. Lo stato del push e gli eventuali commit ancora locali devono essere riportati a ogni fase software conclusa.
