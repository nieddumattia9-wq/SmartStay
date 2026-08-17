# StayOpti Source Registry

Updated: 2026-08-17

## Precedence and conflict handling

Use this order:

1. explicit accepted decision records with a later date and clear supersession;
2. `PRODUCT_CONSTITUTION.md` for consolidated product invariants;
3. `CURRENT_STATE.md` only for the last evidence-backed operational checkpoint, after local verification;
4. the most recent domain-specific canonical source below;
5. older sources as historical rationale and constraints;
6. implementation and tests as evidence of current behavior, not automatic authority to redefine product intent.

Recency alone does not authorize a philosophy change. If two sources conflict and no later accepted decision clearly resolves them, stop, document the conflict, and ask Mattia. Preserve both sources.

## Canonical originals

| File | Role | SHA-256 |
|---|---|---|
| `canonical-sources/01-SMARTSTAY_PROJECT_SOURCE_OF_TRUTH_2026-07-22-1-.md` | Original project identity, product truth, UX, engine model, architecture, safety, and roadmap | `71e01e50ddd064ed16b0f308a9f67e11d9456dbfbf1ccbd66d3223793cf3564d` |
| `canonical-sources/02-SMARTSTAY_PRODUCT_MARKET_STRATEGY_MASTER_LIST_v1-2-.md` | Product-market strategy, positioning, trust, distribution, metrics, moat, data, and gates | `79ccbdf878d013be3e43067045f56a61ee6c28d39dd064aa0b2ef0f240855324` |
| `canonical-sources/03-StayOpti_Engine_V3_Roadmap_2026-08-13-2-.md` | V3 capabilities and original staged roadmap | `d569e80a4d40810dc4c83ce6cb98365d6715c36fa38a0a3ecc7ec4106bdb78cf` |
| `canonical-sources/04-StayOpti-Engine-V3-Integrated-Execution-Roadmap-2026-08-14-1-.md` | Integrated V3 decision constitution, safety architecture, gates, sequence, and Definition of Done | `6397fd01804241f104a3ae95f806ee4e9ea263ba0b00e3e866fbde590f3c1116` |
| `canonical-sources/05-StayOpti_Windows_PowerShell_Runner_Guardrails_2026-08-15-2-.md` | Initial Windows/PowerShell operating guardrails | `8c32246c554c523553d07bb353f303b6253c4000c7c951af708dcaab907ef80d` |
| `canonical-sources/06-05-StayOpti_Windows_PowerShell_Runner_Guardrails_2026-08-15-2-1-.md` | Newer complete Windows/PowerShell guardrails and incident history | `65b2ba886891f0dc22f4e6fbc59bd3b243825c7bafae9e274771ba360aa45fc3` |

## Integrity rule

Never edit a file in `canonical-sources/` in place. To correct or extend a source, add a new version with a new filename, date, role, hash, provenance, and supersession note. Hash mismatch is a blocker.

## Adding new evidence-derived state

Evidence ZIPs are not automatically canonical product sources. Extract the validated checkpoint into `CURRENT_STATE.md`, identify the Evidence filename and commit, retain the raw artifact according to repository storage policy, and do not treat an unreviewed test result as a product decision.
