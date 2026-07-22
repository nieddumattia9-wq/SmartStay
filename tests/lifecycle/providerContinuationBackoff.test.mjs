import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(import.meta.url);

const {
  createProviderExecutionStates,
  beginProviderExecutionAttempt,
  applyProviderExecutionFailure,
  getRunnableProviderExecutions,
  getMinimumProviderRetryAfterMs,
  summarizeProviderExecutions,
} = require(
  "../../server/providers/common/providerContinuationState.js"
);

const {
  deriveSearchLifecycle,
} = require(
  "../../server/utils/searchLifecycle.js"
);

test(
  "retryable continuations wait until nextAttemptAt instead of polling the provider early",
  () => {
    let executions =
      createProviderExecutionStates([
        {
          providerId:
            "provider-a",

          supportsContinuation:
            true,

          continuation: {
            providerId:
              "provider-a",

            cursor:
              "cursor-a",
          },
        },
      ]);

    executions =
      beginProviderExecutionAttempt(
        executions,
        "provider-a",
        1_000
      );

    executions =
      applyProviderExecutionFailure(
        executions,
        "provider-a",
        {
          outcome:
            "rate_limited",

          code:
            "PROVIDER_RATE_LIMITED",

          message:
            "raw rate limit",

          retryable:
            true,

          retryAfterMs:
            5_000,

          now:
            1_100,
        }
      );

    assert.equal(
      getRunnableProviderExecutions(
        executions,
        6_099
      ).length,
      0
    );

    assert.equal(
      getMinimumProviderRetryAfterMs(
        executions,
        6_099
      ),
      1
    );

    assert.equal(
      getRunnableProviderExecutions(
        executions,
        6_100
      ).length,
      1
    );

    const summary =
      summarizeProviderExecutions(
        executions
      );

    assert.equal(
      summary.retryableFailures,
      1
    );
  }
);

test(
  "running lifecycle exposes retryAfterMs without becoming a terminal failure",
  () => {
    const lifecycle =
      deriveSearchLifecycle({
        success:
          true,

        status:
          "InProgress",

        searchIncomplete:
          true,

        retryable:
          true,

        retryAfterMs:
          8_000,
      });

    assert.equal(
      lifecycle.phase,
      "running"
    );

    assert.equal(
      lifecycle.outcome,
      "pending"
    );

    assert.equal(
      lifecycle.retryable,
      true
    );

    assert.equal(
      lifecycle.retryAfterMs,
      8_000
    );
  }
);

test(
  "terminal rate limit remains distinct from timeout and generic provider errors",
  () => {
    const lifecycle =
      deriveSearchLifecycle({
        success:
          false,

        status:
          "Failed",

        code:
          "PROVIDER_RATE_LIMITED",

        retryable:
          true,

        retryAfterMs:
          12_000,
      });

    assert.equal(
      lifecycle.outcome,
      "rate-limited"
    );

    assert.equal(
      lifecycle.publicCode,
      "SEARCH_RATE_LIMITED"
    );

    assert.equal(
      lifecycle.retryAfterMs,
      12_000
    );
  }
);


test(
  "continuation retries use a default backoff and stop when Retry-After exceeds the search window",
  () => {
    let executions =
      createProviderExecutionStates([
        {
          providerId:
            "provider-a",
          supportsContinuation:
            true,
          continuation: {
            providerId:
              "provider-a",
            cursor:
              "cursor-a",
          },
        },
      ]);

    executions =
      beginProviderExecutionAttempt(
        executions,
        "provider-a",
        1_000
      );

    const defaultBackoff =
      applyProviderExecutionFailure(
        executions,
        "provider-a",
        {
          outcome:
            "timeout",
          retryable:
            true,
          retryAfterMs:
            null,
          now:
            1_100,
        }
      );

    assert.equal(
      getMinimumProviderRetryAfterMs(
        defaultBackoff,
        1_100
      ),
      2_500
    );

    const tooLong =
      applyProviderExecutionFailure(
        executions,
        "provider-a",
        {
          outcome:
            "rate_limited",
          code:
            "PROVIDER_RATE_LIMITED",
          retryable:
            true,
          retryAfterMs:
            61_000,
          now:
            1_100,
        }
      );

    const summary =
      summarizeProviderExecutions(
        tooLong
      );

    assert.equal(
      summary.terminalFailures,
      1
    );

    assert.equal(
      summary.runnable,
      0
    );
  }
);
