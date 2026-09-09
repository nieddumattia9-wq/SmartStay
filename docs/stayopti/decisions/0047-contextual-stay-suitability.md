# D-0047 — Contextual suitability before evaluation recommendation

Status: accepted by the D-0047 task; offline synthetic implementation.
Source: 62fe765e9423bc8b9134c3eb16e94b72cfa46d62.

The confirmed D-0046 manual-Balanced dorm outcome is preserved before repair.
Add `staySuitabilityContextV3` and version the evaluation intent bridge @2.
Preserve the profile, numeric weights and cost policy; gate contextual suitability
using known offer privacy even where contextual unit fit is null. Unknown relevant
privacy is unverified; sharing mismatches are not fabricated human hard violations.
Explicit unit preferences and mandatory requirements remain distinct. Verify them
against the evaluated offer, not the property's generic inventory. Independent room,
bath and property category evidence prevents hotel/hostel shortcuts.

Use existing normalized spending capacity, market reliability and contextual comfort
dimensions to explain expectations. Candidate fallback does not certify premium;
neither budget nor stars creates an automatic luxury floor or spending obligation.
The precautionary non-shared context applies even with a constrained budget; a
case may abstain instead of assuming consent. This is a scoped evaluation policy
decision, not a universal human preference or public behavior change.

No production promotion, real execution or Golden admission. Full robustness is
not demonstrated; preserve the separate Maximum Comfort 50m/100 EUR sensitivity
and zero positive Upgrade assignments in the D-0046 grid. Numerical merit and
the historical V2 classification-confidence component are not globally retuned.

Validation and concrete before/after choices are documented in
`docs/engine-v3/d0047-contextual-stay-suitability.md` and the external synthetic
delivery. Selective work-branch commit/push is authorized only after mandatory
gates; final synchronization state must be observed and reported explicitly.
Seven excluded and seventeen sealed files remain byte-identical. No implicit
manifest/progress migration or rollback is performed.
