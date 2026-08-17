# StayOpti Engine V3 — Audit delle 115 capacità e roadmap di costruzione

**Data:** 13 agosto 2026  
**Stato:** proposta tecnica da congelare dopo V3-00  
**Baseline conosciuta:** Engine V2, commit `0798dd4e9c525fe517ba55c322eb20278d6cde48`, 196/196 test Engine PASS, ENG-01 Decision Trace chiuso  

> **North Star:** StayOpti non deve diventare il miglior motore di ricerca hotel. Deve diventare il miglior sistema al mondo per decidere quale soggiorno vale la pena scegliere.

## 1. Decisione strategica

Il V3 non sarà l'implementazione indiscriminata delle 115 capacità del blueprint. Sarebbe dispersione di prodotto e non creerebbe un vantaggio difendibile contro Google, Booking.com, KAYAK o altri grandi operatori.

Il V3 sarà costruito attorno a dieci capacità integrate:

1. Personal Utility Model;
2. Marginal Value Engine;
3. Pareto/Dominance Engine;
4. Peer Intelligence;
5. Evidence + Confidence Engine;
6. Risk-adjusted Decision Engine;
7. Counterfactual Engine;
8. Robustness Engine;
9. Decision Explanation Engine;
10. Outcome Learning.

Le altre voci della lista entrano solo se rendono più forte uno di questi dieci sistemi o se sono prerequisiti di integrità del dato.

## 2. Realtà competitiva verificata

Al 13 agosto 2026, le fonti pubbliche ufficiali mostrano che:

- Google AI Mode/Canvas usa dati in tempo reale su voli e hotel, confronta prezzi e servizi, ottimizza attività per tempo di viaggio e aiuta esplicitamente a ragionare su trade-off tra hotel;
- Personal Intelligence collega, su base opt-in, Gmail e Google Photos per produrre suggerimenti e itinerari personalizzati;
- UCP for Lodging è progettato per prenotazioni dirette nelle superfici AI di Google, inclusa AI Mode;
- nei free booking links Google dichiara che ranking e rapporto commerciale sono separati; gli Hotel Ads restano una superficie pubblicitaria distinta;
- KAYAK e Booking.com offrono già ricerca conversazionale, filtri AI, riepiloghi recensioni, confronti e pianificazione personalizzata.

Conclusione: **chatbot + personalizzazione + confronto hotel + booking non costituiscono un vantaggio competitivo sufficiente**.

Lo spazio di StayOpti è la **decision proof**: mostrare, con dati e assunzioni esplicite, perché una scelta è razionale, cosa sacrifica, quando cambierebbe, quanto è robusta e quando il sistema non possiede evidenze sufficienti per raccomandare.

Questa è una differenziazione di prodotto plausibile, non una garanzia di moat. Il moat reale può emergere soltanto dal ciclo proprietario:

`decisione → scelta → soggiorno → soddisfazione/rimpianto → calibrazione → nuova policy`

## 3. Correzioni obbligatorie alla narrativa

1. Non useremo la tesi “Google favorisce chi paga” per descrivere i risultati organici/free booking links. StayOpti deve dimostrare la propria indipendenza senza costruire il brand su un'affermazione inesatta.
2. “Domina l'83% delle alternative” è pubblicabile solo se il denominatore e la copertura del mercato sono noti. In caso contrario deve diventare “domina l'83% del set analizzato”.
3. “Comfort +7%” non è un fatto osservabile: è una variazione su una scala modellata. Va mostrata come stima di utilità/comfort e solo dopo calibrazione.
4. “Vince nel 79% degli scenari” è credibile soltanto se scenari, distribuzioni e range di sensibilità sono congelati e documentati.
5. “Confidence alta” non può essere un badge cosmetico. Deve corrispondere a una probabilità calibrata o a una classe derivata da coverage, qualità, freschezza e coerenza delle evidenze.

## 4. Cosa risulta già costruito

L'audit documentale del Source of Truth, della Master List, del blueprint da 115 voci e della baseline ENG-01 porta a questa fotografia:

