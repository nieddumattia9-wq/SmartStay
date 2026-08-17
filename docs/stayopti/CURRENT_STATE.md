# StayOpti Current State

Updated: 2026-08-17  
Status: last reported evidence-backed checkpoint, not a substitute for inspecting the repository

## Mandatory verification

Before any mutation, verify and report:

- repository path is the intended StayOpti repository;
- current branch and HEAD;
- `origin/main` relationship;
- staged, unstaged, and untracked state;
- canonical npm scripts and relevant tool versions;
- newest applicable Evidence artifact.

If repository reality differs from this file, stop and collect read-only evidence. Do not force the repository to match this document.

## Repository alignment after canonical-context installation

- repository `HEAD` immediately after the documentation-only canonical-context installation: `993da13330a96ef29cad8433b4a13a060dc6ed9a`;
- `origin/main` was aligned with that commit and the working tree was clean;
- the installation changed only `AGENTS.md` and `docs/stayopti/**`;
- no application code, dependencies, tests, or configuration files changed;
- the last functional V3-17BF checkpoint remains `12a39af8a5485ac92257fd8207282c6ae1c1810d`.

## Last functional checkpoint before context installation

The most recently accepted functional state reported in the working conversation is after V3-17BF, Golden Negative Outcome Baseline Binding:

- functional checkpoint commit: `12a39af8a5485ac92257fd8207282c6ae1c1810d`;
- Engine V2 canonical suite: `196/196 PASS`;
- Engine V3 suite: `360/360 PASS`;
- provider suite: `46/46 PASS`;
- lifecycle V2, typecheck, and build: PASS;
- working tree: reported clean;
- public baseline: V2 protected;
- V3: not public; promotion remains controlled and manual;
- split stay: not a substitute for an immature single-stay policy.

These values are historical assertions until revalidated locally.

## Program progress

- V3-00 through V3-16: reported complete in the integrated execution program.
- V3-17 Golden Decision Dataset work: active; numerous baseline cases and recovery cases have been executed.
- Multi-room prebook aggregation and failed-slot recovery underwent controlled repair and verification.
- Incorrect favorable-price/savings promotion, including behavior affecting Comfort and Maximum Comfort, was diagnosed and repaired.
- Negative-outcome and upstream failure accounting work reached V3-17BF.
- Dataset quality remains the objective: cases must contribute meaningful traveler decisions, not random test volume.

## Frozen direction

- V2 remains the public safety baseline.
- V3 remains offline/shadow until Golden Dataset, blind evaluation, calibration, robustness, fairness, abstention, and critical-regression gates are satisfied.
- No claim of V3 superiority or public readiness is valid from module count or test count alone.
- Public progression is `off → shadow → guarded-shadow → canary → public-eligible → manual authorization`.

## Next-action rule

Determine the next package from the newest Evidence and repository state. Do not infer it only from an old alphabetical package label. After every accepted checkpoint, update this file with the exact commit, suites, evidence filename, external calls, and remaining blockers.
