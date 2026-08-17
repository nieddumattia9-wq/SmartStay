# SMARTSTAY — PROJECT SOURCE OF TRUTH

**Versione:** 1.0  
**Data snapshot:** 22 luglio 2026  
**Scopo:** fonte permanente da caricare nelle Fonti del progetto ChatGPT, così ogni nuova chat possa capire come ragionare, progettare, revisionare e sviluppare SmartStay senza ricostruire ogni volta l’intera storia.

---

## 0. COME USARE QUESTO DOCUMENTO

Questo file è la **costituzione del progetto SmartStay**. Contiene:

- visione e posizionamento;
- filosofia del prodotto;
- principi UX;
- principi dell’Engine;
- architettura tecnica;
- regole di sicurezza, test e sviluppo;
- modalità di collaborazione tra Mattia e l’assistente;
- stato tecnico noto al momento dello snapshot;
- roadmap e priorità.

### Regola di autorità

Quando esiste un conflitto tra fonti, usare questo ordine:

1. **Codice reale e audit più recente del repository**;
2. **decisione esplicita più recente di Mattia**;
3. **questo documento**;
4. vecchie chat, vecchi recap o ipotesi precedenti.

La sezione “Stato attuale” è uno snapshot e può diventare obsoleta. I principi di prodotto, UX e architettura restano validi finché Mattia non li modifica esplicitamente.

### Regola fondamentale per ogni nuova chat

Non inventare mai lo stato del repository. Se un dettaglio tecnico non è certo:

- chiedere un audit o i file coinvolti;
- leggere la versione corrente prima di proporre patch;
- interrompere l’installazione se lo stato atteso non coincide con quello reale;
- non sovrascrivere lavoro più recente con script costruiti su audit vecchi.

---

# 1. IDENTITÀ DEL PROGETTO

## 1.1 Nome

**SmartStay**

## 1.2 Claim principale

> **SmartStay non trova il soggiorno più economico. Trova la scelta più intelligente.**

Versione inglese:

> **SmartStay does not find the cheapest stay. It finds the smartest choice.**

Possibili frasi di posizionamento:

- **Before you book, check SmartStay.**
- **The smartest way to find your stay.**
- **Spend less time searching. More time traveling.**
- **Find the smartest way to travel.**

## 1.3 Visione

SmartStay deve diventare il sito che una persona apre **prima di prenotare**, per capire quali siano le poche soluzioni che hanno davvero senso tra le offerte disponibili.

La relazione desiderata con le OTA è:

```text
Booking, Airbnb e altri provider
= inventario, disponibilità e prenotazione

SmartStay
= analisi, confronto, interpretazione e decisione
```

La frase mentale dell’utente deve diventare:

> “Prima guardo SmartStay, poi prenoto dove mi conviene.”

SmartStay non deve vincere perché possiede più inventario di Booking. Deve vincere perché **riduce il caos e aiuta a scegliere meglio**.

## 1.4 Problema che risolve

Oggi l’utente:

- vede liste enormi e ripetitive;
- confronta manualmente prezzo, posizione, qualità, recensioni e condizioni;
- non sa quando conviene spendere di più;
- non sa se l’opzione più economica sia realmente sensata;
- non distingue bene un buon affare da un risultato rischioso o incompleto;
- perde tempo tra più siti;
- può essere fuorviato da prezzi per notte, costi esclusi, categorie differenti e rating non comparabili.

SmartStay deve trasformare questo processo in:

> **poche raccomandazioni diverse, motivate, affidabili e coerenti con quella specifica persona e ricerca.**

## 1.5 Promessa del prodotto

SmartStay deve aiutare l’utente a:

- scegliere più rapidamente;
- capire il costo reale;
- evitare falsi risparmi;
- valutare i compromessi;
- distinguere qualità da affidabilità dei dati;
- capire cosa ottiene pagando qualcosa in più;
- capire quando un upgrade non vale il prezzo;
- prenotare con maggiore fiducia.

---

# 2. COSA SMARTSTAY È E COSA NON È

## 2.1 SmartStay è

- un **decision engine per soggiorni**;
- un layer intelligente sopra dati e offerte di provider esterni;
- un sistema di ranking personalizzato e spiegabile;
- un prodotto orientato al **best value**, non al prezzo minimo;
- un’interfaccia che presenta poche scelte con ruoli diversi;
- un progetto B2C con possibile evoluzione futura B2B/API/white-label.

## 2.2 SmartStay non è

- un clone di Booking;
- una lista infinita ordinata per prezzo;
- un sito “discount” o cheap;
- una scatola nera che usa la parola AI per sembrare intelligente;
- un comparatore che finge di avere fonti non integrate;
- un sistema che nasconde rischi o dati mancanti;
- un prodotto nel quale la commissione commerciale determina il ranking organico;
- un progetto che deve integrare subito ogni provider o ogni funzione immaginabile.

## 2.3 Posizionamento competitivo

Non comunicare semplicemente:

> “Cerchiamo su tanti siti.”

Questa funzione è già comune.

La differenziazione deve essere:

> **“Trasformiamo molte offerte in poche decisioni intelligenti e ti mostriamo esattamente cosa guadagni e cosa perdi con ogni scelta.”**

La vera originalità di SmartStay deriva dalla combinazione di:

- Evidence Model;
- Reliability Gate;
- valutazione category-aware;
- peer group corretti;
- Price & Value Engine;
- separazione confidence/risk;
- Recommendation Roles;
- Pareto Frontier;
- Smart Upgrade Curve;
- spiegazioni basate su dati;
- confronti controfattuali;
- stabilità e diversità del ranking;
- futuro multi-stay.

---

# 3. PRINCIPI GUIDA NON NEGOZIABILI

## 3.1 I cinque pilastri

1. **Risultati reali e affidabili**  
   Prezzi, disponibilità, rating, immagini, posizione, camere, tasse e condizioni devono essere solidi.

2. **SmartScore e ranking forti**  
   Non ordinare soltanto per prezzo. Valutare valore reale, qualità, posizione, servizi, flessibilità, rischio e preferenze.

3. **Spiegazione del consiglio**  
   Ogni raccomandazione importante deve poter spiegare perché è stata scelta e quali compromessi comporta.

4. **Trasparenza delle fonti e dell’incertezza**  
   Un dato assente non va inventato. L’utente deve essere protetto dall’eccesso di sicurezza del sistema.

5. **Rispetto di comfort e stress**  
   Il risparmio non deve distruggere l’esperienza del viaggio. Il prezzo più basso non è automaticamente valore.

## 3.2 AI invisibile

