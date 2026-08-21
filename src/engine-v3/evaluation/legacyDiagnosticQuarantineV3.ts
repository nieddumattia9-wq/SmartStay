export const STAYOPTI_LEGACY_DIAGNOSTIC_QUARANTINE_SCHEMA_VERSION_V3 =
  "stayopti.v3.legacy-diagnostic-quarantine@1" as const;

export const STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3 =
  "FROZEN_HISTORICAL_DIAGNOSTIC_CONTEXT_ONLY" as const;

export const STAYOPTI_LEGACY_DIAGNOSTIC_PROHIBITED_USES_V3 = [
  "REPLAY_INPUT",
  "GOLDEN",
  "GROUND_TRUTH",
  "CURRENT_HUMAN_JUDGMENT",
  "TRAINING",
  "TUNING",
  "CALIBRATION",
  "SCORING",
  "RANKING",
  "V2_V3_SUPERIORITY_BENCHMARK",
  "TRACE_EVIDENCE",
  "PROMOTION_EVIDENCE",
  "V3_12B_INPUT",
  "POLICY_WEIGHT_THRESHOLD_AUTHORIZATION",
] as const;

export const STAYOPTI_LEGACY_DIAGNOSTIC_CASE_IDS_V3 = [
  "diag-pilot-001",
  "diag-pilot-002",
  "diag-pilot-003",
  "diag-batch-001",
  "diag-batch-002",
  "diag-batch-003",
  "diag-batch-004",
  "diag-batch-005",
  "diag-batch-006",
  "diag-batch-007",
  "diag-batch-008",
  "diag-batch-009",
  "diag-batch-010",
  "diag-batch-011",
  "diag-batch-012",
] as const;

export type StayOptiLegacyDiagnosticUseV3 =
  | typeof STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3
  | (typeof STAYOPTI_LEGACY_DIAGNOSTIC_PROHIBITED_USES_V3)[number]
  | string;

export type StayOptiLegacyDiagnosticQuarantineBlockCodeV3 =
  | "LEGACY_DIAGNOSTIC_CASE_SET_MISMATCH"
  | "LEGACY_DIAGNOSTIC_DIGEST_MISMATCH"
  | "LEGACY_DIAGNOSTIC_HASH_UNAVAILABLE"
  | "LEGACY_DIAGNOSTIC_INPUT_INVALID"
  | "LEGACY_DIAGNOSTIC_MANIFEST_MISMATCH"
  | "LEGACY_DIAGNOSTIC_USE_PROHIBITED";

export type StayOptiLegacyDiagnosticQuarantineResultV3 =
  | {
      status: "admitted";
      allowedUse: typeof STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3;
      quarantineStatus: "LEGACY_DIAGNOSTIC_QUARANTINED";
      provenanceStatus: "PARTIALLY_RECOVERED_NON_REPLAYABLE";
      fixture: Readonly<Record<string, unknown>>;
      issueCode: null;
    }
  | {
      status: "blocked";
      allowedUse: null;
      quarantineStatus: "LEGACY_DIAGNOSTIC_QUARANTINED";
      provenanceStatus: "PARTIALLY_RECOVERED_NON_REPLAYABLE";
      fixture: null;
      issueCode: StayOptiLegacyDiagnosticQuarantineBlockCodeV3;
    };

interface NodeHashV3 {
  update(
    value: string,
    encoding: "utf8"
  ): NodeHashV3;
  digest(
    encoding: "hex"
  ): string;
}

interface NodeCryptoV3 {
  createHash(
    algorithm: "sha256"
  ): NodeHashV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (
    specifier: string
  ) => unknown;
}

const EXPECTED_FIXTURE_PATH =
  "tests/engine-v3/fixtures/v3-12a-diagnostic-judgments.json";

const EXPECTED_FIXTURE_SHA256 =
  "44c81f0a68f2551c53e6a348d963c1d1076ab2ac524a1723460463db7ca5fa20";

const EXPECTED_EVIDENCE_SHA256 = {
  "v3-12a0":
    "df3da0f6ef831d9e66887f7f0950ed9266cbc54dbd3f753386cd48f6e73f4942",
  "v3-12a1":
    "3b18caad7c5933bcde37c7516621d8b97af8e524f09d2668f07de311c0674fb4",
  "v3-12a2":
    "8b27692593d22df8d76acc262840352a7bbebba11de01e40da358adb7ab96af9",
} as const;

const EXPECTED_REASON_CODES = [
  "SOURCE_CAPSULE_UNAVAILABLE",
  "SOURCE_DIGEST_UNAVAILABLE",
  "CASE_FINGERPRINT_DERIVATION_UNAVAILABLE",
  "VERDICT_DEBLIND_RECEIPT_UNAVAILABLE",
] as const;

function blocked(
  issueCode: StayOptiLegacyDiagnosticQuarantineBlockCodeV3
): StayOptiLegacyDiagnosticQuarantineResultV3 {
  return Object.freeze({
    status: "blocked" as const,
    allowedUse: null,
    quarantineStatus: "LEGACY_DIAGNOSTIC_QUARANTINED" as const,
    provenanceStatus: "PARTIALLY_RECOVERED_NON_REPLAYABLE" as const,
    fixture: null,
    issueCode,
  });
}

function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return prototype === Object.prototype ||
    prototype === null;
}

function sameStringArray(
  actual: unknown,
  expected: readonly string[]
) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every(
      (value, index) =>
        value === expected[index]
    );
}

