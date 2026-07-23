"use strict";

const fs =
  require(
    "node:fs"
  );

const path =
  require(
    "node:path"
  );

const CONTRACT_PATH =
  path.resolve(
    __dirname,
    "../../contracts/analytics-event-contract.v1.json"
  );

const analyticsContract =
  Object.freeze(
    JSON.parse(
      fs.readFileSync(
        CONTRACT_PATH,
        "utf8"
      ).replace(
        /^\uFEFF/,
        ""
      )
    )
  );

const allowedEnvelopeKeys =
  new Set([
    ...analyticsContract
      .envelope
      .required,
    ...analyticsContract
      .envelope
      .optional,
  ]);

const forbiddenFieldKeys =
  new Set(
    analyticsContract
      .forbiddenFields
      .map(normalizeFieldKey)
  );

const allowedPages =
  new Set(
    analyticsContract
      .propertyDefinitions
      .stage
      .values
  );

class AnalyticsValidationError extends Error {
  constructor(
    message,
    field = null
  ) {
    super(message);

    this.name =
      "AnalyticsValidationError";
    this.status =
      400;
    this.code =
      "INVALID_ANALYTICS_EVENT";
    this.exposePublic =
      true;
    this.field =
      field;
  }
}

function normalizeFieldKey(
  value
) {
  return String(value)
    .replace(
      /[^a-z0-9]/gi,
      ""
    )
    .toLowerCase();
}

function isPlainObject(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  return (
    prototype ===
      Object.prototype ||
    prototype ===
      null
  );
}

function assertNoForbiddenFields(
  value,
  fieldPath =
    "event"
) {
  if (Array.isArray(value)) {
    value.forEach(
      (
        entry,
        index
      ) => {
        assertNoForbiddenFields(
          entry,
          `${fieldPath}[${index}]`
        );
      }
    );

    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (
    const [
      key,
      nestedValue,
    ] of Object.entries(value)
  ) {
    if (
      forbiddenFieldKeys.has(
        normalizeFieldKey(key)
      )
    ) {
      throw new AnalyticsValidationError(
        "Analytics payload contains a forbidden field.",
        fieldPath
      );
    }

    assertNoForbiddenFields(
      nestedValue,
      `${fieldPath}.${key}`
    );
  }
}

function assertExactKeys(
  value,
  allowedKeys,
  requiredKeys,
  fieldPath
) {
  const keys =
    Object.keys(value);

  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      throw new AnalyticsValidationError(
        "Analytics payload contains an unsupported field.",
        `${fieldPath}.${key}`
      );
    }
  }

  for (const key of requiredKeys) {
    if (
      !Object.prototype
        .hasOwnProperty.call(
          value,
          key
        )
    ) {
      throw new AnalyticsValidationError(
        "Analytics payload is missing a required field.",
        `${fieldPath}.${key}`
      );
    }
  }
}

function assertOpaqueIdentifier(
  value,
  field
) {
  if (
    typeof value !==
      "string" ||
    !/^[A-Za-z0-9._-]{8,128}$/.test(
      value
    )
  ) {
    throw new AnalyticsValidationError(
      "Analytics identifier is invalid.",
      field
    );
  }
}

function assertOccurredAt(
  value
) {
  if (
    typeof value !==
      "string" ||
    value.length > 40
  ) {
    throw new AnalyticsValidationError(
      "Analytics timestamp is invalid.",
      "event.occurredAt"
    );
  }

  const timestamp =
    Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new AnalyticsValidationError(
      "Analytics timestamp is invalid.",
      "event.occurredAt"
    );
  }

  const differenceMs =
    timestamp - Date.now();

  if (
    differenceMs >
      5 * 60 * 1000 ||
    differenceMs <
      -24 * 60 * 60 * 1000
  ) {
    throw new AnalyticsValidationError(
      "Analytics timestamp is outside the accepted window.",
      "event.occurredAt"
    );
  }
}

