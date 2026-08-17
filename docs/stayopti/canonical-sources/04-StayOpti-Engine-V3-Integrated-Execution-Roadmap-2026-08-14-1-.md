# StayOpti Engine V3 — Roadmap esecutiva integrata

**Data di congelamento:** 14 agosto 2026  
**Stato:** approvata da Mattia come nuova scaletta operativa  
**Ambito:** Engine V3, Decision Intelligence, V2 Safety Kernel, apprendimento teacher–student, valutazione, split-stay e promozione controllata  
**North Star:** probabilità che, dopo il soggiorno, l'utente rifarebbe la stessa scelta conoscendo le alternative realmente disponibili al momento della decisione.

---

## 1. Decisione esecutiva

StayOpti non deve diventare un altro motore che ordina hotel. Deve diventare il miglior sistema specializzato nel costruire, confrontare e spiegare il soggiorno più adatto alla singola persona.

Il programma V3 prosegue senza riscrivere il V2 e senza perdere i moduli già costruiti. La nuova direzione integra cinque elementi:

1. la logica V2, stabile e già valida, come baseline e fallback;
2. i moduli V3 già implementati per utility, evidence, geometria, rischio, robustezza, spiegazione, outcome e promozione;
3. una Decision Science Library specialistica su soggiorni, comportamento dell'utente e trade-off;
4. un Decision Curriculum teacher–student per educare e verificare le policy candidate;
5. un V2 Safety Kernel/Governor che impedisca al V3 di pubblicare decisioni assurde, senza bloccare miglioramenti dimostrati.

La conversione economica è una conseguenza della qualità decisionale, non l'obiettivo interno del ranking:

```text
decisione migliore
→ maggiore fiducia
→ scelta della card
→ handoff e recheck
→ prenotazione
→ commissione
→ outcome reale
→ calibrazione offline
```

Commissioni, markup, provider preferito e valore commerciale restano fuori dalla funzione decisionale e dal Decision Trace.

---

## 2. Stato reale congelato

### 2.1 Baseline tecnica

- Branch verificato dal collector V3-10F: `main`.
- HEAD verificato: `d392fcf7aca899fcef1e1e3250ff6550bcd30ec2`.
- Repository pulito prima e dopo la raccolta.
- V2 pubblico invariato.
- V3 pubblico disabilitato e non autorevole.
- SPLIT disabilitato.
- Nessun booking, pagamento o deploy eseguito dai collector di valutazione.
- Il caricamento inutile del runtime V3 in modalità `off` è stato corretto da V3-11D: in `off` il modulo V3 non viene importato né eseguito; in `shadow` viene caricato una sola volta e resta isolato.

### 2.2 Moduli V3 costruiti e da preservare

| Milestone | Capacità | Stato operativo |
|---|---|---|
| V3-00 | Audit sorgente e baseline freeze | Completata e verificata |
| V3-01 | Contratto V3, versioning, replay e firewall commerciale | Completata |
| V3-02 | Integrità soggiorno, costo, offerta e semantica temporale | Completata |
| V3-03 | Personal Utility e Peer Intelligence | Implementata, ma policy da correggere/calibrare |
| V3-04 | Decision Geometry, Pareto, marginal value e soglie | Completata come infrastruttura |
| V3-05 | Rischio, robustezza, regret e astensione | Completata come infrastruttura |
| V3-06 | Location, room, flexibility e friction contestuali | Completata come infrastruttura |
| V3-07 | Decision Explanation in forma evidence-linked | Completata |
| V3-08 | Scala, coverage e protezione delle alternative forti | Completata |
| V3-09 | Outcome Data Loop privacy-safe e offline-only | Contratto e pipeline predisposti; outcome reali ancora da raccogliere |
| V3-10 | Evaluation e calibrazione con soglie congelate | Infrastruttura completata; campione reale insufficiente |
| V3-10A | Semantica Nuitee Public Rates | Patch completata; gate sandbox post-patch campionato PASS |
| V3-10B–10E | Ponte casi reali, astensione, HTML cieco e offerta esatta | Completati |
| V3-10F | Batch cieco reale | Raccolta PASS; risultato diagnostico sfavorevole al V3 |
| V3-11 | Shadow, canary, kill switch, rollback e promotion review | Infrastruttura completata; promozione non autorizzata |
| V3-11B–11D | Orchestrazione indipendente, runtime Results e strict-off loading | Completati |