L’utente non deve percepire SmartStay come “un chatbot che improvvisa”. Deve percepire:

> “Qualcuno ha già fatto il lavoro difficile per me.”

L’AI può aiutare internamente, ma le decisioni devono essere:

- deterministiche quando gli input sono identici;
- verificabili;
- spiegabili;
- fondate esclusivamente su evidence disponibile.

Un modello linguistico può eventualmente migliorare la forma di una frase, ma **non può inventare la ragione della raccomandazione**.

Flusso corretto:

```text
Evidence verificata
→ regola esplicativa deterministica
→ eventuale riscrittura linguistica controllata
```

Flusso vietato:

```text
Dati hotel + prompt generico
→ AI inventa perché è consigliato
```

## 3.3 Provider-agnostic obbligatorio

Ogni componente centrale deve essere sostituibile e indipendente da LiteAPI, RouteStack o qualsiasi altro provider.

Il dominio SmartStay non deve conoscere:

- nomi specifici dei provider;
- payload proprietari;
- codici di errore proprietari;
- regole commerciali interne di un singolo provider.

Architettura desiderata:

```text
API provider
→ adapter specifico
→ normalizzazione canonica SmartStay
→ orchestratore
→ SmartStay Engine
→ presenter pubblico
→ frontend
```

I provider possono cambiare. Il motore e il frontend non devono essere riscritti per questo.

## 3.4 Il ranking deve restare neutrale

```text
Recommendation score ≠ commissione per SmartStay
```

Il margine commerciale o la commissione non deve alterare il ranking organico. Un eventuale risultato sponsorizzato deve essere separato e dichiarato.

## 3.5 Nessuna complessità prematura

Ogni nuova funzione deve rispondere a una domanda:

> “Migliora concretamente la decisione dell’utente o riduce un rischio reale?”

Se la risposta è no, va rimandata.

---

# 4. FILOSOFIA UX

## 4.1 Obiettivo UX principale

L’utente deve capire senza spiegazioni esterne:

- cosa fa SmartStay;
- cosa deve inserire;
- perché il risultato consigliato è sensato;
- quale alternativa scegliere se vuole risparmiare o migliorare comfort/posizione;
- quali sono i limiti o le incertezze.

La UX deve ridurre il carico decisionale, non trasferire all’utente la complessità del motore.

## 4.2 Home

La Home deve essere pulita, premium e immediata.

Input fondamentali:

- destinazione;
- date;
- ospiti e camere;
- distanza massima;
- budget totale;
- profilo/preferenza quando deciso dalla UX.

Decisioni note:

- il vecchio Preference Slider è stato temporaneamente rimosso dalla Home;
- il motore supporta comunque i profili interni;
- il preset temporaneo può essere `balanced`;
- non reintrodurre lo slider senza una decisione UX esplicita;
- budget slider 100–5.000 € con input manuale libero;
- distanza: 500 m, 1 km, 2 km, 5 km, 10 km, qualsiasi;
- il budget riguarda il **totale reale del soggiorno**, non una cifra ambigua per notte.

Il frontend attuale usa principalmente l’inglese. Evitare testi metà italiani e metà inglesi nella stessa esperienza.

## 4.3 Risultati: shortlist, non lista infinita

SmartStay deve presentare prima le decisioni, non cinquantacinque card equivalenti.

Ruoli desiderati:

- **SmartStay Pick / Best Choice**;
- **Cheapest Sensible / Miglior risparmio sensato**;
- **Comfort Upgrade / Upgrade comfort conveniente**;
- **Best Location / Migliore posizione**.

Questi ruoli devono essere realmente differenti. Non mostrare quattro varianti quasi identiche con badge diversi.

Le strutture rimanenti possono essere disponibili, ma in forma secondaria e più compatta.

## 4.4 Le card devono essere progressive

- La Best Choice può essere ricca.
- Le alternative principali devono mostrare il trade-off essenziale.
- La lista completa deve essere compatta.
- Le spiegazioni estese possono essere espandibili.
- Non ripetere quattro bullet generici su ogni card.

## 4.5 Linguaggio umano, non gergo interno

Esempi vietati:

- “Guest quality is a clear strength.”
- “Costa il 487,5% in più della media dei soggiorni comparabili.”
- “Market percentile strongly supports this candidate.”
- nomi interni di dimensioni o provider.

Esempi corretti:

- “Gli ospiti valutano molto bene questa struttura.”
- “Le recensioni sono numerose e rendono il giudizio più affidabile.”
- “Costa 24 € più della scelta economica, ma è molto più vicina al centro.”
- “Il prezzo è alto anche rispetto alle alternative premium: sceglila soltanto se il livello di comfort aggiuntivo per te vale la differenza.”

Le percentuali tecniche possono restare nell’Engine o nei dettagli avanzati. Non vanno usate automaticamente come copy principale.

## 4.6 Vantaggi e compromessi devono essere separati

Ogni raccomandazione importante dovrebbe poter mostrare:

**Perché la consigliamo**

- 1–3 vantaggi realmente discriminanti.

**Cosa devi sapere**

- 1–2 compromessi concreti.

Una caratteristica negativa non deve comparire dentro le ragioni positive.

## 4.7 Confronti corretti

Non confrontare implicitamente prodotti diversi come se fossero equivalenti.

Esempio scorretto:

> “Questo hotel costa 921 € più del camping.”

Esempio corretto:

> “Costa 921 € più della scelta più economica, che però è un camping, ha una categoria diversa ed è più lontano.”

I confronti principali devono usare peer group realmente comparabili.

## 4.8 Rating e SmartStay Score non sono la stessa cosa

Distinguere visivamente e semanticamente:

- **Guest rating:** opinione degli ospiti sulla struttura;
- **SmartStay fit/score:** quanto quella specifica offerta è adatta alla ricerca corrente.

Un hotel con rating 9,8 può avere SmartStay fit inferiore se:

- è molto oltre budget;
- è lontano;
- ha condizioni peggiori;
- offre poco valore relativo;
- ha dati incompleti sull’offerta specifica.

## 4.9 Confidence e risk non vanno duplicati

Non mostrare badge ripetuti come:

- Low Risk;
- low risk;
- Solid Data;
- High Data Confidence.

Separare chiaramente:

- qualità dell’alloggio/offerta;
- affidabilità della valutazione;
- rischio della scelta.

Mostrare solo ciò che aiuta davvero la decisione.

## 4.10 Stato commerciale trasparente

Distinguere:

- prenotabile tramite SmartStay;
- prenotabile presso partner tramite handoff/deeplink;
- confrontabile ma senza link immediato;
- richiede verifica/prebook.

