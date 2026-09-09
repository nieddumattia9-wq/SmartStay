# D-0048 — Maximum Comfort: banda di esperienza ancorata

Scope: candidata offline/evaluation-only; fixture interamente sintetiche.
Source: `35d70a650867bcf87c594eaa7e42531bf1470a01`.

## Causa e correzione

`chooseBestChoice` ordinava Maximum Comfort direttamente per esperienza; il
prezzo interveniva soltanto a parita esatta. La configurazione conteneva gia
`choiceExperienceLossTolerance=0.5`, ma questo ramo non la applicava.

Ora, dopo ammissibilita e dominanza, il massimo dell'intero insieme ancora una
fascia inclusiva di 0.5 punti. Nella fascia prevale il costo totale completo
minore, poi l'esperienza maggiore a parita di costo. Non ci sono comparatori
approssimati a coppie: 89.2, 89.6, 90 non formano una catena di equivalenze.
Gli effettivi pareggi conservano la classe e non ricevono un vincitore per ID.

La sottrazione usa la precisione gia esistente dei punteggi (sei decimali),
non un nuovo epsilon, arrotondamento di distanza o limite economico per metro.
Nessun peso, soglia, configurazione numerica o altro profilo e cambiato.
Hard requirement, privacy R1, totale UNKNOWN, budget e preferenza forte di
distanza restano gate anteriori alla scelta. Il bridge non e stato modificato.

Policy e schema passano da `.2` a `.3`; i payload storici non vengono migrati.
Il fingerprint di configurazione numerica resta lo stesso; policyVersion,
schemaVersion e fingerprint del risultato distinguono la nuova semantica.
Il validator ricalcola banda/scelta e confronto anche contro payload risigillati.

## Spiegazione verificabile

`experienceBandComparison` registra massimo, limite inferiore, tolleranza,
compromesso accettato, conteggi e confronti delle alternative ammissibili non
dominate: differenze di costo, esperienza e dimensioni con evidence IDs.
Un dato sconosciuto produce delta null, non zero. Gli ID sono riferimenti.
La banda non e una classe di equivalenza e non certifica uguale completezza.
La tesi esplicita il costo dopo la banda, senza inventare qualita superiore.

## Prova congelata prima/dopo

Il nuovo MC01 e fallito sul source con `400 !== 300`; input, sorgente precedente,
test iniziale e log sono conservati separatamente nella consegna. La baseline
riprodotta coincide byte-per-byte con i risultati R1. Nessun input D-0046/R1
o fixture storica e riscritto. SC19 cambia soltanto l'aspettativa del difetto
ora corretto: l'esito storico D-0047/R1 resta conservato.

Tutti e soli i cambiamenti di scelta sulla griglia congelata:

| Famiglia / scenario | Prima | Dopo | Esperienza prima/dopo | Saving | Upgrade |
|---|---|---|---|---|---|
| equal-experience / distance-small | STAY_2, 400 EUR | STAY_1, 300 EUR | 92.462875 / 92.330875 | selezionata -> non applicabile | invariato, non applicabile |
| automatic-market / rating-minus-0.2 | STAY_2, 192 EUR | STAY_1, 180 EUR | 93.212875 / 92.874875 | selezionata -> non applicabile | invariato, non applicabile |

Nel primo caso qualita identica, posizione leggermente migliore nell'offerta
da 400 EUR: 0.132 punti non giustificano 100 EUR secondo la tolleranza gia
configurata. Il controllo originale senza perturbazione resta a 300 EUR.
Il secondo caso usa Maximum Comfort risolto automaticamente: 0.338 punti,
12 EUR evitati. Non si modifica il resolver automatico.

187 input, 186 esecuzioni, una non-esecuzione contestuale gia prevista
(`strong-distance/exception-unsupported`). Nessun nuovo skip di test.
Zero cambiamenti agli input di policy o alle metriche candidate; due cambi
Best Choice e due Saving; zero cambi Upgrade e zero Upgrade positivi nella
griglia. Altri profili invariati. I risultati completi includono ogni riga,
denominatori e stato delle referenze: non viene nascosta la non-esecuzione.

## Esecuzione e limiti

Runner repository: `scripts/run-maximum-comfort-band-synthetic-proof.mjs`.
Accetta soltanto `--synthetic-proof NEW_EXTERNAL_OUTPUT_DIRECTORY`, non dati
reali. Usa il compilatore TypeScript locale e test Node canonici, senza loader,
shim, download, credenziali o provider. La consegna include un unico launcher
PowerShell 5.1 che verifica HEAD/staging ed esporta i byte del commit in un
checkout temporaneo prima della prova; nessun path escluso viene eseguito.

26 test mirati PASS; controlli di soglia, catena, invariance, hard/strong
distance, privacy, UNKNOWN, budget, dominanza, fingerprint ed equivalenza.
Regressioni R1 34/34, D-0047 30/30, D-0046 34/34, D-0044 41/41 PASS.
Prima della pubblicazione sono obbligatori V3/V2 e tutti i gate offline;
exit code, output e tree del candidato sono inclusi nella consegna finale.
Il controllo dipendenze online non e eseguito: rete autorizzata solo Git.

Questa correzione non e robustezza completa, calibrazione scientifica dello
0.5 o certificazione di outcome. La copertura positiva Upgrade rimane un
problema separato. Nessuna esecuzione reale, Golden, custodia o runtime pubblico.
Le condizioni D-0038 branch/HEAD/inventario esplicite restano in vigore:
nessun rinominare branch o migrare progressi per far passare un launcher.

## Consolidamento

Un commit selettivo sul solo branch `codex/evaluation-d0036-d0041`, parent
source sopra indicato, dopo gate positivi e verifica 7 esclusi + 17 sigillati.
Push non-force solo verso il repository Git autorizzato; main non toccato.
Il rapporto di sincronizzazione nella consegna registra SHA locale/remoto,
push realmente eseguito e commit ancora locali. Non inferire sincronizzazione
dal solo commit locale. Nessun pacchetto privato nel repository.