Nessuno di questi moduli deve essere duplicato. Le nuove fasi li correggono, li alimentano o li usano come gate.

### 2.3 Evidenza Public Rates

Il gate sandbox post-patch Nuitee ha verificato un flusso campionato coerente:

`Rates → Prebook → GET Prebook → White Label reachability`

Esito del campione: PASS. Limite: non è stato eseguito browser JavaScript sul White Label e non è stato inviato alcun booking o pagamento. La coerenza deve continuare a essere verificata e legata alla decisione selezionata prima di qualunque promozione pubblica o SPLIT.

### 2.4 Evidenza V3-10F

Il collector ha prodotto:

- 12 casi tentati e 12 completati;
- 11 raccomandazioni e 1 astensione;
- 12 proiezioni pubbliche esatte;
- 6 accordi V2/V3 e 6 divergenze di selezione;
- zero divergenze di stato;
- 54 chiamate provider, zero booking e zero pagamenti;
- pacchetto cieco valido e offerta selezionata legata esattamente alla decisione.

Il PASS certifica la raccolta, non la superiorità del V3.

### 2.5 Primo risultato umano diagnostico

Sui 15 casi finora esaminati complessivamente:

| Esito | Conteggio |
|---|---:|
| Vittoria V2 | 6 |
| Vittoria V3 | 1 |
| Pareggio | 8 |
| Totale | 15 |

Con tie valutato 0,5:

- V3 effective win rate: 33,3%;
- V2 effective win rate: 66,7%.

Segnale qualitativo:

- nelle cinque divergenze Comfort/Maximum Comfort la preferenza umana è andata al V2;
- nell'unica divergenza Balanced favorevole al V3, il V3 ha prodotto un trade-off ritenuto migliore.

Questo campione è troppo piccolo per certificare una policy, ma è sufficiente per identificare un difetto strutturale e bloccare correttamente la promozione.

---

## 3. Diagnosi congelata

### 3.1 Cosa non è il problema principale

Le verifiche sul codice e sulle evidenze mostrano che:

- il profilo dichiarato viene risolto e passato al V3;
- budget, costo selezionato, durata, distanza e contesto entrano nella Personal Utility;
- il confronto cieco usa l'offerta selezionata esatta;
- il public projection binding è valido;
- il V2 pubblico non è stato modificato;
- la pipeline di raccolta non spiega il pattern di sconfitte Comfort/Maximum Comfort.

### 3.2 Difetto primario: obiettivo del budget

La funzione corrente `createBudgetUtilityV3` assegna, sotto budget, un punteggio progressivamente più alto quanto meno viene speso:

```text
budget utility = 100 − 35 × (costo / budget)^1,35
```

Quindi, anche quando due soluzioni sono entrambe ampiamente ammissibili, il risparmio inutilizzato viene premiato in tutti i profili. Questo incentivo è appropriato per Savings/Maximum Savings, ma non può guidare allo stesso modo Comfort/Maximum Comfort.

La regola corretta è:

> Il budget inutilizzato non è un beneficio in sé. È un beneficio soltanto quando il risparmio non comporta una perdita significativa rispetto all'esperienza cercata dall'utente.

### 3.3 Difetto secondario: compressione della qualità premium

Le curve a rendimenti decrescenti comprimono le differenze nella fascia alta. Una differenza materialmente importante tra due esperienze può diventare troppo piccola, mentre il risparmio di prezzo resta molto visibile.

Non si corregge aumentando arbitrariamente un peso. Devono essere preservati:

- soglie di qualità contestuali;
- interazioni tra categoria, camera, posizione, comfort e viaggio;
- sensibilità diversa per profilo;
- possibilità che un piccolo delta quantitativo rappresenti una differenza qualitativa importante.