| Stato | Numero | Significato |
|---|---:|---|
| **A — sostanziale** | 35 | Fondazione implementata e coperta da test noti; non significa già calibrata o pronta per il V3 pubblico. |
| **P — parziale** | 43 | Componente o contratto esistente, ma incompleto rispetto alla promessa V3. |
| **N — nuova core** | 24 | Capacità da costruire nel V3; include l'infrastruttura Outcome Learning. |
| **L — later** | 13 | Da rinviare finché mancano traffico, dati, secondo provider o prova di valore. |
| **Totale** | **115** | Nessuna voce ignorata. |

La baseline V2 già affronta in modo sostanziale: Evidence Model, Reliability Gate, Category Model, peer groups, price/value, quality, location, comfort/flexibility, confidence/risk, user utility, Pareto, recommendation roles, Smart Upgrade Curve, spiegazioni evidence-based, counterfactuals, stabilità/diversità e Golden Dataset.

L'ENG-01 ha inoltre chiuso il Decision Trace provider-agnostic senza alterare ranking, gruppi, ruoli o output pubblico. Questo è il punto di partenza corretto per il V3.

**Limite dell'audit:** i documenti di progetto sono snapshot e possono essere superati dal codice più recente. V3-00 deve quindi verificare il repository sul commit baseline prima di modificare il comportamento del motore.

## 5. Le dieci capacità core: stato e obiettivo V3

| Capacità | Stato attuale | Obiettivo V3 verificabile |
|---|---|---|
| Personal Utility Model | Base sostanziale: cinque profili, curve budget, hard/soft constraints, contesto | Utility non lineare, interazioni tra preferenze, sensitività per ricerca, separazione tra preferenze dichiarate e inferite, fallback neutro |
| Marginal Value Engine | Smart Upgrade, saving threshold e price/value già presenti | Valore marginale per euro, rendimenti decrescenti, prezzo massimo sensato e soglie di cambio raccomandazione |
| Pareto/Dominance | Pareto presente, dominance parziale | Dominanza forte/debole, reason codes, frontiera per peer corretti, nessuna eliminazione su dati mancanti |
| Peer Intelligence | Peer groups dinamici presenti | Coorti contestuali per categoria, camera, destinazione e tipo di viaggio; fallback espliciti e test anti-confronto scorretto |
| Evidence + Confidence | Evidence/Reliability/Confidence presenti | Coverage misurata, provenance/freshness, calibrazione, confidence per dimensione e non un unico badge opaco |
| Risk-adjusted Decision | Risk e segnali di anomalia presenti | Utility aggiustata per downside, incertezza di prezzo/condizioni, expected regret e astensione selettiva |
| Counterfactual | Prima implementazione presente | Soglie esatte e stabili: “B vince se prezzo/distanza/condizioni cambiano di X”, con spiegazione della variabile decisiva |
| Robustness | Stability presente; sensitivity/scenari mancanti | Simulazione deterministica di perturbazioni ragionevoli, robust choice score e near-tie coerente |
| Decision Explanation | Narrative/trade-off esistenti | Tesi comprensibile in 10 secondi, prova, sacrificio, alternativa, counterfactual e incertezza senza gergo |
| Outcome Learning | Non presente come ciclo end-to-end | Event schema, consenso, attribution, scelta, motivazione, feedback post-stay e pipeline offline di calibrazione con shadow promotion |

## 6. Architettura logica del V3

```text
Search context + vincoli + preferenze
                ↓
Normalizzazione soggiorno/offerta + costo reale + bookability
                ↓
Evidence / provenance / freshness / coverage
                ↓
Peer Intelligence
                ↓
Utility personale + rischio + confidence per dimensione
                ↓
Pareto / dominance / marginal value / pairwise comparison
                ↓
Counterfactual / sensitivity / robustness / expected regret
                ↓
Scelta, alternativa, saving, upgrade oppure astensione
                ↓
Decision Thesis + Decision Trace versionato
                ↓
Scelta utente → soggiorno → feedback → dataset outcome
                ↓
Calibrazione offline → shadow engine → promozione controllata
```

