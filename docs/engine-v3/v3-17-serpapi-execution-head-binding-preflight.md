# V3-17T2C-PREFLIGHT — SerpApi execution-head binding

Status: `READY_FOR_USER_LITERAL_ACCEPTANCE`

## Finding

The T2B literal used `HEAD_ed2633c...` for the T2A source checkpoint while the
actual gate commit was `17432a1...`. The runner separately checked its observed
Git HEAD, and the bundle hash protected every executable component, but the
literal did not identify the execution commit. The handoff also accepted any
commit whose parent was the T2A source. That was fail-closed for the intended
linear gate but not an unambiguous authorization seal.

The ambiguous T2B literal is therefore invalidated without being accepted or
consumed.

## Corrected binding

The final authorization literal is generated after the implementation commit.
It contains distinct fields for:

- `SOURCE_SHA`: the immutable T2A source
  `ed2633c1fc700a9d9199ce920b826d2909543ab8`;
- `EXECUTION_HEAD`: the exact commit from which the future runner is invoked;
- the immutable manifest hash;
- the normalized runner-bundle hash;
- every MAX2 policy dimension.

The execution HEAD is not hard-coded into bundle source. Before any credential
access or network operation, the handoff reads Git HEAD, proves that the T2B
gate commit is an ancestor, constructs the only acceptable literal for that
exact HEAD and passes the same HEAD to the Node runner. The runner independently
compares Git HEAD with the declared execution HEAD, recomputes the complete
bundle hash and reconstructs the literal from the observed HEAD. The collector
then repeats the literal and execution-head check before transport.

Any previous or later HEAD, altered manifest, altered bundled file, staged
change, additional dirty path or modified allowed dirty path fails before
credential loading and before transport. A later commit requires a distinct
literal and fresh user acceptance even when the normalized bundle is unchanged.

## Preserved MAX2 policy

- one frozen session;
- one main search;
- at most one property detail;
- two total transmitted requests;
- concurrency one;
- retry and pagination zero;
- automatic stop;
- AES-256-GCM and CurrentUser-DPAPI private quarantine required;
- no remaining stage;
- no automatic Golden admission.

The twelve-session manifest is unchanged. T2C-PREFLIGHT performs no canary,
credential load, SerpApi call, provider call or HTTP request. The final literal
is published for explicit review only and remains unaccepted.

Frozen inputs after the repair:

- manifest SHA-256:
  `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`;
- normalized runner-bundle SHA-256:
  `639e58d2ef2eba14741f0b670f2d4ad641e583f08056f2b179eac393d1a896e5`.

Offline evidence: T2C targeted `14/14`, combined T2C/T2B/T2A `64/64`,
PowerShell handoff `30/30`, Engine V3 `1272/1272`, Engine V2 `196/196`, and
TypeScript build all pass. These checks grant no network authority.

Next recommendation:
`V3-17T2C_SERPAPI_GOOGLE_HOTELS_MAX2_CANARY_LITERAL_ACCEPTANCE_GATE`.
