# StayOpti V3-15 — Personal Utility & Role Policy Candidate

## Stato operativo

V3-15 è una policy candidata esclusivamente offline. Non sostituisce la utility V3 precedente nel runtime, non modifica V2 pubblico, non abilita V3, non cambia soglie o ranking pubblici e non abilita SPLIT.

La policy è additiva, versionata e fingerprinted. Le sue impostazioni sono ipotesi falsificabili da validare con replay e giudizi ciechi: non sono verità derivate automaticamente dal Teacher Lab.

## Obiettivo decisionale

La policy applica questa gerarchia:

1. hard constraint e integrità dell'offerta;
2. soglia minima di qualità ed esperienza;
3. esperienza coerente con il profilo;
4. costo-opportunità calibrato per profilo;
5. ruoli Choice, Saving e Upgrade costruiti indipendentemente;
6. astensione quando nessuna soluzione è comparabile.

Le dimensioni di esperienza sono qualità, comfort, posizione, camera, flessibilità e soggiorni lunghi. I punteggi disponibili mantengono la scala originale: la qualità premium non viene compressa da una curva a rendimenti decrescenti. Una dimensione mancante non riceve zero; i pesi disponibili vengono rinormalizzati e la coverage diminuisce.

## Semantica del budget

- **Maximum Comfort:** il budget è un tetto. Sotto il tetto non esiste premio per il budget inutilizzato; vince l'esperienza e il prezzo interviene soltanto nel near tie.
- **Comfort:** il budget è un tetto. Il costo-opportunità può distinguere opzioni dentro una fascia stretta di perdita d'esperienza, ma non cancellare un miglioramento materiale.
- **Balanced:** il costo-opportunità è esplicito e può ammettere soltanto un overrun controllato; la scelta massimizza il valore marginale complessivo.
- **Savings:** il prezzo pesa fortemente dopo soglie minime e vincoli.
- **Maximum Savings:** vince il costo più basso tra le soluzioni che superano soglie minime non negoziabili.

## Portfolio role-aware

`Best Choice` viene selezionata senza usare l'etichetta finale come conseguenza di un confronto con V2. Una soluzione dominata non può essere Choice.

`Best Sensible Saving` cerca separatamente una soluzione più economica della Choice. Deve pubblicare saving, perdita di qualità, perdita di esperienza e tolleranze del profilo. Se le perdite superano le tolleranze, il ruolo resta non applicabile e non sostituisce Choice.

`Worthwhile Comfort Upgrade` cerca separatamente una soluzione più costosa. Deve pubblicare premium, guadagno d'esperienza, marginal value per 100 unità monetarie e soglia del profilo.

`SPLIT` è presente nel contratto del portfolio ma resta `disabled` fino alla maturità single-stay prevista dalla roadmap.

## Invarianti fail-closed

- aumentare il budget di Maximum Comfort non può favorire un'opzione peggiore soltanto perché economica;
- una soluzione gratuita materialmente migliore resta selezionabile;
- una soluzione dominata non può diventare Best Choice;
- Saving non sostituisce Choice senza perdita esplicita e tollerabile;
- lo stesso set può produrre scelte diverse per profili diversi;
- missing evidence riduce coverage e non crea una penalità inventata;
- commissioni, markup, probabilità di click, priorità provider e valore economico dell'utente sono rifiutati.
