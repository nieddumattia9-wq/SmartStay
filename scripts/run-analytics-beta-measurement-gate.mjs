import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  createRequire,
} from "node:module";
import {
  fileURLToPath,
} from "node:url";

const require =
  createRequire(
    import.meta.url
  );

const currentDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositoryRoot =
  path.resolve(
    currentDirectory,
    ".."
  );

const serverRequire =
  createRequire(
    path.join(
      repositoryRoot,
      "server",
      "server.js"
    )
  );

const ADMIN_TOKEN =
  "smartstay-analytics-beta-gate-token-0001";

function parseArguments(
  argumentsList
) {
  const values =
    new Map();

  for (
    let index = 0;
    index < argumentsList.length;
    index += 1
  ) {
    const key =
      argumentsList[index];

    if (!key.startsWith("--")) {
      throw new Error(
        `Unexpected argument: ${key}`
      );
    }

    const value =
      argumentsList[index + 1];

    if (
      value === undefined ||
      value.startsWith("--")
    ) {
      throw new Error(
        `Missing value for ${key}.`
      );
    }

    values.set(key, value);
    index += 1;
  }

  return {
    outputPath:
      values.has("--output")
        ? path.resolve(
            repositoryRoot,
            values.get("--output")
          )
        : null,
  };
}

function createEvent({
  index,
  eventName,
  page,
  properties,
  occurredAt,
  journeyId =
    "journey-beta-gate-0001",
}) {
  return {
    eventId:
      `event-beta-gate-${String(index).padStart(4, "0")}`,
    eventName,
    eventVersion: 1,
    occurredAt:
      new Date(occurredAt)
        .toISOString(),
    sessionId:
      "session-beta-gate-0001",
    journeyId,
    releaseSha:
      "synthetic-beta-gate",
    page,
    properties,
  };
}

function createCanonicalSyntheticEvents(
  now
) {
  const startedAt =
    now - 30_000;

  const definitions = [
    [
      "page_view",
      "home",
      {
        entrySource: "direct",
      },
    ],
    [
      "search_started",
      "home",
      {
        nightsBucket: "3-7",
        partySizeBucket: "2",
        roomCount: 1,
        budgetProvided: true,
        distanceBand: "2km",
      },
    ],
    [
      "search_started",
      "home",
      {
        nightsBucket: "1-2",
        partySizeBucket: "1",
        roomCount: 1,
        budgetProvided: false,
        distanceBand: "any",
      },
      "journey-beta-gate-0002",
    ],
    [
      "search_completed",
      "loading",
      {
        outcome: "results",
        durationBucket: "5-15s",
        visibleResultsBucket:
          "4-10",
      },
    ],
    [
      "search_failed",
      "loading",
      {
        outcome: "timeout",
        retryable: true,
        publicCode:
          "SEARCH_TIMEOUT",
        durationBucket: "30-60s",
      },
      "journey-beta-gate-0002",
    ],
    [
      "results_viewed",
      "results",
      {
        visibleResultsBucket:
          "4-10",
        rolesShown: [
          "best-choice",
          "best-sensible-saving",
          "best-location",
        ],
      },
    ],
    [
      "recommendation_selected",
      "results",
      {
        role: "best-choice",
        selectionAction:
          "details",
        positionBucket: "1",
      },
    ],
    [
      "hotel_details_opened",
      "details",
      {
        role: "best-choice",
        positionBucket: "1",
      },
    ],
    [
      "explanation_toggled",
      "results",
      {
        role: "best-choice",
        expanded: true,
      },
    ],
    [
      "search_preferences_changed",
      "results",
      {
        field: "budget",
        changeKind: "increased",
      },
    ],
    [
      "search_retried",
      "loading",
      {
        stage: "loading",
        recoveryAction: "retry",
      },
    ],
    [
      "booking_recheck_started",
      "recheck",
      {
        role: "best-choice",
      },
    ],
    [
      "booking_recheck_completed",
      "recheck",
      {
        role: "best-choice",
        recheckState: "confirmed",
        retryable: false,
      },
    ],
    [
      "booking_handoff_prepared",
      "handoff",
      {
        role: "best-choice",
        acceptedChanges: false,
      },
    ],
    [
      "booking_handoff_opened",
      "handoff",
      {
        role: "best-choice",
      },
    ],
    [
      "journey_abandoned",
      "results",
      {
        stage: "results",
        durationBucket: "30-60s",
      },
    ],
    [
      "results_recovery_applied",
      "results",
      {
        recoveryAction:
          "raise-budget",
      },
    ],
  ];

  return definitions.map(
    (
      [
        eventName,
        page,
        properties,
        journeyId,
      ],
      index
    ) =>
      createEvent({
        index: index + 1,
        eventName,
        page,
        properties,
        occurredAt:
          startedAt +
          index * 1_000,
        ...(journeyId
          ? { journeyId }
          : {}),
      })
  );
}