### 3.4 Difetto di ruolo

Il V3 seleziona una soluzione primaria e solo successivamente la etichetta rispetto alla scelta V2:

- più economica → `best-sensible-saving`;
- più costosa → `worthwhile-comfort-upgrade`;
- stesso costo/stessa soluzione → `best-choice`.

Questo può trasformare una buona alternativa economica nella sola raccomandazione V3 sottoposta contro la Best Choice V2. Il problema è doppio:

1. la policy primaria può scegliere il ruolo sbagliato;
2. il protocollo può confrontare due ruoli differenti come se rispondessero alla stessa domanda.

La nuova valutazione dovrà confrontare:

- Best Choice contro Best Choice;
- Best Sensible Saving contro Best Sensible Saving;
- Worthwhile Comfort Upgrade contro Worthwhile Comfort Upgrade;
- SPLIT contro il miglior single-stay, con frizione esplicita.

### 3.5 Limite della robustezza

La Robustness Engine testa variazioni della funzione esistente. Se l'obiettivo di base è sbagliato, la robustezza può rendere stabile una decisione coerentemente sbagliata. Robustezza non equivale a correttezza dell'obiettivo.

---

## 4. Costituzione decisionale V3

### 4.1 Unità fondamentale

L'unità valutata è `StaySolution`, non l'hotel astratto. Una soluzione comprende:

- struttura;
- camera;
- occupazione corretta;
- offerta e condizioni;
- costo totale reale e tasse;
- posizione e tempi rilevanti;
- cancellazione e flessibilità;
- evidence, confidence e rischio;
- single-stay oppure split-stay verificato.

### 4.2 Gerarchia degli obiettivi

1. rispettare vincoli hard e integrità dell'offerta;
2. capire intento e preferenze dichiarate/inferite;
3. massimizzare l'esperienza coerente con quel profilo;
4. valutare costo-opportunità e marginal value;
5. separare scelta primaria, risparmio e upgrade;
6. verificare robustezza, rischio e confidence;
7. astenersi quando le prove non bastano.

### 4.3 Semantica dei cinque profili

| Profilo | Funzione decisionale primaria |
|---|---|
| Maximum Comfort | Massimizzare qualità ed esperienza coerente entro budget; prezzo come vincolo e tie-breaker, non premio automatico al non-speso |
| Comfort | Privilegiare comfort, location, camera e qualità; alternativa più economica solo se la perdita è entro una tolleranza calibrata |
| Balanced | Ottimizzare il trade-off complessivo e il valore marginale per euro |
| Savings | Ridurre il costo rispettando una soglia minima di esperienza e qualità |
| Maximum Savings | Prezzo prioritario dopo vincoli hard, sicurezza e soglia minima non negoziabile |

### 4.4 Ruoli pubblici

- **Best Choice:** migliore esperienza coerente con intento, budget e vincoli.
- **Best Sensible Saving:** massimo risparmio con perdita di esperienza accettabile e spiegata.
- **Worthwhile Comfort Upgrade:** miglioramento che giustifica il costo aggiuntivo.
- **Smart Split/Split Saver:** configurazione multi-struttura il cui vantaggio netto supera frizione, switching cost e rischio.
- **Astensione/Near tie:** nessuna raccomandazione forzata quando le evidenze non permettono una scelta robusta.

### 4.5 Firewall commerciale

Il motore non riceve né usa:

- commissione prevista;
- provider più remunerativo;
- markup commerciale;
- probabilità di click usata come obiettivo di ranking;
- valore economico dell'utente.

Questi dati possono essere misurati a valle per il business, ma non possono decidere quale soggiorno sia migliore.

---

## 5. Architettura target

