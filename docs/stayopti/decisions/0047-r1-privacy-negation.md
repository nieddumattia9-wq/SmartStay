# D-0047 R1 — Negation is not affirmative privacy evidence

Approved by the explicit R1 instruction, 2026-09-09. Source D-0047 commit:
`627f2fd8f07d9f8a744b8634d0508cd450e6f745`.

The complete bridge reproduction falsely selected an explicitly nonprivate-bath
offer under a required private bathroom. Preserve the failing input/output and
repair feature-scoped polarity, not ranking weights. Keep PRIVATE, NOT_PRIVATE,
SHARED, UNKNOWN and CONFLICTING distinct, including their downstream suitability
and mandatory-constraint effects. No private evidence can be manufactured through
property fallback, substring matches or a negated shared claim.

This forward-only repair versions the evaluation context/bridge and preserves
Balanced plus all frozen D-0047/D-0046 inputs and numerical role behavior. It does
not certify unrestricted text interpretation. Unknown text still needs documented
evidence. Private hostel offers and explicit shared preferences retain their meaning.

Rejected alternatives: patching only the four literal strings; merely adding a
parser label without rejecting the invalid recommendation; changing fixtures or
weights to obtain PASS; treating NOT_PRIVATE as a proven shared-room type.

Evidence: a new bridge-level initially red regression, bounded polarity variants,
constraint/fallback tests, all-role exclusion, unchanged historical semantic outputs,
clean isolated canonical gates and exact publication inventory. Technical details
and residual Maximum Comfort/Upgrade limitations are in
`docs/engine-v3/d0047-r1-privacy-negation.md`.

No amend, rollback, main publication, real data, provider call or public activation.
The user authorizes a new R1 commit and a non-force push of D-0047 plus R1 to
`refs/heads/codex/evaluation-d0036-d0041` only, after gates. The final delivery
records actual local/remote SHAs, push result and pending commits. Seven excluded
paths and seventeen D-0037 sealed files remain byte-identical.