function normalizeFieldKey(
  value
) {
  return String(value)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function collectKeys(
  value,
  target = []
) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectKeys(entry, target);
    }

    return target;
  }

  if (
    !value ||
    typeof value !== "object"
  ) {
    return target;
  }

  for (
    const [key, nestedValue] of
    Object.entries(value)
  ) {
    target.push(key);
    collectKeys(
      nestedValue,
      target
    );
  }

  return target;
}

async function startHarness({
  enabled,
}) {
  const express =
    serverRequire("express");

  const {
    createApp,
  } = require(
    "../server/app.js"
  );

  const {
    createRuntimeSecurityConfig,
  } = require(
    "../server/config/runtimeSecurityConfig.js"
  );

  const {
    createSecurityLogger,
  } = require(
    "../server/observability/securityLogger.js"
  );

  const config =
    createRuntimeSecurityConfig({
      environment: {},
      overrides: {
        nodeEnv: "test",
        allowedOrigins: [
          "http://allowed.example",
        ],
        rateLimitWindowMs:
          60_000,
        rateLimitMaxRequests:
          10_000,
        analyticsEnabled:
          enabled,
        analyticsAdminToken:
          ADMIN_TOKEN,
        analyticsVolatileStorageAcknowledged:
          true,
      },
    });

  const logger =
    createSecurityLogger({
      environment: {},
      write: () => {},
    });

  const {
    app,
    analyticsEventStore,
  } = createApp({
    config,
    logger,
    searchRoutes:
      express.Router(),
  });

  const server =
    http.createServer(app);

  await new Promise(
    (resolve, reject) => {
      server.once("error", reject);
      server.listen(
        0,
        "127.0.0.1",
        resolve
      );
    }
  );

  const address =
    server.address();

  assert.ok(
    address &&
    typeof address === "object"
  );

  return {
    origin:
      `http://127.0.0.1:${address.port}`,
    analyticsEventStore,
    async close() {
      await new Promise(
        (resolve) =>
          server.close(resolve)
      );
    },
  };
}