```text
Search context + vincoli + preferenze
                    ↓
Canonical StaySolution + costo + bookability
                    ↓
Evidence / provenance / freshness / coverage
                    ↓
Peer Intelligence
                    ↓
Decision Science Library
                    ↓
Personal Utility + intent + risk per dimensione
                    ↓
Role-aware portfolio: Choice / Saving / Upgrade / Split
                    ↓
Pareto + marginal value + counterfactuals
                    ↓
Robustness + regret + abstention
                    ↓
V2 Safety Governor e divergence proof
                    ↓
Decision Thesis + recheck + handoff
                    ↓
Outcome → calibrazione offline → policy candidata
```

### 5.1 V2 come tutore, non come padrone

Durante la maturazione:

- V2 produce sempre la propria decisione stabile;
- V3 produce una decisione candidata indipendente;
- il Safety Governor confronta decisioni, ruoli, vincoli ed evidenze;
- V3 può superare V2 solo con una divergence proof valida;
- se la prova manca, viene servito V2;
- se entrambe le opzioni sono deboli, il sistema può astenersi.

V2 non è verità assoluta. Un veto automatico su ogni divergenza impedirebbe al V3 di migliorare. Nel tempo le proprietà più affidabili del V2 saranno formalizzate in un Safety Kernel indipendente e versionato.

### 5.2 Decision Science Library

Non sarà una raccolta indiscriminata di testi. Ogni unità di conoscenza dovrà contenere:

- identificativo e versione;
- proposizione decisionale;
- fonte e tipo di fonte;
- popolazione e contesto;
- qualità/forza dell'evidenza;
- limiti e possibili bias;
- data di validità/revisione;
- dimensioni StayOpti interessate;
- condizioni in cui non è applicabile;
- test o casi collegati.

### 5.3 Decision Curriculum

Il curriculum sarà un asset proprietario composto da:

- casi reali redatti e privi di PII;
- casi sintetici controllati;
- casi avversariali;
- controfattuali;
- near tie;
- no-good-option;
- errori storici V2 e V3;
- differenze per profilo, durata, lead time, destinazione, composizione del gruppo e coverage;
- casi SPLIT con saving e frizione variabili.

### 5.4 Teacher Lab offline

L'assistente opera come chief teacher e ricercatore, non come oracolo. Per ogni lezione deve produrre:

- Best Choice;
- Best Sensible Saving;
- eventuale Comfort Upgrade;
- eventuale SPLIT;
- sacrificio principale;
- variabile decisiva;
- counterfactual di cambio scelta;
- confidence e limiti;
- eventuale astensione;
- riferimenti alle conoscenze usate.

Le risposte teacher sono supervisioni candidate. Non diventano automaticamente ground truth o policy pubblica.

### 5.5 Policy distillation

Le lezioni possono alimentare:

- regole deterministiche;
- curve non lineari;
- soglie contestuali;
- modelli pairwise calibrati;
- interazioni tra preferenze;
- policy candidate versionate.

Ogni candidata resta offline finché non supera Golden Dataset, test ciechi, Safety Governor e promotion gate.

---

## 6. Programma di ricerca specialistica

### 6.1 Ambiti obbligatori

- hospitality e guest satisfaction;
- psicologia della scelta ed economia comportamentale;
- willingness to pay e valore percepito;
- UX, choice architecture e decision overload;
- hotel operations e revenue management;
- qualità di camera, sonno, rumore, pulizia e manutenzione;
- posizione, accessibilità e tempi di viaggio;
- cancellazione, rischio e flessibilità;
- aspettative premium e lusso;
- recensioni, provenance e review reliability;
- famiglie, coppie, business, gruppi e solo travel;
- soggiorni lunghi e costo della frizione;
- accessibilità e bisogni non negoziabili;
- split-stay, switching cost e avversione al cambio.

### 6.2 Gerarchia delle fonti

1. meta-analisi, systematic review e studi peer-reviewed;
2. standard ufficiali e fonti istituzionali;
3. manuali e testi specialistici legalmente accessibili;
4. dataset pubblici o concessi in licenza;
5. ricerca qualitativa, interviste e test utenti;
6. review corpus utilizzabili legalmente e con provenance;
7. outcome proprietari StayOpti, dopo consenso e privacy gate.

