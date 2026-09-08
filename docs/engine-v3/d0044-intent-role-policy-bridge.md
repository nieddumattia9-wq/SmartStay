# D-0044 — Raccordo intento / policy V3-15 (solo evaluation)

## Percorso eseguibile

`runIntentRolePolicyBridgeV3` accetta il contratto V2 già normalizzato e un
contesto evaluation esplicito. Non accetta dossier, feedback o credenziali.
La CLI pubblicata accetta soltanto `--synthetic-proof` e una cartella nuova
esterna al repository. Non è un comando per Bologna.

| Dato | Raccordo e regola |
|---|---|
| Profilo manuale | prevale; resolver V2, nessuna inferenza sostitutiva |
| Automatico | passaggio preliminare Balanced, resolver marketRelativePreference V2; eventuale secondo passaggio sul mercato congelato |
| Budget | totale esplicito, valuta, notti e camere; budgetIntent riusa la base per camera/notte (arrotondamento V2 a centesimi) |
| Mercato | sorgente, numerosità, confidence, livello e motivo di fallback conservati; candidate-fallback può essere usable ma insufficiente per cambiare profilo |
| Target esperienza | floor e tier di budgetIntent, con provenienza e attivazione. Non si copia bestChoiceEligible, intentAdjustedScore o veto percentile prezzo |
| Quality/comfort/location/flexibility | dimensioni V2 dell'offerta effettivamente valutata, non il vecchio score totale |
| Room | unitType fit contestuale del valutatore comfort V2 e relativi evidenceIds; NON roomTier convertito con una scala inventata |
| Long-stays | practicality V2 per almeno sette notti, altrimenti null/not-applicable |
| categoryFit | confidenza di classificazione, conservata nell'audit; non mappata a room/premium suitability |
| Privacy | requisiti espliciti comfort/unitType, con violated distinto da unverified; UNKNOWN non certifica privacy |
| Offerta | lookup opaco dalla valutazione V2 per tutti i candidati; costo/camera/condizioni/fatti/dimensioni legati alla stessa selezione |
| Totale incompleto | totalCost=null nel nuovo input; calcolo diagnostico possibile, non raccomandabile, astensione strutturata se tutti incompleti |
| Rating scale UNKNOWN | non riscalata dal bridge. Si accetta soltanto il punteggio canonico già ammissibile V2, conservando l'osservazione fuori dal ranking |
| Distanza | unico maximumDistanceKm + selectedLocation; semantica e provenienza esplicite, eccesso osservato nel trace, nessuna tolleranza generale |
| Ruoli e spiegazioni | stesso risultato della policy .2; spiegazione contestuale separa motivi di ammissibilità, sacrificio di distanza e motivi della policy |
| Robustness | budget-tight .9 / budget-relaxed 1.1: ricalcolo intento, ammissibilità e stessa policy, non vecchia utility. Solo sensitivity bounded |

## Limiti che non vengono nascosti

- V2 budgetIntent conserva storicamente un termine categoryFit nel proprio
  aggregato. Non viene presentato come prova autonoma di lusso e non è duplicato
  nelle dimensioni V3-15; la sua rimozione da V2 non è autorizzata.
- Il target di esperienza viene applicato conservativamente come requisito
  contestuale comune: non è ancora un trasferimento delle diverse deroghe V2
  per Saving. Le tolleranze di Saving/Upgrade V3-15 non sono alterate. Questa
  scelta può astenersi da ruoli aggiuntivi, non inventarli.
- Il fit del tipo di unità non misura dimensioni fisiche o privacy sconosciute.
  Questi attributi restano nel binding dell'offerta/UNKNOWN, non convertiti in
  nuovi score.
- Full robustness multi-asse e regret sono `NOT_AVAILABLE`; nessun PASS di
  promozione ereditato. La sensitivity non certifica l'intera robustness V3.
- Nessun mapping automatico Best Over Budget → Comfort Upgrade. Il bridge non
  esegue il caso reale né rende D-0041 Golden/blind-eligible.
- Il launcher D-0038 mantiene il prerequisito del branch
  `ci/d0033-clean-commit-proof`. Un fallimento relativo deve essere riportato
  come gate non passato, senza rinominare branch o cancellare test.

## Riproduzione offline

Usare Node locale già installato e il runner canonico tsc/CommonJS. Esempio
PowerShell 5.1 (la cartella di output deve essere nuova):

```powershell
Set-Location -LiteralPath 'C:\Users\Mattia\SmartStay'
& 'C:\Program Files\nodejs\node.exe' '.\scripts\run-intent-role-policy-proof.mjs' '--synthetic-proof' (Join-Path $env:TEMP ('StayOpti-D0044-proof-' + [guid]::NewGuid().ToString('N')))
if ($LASTEXITCODE -ne 0) { throw 'D0044_SYNTHETIC_PROOF_FAILED' }
```

La consegna contiene log dell'invocazione effettiva in PowerShell 5.1, input
sintetici congelati con SHA-256 prima dell'esecuzione e risultati, oltre alla
regressione F3 rossa prima della correzione. Il fingerprint di dominio FNV non
viene confuso con lo SHA-256 dei file.
