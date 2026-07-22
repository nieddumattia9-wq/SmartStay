const {
  DEFAULT_PROVIDER_RETRY_AFTER_MS,
} = require(
  "./providerRetryPolicy"
);

const PROVIDER_EXECUTION_STATES =
  Object.freeze({
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    RETRYABLE_FAILURE:
      "retryable-failure",
    TERMINAL_FAILURE:
      "terminal-failure",
  });

const DEFAULT_MAX_ATTEMPTS_PER_CURSOR =
  2;

const DEFAULT_MAX_CONTINUATION_RETRY_WAIT_MS =
  60_000;

function normalizeProviderId(
  providerId
) {
  if (
    typeof providerId !== "string" ||
    providerId.trim().length === 0
  ) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return providerId
    .trim()
    .toLowerCase();
}

function normalizePositiveInteger(
  value,
  fallbackValue
) {
  const parsedValue =
    Number.parseInt(
      value,
      10
    );

  return (
    Number.isInteger(parsedValue) &&
    parsedValue > 0
  )
    ? parsedValue
    : fallbackValue;
}

function normalizeNullableTimestamp(
  value
) {
  const timestamp =
    Number(value);

  return (
    Number.isFinite(timestamp) &&
    timestamp >= 0
  )
    ? timestamp
    : null;
}

function normalizeRetryAfterMs(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const retryAfterMs =
    Number(value);

  return (
    Number.isFinite(retryAfterMs) &&
    retryAfterMs >= 0
  )
    ? retryAfterMs
    : null;
}

function normalizeProviderContinuation(
  continuation,
  fallbackProviderId = null
) {
  if (
    !continuation ||
    typeof continuation !== "object" ||
    Array.isArray(continuation)
  ) {
    return null;
  }

  const providerId =
    normalizeProviderId(
      continuation.providerId ??
      fallbackProviderId
    );

  const cursor =
    continuation.cursor;

  const hasUsableCursor =
    cursor !== undefined &&
    cursor !== null &&
    (
      typeof cursor !== "string" ||
      cursor.trim().length > 0
    );

  if (!hasUsableCursor) {
    return null;
  }

  return {
    providerId,
    cursor,
  };
}

function stableSerialize(
  value
) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return (
      "[" +
      value
        .map(stableSerialize)
        .join(",") +
      "]"
    );
  }

  if (typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => (
          `${JSON.stringify(key)}:${stableSerialize(value[key])}`
        ))
        .join(",") +
      "}"
    );
  }

  return JSON.stringify(value);
}

function isSameContinuation(
  firstContinuation,
  secondContinuation
) {
  const first =
    firstContinuation
      ? normalizeProviderContinuation(
          firstContinuation,
          firstContinuation.providerId
        )
      : null;

  const second =
    secondContinuation
      ? normalizeProviderContinuation(
          secondContinuation,
          secondContinuation.providerId
        )
      : null;

  if (!first || !second) {
    return first === second;
  }

  return (
    first.providerId ===
      second.providerId &&
    stableSerialize(first.cursor) ===
      stableSerialize(second.cursor)
  );
}