Non è necessario né possibile leggere letteralmente ogni libro esistente. L'obiettivo è una copertura sistematica, versionata e falsificabile, non una biblioteca decorativa.

### 6.3 Principio anti-generalizzazione

Nessun segnale è universalmente premium. Colazione, stelle, centro, camera grande, cancellazione, silenzio o servizi valgono diversamente a seconda di persona e viaggio. La Library deve produrre prior informati, non gusti universali.

---

## 7. V2 Safety Kernel e Safety Governor

### 7.1 Output del Governor

Il Governor restituisce uno dei seguenti esiti:

- `approve-v3`;
- `serve-v2-fallback`;
- `abstain`;
- `manual-review-required` solo offline/canary.

### 7.2 Veto hard

V3 non può essere approvato se:

- viola un vincolo hard;
- usa un'offerta non integra o non prenotabile;
- perde una camera/occupazione essenziale;
- seleziona una soluzione fortemente dominata;
- confronta peer incompatibili;
- usa dati mancanti come svantaggio inventato;
- confonde Best Choice, Saving o Upgrade;
- presenta una divergence proof mancante o incoerente;
- dipende da commissione/provider;
- propone SPLIT senza evidenza completa o vantaggio netto materiale;
- è instabile oltre i limiti congelati;
- contiene una regressione critica.

### 7.3 Divergence proof

Quando V3 supera V2 deve registrare:

- scelta V2 e scelta V3;
- ruolo confrontato;
- differenze materiali;
- evidenze decisive;
- costo/saving/premium;
- sacrificio;
- counterfactual di inversione;
- robustezza;
- confidence per dimensione;
- codice di approvazione del Governor.

Una semplice differenza di punteggio non è una prova sufficiente.

### 7.4 Evoluzione del Kernel

Fase iniziale: V2 completo in parallelo.  
Fase successiva: estrazione delle invarianti V2 affidabili in un kernel indipendente.  
Fase matura: V2 resta replay/fallback di emergenza finché gli outcome non dimostrano che il kernel è sufficiente.

---

## 8. Nuova scaletta operativa

### V3-12A — Decision Constitution & Diagnostic Freeze

**Obiettivo:** trasformare le decisioni di prodotto appena approvate in contratti e casi riproducibili, senza cambiare ancora il comportamento pubblico.

Deliverable:

- costituzione decisionale versionata;
- tassonomia Choice/Saving/Upgrade/Split/Astention;
- semantica dei cinque profili;
- root-cause report V3-10F;
- 15 casi già giudicati trasformati in fixture diagnostiche;
- test di budget expansion, role separation e profile coherence;
- protocollo cieco role-aware;
- baseline di tutti i test V2/V3.

Gate:

- V2 invariato;
- V3 pubblico off;
- SPLIT off;
- nessuna soglia cambiata dopo i risultati;
- diagnosi riproducibile dal codice;
- test esistenti PASS.

### V3-12B — Role-aware Blind Evaluation Repair

**Obiettivo:** impedire confronti Best Choice contro Saving/Upgrade come se fossero la stessa decisione.

Deliverable:

- pacchetto cieco separato per ruolo;
- deblind deterministico;
- reason diff per ruolo;
- astensione valutata separatamente;
- test anti-role-leak e anti-label-leak.

Gate: lo stesso caso non può dichiarare vincitore un ruolo diverso senza esplicita domanda di valutazione.

### V3-13 — Decision Science Library v1

**Obiettivo:** costruire la prima base specialistica verificabile prima di finalizzare la nuova policy.

Deliverable:

- protocollo di ricerca;
- source registry;
- claim schema;
- primi domini core: budget, qualità, comfort, posizione, camera, flessibilità e soggiorni lunghi;
- mappa evidenza → dimensione → test;
- red-team dei bias culturali e contestuali.

Gate: nessun claim entra nella policy senza fonte, ambito, forza, limiti e test associato.

### V3-14 — Decision Curriculum & Teacher Lab v1

