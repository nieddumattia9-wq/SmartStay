const PROVIDER_CIRCUIT_STATES = {
  CLOSED: "closed",
  OPEN: "open",
  HALF_OPEN: "half_open",
};

function parsePositiveInteger(value, fallbackValue) {
  const parsedValue =
    Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : fallbackValue;
}

const DEFAULT_PROVIDER_HEALTH_POLICY = {
  failureThreshold:
    parsePositiveInteger(
      process.env.PROVIDER_CIRCUIT_FAILURE_THRESHOLD,
      3
    ),

  cooldownMs:
    parsePositiveInteger(
      process.env.PROVIDER_CIRCUIT_COOLDOWN_MS,
      120000
    ),
};

const providerHealthStates =
  new Map();

function validateProviderId(providerId) {
  if (
    typeof providerId !== "string" ||
    providerId.trim().length === 0
  ) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return providerId.trim();
}

function resolveProviderHealthPolicy(
  policy = {}
) {
  return {
    failureThreshold:
      parsePositiveInteger(
        policy.failureThreshold,
        DEFAULT_PROVIDER_HEALTH_POLICY
          .failureThreshold
      ),

    cooldownMs:
      parsePositiveInteger(
        policy.cooldownMs,
        DEFAULT_PROVIDER_HEALTH_POLICY
          .cooldownMs
      ),
  };
}

function resolveNow(options = {}) {
  return Number.isFinite(
    options.nowMs
  )
    ? options.nowMs
    : Date.now();
}

function createProviderHealthState(
  providerId
) {
  return {
    providerId,

    circuitState:
      PROVIDER_CIRCUIT_STATES.CLOSED,

    consecutiveFailures: 0,

    openedAt: null,
    nextAttemptAt: null,

    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,

    lastErrorType: null,
    lastErrorMessage: null,
    lastErrorStatus: null,

    halfOpenProbeInFlight: false,
  };
}

function getOrCreateProviderHealthState(
  providerId
) {
  const validProviderId =
    validateProviderId(providerId);

  if (
    !providerHealthStates.has(
      validProviderId
    )
  ) {
    providerHealthStates.set(
      validProviderId,
      createProviderHealthState(
        validProviderId
      )
    );
  }

  return providerHealthStates.get(
    validProviderId
  );
}

function createProviderHealthSnapshot(
  state,
  now
) {
  const retryAfterMs =
    state.circuitState ===
      PROVIDER_CIRCUIT_STATES.OPEN &&
    Number.isFinite(
      state.nextAttemptAt
    )
      ? Math.max(
          0,
          state.nextAttemptAt - now
        )
      : 0;

  return {
    ...state,
    retryAfterMs,
  };
}

function beginProviderAttempt(
  providerId,
  options = {}
) {
  const now =
    resolveNow(options);

  const state =
    getOrCreateProviderHealthState(
      providerId
    );

  if (
    state.circuitState ===
    PROVIDER_CIRCUIT_STATES.OPEN
  ) {
    const cooldownFinished =
      !Number.isFinite(
        state.nextAttemptAt
      ) ||
      now >= state.nextAttemptAt;

    if (!cooldownFinished) {
      return {
        allowed: false,
        reason: "circuit_open",
        health:
          createProviderHealthSnapshot(
            state,
            now
          ),
      };
    }

    state.circuitState =
      PROVIDER_CIRCUIT_STATES.HALF_OPEN;

    state.halfOpenProbeInFlight =
      false;
  }

  if (
    state.circuitState ===
      PROVIDER_CIRCUIT_STATES.HALF_OPEN &&
    state.halfOpenProbeInFlight
  ) {
    return {
      allowed: false,
      reason:
        "half_open_probe_in_flight",

      health:
        createProviderHealthSnapshot(
          state,
          now
        ),
    };
  }

  state.lastAttemptAt =
    now;

  if (
    state.circuitState ===
    PROVIDER_CIRCUIT_STATES.HALF_OPEN
  ) {
    state.halfOpenProbeInFlight =
      true;
  }

  return {
    allowed: true,

    reason:
      state.circuitState ===
      PROVIDER_CIRCUIT_STATES.HALF_OPEN
        ? "half_open_probe"
        : "circuit_closed",

    health:
      createProviderHealthSnapshot(
        state,
        now
      ),
  };
}

function recordProviderSuccess(
  providerId,
  options = {}
) {
  const now =
    resolveNow(options);

  const state =
    getOrCreateProviderHealthState(
      providerId
    );

  state.circuitState =
    PROVIDER_CIRCUIT_STATES.CLOSED;

  state.consecutiveFailures =
    0;

  state.openedAt =
    null;

  state.nextAttemptAt =
    null;

  state.lastSuccessAt =
    now;

  state.halfOpenProbeInFlight =
    false;

  return createProviderHealthSnapshot(
    state,
    now
  );
}

function recordProviderFailure(
  providerId,
  failure = {},
  options = {}
) {
  const now =
    resolveNow(options);

  const policy =
    resolveProviderHealthPolicy(
      options.policy
    );

  const state =
    getOrCreateProviderHealthState(
      providerId
    );

  const wasHalfOpen =
    state.circuitState ===
    PROVIDER_CIRCUIT_STATES.HALF_OPEN;

  state.consecutiveFailures += 1;

  state.lastFailureAt =
    now;

  state.lastErrorType =
    failure.errorType ??
    "provider_error";

  state.lastErrorMessage =
    failure.message ??
    null;

  state.lastErrorStatus =
    failure.status ??
    null;

  state.halfOpenProbeInFlight =
    false;

  const shouldOpenCircuit =
    wasHalfOpen ||
    state.consecutiveFailures >=
      policy.failureThreshold;

  if (shouldOpenCircuit) {
    state.circuitState =
      PROVIDER_CIRCUIT_STATES.OPEN;

    state.openedAt =
      now;

    state.nextAttemptAt =
      now + policy.cooldownMs;
  } else {
    state.circuitState =
      PROVIDER_CIRCUIT_STATES.CLOSED;

    state.openedAt =
      null;

    state.nextAttemptAt =
      null;
  }

  return createProviderHealthSnapshot(
    state,
    now
  );
}

function recordProviderHealthyResponse(
  providerId,
  options = {}
) {
  return recordProviderSuccess(
    providerId,
    options
  );
}

function getProviderHealth(
  providerId,
  options = {}
) {
  const now =
    resolveNow(options);

  const state =
    getOrCreateProviderHealthState(
      providerId
    );

  return createProviderHealthSnapshot(
    state,
    now
  );
}

function resetProviderHealth(
  providerId
) {
  const validProviderId =
    validateProviderId(providerId);

  providerHealthStates.delete(
    validProviderId
  );
}

function resetAllProviderHealth() {
  providerHealthStates.clear();
}

module.exports = {
  PROVIDER_CIRCUIT_STATES,
  DEFAULT_PROVIDER_HEALTH_POLICY,
  beginProviderAttempt,
  recordProviderSuccess,
  recordProviderFailure,
  recordProviderHealthyResponse,
  getProviderHealth,
  resetProviderHealth,
  resetAllProviderHealth,
};
