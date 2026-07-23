import fs from "node:fs";
import path from "node:path";

const EXPECTED_EVENTS =
  Object.freeze([
    "booking_handoff_opened",
    "booking_handoff_prepared",
    "booking_recheck_completed",
    "booking_recheck_started",
    "explanation_toggled",
    "hotel_details_opened",
    "journey_abandoned",
    "page_view",
    "recommendation_selected",
    "results_recovery_applied",
    "results_viewed",
    "search_completed",
    "search_failed",
    "search_preferences_changed",
    "search_retried",
    "search_started",
  ]);

const MINIMUM_FORBIDDEN_FIELDS =
  Object.freeze([
    "address",
    "adults",
    "apiKey",
    "authorization",
    "budget",
    "childAges",
    "children",
    "checkIn",
    "checkOut",
    "cookie",
    "destination",
    "destinationId",
    "email",
    "handoffId",
    "hotelId",
    "hotelName",
    "idempotencyKey",
    "ip",
    "latitude",
    "longitude",
    "offerId",
    "password",
    "phone",
    "providerContext",
    "providerId",
    "referrer",
    "requestId",
    "searchId",
    "secret",
    "token",
    "url",
    "userAgent",
    "verificationId",
  ]);

const ALLOWED_PROPERTY_TYPES =
  new Set([
    "boolean",
    "enum",
    "enum-array",
    "integer",
    "string",
  ]);

function isPlainObject(
  value
) {
  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  );
}

function addIssue(
  issues,
  pathValue,
  message
) {
  issues.push({
    path:
      pathValue,
    message,
  });
}

function assertUniqueStrings(
  issues,
  pathValue,
  values
) {
  if (
    !Array.isArray(values) ||
    values.some(
      (value) =>
        typeof value !==
          "string" ||
        !value.trim()
    )
  ) {
    addIssue(
      issues,
      pathValue,
      "must be an array of non-empty strings"
    );

    return [];
  }

  const normalized =
    values.map(
      (value) =>
        value.trim()
    );

  if (
    new Set(
      normalized
    ).size !==
    normalized.length
  ) {
    addIssue(
      issues,
      pathValue,
      "must not contain duplicates"
    );
  }

  return normalized;
}

function validatePropertyDefinition(
  issues,
  propertyName,
  definition
) {
  const pathValue =
    `propertyDefinitions.${propertyName}`;

  if (
    !isPlainObject(
      definition
    )
  ) {
    addIssue(
      issues,
      pathValue,
      "must be an object"
    );

    return;
  }

  if (
    !ALLOWED_PROPERTY_TYPES.has(
      definition.type
    )
  ) {
    addIssue(
      issues,
      `${pathValue}.type`,
      "is not supported"
    );

    return;
  }

  if (
    definition.type ===
      "enum" ||
    definition.type ===
      "enum-array"
  ) {
    const values =
      assertUniqueStrings(
        issues,
        `${pathValue}.values`,
        definition.values
      );

    if (
      values.length ===
      0
    ) {
      addIssue(
        issues,
        `${pathValue}.values`,
        "must contain at least one value"
      );
    }
  }

  if (
    definition.type ===
      "integer"
  ) {
    if (
      !Number.isInteger(
        definition.minimum
      ) ||
      !Number.isInteger(
        definition.maximum
      ) ||
      definition.minimum >
        definition.maximum
    ) {
      addIssue(
        issues,
        pathValue,
        "has invalid integer bounds"
      );
    }
  }

  if (
    definition.type ===
      "string"
  ) {
    if (
      !Number.isInteger(
        definition.maximumLength
      ) ||
      definition.maximumLength <
        1 ||
      definition.maximumLength >
        128
    ) {
      addIssue(
        issues,
        `${pathValue}.maximumLength`,
        "must be between 1 and 128"
      );
    }

    if (
      typeof definition.pattern !==
        "string"
    ) {
      addIssue(
        issues,
        `${pathValue}.pattern`,
        "must be a string"
      );
    }
    else {
      try {
        new RegExp(
          definition.pattern
        );
      }
      catch {
        addIssue(
          issues,
          `${pathValue}.pattern`,
          "must be a valid regular expression"
        );
      }
    }
  }

  if (
    definition.type ===
      "enum-array" &&
    (
      !Number.isInteger(
        definition.maximumItems
      ) ||
      definition.maximumItems <
        1 ||
      definition.maximumItems >
        8
    )
  ) {
    addIssue(
      issues,
      `${pathValue}.maximumItems`,
      "must be between 1 and 8"
    );
  }
}

