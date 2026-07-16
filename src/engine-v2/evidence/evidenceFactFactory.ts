import type {
  SmartStayEvidenceAvailability,
  SmartStayEvidenceFactV2,
  SmartStayEvidenceSeverity,
  SmartStayEvidenceSource,
  SmartStayEvidenceValueV2,
} from "../model/smartStayEvaluationV2";

export interface SmartStayEvidenceFactInputV2 {
  id: string;

  code: string;

  availability:
    SmartStayEvidenceAvailability;

  value?:
    SmartStayEvidenceValueV2;

  unit?:
    string | null;

  source:
    SmartStayEvidenceSource;

  sourceProvider?:
    string | null;

  sourceField?:
    string | null;

  confidence?:
    number;

  severity?:
    SmartStayEvidenceSeverity;

  missingReasonCode?:
    string | null;

  capturedAt?:
    string | null;

  derivedFromEvidenceIds?:
    string[];
}

export interface SmartStayKnownEvidenceInputV2 {
  id: string;

  code: string;

  value:
    SmartStayEvidenceValueV2;

  unit?:
    string | null;

  source:
    SmartStayEvidenceSource;

  sourceProvider?:
    string | null;

  sourceField?:
    string | null;

  confidence?:
    number;

  severity?:
    SmartStayEvidenceSeverity;

  capturedAt?:
    string | null;

  derivedFromEvidenceIds?:
    string[];
}

export interface SmartStayUnavailableEvidenceInputV2 {
  id: string;

  code: string;

  value?:
    SmartStayEvidenceValueV2;

  unit?:
    string | null;

  source?:
    SmartStayEvidenceSource;

  sourceProvider?:
    string | null;

  sourceField?:
    string | null;

  confidence?:
    number;

  severity?:
    SmartStayEvidenceSeverity;

  missingReasonCode:
    string;

  capturedAt?:
    string | null;

  derivedFromEvidenceIds?:
    string[];
}

export interface SmartStayEvidenceAvailabilityIndexV2 {
  knownFieldCodes:
    string[];

  unknownFieldCodes:
    string[];

  notApplicableFieldCodes:
    string[];

  conflictingFieldCodes:
    string[];
}

function requireText(
  value:
    unknown,
  fieldName:
    string
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a non-empty string.`
    );
  }

  return value.trim();
}

function normalizeNullableText(
  value:
    unknown
) {
  return (
    typeof value === "string" &&
    value.trim()
  )
    ? value.trim()
    : null;
}

function clampConfidence(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    Math.max(
      value,
      0
    ),
    1
  );
}

function getDefaultConfidence(
  availability:
    SmartStayEvidenceAvailability
) {
  return (
    availability === "known" ||
    availability === "not-applicable"
  )
    ? 1
    : 0;
}

function getDefaultSeverity(
  availability:
    SmartStayEvidenceAvailability
): SmartStayEvidenceSeverity {
  return (
    availability === "unknown" ||
    availability === "conflicting"
  )
    ? "warning"
    : "information";
}

export function createSmartStayEvidenceFactV2(
  input:
    SmartStayEvidenceFactInputV2
): SmartStayEvidenceFactV2 {
  const id =
    requireText(
      input.id,
      "Evidence id"
    );

  const code =
    requireText(
      input.code,
      "Evidence code"
    );

  const missingReasonCode =
    normalizeNullableText(
      input.missingReasonCode
    );

  if (
    input.availability !== "known" &&
    !missingReasonCode
  ) {
    throw new Error(
      `Evidence ${code} requires a missingReasonCode.`
    );
  }

  return {
    id,

    code,

    availability:
      input.availability,

    value:
      input.value ?? null,

    unit:
      normalizeNullableText(
        input.unit
      ),

    source:
      input.source,

    sourceProvider:
      normalizeNullableText(
        input.sourceProvider
      ),

    sourceField:
      normalizeNullableText(
        input.sourceField
      ),

    confidence:
      clampConfidence(
        input.confidence,
        getDefaultConfidence(
          input.availability
        )
      ),

    severity:
      input.severity ??
      getDefaultSeverity(
        input.availability
      ),

    missingReasonCode:
      input.availability === "known"
        ? null
        : missingReasonCode,

    capturedAt:
      normalizeNullableText(
        input.capturedAt
      ),

    derivedFromEvidenceIds: [
      ...new Set(
        input.derivedFromEvidenceIds ??
        []
      ),
    ],
  };
}

export function createKnownEvidenceFactV2(
  input:
    SmartStayKnownEvidenceInputV2
) {
  return createSmartStayEvidenceFactV2({
    ...input,

    availability:
      "known",

    missingReasonCode:
      null,
  });
}

export function createUnknownEvidenceFactV2(
  input:
    SmartStayUnavailableEvidenceInputV2
) {
  return createSmartStayEvidenceFactV2({
    ...input,

    availability:
      "unknown",

    source:
      input.source ??
      "provider",
  });
}

export function createNotApplicableEvidenceFactV2(
  input:
    SmartStayUnavailableEvidenceInputV2
) {
  return createSmartStayEvidenceFactV2({
    ...input,

    availability:
      "not-applicable",

    source:
      input.source ??
      "system",

    severity:
      input.severity ??
      "information",
  });
}

export function createConflictingEvidenceFactV2(
  input:
    SmartStayUnavailableEvidenceInputV2
) {
  return createSmartStayEvidenceFactV2({
    ...input,

    availability:
      "conflicting",

    source:
      input.source ??
      "derived",

    severity:
      input.severity ??
      "warning",
  });
}

export function deduplicateEvidenceFactsV2(
  facts:
    SmartStayEvidenceFactV2[]
) {
  const factsById =
    new Map<
      string,
      SmartStayEvidenceFactV2
    >();

  for (const fact of facts) {
    const existing =
      factsById.get(
        fact.id
      );

    if (
      existing &&
      (
        existing.code !== fact.code ||
        existing.availability !==
          fact.availability
      )
    ) {
      throw new Error(
        `Conflicting evidence id: ${fact.id}`
      );
    }

    if (!existing) {
      factsById.set(
        fact.id,
        fact
      );
    }
  }

  return [
    ...factsById.values(),
  ];
}

export function createEvidenceAvailabilityIndexV2(
  facts:
    SmartStayEvidenceFactV2[]
): SmartStayEvidenceAvailabilityIndexV2 {
  const index:
    SmartStayEvidenceAvailabilityIndexV2 = {
      knownFieldCodes: [],
      unknownFieldCodes: [],
      notApplicableFieldCodes: [],
      conflictingFieldCodes: [],
    };

  for (const fact of facts) {
    if (
      fact.availability === "known"
    ) {
      index.knownFieldCodes.push(
        fact.code
      );

      continue;
    }

    if (
      fact.availability === "unknown"
    ) {
      index.unknownFieldCodes.push(
        fact.code
      );

      continue;
    }

    if (
      fact.availability ===
      "not-applicable"
    ) {
      index.notApplicableFieldCodes.push(
        fact.code
      );

      continue;
    }

    index.conflictingFieldCodes.push(
      fact.code
    );
  }

  return {
    knownFieldCodes: [
      ...new Set(
        index.knownFieldCodes
      ),
    ],

    unknownFieldCodes: [
      ...new Set(
        index.unknownFieldCodes
      ),
    ],

    notApplicableFieldCodes: [
      ...new Set(
        index.notApplicableFieldCodes
      ),
    ],

    conflictingFieldCodes: [
      ...new Set(
        index.conflictingFieldCodes
      ),
    ],
  };
}