function sha256Text(
  value: string
) {
  const runtimeProcess = (
    globalThis as typeof globalThis & {
      process?: NodeProcessWithBuiltinsV3;
    }
  ).process;
  const cryptoModule =
    runtimeProcess?.getBuiltinModule?.(
      "node:crypto"
    ) as NodeCryptoV3 | undefined;

  if (
    typeof cryptoModule?.createHash !== "function"
  ) {
    return null;
  }

  return cryptoModule
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function deepFreezeJson(
  value: unknown
): unknown {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (
    const child
    of Object.values(value)
  ) {
    deepFreezeJson(child);
  }

  return Object.freeze(value);
}

function validEvidenceBinding(
  value: unknown
) {
  return isPlainRecord(value) &&
    value["v3-12a0"] === EXPECTED_EVIDENCE_SHA256["v3-12a0"] &&
    value["v3-12a1"] === EXPECTED_EVIDENCE_SHA256["v3-12a1"] &&
    value["v3-12a2"] === EXPECTED_EVIDENCE_SHA256["v3-12a2"];
}

function validateManifest(
  manifest: unknown
) {
  return isPlainRecord(manifest) &&
    manifest.schemaVersion ===
      STAYOPTI_LEGACY_DIAGNOSTIC_QUARANTINE_SCHEMA_VERSION_V3 &&
    manifest.manualLegacyQuarantineDecision === "APPROVED" &&
    manifest.fixturePath === EXPECTED_FIXTURE_PATH &&
    manifest.fixtureSha256 === EXPECTED_FIXTURE_SHA256 &&
    manifest.provenanceStatus ===
      "PARTIALLY_RECOVERED_NON_REPLAYABLE" &&
    manifest.quarantineStatus ===
      "LEGACY_DIAGNOSTIC_QUARANTINED" &&
    manifest.allowedUse ===
      STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3 &&
    sameStringArray(
      manifest.caseIds,
      STAYOPTI_LEGACY_DIAGNOSTIC_CASE_IDS_V3
    ) &&
    sameStringArray(
      manifest.prohibitedUses,
      STAYOPTI_LEGACY_DIAGNOSTIC_PROHIBITED_USES_V3
    ) &&
    sameStringArray(
      manifest.reasonCodes,
      EXPECTED_REASON_CODES
    ) &&
    validEvidenceBinding(
      manifest.evidenceSha256
    );
}

function validateFixtureCaseSet(
  fixture: unknown
) {
  if (
    !isPlainRecord(fixture) ||
    fixture.diagnosticOnly !== true ||
    fixture.candidateGroundTruth !== false ||
    fixture.thresholdTuningAllowed !== false ||
    fixture.publicPromotionAllowed !== false ||
    !Array.isArray(fixture.cases) ||
    fixture.cases.length !==
      STAYOPTI_LEGACY_DIAGNOSTIC_CASE_IDS_V3.length
  ) {
    return false;
  }

  const ids: string[] = [];

  for (
    const candidate
    of fixture.cases
  ) {
    if (
      !isPlainRecord(candidate) ||
      typeof candidate.diagnosticId !== "string" ||
      candidate.diagnosticOnly !== true ||
      candidate.candidateGroundTruth !== false
    ) {
      return false;
    }

    ids.push(
      candidate.diagnosticId
    );
  }

  return new Set(ids).size === ids.length &&
    sameStringArray(
      ids,
      STAYOPTI_LEGACY_DIAGNOSTIC_CASE_IDS_V3
    );
}

export function admitLegacyDiagnosticFixtureV3(
  fixtureJsonText: string,
  manifestJsonText: string,
  requestedUse: StayOptiLegacyDiagnosticUseV3
): StayOptiLegacyDiagnosticQuarantineResultV3 {
  if (
    typeof fixtureJsonText !== "string" ||
    typeof manifestJsonText !== "string" ||
    typeof requestedUse !== "string"
  ) {
    return blocked(
      "LEGACY_DIAGNOSTIC_INPUT_INVALID"
    );
  }

  const digest =
    sha256Text(
      fixtureJsonText
    );

  if (
    digest === null
  ) {
    return blocked(
      "LEGACY_DIAGNOSTIC_HASH_UNAVAILABLE"
    );
  }

  if (
    digest !== EXPECTED_FIXTURE_SHA256
  ) {
    return blocked(
      "LEGACY_DIAGNOSTIC_DIGEST_MISMATCH"
    );
  }

  let fixture: unknown;
  let manifest: unknown;

  try {
    fixture =
      JSON.parse(
        fixtureJsonText
      );
    manifest =
      JSON.parse(
        manifestJsonText
      );
  }
  catch {
    return blocked(
      "LEGACY_DIAGNOSTIC_INPUT_INVALID"
    );
  }

  if (
    !validateManifest(
      manifest
    )
  ) {
    return blocked(
      "LEGACY_DIAGNOSTIC_MANIFEST_MISMATCH"
    );
  }

  if (
    !validateFixtureCaseSet(
      fixture
    )
  ) {
    return blocked(
      "LEGACY_DIAGNOSTIC_CASE_SET_MISMATCH"
    );
  }

  if (
    requestedUse !==
      STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3
  ) {
    return blocked(
      "LEGACY_DIAGNOSTIC_USE_PROHIBITED"
    );
  }

  return Object.freeze({
    status: "admitted" as const,
    allowedUse:
      STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3,
    quarantineStatus:
      "LEGACY_DIAGNOSTIC_QUARANTINED" as const,
    provenanceStatus:
      "PARTIALLY_RECOVERED_NON_REPLAYABLE" as const,
    fixture:
      deepFreezeJson(
        fixture
      ) as Readonly<Record<string, unknown>>,
    issueCode: null,
  });
}