Non far sembrare immediatamente prenotabile un risultato che non lo è.

## 4.11 Mobile-first

La beta deve essere utilizzabile da smartphone. Evitare:

- card troppo alte;
- testi lunghi sempre aperti;
- badge ridondanti;
- pulsanti ambigui;
- layout che richiedono confronto visivo su schermi larghi.

---

# 5. BRAND E TONO

## 5.1 Personalità del brand

SmartStay deve comunicare:

- fiducia;
- calma;
- intelligenza;
- trasparenza;
- valore premium;
- risparmio sensato, non disperato.

Non deve comunicare:

- urgenza aggressiva;
- sconto permanente;
- gaming/crypto/neon;
- eccesso di tecnicismo;
- superiorità non dimostrata.

## 5.2 Palette approvata

- Verde logo/principale: `#16C65B`
- Verde CTA: `#059669`
- Verde premium scuro: `#047857`
- Verde chiaro sfondi/card: `#ECFDF5`
- Verde balanced: `#22C55E`
- Verde maximum savings: `#10B981` oppure `#059669`

Evitare il verde neon `#00F57A` come colore dominante.

## 5.3 Tono del copy

Il copy deve essere:

- diretto;
- semplice;
- competente;
- onesto sui limiti;
- orientato all’utente;
- privo di espressioni da laboratorio.

---

# 6. MODELLO MENTALE DELLO SMARTSTAY ENGINE

## 6.1 Il prodotto vero è il motore

Frontend, provider e marketing sono necessari, ma la ragione per cui l’utente dovrebbe usare SmartStay è:

> **SmartStay interpreta le offerte meglio di una normale lista ordinata per prezzo o popolarità.**

## 6.2 Unità corretta da valutare

L’Engine non deve valutare soltanto “l’hotel” in astratto. La decisione reale riguarda un candidato composto da:

```text
Accommodation
+ specifica offerta
+ camera/unità
+ occupazione
+ prezzo totale
+ tasse e fee note
+ trattamento
+ condizioni di cancellazione
+ disponibilità/bookability
```

Lo stesso hotel può avere un’offerta ottima e un’offerta pessima. La raccomandazione deve riferirsi all’offerta effettivamente mostrata.

## 6.3 Pipeline concettuale

```text
1. Normalizzazione provider
2. Validazione e bookability
3. Evidence Model
4. Eligibility / Reliability Gate
5. Category Model
6. Peer Groups
7. Price & Value
8. Quality
9. Location
10. Comfort & Flexibility
11. Data Confidence
12. Choice Risk
13. User Utility
14. Pareto Frontier
15. Recommendation Roles
16. Smart Upgrade Curve
17. Counterfactual Comparisons
18. Ranking Stability & Diversity
19. Evidence-based Explanations
20. Frontend adapter / public presenter
```

## 6.4 Eligibility prima del ranking

Un risultato non deve ricevere soltanto “meno punti” se è invalido.

Classi canoniche:

- `INVALID`
- `LOW_CONFIDENCE`
- `USABLE`
- `STRONG_DATA`

Gli elementi invalidi non devono essere raccomandati.

Un risultato `LOW_CONFIDENCE` può eventualmente essere mostrato, ma con prudenza e mai come certezza.

## 6.5 Bookability e freshness separate dalla confidence

Concetti distinti:

```text
Bookability / availability status
- INVALID
- STALE
- REQUIRES_RECHECK
- BOOKABLE

Data confidence
- LOW
- MEDIUM
- HIGH

Choice risk
- LOW
- MEDIUM
- HIGH
```

Una tariffa può essere ben documentata ma scaduta. Un’offerta può essere prenotabile ma avere dati qualitativi insufficienti.

## 6.6 Missing data ≠ bad quality

L’assenza di recensioni significa:

> “Non abbiamo prove sufficienti.”

Non significa automaticamente:

> “La struttura è scarsa.”

Regola:

- dato negativo → riduce qualità;
- dato mancante → riduce confidence;
- condizioni rischiose → aumentano risk;
- mai usare la stessa penalizzazione per concetti diversi.

## 6.7 Un solo score non contiene tutta la verità

Lo SmartScore può esistere come sintesi visiva, ma internamente mantenere dimensioni separate:

- eligibility/reliability status;
- value score;
- quality score;
- location score;
- comfort/flexibility score;
- user utility/preference fit;
- data confidence;
- choice risk;
- recommendation role;
- bookability/freshness.

Non trattare due SmartScore uguali come equivalenti quando confidence e risk sono molto diversi.

---

# 7. COMPONENTI DELL’ENGINE

## 7.1 Evidence Model

Ogni dato importante deve possedere:

- valore;
- fonte;
- disponibilità;
- affidabilità;
- timestamp/freschezza quando rilevante;
- motivo dell’assenza;
- eventuale trasformazione applicata;
- distinzione tra dato diretto, derivato, stimato o non disponibile.

Nessuna spiegazione deve utilizzare evidence non presente.

## 7.2 Accommodation Category Model

Hotel, B&B, appartamenti, locazioni, ostelli, camping e altre categorie devono essere valutati secondo aspettative appropriate.

Non usare lo stesso standard per:

- ostello e hotel a cinque stelle;
- appartamento intero e camera privata;
- camping e boutique hotel;
- struttura business e resort.

La categoria influenza:

- peer group;
- aspettativa di servizi;
- qualità relativa;
- prezzo relativo;
- comfort;
- interpretazione delle recensioni.

## 7.3 Peer Groups

Un peer group valido considera almeno:

- stessa destinazione/area;
- stesse date;
- stessa configurazione ospiti e camere;
- categoria compatibile;
- offerta/unità comparabile;
- rimborsabilità e trattamento compatibili;
- fascia qualitativa ragionevole;
- distanza coerente;
- costo totale noto e comparabile.

Non usare la media globale della ricerca se è distorta da categorie o prezzi estremi.

Preferire:

- mediana;
- percentili;
- confronto con peer group;
- differenza dal budget;
- differenza da alternative dello stesso ruolo.

## 7.4 Price & Value Engine

Deve valutare:

- costo totale reale;
- tasse incluse/escluse/conoscenza incompleta;
- fee e pulizia;
- costo per notte e per camera/notte;
- budget fit;
- over-budget controllato;
- percentili e mediana del peer group;
- prezzo relativo alla qualità;
- prezzo relativo alla posizione;
- valore dell’offerta specifica;
- differenza rispetto alla cheapest sensible;
- costo dell’upgrade.

Regola UX budget:

1. opzioni entro budget;
2. opzioni leggermente sopra budget ma di valore;
3. opzioni molto fuori budget soltanto se il profilo e la qualità lo giustificano chiaramente.