Il modello deve mantenere tre separazioni:

- **decisione struttura/offerta** distinta da selezione del provider di acquisto;
- **confidence dei dati** distinta da qualità dell'hotel e da rischio della scelta;
- **policy editoriale/decisionale** distinta da commissioni, provider e ranking commerciale.

### Contratto V3 minimo

Ogni `StayOptiDecisionV3` deve contenere:

- `engineVersion`, `policyVersion`, `evidenceSchemaVersion`, `configHash`;
- contesto di ricerca e preferenze dichiarate/inferite;
- hard/soft constraints e relative violazioni;
- snapshot di coverage del set analizzato;
- offerta canonica, costo totale, tasse e stato di completezza;
- evidence/provenance/freshness per dimensione;
- peer group e motivo di appartenenza;
- utility per dimensione, confidence e risk separati;
- Pareto/dominance status con reason codes;
- valore marginale, soglie saving/upgrade e counterfactuals;
- sensitivity, robust choice score, near-tie e expected regret;
- ruolo finale oppure codice di astensione;
- tesi della scelta, migliore alternativa e compromesso principale;
- trace interno riproducibile e privo di dati commerciali.

## 7. Roadmap operativa verso StayOpti Engine V3

Le fasi sono ordinate per dipendenza. Non si salta un gate per aggiungere una funzione visibile.

### V3-00 — Source audit e baseline freeze

**Obiettivo:** sapere esattamente cosa esiste nel codice, non soltanto nei documenti.

Deliverable:

- collector read-only sul commit baseline;
- mappa moduli → contratti → test → flag → output UI;
- benchmark V2 congelato su Golden Dataset e scenari live già certificati;
- inventario delle 115 voci con evidenza di codice/test;
- registro gap e debito tecnico.

Gate: zero cambi di ranking; baseline riproducibile; ogni stato A/P/N/L confermato o corretto con evidenza.

### V3-01 — Contratto, versioning e firewall decisionale

**Obiettivo:** rendere il V3 evolvibile e auditabile prima di cambiarne la matematica.

Deliverable:

- `StayOptiDecisionV3` e schemi versionati;
- adapter V2→V3 per compatibilità;
- policy/config hash e reason-code registry;
- test che vietano campi commerciali nel ranking;
- decision replay deterministico.

Gate: stesso input + stessa versione = stessa decisione e stesso trace.

### V3-02 — Integrità del soggiorno e del costo reale

**Obiettivo:** impedire che matematica sofisticata operi su prezzi o offerte semanticamente sbagliati.

Deliverable:

- costo totale per soggiorno/camera/occupazione;
- valuta, tasse, fee e stato `known/estimated/unknown`;
- camera, trattamento, cancellazione, pagamento e bookability canonici;
- deduplica struttura/offerta;
- recheck e gestione della variazione prima dell'handoff;
- coverage report del set candidato.

Gate di produzione: nessuna promozione pubblica del V3 finché il tema **public rates/price consistency LiteAPI/Nuitee** non è chiuso con evidenza. Il lavoro offline può procedere.

### V3-03 — Personal Utility + Peer Intelligence

**Obiettivo:** definire “migliore per questa ricerca” senza trasformare il budget massimo in un invito a spendere tutto.

Deliverable:

- funzione di utilità non lineare e monotonicità documentata;
- interazioni budget×durata, distanza×tipo viaggio, flessibilità×lead time, camera×gruppo;
- preferenze dichiarate separate da quelle inferite;
- peer group dinamici, reason codes e fallback;
- test metamorfici e controesempi.

Gate: nessuna raccomandazione cambia per una variabile irrilevante; nessun confronto diretto tra peer incompatibili senza dichiararlo.

### V3-04 — Decision Geometry

**Obiettivo:** costruire il nucleo matematico del vantaggio StayOpti.

