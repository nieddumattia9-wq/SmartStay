# StayOpti Engine V3-17C — Golden Real Evidence Batch Intake

## Stato del checkpoint

V3-17C aggiunge il confine deterministico che trasforma capture realmente
acquisite in receipt compatibili con la campagna V3-17B. Il checkpoint non
contiene né simula chiamate ai provider. Una capture pianificata, vuota o
costruita artificialmente vale zero evidenza.

Versione del contratto:
`3.0.0-golden-real-evidence-batch.1`.

## Obiettivo

Il runner V3-17B ha congelato 200 slot reali, 400 assegnazioni cieche, 20
challenge di astensione e 100 replay provider-neutral. V3-17C rende possibile
alimentare quel piano a batch, senza permettere che un file non verificato
diventi evidenza statistica.

Ogni batch è legato al fingerprint esatto della campagna precedente. Per ogni
capture valida vengono emessi in modo deterministico:

- un `receiptId` derivato dallo slot e dal fingerprint della capture;
- un `caseId` reale e stabile;
- un `evidenceBundleFingerprint` che lega snapshot, Public Rates, decisioni
  V2/V3, audit witness, derivazione, astensione e replay;
- una nuova campagna con ledger aggiornato;
- una readiness V3-17B ricalcolata.

## Requisiti di una capture reale

Una capture deve attestare tutti i seguenti elementi:

1. esecuzione controllata di una ricerca live;
2. snapshot sorgente conservato per audit;
3. verifica Public Rates;
4. decision fingerprint V2 e V3 sullo stesso snapshot;
5. audit witness indipendente dalla receipt;
6. rimozione di identificatori diretti, identità provider e segnali
   commerciali;
7. assenza di teacher output come ground truth;
8. stato ancora `unmeasured`.

I fingerprint obbligatori devono rispettare il formato stabile StayOpti V3.
Il payload non accetta PII, nome o id provider, commissioni, markup, revenue,
probabilità di click o valore economico utente.

## Baseline, adversarial e counterfactual

Gli slot baseline devono provenire da snapshot reali unici. Non possono avere
un parent o un fingerprint di derivazione.

Gli slot adversarial e counterfactual devono:

- indicare esattamente il `parentCaseSlotId` congelato in V3-17B;
- possedere un fingerprint di derivazione;
- riutilizzare il fingerprint dello snapshot reale del parent baseline;
- entrare nello stesso batch del parent oppure dopo che il parent ha già una
  receipt.

Questo impedisce di creare casi derivati non ancorati a una ricerca reale.

## Challenge e replay

Se lo slot richiede una challenge di astensione, il relativo fingerprint è
obbligatorio. Se non la richiede, deve essere `null`.

La stessa regola vale per il replay provider-neutral. In questo modo il piano
V3-17B non può essere soddisfatto riciclando prove su slot diversi o allegando
prove non programmate.

## Determinismo e idempotenza operativa

Le capture vengono ordinate per `caseSlotId` e `captureId` prima del calcolo.
Invertire l'ordine di input non cambia batch, receipt o campaign fingerprint.
Uno slot già receipted viene rifiutato, così come capture duplicate, due
capture sullo stesso slot e due baseline con lo stesso snapshot.

## Gate ancora chiusi

Anche dopo un batch valido:

- `statisticalClaimAllowed` resta `false`;
- `publicV3PromotionAllowed` resta `false`;
- `splitEnabled` resta `false`;
- V2 pubblico non cambia;
- nessun giudizio cieco viene contato;
- nessuna metrica outcome o regret viene accettata in intake.

La chiusura del piano casi reali è soltanto una prerequisito per i successivi
batch di raccolta, assegnazione cieca, giudizio e misurazione. V3-18 Outcome
Pilot e V3-19 Split restano bloccati finché l'intero gate V3-17 non passa.

## Confini di audit

V3-17C non modifica runtime pubblico, booking, pagamenti, analytics, deploy o
integrazioni provider. Non effettua network call e non contiene credenziali.
Il prossimo passo operativo è un collector controllato che produca capture
reali conformi a questo contratto; il collector non può dichiarare evidenza
senza passare da V3-17C.