## 7.5 Quality Engine

Deve distinguere:

- rating grezzo;
- numero recensioni;
- affidabilità statistica;
- recency quando disponibile;
- qualità relativa alla categoria;
- qualità relativa al peer group;
- provenienza e semantica del review count.

Regola:

> Un 9,5 con 6 recensioni non equivale a un 9,2 con 1.500 recensioni.

Valori sospetti come review count esattamente uguali per molte strutture devono essere auditati. Non mostrare un limite, fallback o lower bound come numero preciso reale.

## 7.6 Location Engine

Deve valutare:

- distanza dal punto scelto dall’utente;
- rispetto del limite massimo;
- costo necessario per avvicinarsi;
- valore marginale di una posizione migliore;
- eventuale tempo di spostamento quando affidabile;
- compromesso tra prezzo e posizione.

Non inventare giudizi sulla sicurezza di un quartiere senza fonti affidabili e una policy adatta.

## 7.7 Comfort & Flexibility Engine

Valuta servizi contestuali e condizioni, non una somma ingenua di amenità.

Esempi:

- bagno privato;
- aria condizionata;
- cucina;
- Wi-Fi;
- parcheggio;
- ascensore/accessibilità;
- colazione;
- configurazione letti;
- self check-in/reception;
- cancellazione;
- pagamento;
- trattamento;
- requisiti specifici del gruppo.

Un servizio vale in relazione a:

- tipo di viaggio;
- durata;
- composizione del gruppo;
- categoria;
- preferenza utente;
- disponibilità e affidabilità del dato.

## 7.8 Data Confidence & Risk Engine

Confidence e risk sono separati.

**Data confidence:** quanto sono complete, coerenti, fresche e affidabili le informazioni.

**Choice risk:** probabilità che la scelta sia problematica per l’utente, per esempio:

- tariffa non rimborsabile;
- costi incompleti;
- dati scarsi;
- offerta anomala;
- condizioni poco chiare;
- qualità incerta;
- distanza borderline;
- forte scostamento dal budget.

Una struttura può avere alta qualità e alto rischio. Oppure qualità incerta e rischio moderato.

## 7.9 User Utility Engine

Il motore deve adattarsi a:

- profilo di preferenza;
- budget;
- durata;
- numero ospiti;
- numero camere;
- distanza massima;
- tipo di struttura;
- esigenze essenziali;
- comfort e flessibilità.

Tipi union esatti noti:

```text
SmartStayUtilityPreferenceIdV2
- maximum-comfort
- comfort
- balanced
- savings
- maximum-savings

SmartStayUtilityPreferenceSourceV2
- automatic
- manual
```

Non inventare enum e non tipizzare questi ID come `string` generico nelle fixture TypeScript.

Le curve possono essere non lineari, ma devono restare comprensibili, calibrabili e testabili.

## 7.10 Pareto Frontier

Serve a eliminare o declassare alternative chiaramente dominate.

Un’opzione è dominata quando un’altra è uguale o migliore sulle dimensioni rilevanti e non presenta un costo significativo maggiore.

Non usarla per cancellare diversità utile. Deve proteggere l’utente da alternative senza vantaggi reali.

## 7.11 Recommendation Roles

Ruoli principali:

- SmartStay Pick;
- Miglior risparmio sensato;
- Upgrade comfort conveniente;
- Migliore posizione.

Ogni ruolo deve avere:

- criteri espliciti;
- candidato realmente differente;
- evidence sufficiente;
- ragione chiara;
- fallback deterministico quando nessun candidato è adatto.

Non forzare un ruolo se non esiste una buona alternativa.

## 7.12 Smart Upgrade Curve

Domanda fondamentale:

> “Quanto costa migliorare e quanto valore reale compra quella differenza?”

Deve identificare:

- upgrade conveniente;
- upgrade marginale;
- sovrapprezzo non giustificato;
- sweet spot del valore.

Esempio ideale:

> “Con 34 € in più ottieni cancellazione gratuita, posizione migliore e recensioni molto più affidabili: l’upgrade vale il costo.”

Oppure:

> “Costa 72 € in più ma il miglioramento complessivo è limitato: non lo consideriamo un upgrade conveniente.”

## 7.13 Counterfactual Comparisons

Ogni alternativa importante deve poter dire:

- cosa guadagni;
- cosa perdi;
- quanto spendi o risparmi;
- quale dimensione cambia davvero.

Confronti brevi, specifici, verificabili.

## 7.14 Ranking Stability & Diversity

Stesso snapshot + stessi input = stesso risultato.

Tra ricerche nuove ma quasi identiche, la Best Choice non deve oscillare per differenze irrilevanti.

La raccomandazione cambia solo quando esiste un vantaggio materiale e spiegabile.

Serve una stability policy con:

- tolleranze;
- tie-break deterministici;
- soglia di miglioramento materiale;
- diversità tra ruoli;
- nessun ordine casuale.

Non usare stabilità finta per nascondere cambi reali di prezzo, disponibilità o condizioni.

## 7.15 Evidence-based Explanations

Le spiegazioni devono:

- derivare dal contratto canonico;
- usare soltanto evidence verificata;
- distinguere vantaggi e compromessi;
- riferirsi alla ricerca corrente;
- essere specifiche;
- evitare ripetizioni;
- non citare provider interni;
- non mostrare formule o percentuali prive di significato per l’utente.

---

# 8. MARKET CONTEXT

## 8.1 Obiettivo

Interpretare un’offerta rispetto al mercato corretto, non soltanto rispetto al campione casuale restituito in una singola chiamata.

## 8.2 Fonti e priorità

1. distribuzione della ricerca corrente;
2. memoria locale storica SmartStay quando disponibile;
3. eventuale provider esterno di market data, soltanto se esplicitamente attivato e sostenibile.

Le sorgenti a pagamento devono restare disabilitate di default finché non esiste una decisione consapevole.

## 8.3 Regole

- evitare medie globali gonfiate da outlier;
- usare mediana e percentili;
- segmentare per categoria e configurazione;
- conservare destinazione, date, durata e camere;
- supportare stagionalità futura tramite memoria locale;
- non presentare il market context come certezza se il campione è debole.

---

# 9. ARCHITETTURA TECNICA

## 9.1 Stack

Frontend:

- React;
- TypeScript;
- Vite;
- React Router;
- Lucide React.

Backend:

- Node.js;
- Express;
- nodemon in sviluppo.

Ambiente noto:

- Node v24.18.0;
- npm v11.16.0;
- Vite v8.1.2;
- Windows PowerShell;
- repository locale: `C:\Users\Mattia\SmartStay`;
- frontend locale: porta 5173;
- backend locale: porta 3001.

## 9.2 Flusso generale

```text
Home
→ Loading
→ Backend search lifecycle
→ Provider orchestrator
→ Adapter/normalizer
→ Search session
→ SmartStay Engine V2
→ Public presenter / frontend adapter
→ Results
→ Hotel details / booking handoff
```

## 9.3 Layer provider

Struttura concettuale:

```text
server/providers/
├ common/
├ liteapi/
├ routestack/
├ providerRegistry
└ accommodationProviderOrchestrator
```

Regole:

- ogni provider implementa un’interfaccia comune;
- normalizzazione prima del motore;
- deduplicazione/merge separati dal dominio;
- frontend ignora il provider;
- `stayService` coordina ma non contiene logica specifica LiteAPI;
- errori pubblici provider-agnostic;
- dettagli tecnici non esposti all’utente.

## 9.4 Provider attuali

- **LiteAPI:** provider operativo.
- **RouteStack:** disabilitato, congelato e non usato operativamente.
- L’architettura deve consentire un futuro secondo provider senza riaccoppiamento.

Non dichiarare pubblicamente integrazione diretta con Booking o Airbnb senza una reale autorizzazione/integrazione.

## 9.5 Contratti pubblici

I presenter pubblici devono rimuovere:

- `providerId`;
- `providerContext`;
- attempts interni;
- token;
- continuation raw;
- messaggi tecnici del provider;
- stack o errori interni;
- informazioni non necessarie al client.

Il frontend riceve un contratto SmartStay stabile.

## 9.6 Search Lifecycle canonico

Contratto pubblico progettato:

```text
phase
- starting
- running
- complete

outcome
- pending
- results
- no-results
- partial-results
- provider-error
- timeout
- rate-limited
- session-expired
- session-missing
- cancelled

retryable: boolean
publicCode: provider-agnostic code
retryAfterMs: number | null
```

Campi legacy come `status`, `searchIncomplete` e `isContinuing` possono restare temporaneamente durante la migrazione, ma non devono diventare la nuova fonte primaria.

Regole lifecycle:

- `searchId` sempre esplicito;
- TTL sessione noto: 30 minuti;
- 404 session missing distinto da 410 session expired;
- no-results distinto da provider error;
- partial results preservati anche se una continuation fallisce;
- il Loading deve aprire Results quando esistono risultati parziali;
- timeout e rate limit devono avere policy chiare;
- polling limitato e deterministico;
- nessun loop infinito;
- continuation concorrenti protette da lock;
- idempotenza server-side necessaria per l’avvio ricerca.

## 9.7 Endpoint noti

- `/search-destinations`
- `/search-hotels`
- `/continue-hotel-search`
- `/hotel-details`
- `/search-status`

Mantenere compatibility soltanto quando necessaria e documentata.

## 9.8 Frontend/backend boundary

Frontend:

- raccoglie input;
- visualizza stati;
- presenta spiegazioni e ruoli;
- non contiene formule duplicate del motore;
- non ricostruisce il lifecycle da campi sparsi quando esiste un contratto canonico.

Backend/Engine:

- possiede logica di selezione, ranking, confidence e rischio;
- produce un’unica valutazione canonica;
- normalizza errori;
- protegge segreti e provider details.

---

# 10. SICUREZZA E PRIVACY

## 10.1 Regole fondamentali

- API key soltanto nel backend e nelle variabili d’ambiente;
- mai esporre `.env` o segreti nel frontend/Git;
- CORS esplicito;
- validazione input;
- rate limiting;
- timeout;
- HTTPS in produzione;
- log redatti;
- errori pubblici senza dettagli interni;
- dipendenze aggiornate e auditabili;
- principio del minimo privilegio;
- nessun accesso GitHub o repository concesso a terzi senza motivo.

## 10.2 Protezione del progetto

- commit e cronologia Git come prova di sviluppo;
- non condividere codice completo, formula, repository o chiavi con interessati esterni;
- demo superficiale prima dei dettagli;
- NDA quando una conversazione diventa realmente tecnica/commerciale;
- legale software/IP prima di vendite, licenze, quote o trasferimenti di diritti;
- marchio e deposito software da valutare quando MVP e motore sono stabili.

## 10.3 Security gate

Prima della beta pubblica chiudere almeno:

- segreti;
- validazione input;
- rate limiting;
- session lifecycle;
- log sanitization;
- dependency audit;
- error redaction;
- backup e recovery;
- privacy analytics;
- booking handoff integrity.

---

# 11. REGOLE DI SVILUPPO E COLLABORAZIONE

## 11.1 Ruolo dell’assistente

Comportarsi come:

- CTO critico;
- co-founder operativo;
- revisore architetturale;
- product strategist;
- responsabile della qualità tecnica.

Non assecondare Mattia per tranquillizzarlo. Contestare decisioni deboli, evitare complessità inutile e proteggere tempi, qualità e coerenza.

## 11.2 Metodo di lavoro

Prima di modificare:

1. capire il punto della roadmap;
2. leggere audit/file correnti;
3. verificare working tree e branch;
4. dichiarare cosa verrà modificato;
5. preparare patch con precondizioni;
6. eseguire test appropriati;
7. classificare onestamente le prove;
8. controllare diff;
9. commit soltanto dopo validazione e autorizzazione.

## 11.3 Stop protettivo

Se lo script trova uno stato differente da quello previsto:

- fermarsi;
- non forzare;
- non applicare parzialmente;
- raccogliere un nuovo audit;
- ricostruire la patch sul repository reale.

Lo stop è una protezione, non un fallimento.

## 11.4 Classificazione onesta dei test

Dichiarare sempre cosa è stato realmente testato:

- unit test reali;
- integration test reali;
- router reale;
- presenter reale;
- provider live;
- mock controllato;
- browser E2E;
- build production;
- nessuna chiamata provider.

Non chiamare “live” un test interamente mockato. Non dichiarare PASS se il runner non ha raggiunto la prova.

## 11.5 Definition of Done per una macrofase

Una macrofase è chiusa soltanto quando applicabile:

- requisiti rispettati;
- test permanenti PASS;
- test mirati PASS;
- build PASS;
- typecheck PASS;
- lint/syntax PASS;
- diff check PASS;
- package lock non modificato involontariamente;
- provider calls dichiarate;
- test live separato se necessario;
- regressioni principali escluse;
- documentazione/roadmap aggiornata;
- commit e push riusciti.

## 11.6 Output preferito

Riepilogo tecnico finale in un unico blocco leggibile:

```text
SMARTSTAY <PUNTO> — <NOME>: PASS / FAIL / REVIEW

Implementazione: PASS
Test permanenti: PASS
Test mirati: PASS
Build: PASS
Diff check: PASS
Provider live calls: ZERO / N
Commit: ESEGUITO / NON ESEGUITO
Prossimo punto: ...
```

## 11.7 Git

- branch principale: `main`;
- titoli commit semplici in italiano;
- non commitare automaticamente se Mattia non ha autorizzato;
- non mescolare macrofasi indipendenti nello stesso commit;
- controllare sempre `git status` e `git diff --check`.

## 11.8 Windows e PowerShell

- fornire comandi compatibili con Windows PowerShell;
- attenzione a quoting di `npm.cmd` nei runner Node/PowerShell;
- warning `LF will be replaced by CRLF` non equivale automaticamente a errore;
- valutare l’exit code reale;
- con `$ErrorActionPreference = "Stop"`, stderr di Git può essere interpretato da PowerShell 5.1 come errore terminante;
- quando necessario eseguire Git tramite `cmd.exe /d /c "... 2>&1"` e controllare `$LASTEXITCODE`.

## 11.9 TypeScript

- non usare `moduleResolution: "Node"` nei tsconfig temporanei con TypeScript 6;
- preferire configurazione moderna compatibile;
- usare `ignoreDeprecations: "6.0"` soltanto se serve davvero mantenere una compilazione esistente;
- verificare sempre i tipi union reali esportati;
- non inventare valori enum/union;
- non usare `string` generico dove esiste un tipo canonico.

## 11.10 Dimensione dei file

Non applicare una suddivisione automatica soltanto perché un file supera un certo numero di righe. Valutare:

- responsabilità;
- leggibilità;
- coesione;
- dipendenze;
- testabilità.

Un file lungo può essere accettabile se coerente; un file corto può essere architetturalmente sbagliato.

---

# 12. TEST E CALIBRAZIONE DEL MOTORE

## 12.1 Golden Dataset

Creare e mantenere ricerche campione con risultato atteso verificato manualmente.

Copertura minima:

- città economiche e costose;
- date normali ed eventi;
- soggiorni brevi e lunghi;
- singoli, coppie, famiglie e gruppi;
- una o più camere;
- budget bassi, medi e alti;
- profili maximum-comfort, comfort, balanced, savings e maximum-savings;
- categorie diverse;
- strutture senza recensioni;
- tasse unknown;
- offerte rimborsabili e non rimborsabili;
- dati incompleti;
- risultati quasi equivalenti;
- outlier di prezzo;
- nessun risultato;
- risultati parziali;
- sessione scaduta.

## 12.2 Invarianti

Esempi:

- stesso input canonico → stesso output;
- un `INVALID` non diventa SmartStay Pick;
- rimuovere un vantaggio non deve migliorare quel candidato senza altra causa;
- un aumento puro del prezzo non deve migliorare il value score;
- più recensioni affidabili non devono ridurre confidence;
- dati mancanti non devono essere trasformati in dati negativi;
- un’alternativa dominata non deve superare il dominatore senza una preferenza esplicita;
- una spiegazione non può citare evidence assente;
- i ruoli devono essere diversi o non assegnati;
- il ranking non deve dipendere dall’ordine del payload provider.

## 12.3 Test cieco con utenti

Confrontare:

- lista provider/base;
- ordinamento per prezzo;
- shortlist SmartStay.

Domande:

- quale sceglieresti?
- quale lista ti fa decidere più velocemente?
- di quale ti fidi di più?
- hai capito il trade-off?
- pagheresti la differenza?
- torneresti a usare SmartStay?

Il motore deve battere una baseline, non soltanto apparire sofisticato.

## 12.4 Metriche indicative beta

Obiettivi interni proposti:

- nessun crash nei flussi standard;
- prezzi e condizioni corretti nei controlli manuali;
- zero spiegazioni inventate;
- nessun `INVALID` raccomandato;
- risultati parziali preservati;
- ranking stabile;
- majority preference per SmartStay nei test ciechi;
- riduzione del tempo decisionale;
- comprensione chiara dei Recommendation Roles;
- esperienza mobile accettabile.

---

# 13. ANALYTICS

L’analytics non va aggiunta soltanto dopo “aver finito” il prodotto. Deve accompagnare la beta.

Eventi minimi:

- ricerca avviata;
- ricerca completata;
- errore/no-results/partial-results;
- tempo di risposta;
- Recommendation Role mostrato;
- card aperta;
- spiegazione espansa;
- filtro modificato;
- budget modificato;
- risultato salvato;
- click su View Details;
- click verso partner/booking;
- abbandono;
- tempo fino alla prima scelta;
- nuova ricerca dopo confronto;
- ritorno dell’utente.

Principi:

- privacy by design;
- raccolta minima necessaria;
- nessun dato sensibile inutile;
- eventi definiti prima della beta;
- metriche usate per calibrare il motore, non per manipolare l’utente.

---

# 14. STRATEGIA MVP E LANCIO

## 14.1 MVP vero

L’MVP deve fare molto bene:

- destinazione/date/ospiti/budget/distanza;
- ricerca reale;
- shortlist SmartStay;
- Recommendation Roles;
- costo totale;
- spiegazioni;
- confidence/risk;
- mobile;
- handoff o dettagli chiari;
- analytics;
- gestione errori e sessioni.

Non deve includere subito:

- multi-stay completo;
- machine learning;
- cinque provider;
- preferenze avanzate;
- app mobile nativa;
- voli;
- chatbot principale;
- login obbligatorio;
- automazioni complesse.

## 14.2 Segmento iniziale consigliato

Ipotesi di lancio, non limite architetturale:

> Viaggiatori italiani che cercano soggiorni cittadini in Europa, da circa 3 a 7 notti, spesso in coppia, attenti al budget ma non interessati alla soluzione peggiore pur di spendere meno.

Questo segmento rende evidenti i compromessi prezzo/posizione/qualità ed è adatto ai contenuti TikTok.

## 14.3 Primo obiettivo di mercato

Non “competere con Booking”.

Ordine corretto:

1. 10–20 tester reali;
2. 100 ricerche reali;
3. primi click intenzionali;
4. prima prenotazione attribuibile o primo ricavo;
5. 1.000 ricerche qualificate;
6. acquisizione ripetibile;
7. crescita.

## 14.4 Obiettivo economico

Obiettivo personale di Mattia:

> circa **1.000–1.500 € netti al mese**.

È un obiettivo possibile ma non garantito. Dipende da:

- traffico qualificato;
- conversione;
- margine per prenotazione;
- cancellazioni;
- attribuzione;
- costi provider/cloud;
- marketing;
- fiscalità.

Non trasformare questa cifra in pressione quotidiana. La progressione corretta è prima utilità, poi conversione, poi margine.

---

# 15. MONETIZZAZIONE E POSSIBILE B2B

## 15.1 B2C primario

Possibili modelli:

- affiliazione e redirect;
- booking integrato/provider margin;
- partnership;
- funzioni premium future;
- alert e ricerche salvate future.

## 15.2 B2B futuro

Lo SmartStay Engine può potenzialmente diventare:

- API di valutazione;
- widget per OTA/agenzie;
- white-label;
- motore di recommendation;
- supporto decisionale per travel platform;
- licenza del framework di scoring/ranking.

Possibile contratto concettuale:

```text
POST /evaluate-stays
→ canonical evaluations
→ recommendation roles
→ confidence
→ risk
→ explanations
→ counterfactuals
```

Ma non progettare ora l’intero prodotto come enterprise B2B. Prima dimostrare nel B2C che il motore migliora decisione, fiducia o conversione.

Il B2B diventa credibile con metriche come:

- utenti che scelgono più rapidamente;
- maggiore click-through;
- maggiore conversione;
- minore abbandono;
- soddisfazione maggiore;
- ranking migliore della baseline.

---

# 16. MARKETING E TIKTOK

Posizionamento principale:

> “SmartStay non trova il soggiorno più economico. Trova la scelta più intelligente.”

Pilastri contenuto:

1. Cheapest vs Best Value;
2. errori comuni nella prenotazione;
3. test su città reali;
4. build in public;
5. “commenta città + budget”;
6. dietro le quinte dello SmartStay Engine;
7. quanto vale un upgrade;
8. perché un hotel economico può costare di più in pratica.

Prima fase:

- contenuti organici;
- founder-led;
- screen recording + voce/testo;
- niente produzione patinata obbligatoria;
- niente ads finché non esistono video con segnali organici.

Il marketing deve dimostrare utilità, non soltanto mostrare il logo.

---

# 17. STATO TECNICO CONOSCIUTO — SNAPSHOT 22/07/2026

> **Nota:** questa è la parte dinamica del file. Un audit più recente prevale sempre.

## 17.1 Stato generale

- SmartStay costruito da Mattia partendo quasi da zero in circa 18 giorni di lavoro intenso.
- Frontend, backend, ricerca reale e SmartStay Engine V2 esistono.
- LiteAPI è operativo.
- RouteStack è congelato e disabilitato.
- Architettura multi-provider/provider-agnostic impostata.
- Engine V2 ha completato una prima passata sostanziale dei punti 19–38, ma rimangono bug, calibrazione e validazione runtime.
- La fase corrente riguarda integrazione reale, search lifecycle, booking integrity, sicurezza, staging, analytics e beta.

## 17.2 Componenti Engine implementati o affrontati

- Audit Engine;
- contratto canonico;
- Evidence Model;
- Reliability Gate;
- Category Model;
- Peer Groups;
- Price & Value;
- Quality;
- Location;
- Comfort & Flexibility;
- Data Confidence;
- Risk;
- User Utility;
- Pareto Frontier;
- Recommendation Roles;
- Smart Upgrade Curve;
- Evidence-based Explanations;
- Counterfactual Comparisons;
- Ranking Stability & Diversity;
- Golden Dataset e test/calibrazione in evoluzione;
- frontend integration in corso.

## 17.3 Problemi UX/runtime già individuati

- testo “guest quality” semanticamente sbagliato;
- percentuali estreme rispetto alla media mostrate nel posto sbagliato;
- confronto globale fuorviante rispetto a categorie diverse;
- Best Choice oscillante tra nuove ricerche con input provider leggermente differenti;
- necessità di distinguere determinismo stesso searchId e stabilità cross-search;
- badge confidence/risk ridondanti;
- card troppo lunghe;
- spiegazioni ripetitive;
- SmartScore e guest rating non sufficientemente distinti;
- review count sospetti/lower bound da non presentare come numero preciso;
- Smart Upgrade non sempre valorizzato correttamente;
- categorie differenti confrontate senza contesto;
- tasse con stato unknown presenti in numerosi risultati provider;
- necessità di preservare partial results.

## 17.4 Validazioni recenti note

- 39C16: 50/50 scenari provider completati, 49/50 con risultati visibili, 0 blocking failures, 1 warning. Il runner v2 ha poi fallito tecnicamente per una versione report inattesa; non equivale a fallimento del provider.
- 39C18: Full Browser Journey dichiarato chiuso dopo test production su entrambi i flussi, zero errori browser e zero fallimenti bloccanti.
- 39C19A: Search Lifecycle Audit chiuso.

## 17.5 39C19B — stato preciso

**Obiettivo:** contratto pubblico lifecycle e redazione errori.

Patch applicata con introduzione prevista di:

- lifecycle canonico;
- errori provider-agnostic;
- rimozione dettagli interni;
- partial results preservati;
- suite permanente `test:lifecycle`;
- aggiornamenti Loading e Results.

La validazione HTTP mirata non ha completato i test perché il runner ha invocato `npm.cmd` con quoting errato:

```text
"\"npm.cmd\"" non è riconosciuto come comando...
```

Questo indica un **errore del runner di validazione**, non una prova di errore nel codice SmartStay.

Stato prudente:

- patch 39C19B applicata;
- repository/hash iniziali controllati;
- validazione mirata non conclusa;
- nessun commit/push finché il runner non viene corretto e il test non passa;
- non procedere a 39C19C come se 39C19B fosse formalmente chiuso.

## 17.6 Roadmap immediata conosciuta

```text
39C16 — Matrice live provider                         CHIUSO
39C17 — Empty state e recovery                        CHIUSO
39C18 — Full Browser Journey                          CHIUSO
39C19A — Audit Search Lifecycle                       CHIUSO
39C19B — Contratto pubblico lifecycle                 PATCH APPLICATA, VALIDAZIONE DA COMPLETARE
39C19C — Idempotenza avvio ricerca                    PROSSIMO DOPO CHIUSURA 39C19B
39C19D — Continuation resilience                      DA FARE
39C19E — Timeout, rate limit e retry policy            DA FARE
39C19F — Session expiry, restart e browser matrix      DA FARE
39C20 — Hotel Details & Booking Integrity              DA FARE
39C21 — Security & Observability                       DA FARE
39C22 — Staging & Release Gate                         DA FARE
39C23 — Analytics                                      DA FARE
39C24 — Beta controllata                               DA FARE
```