Deliverable:

- Pareto forte/debole e dominance engine;
- confronto pairwise dei finalisti;
- marginal value per euro e rendimenti decrescenti;
- saving threshold, upgrade threshold, maximum sensible price;
- decision map interna;
- spiegazione della variabile che ha eliminato ogni finalista.

Gate: proprietà matematiche e invarianti verificate; nessun dato mancante trattato automaticamente come svantaggio.

### V3-05 — Rischio, robustezza, rimpianto e astensione

**Obiettivo:** preferire decisioni che restano buone quando dati e preferenze non sono perfetti.

Deliverable:

- scenario/sensitivity engine deterministico;
- robust choice score;
- risk-adjusted utility;
- expected regret;
- near-tie e no-good-option detection;
- smart abstention e constraint relaxation.

Gate: il motore si astiene nei casi deliberatamente insufficienti e non diventa eccessivamente conservativo nei casi forti.

### V3-06 — Location, room, flexibility e friction contestuali

**Obiettivo:** valorizzare ciò che modifica realmente l'esperienza del soggiorno.

Deliverable:

- travel time rispetto ai punti rilevanti, non sola distanza lineare;
- location value specifico per viaggio;
- room upgrade intelligence;
- valore monetario/di utilità di cancellazione e pay-later;
- group utility, long-stay utility e destination-aware weighting;
- decision friction e convenience index.

Gate: ogni nuovo segnale deve dimostrare guadagno decisionale su casi reali/Golden Dataset, altrimenti resta spento.

### V3-07 — Explanation Engine in dieci secondi

**Obiettivo:** rendere la decisione comprensibile senza esporre matematica decorativa.

Formato pubblico minimo:

1. scelta consigliata;
2. ragione principale;
3. compromesso principale;
4. migliore alternativa;
5. condizione che farebbe cambiare scelta;
6. incertezza rilevante o astensione.

Gate: blind test di comprensione; nessuna percentuale non definita/calibrata; coerenza 1:1 tra copy ed evidence IDs.

### V3-08 — Search-wide scale e coverage

**Obiettivo:** evitare una decisione perfetta su un campione troppo piccolo.

Deliverable:

- coarse-to-fine evaluation;
- dynamic computation e pruning sicuro;
- search-wide context e scarcity;
- test con migliaia di strutture e offerte;
- claim relativi alla copertura: “del set analizzato”, non “del mercato”, quando la copertura è incompleta.

Gate: risultati equivalenti al calcolo completo entro tolleranza congelata; latenza e memoria entro budget; nessuna perdita sistematica di alternative forti.

### V3-09 — Outcome Data Loop

**Obiettivo:** iniziare a costruire il vero asset proprietario.

Eventi minimi:

- decisione mostrata e versione della policy;
- scelta effettuata o abbandono;
- eventuale scelta diversa e motivo;
- prenotazione/recheck attribuibili senza dati eccedenti;
- post-stay: soddisfazione, “rifaresti la stessa scelta?”, rimpianto, problema principale;
- consenso, retention, cancellazione e anonimizzazione/pseudonimizzazione.

Regola critica: il V3 non si auto-modifica in produzione. I dati generano policy candidate offline; ogni candidata passa valutazione, shadow mode e promotion gate.

Gate: schema eventi versionato, consenso valido, attribution misurata, cancellazione dati testata e nessun PII nel Decision Trace.

### V3-10 — Evaluation e calibrazione

**Obiettivo:** dimostrare che il V3 decide meglio del V2, non soltanto che è più complesso.

Deliverable:

- Golden Dataset ampliato con casi avversariali e controfattuali;
- test human-vs-engine e valutazione esperta in cieco;
- metriche di regret, pairwise win rate, calibration error, abstention quality, stabilità e fairness;
- money saved without quality loss e quality gained per extra euro;
- segmentazione degli errori per profilo, destinazione, lead time, durata e copertura.