function assertPropertyValue(
  propertyName,
  value
) {
  const definition =
    analyticsContract
      .propertyDefinitions[
        propertyName
      ];

  if (!definition) {
    throw new AnalyticsValidationError(
      "Analytics property is not defined by the contract.",
      `event.properties.${propertyName}`
    );
  }

  const field =
    `event.properties.${propertyName}`;

  switch (definition.type) {
    case "boolean":
      if (typeof value !== "boolean") {
        throw new AnalyticsValidationError(
          "Analytics property must be a boolean.",
          field
        );
      }
      return;

    case "integer":
      if (
        !Number.isInteger(value) ||
        value < definition.minimum ||
        value > definition.maximum
      ) {
        throw new AnalyticsValidationError(
          "Analytics integer property is outside the accepted range.",
          field
        );
      }
      return;

    case "string": {
      if (
        typeof value !==
          "string" ||
        value.length >
          definition.maximumLength
      ) {
        throw new AnalyticsValidationError(
          "Analytics string property is invalid.",
          field
        );
      }

      if (
        definition.pattern &&
        !new RegExp(
          definition.pattern
        ).test(value)
      ) {
        throw new AnalyticsValidationError(
          "Analytics string property does not match the contract.",
          field
        );
      }
      return;
    }

    case "enum":
      if (
        !definition.values.includes(
          value
        )
      ) {
        throw new AnalyticsValidationError(
          "Analytics enum property is invalid.",
          field
        );
      }
      return;

    case "enum-array":
      if (
        !Array.isArray(value) ||
        value.length >
          definition.maximumItems ||
        new Set(value).size !==
          value.length ||
        value.some(
          (entry) =>
            !definition.values.includes(
              entry
            )
        )
      ) {
        throw new AnalyticsValidationError(
          "Analytics enum-array property is invalid.",
          field
        );
      }
      return;

    default:
      throw new AnalyticsValidationError(
        "Analytics property type is unsupported.",
        field
      );
  }
}

function validateAnalyticsEvent(
  event
) {
  if (!isPlainObject(event)) {
    throw new AnalyticsValidationError(
      "Analytics event must be an object.",
      "event"
    );
  }

  const eventBytes =
    Buffer.byteLength(
      JSON.stringify(event),
      "utf8"
    );

  if (
    eventBytes >
      analyticsContract
        .transport
        .maxEventBytes
  ) {
    throw new AnalyticsValidationError(
      "Analytics event is too large.",
      "event"
    );
  }

  assertNoForbiddenFields(event);

  assertExactKeys(
    event,
    allowedEnvelopeKeys,
    analyticsContract
      .envelope
      .required,
    "event"
  );

  assertOpaqueIdentifier(
    event.eventId,
    "event.eventId"
  );

  assertOpaqueIdentifier(
    event.sessionId,
    "event.sessionId"
  );

  if (
    event.journeyId !==
      undefined
  ) {
    assertOpaqueIdentifier(
      event.journeyId,
      "event.journeyId"
    );
  }

  if (
    typeof event.eventName !==
      "string" ||
    !Object.prototype
      .hasOwnProperty.call(
        analyticsContract.events,
        event.eventName
      )
  ) {
    throw new AnalyticsValidationError(
      "Analytics event name is invalid.",
      "event.eventName"
    );
  }

  if (
    event.eventVersion !==
      analyticsContract
        .eventVersion
  ) {
    throw new AnalyticsValidationError(
      "Analytics event version is invalid.",
      "event.eventVersion"
    );
  }

  assertOccurredAt(
    event.occurredAt
  );

  if (
    typeof event.releaseSha !==
      "string" ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(
      event.releaseSha
    )
  ) {
    throw new AnalyticsValidationError(
      "Analytics release identifier is invalid.",
      "event.releaseSha"
    );
  }

  if (!allowedPages.has(event.page)) {
    throw new AnalyticsValidationError(
      "Analytics page is invalid.",
      "event.page"
    );
  }

  if (!isPlainObject(event.properties)) {
    throw new AnalyticsValidationError(
      "Analytics properties must be an object.",
      "event.properties"
    );
  }

  const eventDefinition =
    analyticsContract.events[
      event.eventName
    ];

  const allowedPropertyKeys =
    new Set([
      ...eventDefinition
        .requiredProperties,
      ...eventDefinition
        .optionalProperties,
    ]);

  assertExactKeys(
    event.properties,
    allowedPropertyKeys,
    eventDefinition
      .requiredProperties,
    "event.properties"
  );

  for (
    const [
      propertyName,
      propertyValue,
    ] of Object.entries(
      event.properties
    )
  ) {
    assertPropertyValue(
      propertyName,
      propertyValue
    );
  }

  return Object.freeze({
    ...event,
    properties:
      Object.freeze({
        ...event.properties,
      }),
  });
}

function validateAnalyticsBatch(
  payload
) {
  if (!isPlainObject(payload)) {
    throw new AnalyticsValidationError(
      "Analytics payload must be an object.",
      "payload"
    );
  }

  assertExactKeys(
    payload,
    new Set([
      "events",
    ]),
    [
      "events",
    ],
    "payload"
  );

  if (
    !Array.isArray(
      payload.events
    ) ||
    payload.events.length < 1 ||
    payload.events.length >
      analyticsContract
        .transport
        .maxBatchEvents
  ) {
    throw new AnalyticsValidationError(
      "Analytics event batch size is invalid.",
      "payload.events"
    );
  }

  return Object.freeze(
    payload.events.map(
      validateAnalyticsEvent
    )
  );
}

module.exports = {
  AnalyticsValidationError,
  analyticsContract,
  validateAnalyticsBatch,
  validateAnalyticsEvent,
};
