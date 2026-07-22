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
  retryable = false,
  retryAfterMs = null,
  maxAttemptsPerCursor =
    DEFAULT_MAX_ATTEMPTS_PER_CURSOR,
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
        : PROVIDER_EXECUTION_STATES
            .COMPLETED,

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
      null,

    retryable:
      Boolean(retryable),

    retryAfterMs:
      normalizeRetryAfterMs(
        retryAfterMs
      ),
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

function isProviderExecutionRunnable(
  execution
) {
  const normalizedExecution =
    normalizeProviderExecutionState(
      execution
    );

  return Boolean(
    normalizedExecution
      .supportsContinuation &&
    normalizedExecution
      .continuation &&
    (
      normalizedExecution.state ===
        PROVIDER_EXECUTION_STATES
          .PENDING ||
      normalizedExecution.state ===
        PROVIDER_EXECUTION_STATES
          .RETRYABLE_FAILURE
    )
  );
}

function getRunnableProviderExecutions(
  executions = []
) {
  return normalizeProviderExecutionStates(
    executions
  ).filter(
    isProviderExecutionRunnable
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

  const canRetry =
    Boolean(retryable) &&
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
        canRetry
          ? normalizeRetryAfterMs(
              retryAfterMs
            )
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
  normalizeProviderContinuation,
  createProviderExecutionState,
  createProviderExecutionStates,
  normalizeProviderExecutionState,
  normalizeProviderExecutionStates,
  isProviderExecutionRunnable,
  getRunnableProviderExecutions,
  getProviderExecution,
  beginProviderExecutionAttempt,
  applyProviderExecutionSuccess,
  applyProviderExecutionFailure,
  summarizeProviderExecutions,
  getPrimaryRunnableProviderExecution,
};