Gate: soglie quantitative congelate prima di leggere i risultati finali; V3 superiore al V2 sulle metriche primarie senza regressioni critiche.

### V3-11 — Shadow, canary e promozione

**Obiettivo:** introdurre il V3 senza compromettere il prodotto esistente.

Deliverable:

- V2 pubblico invariato e V3 in parallelo;
- confronto automatico delle decisioni e reason diff;
- dashboard errori/regressioni;
- canary controllato, kill switch e rollback;
- versione della policy visibile nell'audit interno.

Gate finale: integrità prezzo, invarianti, sicurezza, calibrazione, test umani e monitoraggio tutti verdi.

## 8. Track separati, non blocker del core V3

- **Secondo provider / RouteStack:** rivalidare in ambiente controllato. Attivare cross-provider validation e two-stage provider selection solo con un secondo provider realmente affidabile.
- **Review aspect NLP:** utile, ma non prima di provenance, affidabilità e copertura delle recensioni.
- **Storico prezzi/volatilità:** richiede dataset temporale proprio o fonte affidabile.
- **Multi-stay:** prodotto distinto; non va introdotto nel runtime core prima della prova di valore del single-stay.
- **Preference drift/exploration:** richiedono storico utente e volumi; prima servono privacy e Outcome Data Loop.
- **Efficient Frontier Visualization:** non prioritaria; il vantaggio deve essere comprensibile anche senza grafico.

## 9. KPI del V3

Le soglie numeriche vanno fissate in V3-00 dopo il benchmark, ma le metriche sono già decise:

- normalized decision regret;
- pairwise win rate V3 vs V2 nei test ciechi;
- robust-choice rate e stabilità sotto perturbazioni ammesse;
- confidence calibration error;
- precision/coverage dell'astensione;
- tasso di scelta della raccomandazione, senza ottimizzare il click;
- “rifaresti la stessa scelta?” post-soggiorno;
- regret dichiarato e causa del regret;
- denaro risparmiato senza perdita di qualità accettabile;
- qualità guadagnata per euro aggiuntivo;
- tempo necessario all'utente per decidere;
- regressioni di fairness o dipendenza da provider/commissione.

La metrica North Star di lungo periodo è:

> **Probabilità che, dopo il soggiorno, l'utente rifarebbe la stessa scelta date le alternative realmente disponibili al momento della decisione.**

## 10. Definition of Done di StayOpti Engine V3

Il V3 non è “finito” quando esistono dieci nuovi moduli. È finito quando:

1. ogni decisione è riproducibile, versionata e spiegabile tramite evidence;
2. costo, camera, condizioni, tasse e coverage sono semanticamente corretti;
3. utility, confidence e risk sono separati e calibrati;
4. Pareto, dominance, marginal value e counterfactual rispettano invarianti matematici;
5. la scelta resta stabile sotto variazioni ragionevoli oppure viene dichiarata fragile;
6. il sistema sa riconoscere near-tie, no-good-option e casi in cui deve astenersi;
7. l'utente comprende scelta, sacrificio e alternativa in dieci secondi;
8. il V3 batte il V2 nei test ciechi e nelle metriche di regret;
9. il loop outcome è operativo, privacy-safe e non auto-modifica la produzione;
10. il rollout è reversibile e indipendente da commissioni/provider.

## 11. Matrice completa delle 115 capacità

Legenda: **A** = base sostanziale; **P** = parziale/da irrobustire; **N** = nuova core V3; **L** = rinviata/data-dependent.