**Obiettivo:** trasformare conoscenza e casi in lezioni strutturate.

Deliverable:

- schema lesson/case;
- schema teacher judgment;
- protocollo confidence/abstention;
- casi per tutti e cinque i profili;
- casi avversariali e controfattuali;
- disagreement set tra teacher, V2, V3 e umani;
- curriculum fingerprintato e versionato.

Gate: nessun output teacher diventa ground truth automaticamente; ogni lezione conserva evidenza e incertezza.

### V3-15 — Personal Utility & Role Policy Candidate

**Obiettivo:** correggere l'obiettivo decisionale e produrre una nuova policy V3 offline.

Deliverable:

- budget trattato come vincolo/tetto nei profili comfort-first;
- opportunity cost calibrato e dipendente dal profilo;
- qualità premium non cancellata dalla compressione;
- portfolio role-aware;
- saving con quality-loss tolerance esplicita;
- upgrade con marginal value esplicito;
- nuova `policyVersion` e replay deterministico;
- explanation aggiornata.

Invarianti minime:

1. aumentare il budget non deve far scegliere a Maximum Comfort un'opzione qualitativamente peggiore solo perché economica;
2. una soluzione gratuita materialmente migliore non può peggiorare la scelta;
3. una soluzione dominata non può diventare Best Choice;
4. Saving non può sostituire Choice senza prova di perdita trascurabile;
5. profili diversi devono poter produrre scelte diverse sullo stesso set;
6. missing evidence non diventa penalità inventata.

Gate: tutti i casi diagnostici devono avere ruolo e comportamento coerenti, senza regressione dei casi Balanced in cui V3 ha già mostrato valore.

### V3-16 — V2 Safety Kernel & Runtime Governor

**Obiettivo:** rendere V2 il tutore operativo del V3 durante shadow e canary.

Deliverable:

- decision comparator V2/V3;
- hard veto registry;
- divergence proof;
- fallback e astensione fail-closed;
- telemetria aggregata priva di PII/provider/commissioni;
- test di errore, timeout e corruzione V3;
- kill switch e rollback verificati.

Gate: un errore, un'import failure o una decisione V3 invalida non modifica mai l'output V2 pubblico.

### V3-17 — Golden Decision Dataset reale

**Obiettivo:** costruire il campione necessario a una valutazione falsificabile.

Soglie già congelate:

- almeno 200 casi Golden;
- almeno 40 avversariali;
- almeno 40 controfattuali;
- almeno 300 giudizi umani ciechi;
- almeno 100 giudizi esperti ciechi;
- almeno 20 astensioni valutabili;
- almeno 100 replay provider-neutral.

I 15 giudizi correnti entrano come diagnostica e possibili fixture, ma non vengono presentati come prova statistica finale.

Gate quantitativi già congelati:

- normalized regret V3 ≤ 0,20;
- miglioramento regret sul V2 ≥ 0,02;
- pairwise win rate V3 ≥ 0,55 per umani e per esperti;
- expected calibration error V3 ≤ 0,10 e nessuna regressione V2;
- precisione astensione ≥ 0,80;
- robust-choice rate ≥ 0,80;
- instability rate ≤ 0,10;
- gap massimo di regret tra segmenti ≤ 0,10;
- provider-dependence gap ≤ 0,05;
- zero regressioni critiche.

### V3-18 — Outcome Pilot

**Obiettivo:** verificare se la decisione resta buona dopo il soggiorno.

Eventi minimi:

- decisione mostrata e policy version;
- card scelta o abbandono;
- handoff e recheck;
- prenotazione attribuibile senza dati eccedenti;
- scelta diversa e motivo;
- soddisfazione post-stay;
- “rifaresti la stessa scelta?”;
- rimpianto e causa principale.

Gate:

- consenso valido;
- nessun PII nel Decision Trace;
- retention/cancellazione testate;
- policy candidate solo offline;
- nessuna auto-modifica in produzione.

### V3-19 — Temporal Stay Optimization / Smart Split

