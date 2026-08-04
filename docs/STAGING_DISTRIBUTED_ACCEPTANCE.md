# 39C25A.4E distributed staging acceptance

## Gate split

39C25A.4E is split so source correctness cannot silently authorize paid or
live actions.

### 39C25A.4E1 — source readiness

E1 may change and test repository files. It must not:

- sync a Render Blueprint;
- create, scale, restart or delete a service;
- generate cloud spend;
- read or alter provider credentials;
- call LiteAPI, Geoapify or any external datastore;
- enable production or beta traffic.

The controlled runner may contact the npm registry only to install the exact
lockfile and obtain the current advisory report. All test, build and smoke
stages run with non-loopback networking blocked.

E1 passes only when the exact baseline receives both source profiles:

- `render.yaml`, the connected single-instance safety profile that cannot
  declare workers, Key Value or multi-instance paid capacity;
- `deploy/render-staging-distributed.candidate.yaml`, the reviewed distributed
  candidate that is not connected to the Render Blueprint.

The release validators, candidate constraints, documentation and permanent
tests must prove that separation before the commit is pushed transactionally.
Changing the Render Blueprint path to the distributed candidate is an E2
platform mutation, not an E1 source action.

### 39C25A.4E2 — remote infrastructure acceptance

E2 begins only after explicit cost approval and a confirmed provider account
quota. Its first stage makes zero provider calls. It proves the actual paid
topology, private authenticated persistent Valkey, two API instances, two ready
workers, shared state/queue behavior, restart continuity, bounded overload,
graceful drain and rollback readiness.

### 39C25A.4E3 — bounded live journey

E3 is separately authorized after E2 passes. It performs only the minimum
provider journey required to prove destination/search/detail/recheck/handoff
correctness, inside the confirmed account quota. It is not a load test.

## Evidence rules

Every stage produces one immutable ZIP containing:

- exact source/deployed SHA;
- phase journal and final verdict;
- hashes for every evidence file;
- declared external calls and resource mutations;
- sanitized checks without environment or secret values;
- before/after Git or platform state;
- rollback result where applicable.

E1 evidence must state zero Render/provider/datastore calls, zero Render
actions and zero cloud resources created; npm registry activity is declared
separately. E2 evidence must state zero live provider calls. E3 must state
exact bounded provider call counts without exposing provider-private payloads.

The E1 evidence must also record that the connected Blueprint path remains
`render.yaml`, that Auto Sync is `No`, and that the paid distributed candidate
is not the connected path. A Git push is not permitted to be the mechanism
that authorizes or triggers E2.

## Fail-closed rules

The API and worker may not become ready if:

- state or queue is process-local;
- state/queue connection strings differ;
- namespaces differ from the deployment environment;
- queue admission is disabled;
- no ready worker heartbeat exists;
- secrets are absent or weak;
- provider account-rate policies are missing or malformed;
- provider concurrency exceeds eight;
- process-local analytics is enabled.

No operator may bypass readiness to complete the gate.

## Rollback compatibility

A pre-4E release expects one in-memory API and no worker. Before deploying such
a target, scale API to one and stop workers. Persistent Key Value data is
retained for investigation and never automatically deleted by rollback.
Suspension is preferred to deletion while the incident or acceptance evidence
is under review.

The machine-readable contract is
`contracts/STAGING-DISTRIBUTED-ACCEPTANCE-CONTRACT.json`.
