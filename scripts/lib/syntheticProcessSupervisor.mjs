function normalizeText(value, maximumLength = 4096) {
  return String(value ?? "").slice(-maximumLength);
}

function processRole(record) {
  return String(record?.options?.role ?? "unknown");
}

function processMode(record) {
  return String(record?.options?.webMode ?? "default");
}

function eventName(message) {
  return String(message?.event ?? "unknown").slice(0, 80);
}

function createSupervisorError(code, message, details) {
  const error = new Error(message);

  error.code = code;
  error.details = details;
  return error;
}

export function runSyntheticOperationWithDeadline(
  operation,
  {
    timeoutMs,
    code = "CAPACITY_OPERATION_TIMEOUT",
    message = "Synthetic capacity operation exceeded its deadline.",
    details = null,
  } = {}
) {
  const boundedTimeoutMs = Math.max(
    1,
    Number(timeoutMs) || 1
  );
  let timeoutHandle;
  const deadline = new Promise((_, rejectDeadline) => {
    timeoutHandle = setTimeout(() => {
      const resolvedDetails =
        typeof details === "function"
          ? details()
          : details;

      rejectDeadline(
        createSupervisorError(
          code,
          message,
          Object.freeze({
            timeoutMs: boundedTimeoutMs,
            ...(resolvedDetails ?? {}),
          })
        )
      );
    }, boundedTimeoutMs);
  });

  return Promise.race([
    Promise.resolve().then(operation),
    deadline,
  ]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

export function describeSyntheticProcess(record, expectedEvent = null) {
  return Object.freeze({
    role: processRole(record),
    mode: processMode(record),
    pid: Number(record?.child?.pid) || null,
    expectedEvent,
    elapsedMs: Math.max(0, Date.now() - Number(record?.startedAt ?? Date.now())),
    exited: Boolean(record?.exited),
    exitCode: record?.exitCode ?? null,
    signal: record?.signal ?? null,
    spawnError: record?.spawnError ?? null,
    receivedEvents: Object.freeze(
      (record?.messages ?? []).slice(-20).map(eventName)
    ),
    stdout: normalizeText(record?.stdout),
    stderr: normalizeText(record?.stderr),
  });
}

function rejectWaiters(record, errorFactory) {
  for (const waiter of [...record.waiters]) {
    clearTimeout(waiter.timer);
    record.waiters.delete(waiter);
    waiter.reject(errorFactory(waiter));
  }
}

export function createSyntheticProcessRecord({
  child,
  options,
  onExit = () => {},
  onMessage = () => {},
}) {
  const record = {
    child,
    options: Object.freeze({ ...options }),
    messages: [],
    waiters: new Set(),
    stdout: "",
    stderr: "",
    exited: false,
    exitCode: null,
    signal: null,
    spawnError: null,
    startedAt: Date.now(),
  };

  child.stdout?.on("data", (chunk) => {
    record.stdout = normalizeText(`${record.stdout}${chunk.toString("utf8")}`, 65536);
  });
  child.stderr?.on("data", (chunk) => {
    record.stderr = normalizeText(`${record.stderr}${chunk.toString("utf8")}`, 65536);
  });
  child.on("message", (message) => {
    record.messages.push(message);

    try {
      onMessage(record, message);
    } catch {
      // Diagnostic observers cannot change the supervised process result.
    }

    if (message?.event === "fatal") {
      rejectWaiters(record, (waiter) =>
        createSupervisorError(
          "CAPACITY_PROCESS_FATAL",
          `Synthetic ${processRole(record)} process reported fatal while waiting for ${waiter.expectedEvent}.`,
          Object.freeze({
            ...describeSyntheticProcess(record, waiter.expectedEvent),
            fatalCode: message?.code ?? null,
            fatalMessage: normalizeText(message?.message, 1024),
          })
        )
      );
      return;
    }

    for (const waiter of [...record.waiters]) {
      if (waiter.predicate(message)) {
        clearTimeout(waiter.timer);
        record.waiters.delete(waiter);
        waiter.resolve(message);
      }
    }
  });
  child.once("error", (error) => {
    record.spawnError = normalizeText(error?.message ?? error, 1024);
    rejectWaiters(record, (waiter) =>
      createSupervisorError(
        "CAPACITY_PROCESS_SPAWN_FAILED",
        `Synthetic ${processRole(record)} process failed to spawn while waiting for ${waiter.expectedEvent}.`,
        describeSyntheticProcess(record, waiter.expectedEvent)
      )
    );
  });
  child.once("exit", (code, signal) => {
    record.exited = true;
    record.exitCode = code;
    record.signal = signal ?? null;
    onExit(record);
    rejectWaiters(record, (waiter) =>
      createSupervisorError(
        "CAPACITY_PROCESS_EXITED_BEFORE_MESSAGE",
        `Synthetic ${processRole(record)} process exited before ${waiter.expectedEvent}.`,
        describeSyntheticProcess(record, waiter.expectedEvent)
      )
    );
  });

  return record;
}

export function waitForSyntheticMessage(
  record,
  {
    predicate,
    expectedEvent,
    timeoutMs,
  }
) {
  const existing = record.messages.find(predicate);

  if (existing) {
    return Promise.resolve(existing);
  }

  const fatal = record.messages.find((message) => message?.event === "fatal");

  if (fatal) {
    return Promise.reject(
      createSupervisorError(
        "CAPACITY_PROCESS_FATAL",
        `Synthetic ${processRole(record)} process reported fatal before ${expectedEvent}.`,
        Object.freeze({
          ...describeSyntheticProcess(record, expectedEvent),
          fatalCode: fatal?.code ?? null,
          fatalMessage: normalizeText(fatal?.message, 1024),
        })
      )
    );
  }

  if (record.exited) {
    return Promise.reject(
      createSupervisorError(
        "CAPACITY_PROCESS_EXITED_BEFORE_MESSAGE",
        `Synthetic ${processRole(record)} process already exited before ${expectedEvent}.`,
        describeSyntheticProcess(record, expectedEvent)
      )
    );
  }

  return new Promise((resolveWaiter, rejectWaiter) => {
    const waiter = {
      predicate,
      expectedEvent,
      resolve: resolveWaiter,
      reject: rejectWaiter,
      timer: null,
    };

    waiter.timer = setTimeout(() => {
      record.waiters.delete(waiter);
      rejectWaiter(
        createSupervisorError(
          "CAPACITY_PROCESS_MESSAGE_TIMEOUT",
          `Synthetic ${processRole(record)} process timed out waiting for ${expectedEvent}.`,
          describeSyntheticProcess(record, expectedEvent)
        )
      );
    }, timeoutMs);
    record.waiters.add(waiter);
  });
}