| # | Capacità | Stato | Decisione V3 |
|---:|---|:---:|---|
| 1 | Provider Blind Ranking | P | Formalizzare firewall e test negativi sui campi commerciali. |
| 2 | Total Trip Cost Engine | P | Chiudere semantica totale/tasse/fee/occupazione e gate public rates. |
| 3 | Price Intelligence | P | Consolidare confronto relativo; storico prezzi resta separato. |
| 4 | Marginal Value Engine | P | Portarlo nel nucleo V3 con unità e soglie documentate. |
| 5 | Diminishing Returns | P | Rendere le curve monotone, testate e interpretabili. |
| 6 | Budget Utility Curve | A | Preservare e ricalibrare, senza spend-to-budget bias. |
| 7 | Dynamic Peer Groups | A | Estendere con reason codes e contesto viaggio. |
| 8 | Pareto Frontier | A | Preservare e formalizzare proprietà/invarianti. |
| 9 | Dominance Engine | P | Completare forte/debole, missing-aware e spiegabile. |
| 10 | Opportunity Cost | A | Integrarlo nella tesi e nei counterfactual. |
| 11 | Regret Minimization | N | Costruire expected/realized regret e benchmark. |
| 12 | Confidence-Aware Ranking | P | Passare da signal use a calibrazione verificabile. |
| 13 | Evidence Model | A | Versionare schema, coverage e provenance. |
| 14 | Reliability Gate | A | Preservare e aggiungere reason codes/gate avversariali. |
| 15 | Review Reliability | P | Irrobustire provenienza, count e lower-bound semantics. |
| 16 | Bayesian Quality Estimate | N | Introdurre solo con prior e calibrazione documentati. |
| 17 | Review Aspect Intelligence | L | Dopo affidabilità/coverage; non core V3 iniziale. |
| 18 | Negative Signal Detection | P | Unificare segnali e falsi positivi. |
| 19 | Preference Interaction | N | Core della Utility V3. |
| 20 | Context-Aware Preferences | A | Preservare e ampliare con test metamorfici. |
| 21 | Automatic Preference Inference | A | Separare inferito/dichiarato e mostrare controllo utente. |
| 22 | Preference Sensitivity Analysis | N | Core Robustness V3. |
| 23 | Robust Choice Score | N | Core Robustness V3. |
| 24 | Scenario Simulation | N | Motore deterministico con range congelati. |
| 25 | Counterfactual Engine | A | Estendere a soglie esatte e stabilità. |
| 26 | Price Thresholds | N | Costruire massimo prezzo sensato e switch points. |
| 27 | Upgrade Threshold | P | Generalizzare e calibrare. |
| 28 | Saving Threshold | A | Preservare e calibrare per profilo. |
| 29 | Location Intelligence Vera | P | Portare da distanza a valore contestuale. |
| 30 | Travel-Time Instead of Distance | N | Integrare dati affidabili e fallback. |
| 31 | Location Value | P | Ricalibrare per utilità, non score generico. |
| 32 | Trip-Specific Location | N | Core contestuale V3. |
| 33 | Accommodation Category Intelligence | A | Preservare e testare confronti cross-category. |
| 34 | Room-Level Intelligence | P | Chiudere room/offer canonicalization. |
| 35 | Room Upgrade Intelligence | N | Integrare con marginal value. |
| 36 | Cancellation Value | P | Monetizzare/valutare per contesto e lead time. |
| 37 | Pay Now vs Pay Later | P | Integrare costo/opportunità/rischio. |
| 38 | Risk-Adjusted Value | P | Portare nel core Risk V3. |
| 39 | Hidden Risk Detection | P | Consolidare reason codes e precisione. |
| 40 | Anomaly Detection | P | Aggiungere test live e fallback conservativi. |
| 41 | Cross-Provider Validation | L | Solo con secondo provider affidabile. |
| 42 | Freshness Weighting | P | Versionare e calibrare per tipo evidenza. |
| 43 | Recheck Before Handoff | A | Preservare; aggiungere decision diff. |
| 44 | Decision Stability After Recheck | N | Costruire regole di conferma/cambio. |
| 45 | Multi-Provider Offer Selection | L | Dopo riattivazione certificata di un secondo provider. |
| 46 | Two-Stage Decision Model | L | Contratto-ready, runtime dopo secondo provider. |
| 47 | Alternative Diversity | A | Preservare e misurare valore informativo. |
| 48 | Recommendation Compression | A | Mantenere 1–4 opzioni non ridondanti. |
| 49 | Cognitive Load Optimization | A | Validare con test utente. |
| 50 | Decision Narrative | A | Evolvere in Decision Thesis V3. |
| 51 | Pros/Cons Relative, Not Generic | P | Rendere tutte le frasi comparative/evidence-backed. |
| 52 | Explicit Trade-Off Explanation | A | Preservare; semplificare in 10 secondi. |
| 53 | Why Not the Other One? | P | Completare per finalisti e richiesta utente. |
| 54 | What Would Change My Recommendation? | P | Alimentare dai counterfactual esatti. |
| 55 | Decision Confidence Visible | P | Mostrare solo confidence calibrata e utile. |
| 56 | Near-Tie Detection | P | Unificare con Robustness/abstention. |
| 57 | No-Good-Option Detection | A | Preservare e stress-testare. |
| 58 | Constraint Relaxation Optimizer | P | Rendere graduato, spiegabile e controllabile. |
| 59 | Search Recovery Intelligence | A | Preservare partial results e recovery. |
| 60 | Multi-Stay Optimization | L | Prodotto futuro, non core V3. |
| 61 | Switching Cost Model | L | Dipende dal multi-stay. |
| 62 | Group Utility | P | Rafforzare in Utility V3. |
| 63 | Long-Stay Utility | P | Rafforzare con costo e comfort contestuali. |
| 64 | Length-of-Stay Price Intelligence | P | Consolidare totale e anomalie per durata. |
| 65 | Destination-Aware Weighting | N | Aggiungere con segnali/fallback testabili. |
| 66 | Season-Aware Intelligence | L | Dopo dati sufficienti. |
| 67 | Lead-Time Intelligence | A | Preservare; già validata live nella baseline nota. |
| 68 | Price Volatility Awareness | L | Richiede storico affidabile. |
| 69 | Historical Price Context | L | Richiede dataset temporale/provenance. |
| 70 | Personal Value Function | A | Base del Personal Utility Model V3. |
| 71 | Non-Linear Utility | A | Formalizzare curve e invarianti. |
| 72 | Hard vs Soft Constraints | A | Preservare e rendere spiegabili le violazioni. |
| 73 | User-Specific Sensitivity | A | Collegare al Robustness Engine. |
| 74 | Decision Calibration | P | Trasformare in disciplina offline/versionata. |
| 75 | User Choice Feedback | N | Costruire nello Outcome Data Loop. |
| 76 | Post-Stay Feedback | N | Core strategica: consenso, attribution e survey breve. |
| 77 | Recommendation Outcome Learning | N | Core strategica: offline, shadow, no self-update. |
| 78 | Avoid Click Optimization | A | Preservare come principio e test di metrica. |
| 79 | Anti-Manipulation Layer | P | Rafforzare contro gaming di dati/provider. |
| 80 | Commercial Firewall | A | Formalizzare in architettura e CI. |
| 81 | Auditability | A | Decision Trace già base; estendere V3. |
| 82 | Reproducibility | A | Preservare con version/config hash. |
| 83 | Versioned Decision Engine | P | Versionare policy, evidence e contratti separatamente. |
| 84 | Shadow Engine Testing | P | Infrastruttura finale di promozione V3. |
| 85 | Golden Decision Dataset | A | Ampliare con outcome, avversariali e counterfactuals. |
| 86 | Adversarial Testing | P | Estendere sistematicamente. |
| 87 | Human-vs-Engine Evaluation | N | Test ciechi obbligatori. |
| 88 | Expert Evaluation | N | Protocollo indipendente e tracciato. |
| 89 | Pairwise Comparison Model | N | Core Decision Geometry. |
| 90 | Tournament Ranking | N | Valutare offline; attivare solo se batte approccio semplice. |
| 91 | Coarse-to-Fine Evaluation | N | Necessario per scala/coverage. |
| 92 | Dynamic Computation | N | Necessario per scala e budget di latenza. |
| 93 | Search-Wide Context | A | Preservare e rendere esplicita la copertura. |
| 94 | Relative Scarcity | P | Calibrare e non confondere con urgenza commerciale. |
| 95 | Option Value | N | Aggiungere solo se produce decisioni migliori. |
| 96 | Decision Friction Score | P | Unificare segnali e validare. |
| 97 | Convenience Index | N | Costruire come utilità contestuale, non badge. |
| 98 | Explainable Uncertainty | P | Portare nella tesi pubblica con linguaggio umano. |
| 99 | Honest Recommendation | A | Principio di prodotto e gate. |
| 100 | StayOpti Decision Score ≠ Hotel Score | A | Preservare rigorosamente. |
| 101 | The Decision Thesis | A | Rendere output primario del V3. |
| 102 | Best Alternative Thesis | A | Preservare e alimentare dai finalisti. |
| 103 | Decision Map | N | Costruire prima internamente. |
| 104 | Efficient Frontier Visualization | L | Dopo prova di comprensione; non necessaria al core. |
| 105 | Smart Abstention | P | Completare e calibrare precision/coverage. |
| 106 | Decision Integrity Tests | A | Preservare e ampliare a V3. |
| 107 | Fair Ranking Constraints | P | Definire proprietà e test automatici. |
| 108 | Decision Performance Metrics | P | Congelare metriche/threshold prima dei risultati. |
| 109 | Money Saved Without Quality Loss | P | Definire qualità accettabile e misurare outcome. |
| 110 | Quality Gained Per Extra Euro | P | Derivare dal Marginal Value Engine calibrato. |
| 111 | User Decision History | L | Dopo privacy, account e volumi. |
| 112 | Preference Drift | L | Dopo storico sufficiente. |
| 113 | Exploration | L | Dopo outcome data e guardrail. |
| 114 | Privacy-Preserving Personalization | P | Prerequisito del loop outcome e delle preferenze. |
| 115 | Independent Decision Charter | P | Pubblicare solo dopo test tecnici del firewall. |