**Obiettivo:** insegnare al motore a scegliere la migliore configurazione di soggiorno, non soltanto il miglior hotel.

Vincoli iniziali:

- massimo due strutture;
- massimo un cambio;
- segmenti contigui e nessuna notte scoperta;
- prezzo e disponibilità per notte/segmento;
- recheck completo;
- qualità minima preservata;
- distanza e trasferimento valutati;
- switching cost, tempo, bagagli, rischio e frizione espliciti;
- confronto contro il miglior single-stay;
- nessuna card se il vantaggio è marginale, fragile o non verificabile.

Gate: single-stay V3-17 superato e Public Rates verdi. SPLIT non viene usato per compensare una policy single-stay ancora immatura.

### V3-20 — Shadow, Guarded Canary e Public Eligibility

**Sequenza obbligatoria:**

1. `off`: solo V2 e zero import V3;
2. `shadow`: V2 pubblico, V3 non autorevole;
3. `guarded-shadow`: Governor attivo e divergence audit;
4. `canary`: quota limitata, V2 fallback immediato;
5. `public-eligible`: solo dopo tutti i gate;
6. autorizzazione manuale esplicita;
7. rollout reversibile e monitorato.

Nessuna promozione automatica è ammessa.

---

## 9. Test permanenti obbligatori

### 9.1 Integrità

- costo totale, tasse e valuta coerenti;
- camera e occupazione esatte;
- condizioni e cancellazione legate all'offerta;
- recheck decision-bound;
- provider order invariance;
- determinismo stesso input/versione.

### 9.2 Decisione

- budget expansion monotonicity;
- profile ordering/coherence;
- Pareto dominance;
- role separation;
- saving quality floor;
- upgrade marginal value;
- no universal premium assumption;
- counterfactual consistency;
- near-tie e no-good-option;
- missing data neutrality.

### 9.3 Safety

- V3 failure → V2 invariato;
- V3 timeout → V2 invariato;
- invalid fingerprint → fallback;
- commercial field injection → rifiuto;
- unjustified divergence → fallback;
- critical regression → promotion blocked;
- split marginale → non raccomandato;
- policy mutation → fingerprint failure.

### 9.4 Valutazione umana

- randomizzazione cieca;
- ruoli omogenei;
- label nascoste;
- evaluator pseudonimi;
- duplicati rifiutati;
- risultato separato per profilo e segmento;
- tie ammesso;
- astensione valutabile.

---

## 10. Metriche di prodotto e business

### 10.1 Metriche primarie decisionali

- probabilità di rifare la stessa scelta;
- normalized regret;
- pairwise win rate contro V2;
- stabilità e robust-choice;
- calibration error;
- precisione/coverage dell'astensione;
- denaro risparmiato senza perdita di qualità;
- qualità guadagnata per euro aggiuntivo;
- tempo necessario per decidere;
- fairness e provider independence.

### 10.2 Metriche commerciali a valle

- recommendation/card acceptance;
- apertura dettagli;
- handoff rate;
- recheck success rate;
- booking conversion;
- commissione generata;
- cancellazione/abbandono;
- conversione per ruolo e profilo.

Regola: una policy che aumenta click o commissioni ma peggiora regret, soddisfazione o fairness non viene promossa.

---

## 11. Cose che non faremo

- Non riscriveremo il V2.
- Non aggiungeremo parametri solo per rendere il V3 più complesso.
- Non useremo l'assistente come oracolo infallibile.
- Non useremo output teacher come ground truth automatica.
- Non consentiremo auto-learning o auto-deploy in produzione.
- Non ottimizzeremo il ranking per commissione o click.
- Non faremo del V2 un veto assoluto su ogni innovazione.
- Non confronteremo ruoli differenti nello stesso giudizio cieco.
- Non abiliteremo SPLIT prima della maturità single-stay.
- Non pubblicheremo claim di superiorità senza campione e metriche valide.
- Non presenteremo il V3 come pronto solo perché contiene più moduli.

---

## 12. Protocollo operativo dei pacchetti

Per ogni patch, collector o runner destinato a Mattia:

