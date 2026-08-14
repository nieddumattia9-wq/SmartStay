# StayOpti Engine V3-11B: independent decision orchestration

## Purpose

V3-11 delivered the shadow, canary, kill-switch and rollback controls, but the
compatibility decision still exposed the V2 `best-choice` as its top-level
selection. That contract remains useful for migration, but it cannot prove that
V3 makes a better independent decision.

V3-11B closes that gap before any real-user experiment. It projects a separate
V3 comparable decision from the V3 robustness, regret and abstention policy.
The public result remains the exact V2 object.

## Frozen behavior

- Default execution mode is `off`.
- `shadow` is internal-only and never changes the public V2 result.
- The V2 and V3 selections use the same opaque hotel token, so divergence is
  semantic rather than an artifact of different solution identifiers.
- V3 recommends only the `policyPreferredHotelId` selected by the robustness
  policy and backed by one feasible, eligible, usable single-stay solution.
- V3 abstains when the robustness policy abstains.
- Contract validation, deterministic replay, price integrity, public-rate
  consistency, commercial neutrality, privacy, hard constraints and
  recommendation safety are recorded as closed shadow signals.
- Any V3 execution failure produces a shadow error while V2 remains public.
- No provider call, booking call, analytics transmission, deployment or public
  promotion is introduced.

## SPLIT firewall

SPLIT remains disabled. If temporal optimization reports a split recommendation
or a split solution identifier, this orchestrator fails closed. SPLIT will have
its own later gate and may be surfaced only when net saving is materially large,
both stay options remain valid and comparable, switching friction and added risk
are priced, and the result beats the best single stay after recheck.

## What this phase enables

Once this patch passes in the real repository, StayOpti can collect a truthful
V2-versus-independent-V3 offline or shadow comparison. The next evidence step is
not public rollout: it is the real golden dataset plus blinded human/expert
evaluation, followed by monitored shadow volume and only then a reversible
canary review.