export function validateAnalyticsContract(
  contract
) {
  const issues =
    [];

  if (
    !isPlainObject(
      contract
    )
  ) {
    return [
      {
        path:
          "$",
        message:
          "contract must be an object",
      },
    ];
  }

  if (
    contract.contractVersion !==
      "1.0.0"
  ) {
    addIssue(
      issues,
      "contractVersion",
      "must be 1.0.0"
    );
  }

  if (
    contract.eventVersion !==
      1
  ) {
    addIssue(
      issues,
      "eventVersion",
      "must be 1"
    );
  }

  if (
    contract.status !==
      "foundation-only"
  ) {
    addIssue(
      issues,
      "status",
      "must remain foundation-only until instrumentation is implemented"
    );
  }

  const transport =
    contract.transport;

  if (
    !isPlainObject(
      transport
    )
  ) {
    addIssue(
      issues,
      "transport",
      "must be an object"
    );
  }
  else {
    if (
      transport.mode !==
        "first-party-only"
    ) {
      addIssue(
        issues,
        "transport.mode",
        "must be first-party-only"
      );
    }

    if (
      transport.endpoint !==
        "/api/analytics/events"
    ) {
      addIssue(
        issues,
        "transport.endpoint",
        "must use the first-party analytics endpoint"
      );
    }

    for (
      const field of
      [
        "defaultEnabled",
        "externalSdkAllowed",
        "cookiesAllowed",
      ]
    ) {
      if (
        transport[field] !==
          false
      ) {
        addIssue(
          issues,
          `transport.${field}`,
          "must be false"
        );
      }
    }

    if (
      !Number.isInteger(
        transport.maxEventBytes
      ) ||
      transport.maxEventBytes <
        512 ||
      transport.maxEventBytes >
        4096
    ) {
      addIssue(
        issues,
        "transport.maxEventBytes",
        "must be between 512 and 4096"
      );
    }

    if (
      !Number.isInteger(
        transport.maxBatchEvents
      ) ||
      transport.maxBatchEvents <
        1 ||
      transport.maxBatchEvents >
        20
    ) {
      addIssue(
        issues,
        "transport.maxBatchEvents",
        "must be between 1 and 20"
      );
    }
  }

  const session =
    contract.session;

  if (
    !isPlainObject(
      session
    )
  ) {
    addIssue(
      issues,
      "session",
      "must be an object"
    );
  }
  else {
    if (
      session.scope !==
        "browser-tab" ||
      session.storage !==
        "sessionStorage"
    ) {
      addIssue(
        issues,
        "session",
        "must be browser-tab scoped and sessionStorage only"
      );
    }

    for (
      const field of
      [
        "crossSessionTracking",
        "persistentUserId",
        "fingerprinting",
      ]
    ) {
      if (
        session[field] !==
          false
      ) {
        addIssue(
          issues,
          `session.${field}`,
          "must be false"
        );
      }
    }

    if (
      !Number.isInteger(
        session.maxAgeMinutes
      ) ||
      session.maxAgeMinutes <
        1 ||
      session.maxAgeMinutes >
        120
    ) {
      addIssue(
        issues,
        "session.maxAgeMinutes",
        "must be between 1 and 120"
      );
    }
  }

  const privacySignals =
    contract.privacySignals;

  if (
    !isPlainObject(
      privacySignals
    ) ||
    privacySignals.respectDoNotTrack !==
      true ||
    privacySignals.respectGlobalPrivacyControl !==
      true
  ) {
    addIssue(
      issues,
      "privacySignals",
      "must respect Do Not Track and Global Privacy Control"
    );
  }

  const retention =
    contract.retention;

  if (
    !isPlainObject(
      retention
    ) ||
    !Number.isInteger(
      retention.rawEventMaximumDays
    ) ||
    retention.rawEventMaximumDays >
      30 ||
    retention.rawEventMaximumDays <
      1 ||
    !Number.isInteger(
      retention.aggregatedMetricMaximumDays
    ) ||
    retention.aggregatedMetricMaximumDays >
      180 ||
    retention.aggregatedMetricMaximumDays <
      retention.rawEventMaximumDays
  ) {
    addIssue(
      issues,
      "retention",
      "must cap raw events at 30 days and aggregates at 180 days"
    );
  }

  const forbiddenFields =
    assertUniqueStrings(
      issues,
      "forbiddenFields",
      contract.forbiddenFields
    );

  const forbiddenSet =
    new Set(
      forbiddenFields
    );

  for (
    const field of
    MINIMUM_FORBIDDEN_FIELDS
  ) {
    if (
      !forbiddenSet.has(
        field
      )
    ) {
      addIssue(
        issues,
        "forbiddenFields",
        `must include ${field}`
      );
    }
  }

  const propertyDefinitions =
    contract.propertyDefinitions;

  if (
    !isPlainObject(
      propertyDefinitions
    )
  ) {
    addIssue(
      issues,
      "propertyDefinitions",
      "must be an object"
    );
  }
  else {
    for (
      const [
        propertyName,
        definition,
      ] of
      Object.entries(
        propertyDefinitions
      )
    ) {
      if (
        !/^[a-z][A-Za-z0-9]*$/.test(
          propertyName
        )
      ) {
        addIssue(
          issues,
          `propertyDefinitions.${propertyName}`,
          "must use lower camelCase"
        );
      }

      if (
        forbiddenSet.has(
          propertyName
        )
      ) {
        addIssue(
          issues,
          `propertyDefinitions.${propertyName}`,
          "is forbidden"
        );
      }

      if (
        /(liteapi|routestack|provider)/i.test(
          propertyName
        )
      ) {
        addIssue(
          issues,
          `propertyDefinitions.${propertyName}`,
          "must remain provider-neutral"
        );
      }

      validatePropertyDefinition(
        issues,
        propertyName,
        definition
      );
    }
  }

  const events =
    contract.events;

  if (
    !isPlainObject(
      events
    )
  ) {
    addIssue(
      issues,
      "events",
      "must be an object"
    );
  }
  else {
    const actualEvents =
      Object.keys(
        events
      ).sort();

    if (
      JSON.stringify(
        actualEvents
      ) !==
      JSON.stringify(
        [
          ...EXPECTED_EVENTS,
        ].sort()
      )
    ) {
      addIssue(
        issues,
        "events",
        "must contain the complete beta event set"
      );
    }

    for (
      const [
        eventName,
        eventDefinition,
      ] of
      Object.entries(
        events
      )
    ) {
      const eventPath =
        `events.${eventName}`;

      if (
        !/^[a-z][a-z0-9_]*$/.test(
          eventName
        )
      ) {
        addIssue(
          issues,
          eventPath,
          "must use snake_case"
        );
      }

      if (
        /(liteapi|routestack|provider)/i.test(
          eventName
        )
      ) {
        addIssue(
          issues,
          eventPath,
          "must remain provider-neutral"
        );
      }

      if (
        !isPlainObject(
          eventDefinition
        )
      ) {
        addIssue(
          issues,
          eventPath,
          "must be an object"
        );

        continue;
      }

      const required =
        assertUniqueStrings(
          issues,
          `${eventPath}.requiredProperties`,
          eventDefinition.requiredProperties
        );

      const optional =
        assertUniqueStrings(
          issues,
          `${eventPath}.optionalProperties`,
          eventDefinition.optionalProperties
        );

      const overlap =
        required.filter(
          (propertyName) =>
            optional.includes(
              propertyName
            )
        );

      if (
        overlap.length >
        0
      ) {
        addIssue(
          issues,
          eventPath,
          "required and optional properties must not overlap"
        );
      }

      for (
        const propertyName of
        [
          ...required,
          ...optional,
        ]
      ) {
        if (
          !Object.hasOwn(
            propertyDefinitions ??
              {},
            propertyName
          )
        ) {
          addIssue(
            issues,
            eventPath,
            `references undefined property ${propertyName}`
          );
        }

        if (
          forbiddenSet.has(
            propertyName
          )
        ) {
          addIssue(
            issues,
            eventPath,
            `references forbidden property ${propertyName}`
          );
        }
      }
    }
  }

  const envelope =
    contract.envelope;

  if (
    !isPlainObject(
      envelope
    )
  ) {
    addIssue(
      issues,
      "envelope",
      "must be an object"
    );
  }
  else {
    const required =
      assertUniqueStrings(
        issues,
        "envelope.required",
        envelope.required
      );

    const expectedEnvelope =
      [
        "eventId",
        "eventName",
        "eventVersion",
        "occurredAt",
        "page",
        "properties",
        "releaseSha",
        "sessionId",
      ].sort();

    if (
      JSON.stringify(
        required.sort()
      ) !==
      JSON.stringify(
        expectedEnvelope
      )
    ) {
      addIssue(
        issues,
        "envelope.required",
        "must contain the canonical required envelope"
      );
    }

    const optional =
      assertUniqueStrings(
        issues,
        "envelope.optional",
        envelope.optional
      );

    if (
      JSON.stringify(
        optional.sort()
      ) !==
      JSON.stringify([
        "journeyId",
      ])
    ) {
      addIssue(
        issues,
        "envelope.optional",
        "must allow only journeyId"
      );
    }
  }

  return issues;
}

export function assertValidAnalyticsContract(
  contract
) {
  const issues =
    validateAnalyticsContract(
      contract
    );

  if (
    issues.length >
    0
  ) {
    const error =
      new Error(
        issues
          .map(
            (issue) =>
              `${issue.path}: ${issue.message}`
          )
          .join(
            "\n"
          )
      );

    error.name =
      "SmartStayAnalyticsContractError";

    error.issues =
      issues;

    throw error;
  }

  return contract;
}

export function loadAnalyticsContract(
  filePath
) {
  const absolutePath =
    path.resolve(
      filePath
    );

  const contract =
    JSON.parse(
      fs.readFileSync(
        absolutePath,
        "utf8"
      )
    );

  return assertValidAnalyticsContract(
    contract
  );
}