async function request(
  origin,
  pathname,
  {
    method = "GET",
    body,
    headers = {},
  } = {}
) {
  const response =
    await fetch(
      `${origin}${pathname}`,
      {
        method,
        headers: {
          Origin:
            "http://allowed.example",
          ...(body !== undefined
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
          ...headers,
        },
        ...(body !== undefined
          ? {
              body:
                JSON.stringify(body),
            }
          : {}),
      }
    );

  const text =
    await response.text();

  return {
    status: response.status,
    body:
      text
        ? JSON.parse(text)
        : null,
  };
}

async function runGate({
  outputPath = null,
} = {}) {
  const contract =
    JSON.parse(
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "contracts/analytics-event-contract.v1.json"
        ),
        "utf8"
      ).replace(/^\uFEFF/, "")
    );

  const forbiddenKeys =
    new Set(
      contract.forbiddenFields
        .map(normalizeFieldKey)
    );

  const checks = [];
  let localAnalyticsRequests = 0;

  function record(
    name,
    condition,
    detail = null
  ) {
    checks.push({
      name,
      passed:
        condition === true,
      detail,
    });

    const detailSuffix =
      detail === null
        ? ""
        : `: ${JSON.stringify(detail)}`;

    assert.equal(
      condition,
      true,
      `${name} failed${detailSuffix}`
    );
  }

  const disabledHarness =
    await startHarness({
      enabled: false,
    });

  try {
    localAnalyticsRequests += 1;

    const disabledResponse =
      await request(
        disabledHarness.origin,
        "/api/analytics/events",
        {
          method: "POST",
          body: {
            events:
              createCanonicalSyntheticEvents(
                Date.now()
              ).slice(0, 1),
          },
        }
      );

    record(
      "disabled-mode-inert",
      disabledResponse.status === 204 &&
      disabledHarness
        .analyticsEventStore
        .count() === 0
    );
  } finally {
    await disabledHarness.close();
  }

  const harness =
    await startHarness({
      enabled: true,
    });

  let report = null;

  try {
    const events =
      createCanonicalSyntheticEvents(
        Date.now()
      );

    for (
      const privacyHeaders of
      [
        {
          DNT: "1",
        },
        {
          "Sec-GPC": "1",
        },
      ]
    ) {
      localAnalyticsRequests += 1;

      const response =
        await request(
          harness.origin,
          "/api/analytics/events",
          {
            method: "POST",
            headers:
              privacyHeaders,
            body: {
              events:
                events.slice(0, 1),
            },
          }
        );

      record(
        `privacy-signal-${Object.keys(
          privacyHeaders
        )[0]}`,
        response.status === 204 &&
        harness.analyticsEventStore
          .count() === 0
      );
    }

    localAnalyticsRequests += 1;

    const ingestion =
      await request(
        harness.origin,
        "/api/analytics/events",
        {
          method: "POST",
          body: {
            events,
          },
        }
      );

    record(
      "canonical-sample-accepted",
      ingestion.status === 202 &&
      ingestion.body?.accepted ===
        events.length
    );

    localAnalyticsRequests += 1;

    const duplicate =
      await request(
        harness.origin,
        "/api/analytics/events",
        {
          method: "POST",
          body: {
            events,
          },
        }
      );

    record(
      "synthetic-sample-idempotent",
      duplicate.status === 202 &&
      duplicate.body?.accepted === 0
    );

    localAnalyticsRequests += 1;

    const forbidden =
      await request(
        harness.origin,
        "/api/analytics/events",
        {
          method: "POST",
          body: {
            events: [
              {
                ...events[0],
                properties: {
                  searchId:
                    "private-search",
                },
              },
            ],
          },
        }
      );

    record(
      "forbidden-field-rejected",
      forbidden.status === 400 &&
      forbidden.body?.code ===
        "INVALID_ANALYTICS_EVENT"
    );

    localAnalyticsRequests += 1;

    const unauthorized =
      await request(
        harness.origin,
        "/api/internal/analytics/report?windowDays=30"
      );

    record(
      "admin-report-protected",
      unauthorized.status === 401
    );

    localAnalyticsRequests += 1;

    const reportResponse =
      await request(
        harness.origin,
        "/api/internal/analytics/report?windowDays=30",
        {
          headers: {
            Authorization:
              `Bearer ${ADMIN_TOKEN}`,
          },
        }
      );

    report =
      reportResponse.body?.report;

    record(
      "aggregate-report-available",
      reportResponse.status === 200 &&
      report?.metrics
        ?.searchStartedCount === 2 &&
      report?.distributions
        ?.eventCounts
        ?.page_view === 1 &&
      report?.distributions
        ?.rolesShownCounts
        ?.["best-choice"] === 1 &&
      report?.distributions
        ?.preferenceDimensionCounts
        ?.budgetChanges === 1 &&
      report?.distributions
        ?.preferenceChangeKindCounts
        ?.increased === 1 &&
      report?.distributions
        ?.recheckStateCounts
        ?.confirmed === 1
    );

    const forbiddenReportKeys =
      collectKeys(report)
        .filter(
          (key) =>
            forbiddenKeys.has(
              normalizeFieldKey(key)
            )
        );

    record(
      "aggregate-report-has-zero-forbidden-fields",
      forbiddenReportKeys.length === 0,
      forbiddenReportKeys
    );

    localAnalyticsRequests += 1;

    const deletion =
      await request(
        harness.origin,
        "/api/internal/analytics/data",
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${ADMIN_TOKEN}`,
          },
          body: {
            scope: "expired",
          },
        }
      );

    record(
      "retention-deletion-executable",
      deletion.status === 200 &&
      deletion.body?.deletion
        ?.scope === "expired"
    );
  } finally {
    await harness.close();
  }

  const result = {
    schemaVersion: "1.0.0",
    point: "39C23C",
    result: "PASS",
    generatedAt:
      new Date().toISOString(),
    checks,
    report,
    providerLiveCalls: 0,
    externalAnalyticsCalls: 0,
    localAnalyticsRequests,
    storageMode:
      "in-memory-single-instance",
    persistence: false,
  };

  if (outputPath) {
    fs.mkdirSync(
      path.dirname(outputPath),
      {
        recursive: true,
      }
    );

    fs.writeFileSync(
      outputPath,
      `${JSON.stringify(
        result,
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      result,
      null,
      2
    )}\n`
  );

  return result;
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url);

if (invokedDirectly) {
  runGate(
    parseArguments(
      process.argv.slice(2)
    )
  ).catch(
    (error) => {
      process.stderr.write(
        `${error?.stack ?? error}\n`
      );
      process.exitCode = 1;
    }
  );
}

export {
  createCanonicalSyntheticEvents,
  parseArguments,
  runGate,
};