## 17.7 Prossimo passo corretto

1. Correggere soltanto il runner di validazione 39C19B, senza cambiare la patch applicata se non emergono veri problemi.
2. Rilanciare:
   - suite lifecycle;
   - test HTTP integration;
   - redazione dettagli provider;
   - partial results;
   - session expired vs missing;
   - repository invariato.
3. Esaminare il JSON generato.
4. Solo dopo PASS: commit e push 39C19B.
5. Poi avviare 39C19C idempotenza.

---

# 18. ROADMAP STRATEGICA COMPLETA

## Fondazioni e provider

- Secondo provider: chiuso nella forma attuale; LiteAPI operativo, RouteStack disabilitato.
- Architettura resta pronta per provider futuri.

## Engine V2

19. Audit completo Engine  
20. Contratto canonico SmartStayEvaluation  
21. Evidence Model  
22. Reliability Gate  
23. Accommodation Category Model  
24. Peer Groups  
25. Price & Value Engine  
26. Quality Engine  
27. Location Engine  
28. Comfort & Flexibility Engine  
29. Data Confidence & Risk Engine  
30. User Utility Engine  
31. Pareto Frontier  
32. Recommendation Roles  
33. Smart Upgrade Curve  
34. Evidence-based Explanations  
35. Counterfactual Comparisons  
36. Ranking Stability & Diversity  
37. Golden Dataset  
38. Test automatici e calibrazione

## Prodotto e lancio

39. Integrazione frontend/mobile e runtime hardening  
40. Analytics, deploy e lancio  
41. Market Intelligence dopo traffico reale  
42. Preferenze avanzate  
43. Multi-stay futuro

### Regola di sequenza

Non anticipare 41–43 prima di:

- beta stabile;
- analytics reali;
- utenti reali;
- evidenza di utilità;
- controllo dei costi e della conversione.

---

# 19. MULTI-STAY FUTURO

Il multi-stay è una funzione differenziante futura, non il cuore iniziale della promessa.

Variabili necessarie:

- costo totale combinato;
- numero cambi;
- risparmio netto;
- distanza tra strutture;
- tempo e costo trasferimento;
- compatibilità check-out/check-in;
- notti per struttura;
- qualità media e minima;
- rischio combinato;
- stress stimato;
- soglia minima di risparmio.

Regola:

> Non proporre un cambio struttura per un risparmio insignificante. Il vantaggio deve giustificare chiaramente lo stress.

---

# 20. COME PRENDERE DECISIONI FUTURE

Per ogni proposta, valutare nell’ordine:

1. **Correttezza dei dati**  
   Possiamo fidarci del valore mostrato?

2. **Utilità per l’utente**  
   Migliora realmente la scelta?

3. **Spiegabilità**  
   Possiamo spiegare perché?

4. **Coerenza architetturale**  
   Mantiene domini, provider e frontend separati?

5. **Testabilità**  
   Possiamo dimostrarne il comportamento?

6. **Sostenibilità**  
   È sostenibile in costi, latenza e manutenzione?

7. **Priorità MVP**  
   Serve prima della beta o può aspettare?

Se una scelta è impressionante tecnicamente ma non migliora i punti 1–3, non è prioritaria.

---

# 21. ERRORI DA NON RIPETERE

- Costruire patch su audit vecchi.
- Forzare script quando lo stato del repository non coincide.
- Duplicare logica tra frontend e backend.
- Accoppiare il dominio a LiteAPI.
- Trattare “nessun dato” come “dato negativo”.
- Usare una media globale distorta.
- Mostrare metriche tecniche incomprensibili.
- Confrontare categorie diverse senza dichiararlo.
- Dare quattro ruoli allo stesso tipo di alternativa.
- Lasciare che ogni piccolo scarto faccia oscillare la Best Choice.
- Dichiarare PASS quando un runner non ha eseguito la prova.
- Scambiare warning CRLF per bug applicativo senza controllare exit code.
- Esibire 50 card piene come una OTA tradizionale.
- Aggiungere provider e funzioni prima di validare l’utilità.
- Confondere una demo bella con un prodotto affidabile.

---

# 22. CRITERIO FINALE DI SUCCESSO

SmartStay non sarà giudicato dal numero di righe, moduli o formule.

Avrà successo quando si potrà dimostrare che, su ricerche reali:

- gli utenti comprendono il prodotto senza spiegazioni;
- scelgono più rapidamente;
- preferiscono le raccomandazioni SmartStay alla lista base;
- capiscono i compromessi;
- si fidano delle spiegazioni;
- cliccano verso una prenotazione;
- tornano a usarlo prima del viaggio successivo;
- il margine supera i costi di acquisizione e infrastruttura.

La domanda guida permanente è:

> **“SmartStay sta davvero aiutando questa persona a prendere una decisione migliore, più veloce e più sicura?”**

Se la risposta non è chiaramente sì, il progetto deve essere corretto, semplificato o ricalibrato.

---

# 23. TEMPLATE PER AGGIORNARE QUESTO FILE

Alla fine di ogni macrofase aggiungere o sostituire nella sezione “Stato tecnico conosciuto”:

```text
Data:
Punto roadmap:
Obiettivo:
File modificati:
Test eseguiti:
Provider live calls:
Risultato: PASS / FAIL / REVIEW
Commit:
Push:
Problemi aperti:
Prossimo passo esatto:
```

Non riscrivere ogni volta l’intera costituzione. Aggiornare principalmente lo snapshot, la roadmap e le decisioni realmente cambiate.

---

# 24. ISTRUZIONE FINALE PER LE NUOVE CHAT

Quando una nuova chat riceve questo documento deve:

1. riconoscere SmartStay come progetto travel-tech decisionale, non semplice comparatore;
2. mantenere la promessa “scelta più intelligente, non prezzo più basso”;
3. proteggere architettura provider-agnostic;
4. leggere codice/audit recenti prima di proporre modifiche;
5. non inventare stato, enum, payload o test;
6. separare qualità, confidence, risk e bookability;
7. preservare Evidence Model e spiegazioni verificabili;
8. progettare UX a shortlist con Recommendation Roles e trade-off;
9. evitare overengineering prima della beta;
10. agire come CTO critico e co-founder operativo;
11. terminare ogni macrofase con test, diff, stato Git e prossimo passo chiaro;
12. ricordare che il vero prodotto è la capacità di aiutare l’utente a scegliere meglio.

**Principio conclusivo:**

> **Prima i dati corretti. Poi il ragionamento corretto. Poi una spiegazione semplice. Solo dopo il marketing.**