## 12. Ordine immediato di esecuzione

1. Congelare questa direzione come tesi V3.
2. Eseguire V3-00 sul repository reale e correggere la matrice con prove di codice/test.
3. Definire e approvare `StayOptiDecisionV3`, metriche e invarianti.
4. Chiudere integrità prezzo/offerta e coverage prima di promuovere nuova matematica.
5. Costruire il nucleo Utility → Decision Geometry → Risk/Robustness → Explanation.
6. Instrumentare Outcome Data Loop prima della beta V3, così ogni soggiorno utile può generare apprendimento.
7. Validare offline e con esseri umani; poi shadow, canary e rollout reversibile.

## 13. Fonti competitive principali

- Google, “Explore new ways to plan and book travel with AI in Search”: https://blog.google/products-and-platforms/products/search/agentic-plans-booking-travel-canvas-ai-mode/
- Google, “Personal Intelligence in AI Mode and Gemini expands in the U.S.”: https://blog.google/products-and-platforms/products/search/personal-intelligence-expansion/
- Google Developers, “UCP for Lodging — FAQ”: https://developers.google.com/hotels/ucp/faq
- Google Hotel Center, “Free booking links — reporting and ranking”: https://support.google.com/hotelprices/answer/11202392?hl=en
- KAYAK, “Ask AI”: https://www.kayak.com/news/ask-ai/
- Booking.com, AI-powered travel planning features: https://news.booking.com/bookingcom-enhances-travel-planning-with-new-ai-powered-features--for-easier-smarter-decisions/
- Expedia Group, “The AI Trust Gap”: https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-Reveals-The-AI-Trust-Gap-Travelers-Embrace-AI-for-Planning-but-Rely-on-Trusted-Brands-to-Book/default.aspx

---

**Decisione proposta:** approvare questa roadmap come direzione, ma congelare stime e stato definitivo soltanto dopo V3-00. Il primo pacchetto operativo non deve cambiare il ranking: deve produrre l'audit sorgente, il benchmark e il contratto misurabile da cui partire.
