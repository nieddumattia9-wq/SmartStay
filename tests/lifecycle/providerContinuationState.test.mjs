import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(
    import.meta.url
  );

const {
  PROVIDER_EXECUTION_STATES,
  createProviderExecutionStates,
  getRunnableProviderExecutions,
  beginProviderExecutionAttempt,
  applyProviderExecutionSuccess,
  applyProviderExecutionFailure,
  summarizeProviderExecutions,
} = require(
  "../../server/providers/common/providerContinuationState.js"
);

function createTwoProviderStates() {
  return createProviderExecutionStates([
    {
      providerId:
        "provider-a",

      supportsContinuation:
        true,

      continuation: {
        providerId:
          "provider-a",

        cursor:
          "a-1",
      },

      providerContext: {
        opaque:
          "a-context",
      },
    },
    {
      providerId:
        "provider-b",

      supportsContinuation:
        true,

      continuation: {
        providerId:
          "provider-b",

        cursor:
          "b-1",
      },

      providerContext: {
        opaque:
          "b-context",
      },
    },
  ]);
}

test(
  "provider continuation state advances providers independently",
  () => {
    let states =
      createTwoProviderStates();

    assert.deepEqual(
      getRunnableProviderExecutions(
        states
      ).map(
        (execution) =>
          execution.providerId
      ),
      [
        "provider-a",
        "provider-b",
      ]
    );

    states =
      beginProviderExecutionAttempt(
        states,
        "provider-a",
        100
      );

    const runningA =
      states.find(
        (execution) =>
          execution.providerId ===
          "provider-a"
      );

    const pendingB =
      states.find(
        (execution) =>
          execution.providerId ===
          "provider-b"
      );

    assert.equal(
      runningA.state,
      PROVIDER_EXECUTION_STATES
        .RUNNING
    );

    assert.equal(
      runningA.attemptCount,
      1
    );

    assert.equal(
      pendingB.state,
      PROVIDER_EXECUTION_STATES
        .PENDING
    );

    states =
      applyProviderExecutionSuccess(
        states,
        "provider-a",
        {
          continuation: {
            providerId:
              "provider-a",

            cursor:
              "a-2",
          },

          providerContext: {
            opaque:
              "a-context-2",
          },

          now:
            200,
        }
      );

    const advancedA =
      states.find(
        (execution) =>
          execution.providerId ===
          "provider-a"
      );

    assert.equal(
      advancedA.state,
      PROVIDER_EXECUTION_STATES
        .PENDING
    );

    assert.equal(
      advancedA.continuation.cursor,
      "a-2"
    );

    assert.equal(
      advancedA.attemptsForCursor,
      0
    );

    assert.equal(
      states.find(
        (execution) =>
          execution.providerId ===
          "provider-b"
      ).continuation.cursor,
      "b-1"
    );
  }
);

test(
  "retry budget is bounded per provider cursor",
  () => {
    let states =
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
              "cursor-1",
          },

          maxAttemptsPerCursor:
            2,
        },
      ]);

    states =
      beginProviderExecutionAttempt(
        states,
        "provider-a",
        100
      );

    states =
      applyProviderExecutionFailure(
        states,
        "provider-a",
        {
          outcome:
            "timeout",

          code:
            "PROVIDER_TIMEOUT",

          message:
            "first timeout",

          retryable:
            true,

          now:
            200,
        }
      );

    let execution =
      states[0];

    assert.equal(
      execution.state,
      PROVIDER_EXECUTION_STATES
        .RETRYABLE_FAILURE
    );

    assert.equal(
      getRunnableProviderExecutions(
        states
      ).length,
      1
    );

    states =
      beginProviderExecutionAttempt(
        states,
        "provider-a",
        300
      );

    states =
      applyProviderExecutionFailure(
        states,
        "provider-a",
        {
          outcome:
            "timeout",

          code:
            "PROVIDER_TIMEOUT",

          message:
            "second timeout",

          retryable:
            true,

          now:
            400,
        }
      );

    execution =
      states[0];

    assert.equal(
      execution.state,
      PROVIDER_EXECUTION_STATES
        .TERMINAL_FAILURE
    );

    assert.equal(
      execution.continuation,
      null
    );

    assert.equal(
      getRunnableProviderExecutions(
        states
      ).length,
      0
    );

    assert.equal(
      summarizeProviderExecutions(
        states
      ).terminalFailures,
      1
    );
  }
);

test(
  "unchanged provider cursors terminate instead of looping",
  () => {
    let states =
      createProviderExecutionStates([
        {
          providerId:
            "provider-a",

          supportsContinuation:
            true,

          continuation: {
            providerId:
              "provider-a",

            cursor: {
              page:
                1,

              token:
                "same",
            },
          },
        },
      ]);

    states =
      beginProviderExecutionAttempt(
        states,
        "provider-a",
        100
      );

    states =
      applyProviderExecutionSuccess(
        states,
        "provider-a",
        {
          continuation: {
            providerId:
              "provider-a",

            cursor: {
              token:
                "same",

              page:
                1,
            },
          },

          now:
            200,
        }
      );

    const execution =
      states[0];

    assert.equal(
      execution.state,
      PROVIDER_EXECUTION_STATES
        .TERMINAL_FAILURE
    );

    assert.equal(
      execution.lastCode,
      "PROVIDER_CONTINUATION_STALLED"
    );

    assert.equal(
      execution.continuation,
      null
    );
  }
);