1. consegnare un solo file operativo;
2. usare un collegamento diretto all'artefatto;
3. preferire un singolo `.ps1` quando tecnicamente sicuro e sufficiente;
4. se servono più file, consegnare un solo ZIP con un unico blocco PowerShell che verifica, estrae in temporanea ed esegue senza navigazione manuale;
5. non richiedere a Mattia di aprire lo ZIP, cercare cartelle o lanciare manualmente file interni;
6. evitare checksum come allegato separato; includere la verifica nel comando quando necessaria;
7. usare nomi prevedibili e non assumere un filename differente da quello realmente scaricato;
8. produrre un solo Evidence ZIP finale da ricaricare;
9. indicare in anticipo eventuali chiamate provider a pagamento;
10. dopo un FAIL: causa radice → test regressivo → nuova versione, senza ripetere alla cieca.

Il comportamento dell'interfaccia ChatGPT sul download può dipendere dal client; dal lato della consegna verrà sempre fornito il link più diretto disponibile, senza cartelle intermedie o allegati superflui.

---

## 13. Ruoli operativi

### Assistente / CTO operativo

- ricerca e sintesi delle evidenze;
- architettura e contratti;
- implementazione;
- test e red-team;
- collector e pacchetti;
- analisi dei risultati;
- proposta di policy candidate;
- blocco della promozione quando le prove non bastano.

### Mattia / Product Founder e giudice umano iniziale

- approvazione della costituzione di prodotto;
- valutazione di scenari concreti e comprensibili;
- correzione dell'intento quando il motore interpreta male la promessa;
- autorizzazione manuale dei passaggi di rollout;
- nessun obbligo di interpretare metriche o dettagli tecnici interni.

### Valutatori esterni futuri

- giudizi umani ciechi;
- giudizi esperti ciechi;
- ricerca qualitativa e outcome;
- nessun accesso alle label V2/V3 durante la valutazione.

---

## 14. Definition of Done finale

Il V3 sarà considerato pronto soltanto quando:

1. comprende e separa i cinque profili senza ridurli a pesi lineari superficiali;
2. distingue correttamente Best Choice, Saving, Upgrade e Split;
3. il budget è interpretato coerentemente con l'intento;
4. la Decision Science Library è versionata e collegata a test;
5. il Curriculum copre casi reali, avversariali e controfattuali;
6. le policy teacher-derived sono verificate da umani e outcome;
7. il Safety Governor impedisce decisioni invalide e regressioni critiche;
8. il V3 batte il V2 sui gate congelati;
9. il prezzo/offerta resta coerente fino al recheck;
10. la scelta è spiegabile in circa dieci secondi;
11. il sistema sa astenersi;
12. l'Outcome Loop misura “rifaresti la stessa scelta?”;
13. SPLIT viene promosso solo quando il vantaggio netto è materiale e verificato;
14. nessuna commissione influenza il ranking;
15. rollout, kill switch e rollback sono verificati;
16. l'autorizzazione pubblica resta manuale e reversibile.

---

## 15. Prossimo passo operativo

Il prossimo pacchetto sarà:

> **StayOpti-V3-12A-Decision-Constitution-Diagnostic-Freeze-v1**

Ordine interno:

1. verificare il repository reale sul nuovo HEAD atteso;
2. congelare formalmente questa costituzione;
3. trasformare i 15 casi già giudicati in fixture diagnostiche prive di PII;
4. aggiungere invarianti e protocollo role-aware;
5. eseguire V2 tests, V3 tests, lifecycle, typecheck e build;
6. lasciare V2 pubblico, V3 off/shadow e SPLIT off;
7. produrre un unico Evidence ZIP.

Solo dopo la chiusura V3-12A inizierà la costruzione sistematica della Decision Science Library V3-13.

---

## 16. Formula sintetica della direzione

> **V2 protegge. V3 comprende. La Library informa. Il Curriculum insegna. Il Governor controlla. Gli umani e gli outcome decidono se la policy merita di diventare pubblica.**