function createProviderExecutionState({
  providerId,
  supportsContinuation = false,
  continuation = null,
  providerContext = null,
  outcome = null,
  code = null,
  message = null,
  retryable = false,
  retryAfterMs = null,
  maxAttemptsPerCursor =
    DEFAULT_MAX_ATTEMPTS_PER_CURSOR,
  DEFAULT_MAX_CONTINUATION_RETRY_WAIT_MS,
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const normalizedContinuation =
    continuation
      ? normalizeProviderContinuation(
          continuation,
          normalizedProviderId
        )
      : null;

  const canContinue =
    Boolean(supportsContinuation) &&
    Boolean(normalizedContinuation);

  const normalizedOutcome =
    typeof outcome === "string"
      ? outcome.trim().toLowerCase()
      : "";

  const terminalFailure =
    new Set([
      "error",
      "timeout",
      "rate_limited",
      "rate-limited",
      "unavailable",
      "circuit_open",
      "circuit-open",
      "stalled",
    ]).has(
      normalizedOutcome
    );

  return {
    providerId:
      normalizedProviderId,

    supportsContinuation:
      Boolean(
        supportsContinuation
      ),

    state:
      canContinue
        ? PROVIDER_EXECUTION_STATES
            .PENDING
        : (
            terminalFailure
              ? PROVIDER_EXECUTION_STATES
                  .TERMINAL_FAILURE
              : PROVIDER_EXECUTION_STATES
                  .COMPLETED
          ),

    continuation:
      normalizedContinuation,

    providerContext,

    attemptCount:
      0,

    attemptsForCursor:
      0,

    maxAttemptsPerCursor:
      normalizePositiveInteger(
        maxAttemptsPerCursor,
        DEFAULT_MAX_ATTEMPTS_PER_CURSOR
      ),

    lastAttemptAt:
      null,

    completedAt:
      canContinue
        ? null
        : Date.now(),

    lastOutcome:
      outcome,

    lastCode:
      code,

    lastError:
      terminalFailure &&
      typeof message === "string" &&
      message.trim()
        ? message.trim()
        : null,

    retryable:
      Boolean(retryable),

    retryAfterMs:
      normalizeRetryAfterMs(
        retryAfterMs
      ),

    nextAttemptAt:
      null,
  };
}

function normalizeProviderExecutionState(
  execution
) {
  if (
    !execution ||
    typeof execution !== "object" ||
    Array.isArray(execution)
  ) {
    throw new Error(
      "Provider execution state must be an object."
    );
  }

  const providerId =
    normalizeProviderId(
      execution.providerId
    );

  const supportsContinuation =
    Boolean(
      execution.supportsContinuation
    );

  const continuation =
    execution.continuation
      ? normalizeProviderContinuation(
          execution.continuation,
          providerId
        )
      : null;

  const allowedStates =
    new Set(
      Object.values(
        PROVIDER_EXECUTION_STATES
      )
    );

  let state =
    allowedStates.has(
      execution.state
    )
      ? execution.state
      : (
          supportsContinuation &&
          continuation
            ? PROVIDER_EXECUTION_STATES
                .PENDING
            : PROVIDER_EXECUTION_STATES
                .COMPLETED
        );

  if (
    !supportsContinuation ||
    !continuation
  ) {
    if (
      state ===
        PROVIDER_EXECUTION_STATES
          .PENDING ||
      state ===
        PROVIDER_EXECUTION_STATES
          .RUNNING ||
      state ===
        PROVIDER_EXECUTION_STATES
          .RETRYABLE_FAILURE
    ) {
      state =
        PROVIDER_EXECUTION_STATES
          .COMPLETED;
    }
  }

  return {
    providerId,

    supportsContinuation,

    state,

    continuation,

    providerContext:
      execution.providerContext ??
      null,

    attemptCount:
      Math.max(
        0,
        Number.parseInt(
          execution.attemptCount,
          10
        ) || 0
      ),

    attemptsForCursor:
      Math.max(
        0,
        Number.parseInt(
          execution.attemptsForCursor,
          10
        ) || 0
      ),

    maxAttemptsPerCursor:
      normalizePositiveInteger(
        execution.maxAttemptsPerCursor,
        DEFAULT_MAX_ATTEMPTS_PER_CURSOR
      ),

    lastAttemptAt:
      normalizeNullableTimestamp(
        execution.lastAttemptAt
      ),

    completedAt:
      normalizeNullableTimestamp(
        execution.completedAt
      ),

    lastOutcome:
      execution.lastOutcome ??
      null,

    lastCode:
      execution.lastCode ??
      null,

    lastError:
      typeof execution.lastError ===
        "string" &&
      execution.lastError.trim()
        ? execution.lastError.trim()
        : null,

    retryable:
      Boolean(
        execution.retryable
      ),

    retryAfterMs:
      normalizeRetryAfterMs(
        execution.retryAfterMs
      ),

    nextAttemptAt:
      normalizeNullableTimestamp(
        execution.nextAttemptAt
      ),
  };
}

function createProviderExecutionStates(
  descriptors = []
) {
  const executionsByProvider =
    new Map();

  for (
    const descriptor of
      Array.isArray(descriptors)
        ? descriptors
        : []
  ) {
    const execution =
      createProviderExecutionState(
        descriptor
      );

    executionsByProvider.set(
      execution.providerId,
      execution
    );
  }

  return Array.from(
    executionsByProvider.values()
  );
}

function normalizeProviderExecutionStates(
  executions = []
) {
  const executionsByProvider =
    new Map();

  for (
    const execution of
      Array.isArray(executions)
        ? executions
        : []
  ) {
    const normalizedExecution =
      normalizeProviderExecutionState(
        execution
      );

    executionsByProvider.set(
      normalizedExecution.providerId,
      normalizedExecution
    );
  }

  return Array.from(
    executionsByProvider.values()
  );
}

function getProviderExecutionRetryDelayMs(
  execution,
  now = Date.now()
) {
  const normalizedExecution =
    normalizeProviderExecutionState(
      execution
    );

  if (
    normalizedExecution.state !==
      PROVIDER_EXECUTION_STATES
        .RETRYABLE_FAILURE ||
    !Number.isFinite(
      normalizedExecution
        .nextAttemptAt
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    normalizedExecution
      .nextAttemptAt - now
  );
}

function isProviderExecutionRunnable(
  execution,
  now = Date.now()
) {
  const normalizedExecution =
    normalizeProviderExecutionState(
      execution
    );

  const stateAllowsExecution =
    normalizedExecution.state ===
      PROVIDER_EXECUTION_STATES
        .PENDING ||
    normalizedExecution.state ===
      PROVIDER_EXECUTION_STATES
        .RETRYABLE_FAILURE;

  if (
    !normalizedExecution
      .supportsContinuation ||
    !normalizedExecution
      .continuation ||
    !stateAllowsExecution
  ) {
    return false;
  }

  return (
    getProviderExecutionRetryDelayMs(
      normalizedExecution,
      now
    ) === 0
  );
}

function getRunnableProviderExecutions(
  executions = [],
  now = Date.now()
) {
  return normalizeProviderExecutionStates(
    executions
  ).filter(
    (execution) =>
      isProviderExecutionRunnable(
        execution,
        now
      )
  );
}

function getMinimumProviderRetryAfterMs(
  executions = [],
  now = Date.now()
) {
  const retryDelays =
    normalizeProviderExecutionStates(
      executions
    )
      .filter(
        (execution) =>
          execution.state ===
            PROVIDER_EXECUTION_STATES
              .RETRYABLE_FAILURE &&
          Boolean(
            execution.continuation
          )
      )
      .map(
        (execution) =>
          getProviderExecutionRetryDelayMs(
            execution,
            now
          )
      )
      .filter(
        (delay) =>
          Number.isFinite(delay) &&
          delay > 0
      );

  if (retryDelays.length === 0) {
    return null;
  }

  return Math.min(
    ...retryDelays
  );
}

function replaceProviderExecution(
  executions,
  replacement
) {
  const normalizedExecutions =
    normalizeProviderExecutionStates(
      executions
    );

  const normalizedReplacement =
    normalizeProviderExecutionState(
      replacement
    );

  const replaced =
    normalizedExecutions.map(
      (execution) => (
        execution.providerId ===
          normalizedReplacement
            .providerId
          ? normalizedReplacement
          : execution
      )
    );

  if (
    !replaced.some(
      (execution) =>
        execution.providerId ===
        normalizedReplacement
          .providerId
    )
  ) {
    replaced.push(
      normalizedReplacement
    );
  }

  return replaced;
}

function getProviderExecution(
  executions,
  providerId
) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  return (
    normalizeProviderExecutionStates(
      executions
    ).find(
      (execution) =>
        execution.providerId ===
        normalizedProviderId
    ) ??
    null
  );
}

function beginProviderExecutionAttempt(
  executions,
  providerId,
  now = Date.now()
) {
  const execution =
    getProviderExecution(
      executions,
      providerId
    );

  if (
    !execution ||
    !isProviderExecutionRunnable(
      execution
    )
  ) {
    throw new Error(
      `Provider "${providerId}" has no runnable continuation.`
    );
  }

  return replaceProviderExecution(
    executions,
    {
      ...execution,

      state:
        PROVIDER_EXECUTION_STATES
          .RUNNING,

      attemptCount:
        execution.attemptCount + 1,

      attemptsForCursor:
        execution.attemptsForCursor + 1,

      lastAttemptAt:
        normalizeNullableTimestamp(
          now
        ) ?? Date.now(),

      lastError:
        null,

      retryable:
        false,

      retryAfterMs:
        null,

      nextAttemptAt:
        null,
    }
  );
}

function applyProviderExecutionSuccess(
  executions,
  providerId,
  {
    continuation = null,
    providerContext,
    outcome = "success",
    code = null,
    now = Date.now(),
  } = {}
) {
  const execution =
    getProviderExecution(
      executions,
      providerId
    );

  if (!execution) {
    throw new Error(
      `Provider execution "${providerId}" was not found.`
    );
  }

  const nextContinuation =
    continuation
      ? normalizeProviderContinuation(
          continuation,
          execution.providerId
        )
      : null;

  const stalled =
    Boolean(nextContinuation) &&
    isSameContinuation(
      execution.continuation,
      nextContinuation
    );

  if (stalled) {
    return replaceProviderExecution(
      executions,
      {
        ...execution,

        state:
          PROVIDER_EXECUTION_STATES
            .TERMINAL_FAILURE,

        continuation:
          null,

        completedAt:
          normalizeNullableTimestamp(
            now
          ) ?? Date.now(),

        lastOutcome:
          "stalled",

        lastCode:
          "PROVIDER_CONTINUATION_STALLED",

        lastError:
          "Provider continuation did not advance.",

        retryable:
          false,

        retryAfterMs:
          null,

        nextAttemptAt:
          null,
      }
    );
  }

  const hasNextContinuation =
    Boolean(nextContinuation);

  return replaceProviderExecution(
    executions,
    {
      ...execution,

      state:
        hasNextContinuation
          ? PROVIDER_EXECUTION_STATES
              .PENDING
          : PROVIDER_EXECUTION_STATES
              .COMPLETED,

      continuation:
        nextContinuation,

      providerContext:
        providerContext ===
          undefined
          ? execution.providerContext
          : providerContext,

      attemptsForCursor:
        hasNextContinuation
          ? 0
          : execution.attemptsForCursor,

      completedAt:
        hasNextContinuation
          ? null
          : (
              normalizeNullableTimestamp(
                now
              ) ?? Date.now()
            ),

      lastOutcome:
        outcome,

      lastCode:
        code,

      lastError:
        null,

      retryable:
        false,

      retryAfterMs:
        null,

      nextAttemptAt:
        null,
    }
  );
}

function applyProviderExecutionFailure(
  executions,
  providerId,
  {
    outcome = "error",
    code = null,
    message =
      "Provider continuation failed.",
    retryable = false,
    retryAfterMs = null,
    now = Date.now(),
  } = {}
) {
  const execution =
    getProviderExecution(
      executions,
      providerId
    );

  if (!execution) {
    throw new Error(
      `Provider execution "${providerId}" was not found.`
    );
  }

  const normalizedRetryAfterMs =
    normalizeRetryAfterMs(
      retryAfterMs
    );

  const effectiveRetryAfterMs =
    Boolean(retryable)
      ? (
          normalizedRetryAfterMs ??
          DEFAULT_PROVIDER_RETRY_AFTER_MS
        )
      : normalizedRetryAfterMs;

  const retryFitsCurrentSearch =
    effectiveRetryAfterMs === null ||
    effectiveRetryAfterMs <=
      DEFAULT_MAX_CONTINUATION_RETRY_WAIT_MS;

  const canRetry =
    Boolean(retryable) &&
    retryFitsCurrentSearch &&
    Boolean(execution.continuation) &&
    execution.attemptsForCursor <
      execution.maxAttemptsPerCursor;

  return replaceProviderExecution(
    executions,
    {
      ...execution,

      state:
        canRetry
          ? PROVIDER_EXECUTION_STATES
              .RETRYABLE_FAILURE
          : PROVIDER_EXECUTION_STATES
              .TERMINAL_FAILURE,

      continuation:
        canRetry
          ? execution.continuation
          : null,

      completedAt:
        canRetry
          ? null
          : (
              normalizeNullableTimestamp(
                now
              ) ?? Date.now()
            ),

      lastOutcome:
        outcome,

      lastCode:
        code,

      lastError:
        typeof message === "string" &&
        message.trim()
          ? message.trim()
          : "Provider continuation failed.",

      retryable:
        canRetry,

      retryAfterMs:
        effectiveRetryAfterMs,

      nextAttemptAt:
        canRetry &&
        effectiveRetryAfterMs !== null
          ? (
              normalizeNullableTimestamp(
                now
              ) ?? Date.now()
            ) +
            effectiveRetryAfterMs
          : null,
    }
  );
}

function summarizeProviderExecutions(
  executions = []
) {
  const normalizedExecutions =
    normalizeProviderExecutionStates(
      executions
    );

  const summary = {
    total:
      normalizedExecutions.length,

    pending:
      0,

    running:
      0,

    completed:
      0,

    retryableFailures:
      0,

    waitingForRetry:
      0,

    retryAfterMs:
      null,

    terminalFailures:
      0,

    runnable:
      0,
  };

  for (
    const execution of
      normalizedExecutions
  ) {
    if (
      execution.state ===
      PROVIDER_EXECUTION_STATES
        .PENDING
    ) {
      summary.pending += 1;
    }

    if (
      execution.state ===
      PROVIDER_EXECUTION_STATES
        .RUNNING
    ) {
      summary.running += 1;
    }

    if (
      execution.state ===
      PROVIDER_EXECUTION_STATES
        .COMPLETED
    ) {
      summary.completed += 1;
    }

    if (
      execution.state ===
      PROVIDER_EXECUTION_STATES
        .RETRYABLE_FAILURE
    ) {
      summary.retryableFailures += 1;

      const retryDelay =
        getProviderExecutionRetryDelayMs(
          execution
        );

      if (retryDelay > 0) {
        summary.waitingForRetry += 1;

        summary.retryAfterMs =
          summary.retryAfterMs === null
            ? retryDelay
            : Math.min(
                summary.retryAfterMs,
                retryDelay
              );
      }
    }

    if (
      execution.state ===
      PROVIDER_EXECUTION_STATES
        .TERMINAL_FAILURE
    ) {
      summary.terminalFailures += 1;
    }

    if (
      isProviderExecutionRunnable(
        execution
      )
    ) {
      summary.runnable += 1;
    }
  }

  return Object.freeze(
    summary
  );
}

function getPrimaryRunnableProviderExecution(
  executions = []
) {
  return (
    getRunnableProviderExecutions(
      executions
    )[0] ??
    null
  );
}

module.exports = {
  PROVIDER_EXECUTION_STATES,
  DEFAULT_MAX_ATTEMPTS_PER_CURSOR,
  DEFAULT_MAX_CONTINUATION_RETRY_WAIT_MS,
  normalizeProviderContinuation,
  createProviderExecutionState,
  createProviderExecutionStates,
  normalizeProviderExecutionState,
  normalizeProviderExecutionStates,
  getProviderExecutionRetryDelayMs,
  isProviderExecutionRunnable,
  getRunnableProviderExecutions,
  getMinimumProviderRetryAfterMs,
  getProviderExecution,
  beginProviderExecutionAttempt,
  applyProviderExecutionSuccess,
  applyProviderExecutionFailure,
  summarizeProviderExecutions,
  getPrimaryRunnableProviderExecution,
};
