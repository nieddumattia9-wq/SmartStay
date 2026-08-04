# Synthetic capacity and chaos gate

`39C25A.4D` validates the distributed search runtime before any multi-instance
staging deployment. It uses local Valkey, the real shared-state adapters, the
real BullMQ queue and the real public asynchronous admission route. Provider
work is replaced by a deterministic loopback-only stub.

The executable thresholds are stored in
`contracts/SYNTHETIC-CAPACITY-CHAOS-CONTRACT.json`. The gate covers:

- 1,000 simultaneously active shared sessions with identity and size checks;
- 100 public search admissions inside a ten-second window;
- 1,000 overload attempts against the atomic 1,000-job queue ceiling;
- two independent web processes and two independent worker processes;
- hard web and worker restarts, stale fencing and duplicate-delivery checks;
- a Valkey stop/restart probe that must retain and complete an accepted job;
- bounded BullMQ producer shutdown with forced disconnect if graceful close
  stalls;
- role-specific child-process supervision that fails immediately on a fatal
  IPC message and records PID, mode, received lifecycle events and bounded
  stdout/stderr on a bootstrap timeout;
- a bounded production worker startup path that force-disconnects BullMQ and
  its owned Valkey connection if readiness never completes;
- a dedicated ioredis connection for each BullMQ worker and its blocking fetch,
  while shared state and public queue admission retain their node-redis
  adapters; the connection starts eagerly so an initial loopback refusal is
  retried inside BullMQ's bounded readiness window instead of rejecting the
  bootstrap promise created by ioredis lazy connect; the journal records the
  worker driver, lazy mode, ready status and safe socket error fields;
- sequential process cold starts with one bounded retry, matching the restart
  behavior expected from the staging process supervisor;
- an independent 15-second deadline for every loopback HTTP probe and a
  12-minute hard ceiling for the controlled capacity stage;
- independent scenario deadlines (three minutes for shared sessions and four
  minutes each for multi-process/restart and overload), so the report names the
  first phase that stalls instead of exposing only the final global timeout;
- a live, append-only checkpoint journal with child role, mode, PID and IPC
  lifecycle events, preserved by the controlled runner even if the capacity
  process must be terminated;
- concurrent, deadline-bounded teardown for child processes, shared state and
  namespaces, plus a Windows process-tree `taskkill` fallback after direct
  termination does not produce an exit event;
- bounded HTTP server closure that drops idle and active loopback connections
  after five seconds, and immediate non-zero exit once a failure report has
  been written;
- acknowledgement, status, completion, store, queue, CPU, RSS and event-loop
  measurements;
- a complete permanent test run while external network access is blocked.

The server dependency install is reproducible from `server/package-lock.json`.
The runner requires `ip-address@10.3.1` exactly and keeps the production audit
at severity `high`; the dependency advisory that affects versions through
10.3.0 cannot be waived or converted into an allowed exception.

The shared-session read SLO measures one atomic snapshot of the session value
and tombstone. The Valkey adapter must obtain both with one `MGET`; a second
round trip that rereads the same session is a performance regression and is
blocked by the capacity contract tests.

Each process uses a bounded four-connection command pool with least-inflight
selection and round-robin tie breaking. The pool prevents one large session
response from causing head-of-line blocking for every concurrent state read,
while the hard maximum of eight connections and disabled offline queue keep
resource use and outage behavior bounded.

On Windows, the controlled runner owns a temporary foreground process inside
`Ubuntu-24.04` for the full Valkey-dependent verification window. A systemd
service alone does not keep a WSL instance alive after the launching
`wsl.exe` command exits; without this foreground owner, Windows localhost
forwarding can disappear while Valkey still appeared healthy during the
preflight. The runner proves reachability immediately and again after a
12-second idle window and verifies a real Valkey `PING` at each distributed
checkpoint. The foreground owner is launched through WSL `--exec` from a
static Bash control script transferred over stdin and verified by SHA-256.
No shell program is passed inline through the Windows-to-WSL argument boundary,
and no Linux PID file is used. A unique sentinel requests cooperative shutdown
before staging or committing, after which the temporary script and markers are
removed. This harness does not create `.wslconfig`, change the Windows firewall,
expose Valkey on the WSL interface or add WSL behavior to the application
runtime.

The Windows/WSL harness starts every web and worker fixture sequentially, with
the web tier ready before the first crash worker. A fixture gets at most two
bounded startup attempts. The application's own worker-start deadline is 20
seconds and the outer role-aware supervisor keeps its 45-second ceiling. These
are bootstrap and recovery bounds, not application latency SLOs. The p95 store,
HTTP acknowledgement, status, completion, queue and provider-cap thresholds
remain unchanged. The 1,000-session phase emits progress every 100 writes and
reads. The capacity process records every phase transition and child lifecycle
event in the runner evidence. An individual scenario fails before the global
ceiling, cleanup cannot wait serially on multiple dead children, and the
controlled runner still terminates the complete capacity stage after 12
minutes. Worker connection checkpoints include the non-secret driver, status
and lifecycle phase. Worker lazy connect is prohibited: an initial transient
`ECONNREFUSED` must remain inside the ioredis reconnect lifecycle until the
20-second application deadline. A broken child or Windows/WSL transport
therefore produces bounded, actionable evidence instead of leaving the
repository runner waiting for hours.

Run the capacity process only through the controlled 4D runner. Direct use is
available for maintainers with the responsibility to keep their local Valkey
runtime alive for the entire command:

```text
SMARTSTAY_TEST_VALKEY_URL=redis://127.0.0.1:6389/15 \
SMARTSTAY_CAPACITY_REPORT_PATH=<local-json-path> \
npm run gate:capacity-chaos
```

The gate never imports or calls an accommodation provider adapter, booking
checkout or external analytics endpoint. It accepts loopback traffic only.
Every namespace is environment-scoped and deleted after its scenario.

Local resource measurements size the later staging plan. A local 4D PASS does
not certify a paid Valkey plan or CDN capacity; those remain deployment checks
in 4E. The asynchronous queue flag and distributed state stay disabled in the
normal runtime configuration until that separate rollout gate is approved.
