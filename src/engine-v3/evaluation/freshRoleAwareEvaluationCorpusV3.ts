import {
  stableSerializeV3,
} from "../contract/stableHashV3";

import {
  STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_SCHEMA_VERSION_V3,
  STAYOPTI_FRESH_ROLE_AWARE_CANONICALIZATION_VERSION_V3,
  STAYOPTI_FRESH_ROLE_AWARE_QUESTIONS_V3,
  STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3,
  createFreshReplayableRoleAwareCapsuleV3,
  createFreshRoleAwareSha256V3,
  validateFreshReplayableRoleAwareCapsuleV3,
  verifyFreshReplayableRoleAwareCapsuleReplayV3,
  type StayOptiFreshRoleAwareCapsuleInputV3,
  type StayOptiFreshRoleAwareCapsuleV3,
  type StayOptiFreshRoleAwareRoleV3,
  type StayOptiFreshRoleAwareStaySolutionV3,
} from "./freshReplayableRoleAwareCapsuleV3";

import {
  createFreshRoleAwareBlindBundleV3,
  validateFreshRoleAwareBlindBundleV3,
  type StayOptiFreshBlindAlternativeV3,
  type StayOptiFreshRoleAwareBlindBundleV3,
} from "./freshRoleAwareBlindPipelineV3";

export const STAYOPTI_FRESH_ROLE_AWARE_CORPUS_SCHEMA_VERSION_V3 =
  "stayopti.v3.fresh-role-aware-evaluation-corpus@1" as const;

export const STAYOPTI_FRESH_ROLE_AWARE_CORPUS_DURATIONS_V3 = [
  5,
  7,
  10,
  14,
  21,
  28,
] as const;

export const STAYOPTI_FRESH_ROLE_AWARE_CORPUS_PARTITIONS_V3 = [
  "development",
  "frozen-regression",
  "blind-evaluation",
  "sealed-holdout",
] as const;

export type StayOptiFreshRoleAwareCorpusDurationV3 =
  typeof STAYOPTI_FRESH_ROLE_AWARE_CORPUS_DURATIONS_V3[number];

export type StayOptiFreshRoleAwareCorpusPartitionV3 =
  typeof STAYOPTI_FRESH_ROLE_AWARE_CORPUS_PARTITIONS_V3[number];

type StayOptiFreshRoleAwareCorpusProfileV3 =
  StayOptiFreshRoleAwareCapsuleInputV3["preferences"]["profile"];

export interface StayOptiFreshRoleAwareCorpusCaseManifestV3 {
  ordinal: number;
  caseId: string;
  role: StayOptiFreshRoleAwareRoleV3;
  nights: StayOptiFreshRoleAwareCorpusDurationV3;
  partition: StayOptiFreshRoleAwareCorpusPartitionV3;
  destinationCode: string;
  profile: StayOptiFreshRoleAwareCorpusProfileV3;
  expectedContentDigest: string;
  expectedCapsuleFingerprint: string;
  expectedPacketFingerprint: string;
  expectedAssignmentFingerprint: string;
  expectedBundleFingerprint: string;
}

export interface StayOptiFreshRoleAwareCorpusFixtureV3 {
  schemaVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_CORPUS_SCHEMA_VERSION_V3;
  application: "private-offline-technical-evaluation-only";
  sourceSha: string;
  createdAt: string;
  syntheticOnly: true;
  providerNeutral: true;
  technicalDiagnosticOnly: true;
  humanVerdictsIncluded: false;
  goldenAdmissionAllowed: false;
  tuningAllowed: false;
  scoringAllowed: false;
  rankingAllowed: false;
  promotionAllowed: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitPublicEnabled: false;
  cases: StayOptiFreshRoleAwareCorpusCaseManifestV3[];
}

export interface StayOptiFreshRoleAwareCorpusRecordV3 {
  ordinal: number;
  partition: StayOptiFreshRoleAwareCorpusPartitionV3;
  input: StayOptiFreshRoleAwareCapsuleInputV3;
  capsule: StayOptiFreshRoleAwareCapsuleV3;
  blindBundle: StayOptiFreshRoleAwareBlindBundleV3;
  verdictReceipt: null;
  deblindReport: null;
}

export interface StayOptiFreshRoleAwareEvaluationCorpusV3 {
  schemaVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_CORPUS_SCHEMA_VERSION_V3;
  application: "private-offline-technical-evaluation-only";
  sourceSha: string;
  records: StayOptiFreshRoleAwareCorpusRecordV3[];
  publicV2Changed: false;
  publicV3Enabled: false;
  splitPublicEnabled: false;
  legacyCasesUsedAsInput: 0;
  humanVerdictsCreated: 0;
  goldenAdmissionAllowed: false;
  tuningAllowed: false;
  scoringAllowed: false;
  rankingAllowed: false;
  promotionAllowed: false;
}

export interface StayOptiFreshRoleAwareCorpusValidationV3 {
  valid: boolean;
  issues: string[];
}

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const CASE_ID = /^freshcase-[0-9a-f]{24}$/;
const LEGACY_CASE = /^case-[0-9a-f]{20}$/i;

export function containsLegacyDiagnosticIdentifierV3(value: unknown): boolean {
  if (typeof value === "string") {
    return LEGACY_CASE.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsLegacyDiagnosticIdentifierV3(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some((item) =>
      containsLegacyDiagnosticIdentifierV3(item)
    );
  }
  return false;
}

const PROFILES: readonly StayOptiFreshRoleAwareCorpusProfileV3[] = [
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
];

function addUtcDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addUtcMinutes(value: string, minutes: number) {
  return new Date(Date.parse(value) + minutes * 60_000).toISOString();
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function digestHex(value: unknown, namespace: string) {
  return createFreshRoleAwareSha256V3(value, namespace).slice("sha256:".length);
}

function dataStatus(ordinal: number) {
  const reviewState = ordinal % 7 === 0 ? "unknown" : "known";
  const locationState = ordinal % 5 === 0 ? "estimated" : "known";
  return {
    price: "known",
    taxes: "known",
    mandatoryCosts: "known",
    room: "known",
    treatment: "known",
    cancellation: "known",
    payment: "known",
    availability: "known",
    quality: "known",
    reviews: reviewState,
    location: locationState,
    comfort: "known",
  } as const;
}

function createSegment(
  caseId: string,
  solutionOrdinal: number,
  segmentOrdinal: number,
  checkIn: string,
  nights: number,
  totalCost: number,
  capturedAt: string
) {
  const checkOut = addUtcDays(checkIn, nights);
  return {
    segmentId: `${caseId}-segment-${solutionOrdinal}-${segmentOrdinal}`,
    accommodationToken:
      `${caseId}-accommodation-${solutionOrdinal}-${segmentOrdinal}`,
    checkIn,
    checkOut,
    nights,
    offer: {
      canonicalOfferRef:
        `${caseId}-offer-${solutionOrdinal}-${segmentOrdinal}`,
      cost: {
        total: totalCost,
        currency: "EUR",
        taxes: {
          status: "complete" as const,
          amount: 0,
        },
        mandatoryCosts: {
          status: "complete" as const,
          amount: 0,
        },
      },
      room: {
        typeCode: segmentOrdinal === 1 ? "room:standard" : "room:comfort",
        adults: 2,
        childAges: [],
        rooms: 1,
      },
      treatment: {
        boardCode: "board:room-only",
        included: true,
      },
      cancellation: {
        refundability: "refundable" as const,
        freeCancellationUntil: `${addUtcDays(checkIn, -3)}T18:00:00.000Z`,
        penaltyAmount: 0,
        currency: "EUR",
      },
      payment: {
        timing: "pay-later" as const,
        status: "complete" as const,
      },
      availability: {
        state: "available" as const,
        checkedAt: capturedAt,
      },
    },
  };
}

function createSingleSolution(
  manifest: StayOptiFreshRoleAwareCorpusCaseManifestV3,
  solutionOrdinal: number,
  checkIn: string,
  capturedAt: string,
  totalCost: number
): StayOptiFreshRoleAwareStaySolutionV3 {
  const status = dataStatus(manifest.ordinal);
  const reviewsUnknown = status.reviews === "unknown";
  return {
    solutionId: `${manifest.caseId}-solution-${solutionOrdinal}`,
    segments: [
      createSegment(
        manifest.caseId,
        solutionOrdinal,
        1,
        checkIn,
        manifest.nights,
        totalCost,
        capturedAt
      ),
    ],
    totalCost,
    currency: "EUR",
    quality: {
      starCategory: 3 + ((manifest.ordinal + solutionOrdinal) % 3),
    },
    reviews: {
      score: reviewsUnknown ? null : 8 + solutionOrdinal * 0.2,
      scale: reviewsUnknown ? null : 10,
      count: reviewsUnknown ? null : 180 + manifest.ordinal * 7,
    },
    location: {
      distanceKm: roundCurrency(0.6 + solutionOrdinal * 0.35),
    },
    comfort: {
      featureCodes: solutionOrdinal === 1
        ? ["comfort:quiet-room", "comfort:work-area"]
        : ["comfort:quiet-room", "comfort:larger-room"],
    },
    dataStatus: status,
    evidenceRefs: [`${manifest.caseId}-evidence-${solutionOrdinal}`],
  };
}

function createSplitSolution(
  manifest: StayOptiFreshRoleAwareCorpusCaseManifestV3,
  solutionOrdinal: number,
  checkIn: string,
  capturedAt: string,
  totalCost: number
): StayOptiFreshRoleAwareStaySolutionV3 {
  const firstNights = Math.max(2, Math.floor(manifest.nights / 2));
  const secondNights = manifest.nights - firstNights;
  const firstCost = roundCurrency(totalCost * firstNights / manifest.nights);
  const secondCost = roundCurrency(totalCost - firstCost);
  const secondCheckIn = addUtcDays(checkIn, firstNights);
  return {
    solutionId: `${manifest.caseId}-solution-${solutionOrdinal}`,
    segments: [
      createSegment(
        manifest.caseId,
        solutionOrdinal,
        1,
        checkIn,
        firstNights,
        firstCost,
        capturedAt
      ),
      createSegment(
        manifest.caseId,
        solutionOrdinal,
        2,
        secondCheckIn,
        secondNights,
        secondCost,
        capturedAt
      ),
    ],
    totalCost,
    currency: "EUR",
    quality: {
      starCategory: 4,
    },
    reviews: {
      score: 8.4 + solutionOrdinal * 0.1,
      scale: 10,
      count: 260 + manifest.ordinal * 5,
    },
    location: {
      distanceKm: roundCurrency(0.8 + solutionOrdinal * 0.2),
    },
    comfort: {
      featureCodes: ["comfort:quiet-room", "split:single-transfer"],
    },
    dataStatus: dataStatus(manifest.ordinal),
    evidenceRefs: [`${manifest.caseId}-evidence-${solutionOrdinal}`],
  };
}

function createSolutions(
  manifest: StayOptiFreshRoleAwareCorpusCaseManifestV3,
  checkIn: string,
  capturedAt: string
) {
  const nightlyBase = 78 + manifest.ordinal * 2;
  const baseTotal = roundCurrency(nightlyBase * manifest.nights);
  if (manifest.role !== "split-saver") {
    return [
      createSingleSolution(manifest, 1, checkIn, capturedAt, baseTotal),
      createSingleSolution(
        manifest,
        2,
        checkIn,
        capturedAt,
        roundCurrency(baseTotal + manifest.nights * 11)
      ),
    ];
  }
  return [
    createSplitSolution(
      manifest,
      1,
      checkIn,
      capturedAt,
      roundCurrency(baseTotal - manifest.nights * 7)
    ),
    createSplitSolution(
      manifest,
      2,
      checkIn,
      capturedAt,
      roundCurrency(baseTotal - manifest.nights * 4)
    ),
    createSingleSolution(
      manifest,
      3,
      checkIn,
      capturedAt,
      roundCurrency(baseTotal + manifest.nights * 5)
    ),
  ];
}

function createCapsuleInput(
  manifest: StayOptiFreshRoleAwareCorpusCaseManifestV3
): StayOptiFreshRoleAwareCapsuleInputV3 {
  const checkIn = addUtcDays("2027-01-05", manifest.ordinal * 3);
  const checkOut = addUtcDays(checkIn, manifest.nights);
  const capturedAt = addUtcMinutes(
    "2026-09-01T12:00:00.000Z",
    manifest.ordinal
  );
  const staySolutions = createSolutions(manifest, checkIn, capturedAt);
  const splitComparator = manifest.role === "split-saver"
    ? {
        singleStayComparatorSolutionId: staySolutions[2]?.solutionId ?? null,
        maximumChanges: 1,
        transferMinutes: 35 + manifest.ordinal,
        baggageHandling: "required",
        estimatedFrictionCost: roundCurrency(18 + manifest.nights * 0.75),
      }
    : null;
  const representation = {
    corpusVersion: STAYOPTI_FRESH_ROLE_AWARE_CORPUS_SCHEMA_VERSION_V3,
    caseId: manifest.caseId,
    ordinal: manifest.ordinal,
    role: manifest.role,
    nights: manifest.nights,
    partition: manifest.partition,
    destinationCode: manifest.destinationCode,
    profile: manifest.profile,
    splitComparator,
  };
  const serializedRepresentation = stableSerializeV3(representation);
  const evidence = staySolutions.map((_solution, index) => ({
    evidenceId: `${manifest.caseId}-evidence-${index + 1}`,
    fieldCodes: [
      "availability.state",
      "cost.total",
      "location.distance",
      "room.type",
    ],
    observedAt: capturedAt,
    freshness: "fresh" as const,
    reliability: "high" as const,
  }));
  return {
    schemaVersion: STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_SCHEMA_VERSION_V3,
    caseId: manifest.caseId,
    captureVersion: "stayopti.v3.synthetic-corpus-capture@1",
    provenanceVersion: "stayopti.v3.synthetic-corpus-provenance@1",
    canonicalizationVersion:
      STAYOPTI_FRESH_ROLE_AWARE_CANONICALIZATION_VERSION_V3,
    createdAt: capturedAt,
    evaluationIntent: {
      role: manifest.role,
      question: STAYOPTI_FRESH_ROLE_AWARE_QUESTIONS_V3[manifest.role],
    },
    searchContext: {
      destination: {
        label: `Synthetic ${manifest.destinationCode}`,
        countryCode: "ZZ",
        latitude: null,
        longitude: null,
      },
      checkIn,
      checkOut,
      nights: manifest.nights,
      occupancy: {
        adults: 2,
        childAges: [],
        rooms: 1,
      },
      budget: {
        total: roundCurrency(staySolutions.at(-1)?.totalCost ?? 0),
        currency: "EUR",
      },
      maximumDistanceKm: 3,
    },
    preferences: {
      profile: manifest.profile,
      essentialFeatureCodes: ["essential:complete-cost"],
      preferredFeatureCodes: ["comfort:quiet-room", "location:near-target"],
    },
    hardConstraints: [
      {
        constraintId: "constraint-budget-limit",
        value: roundCurrency(staySolutions.at(-1)?.totalCost ?? 0),
      },
      {
        constraintId: "constraint-provider-neutral",
        value: true,
      },
    ],
    softConstraints: [
      {
        preferenceId: "preference-comfort-balance",
        weight: 4,
        value: manifest.profile,
      },
    ],
    staySolutions,
    sanitizedReplayInput: {
      mediaType: "application/json",
      sourceDigest: digestHex(
        representation,
        "stayopti-v3-12b2-synthetic-replay-source"
      ),
      byteLength: new TextEncoder().encode(serializedRepresentation).length,
      representation,
    },
    provenance: {
      captureId: `${manifest.caseId}-capture`,
      sourceKind: "synthetic-contract-fixture",
      capturedAt,
      freshness: "fresh",
      transformations: [
        {
          transformationId: "transform-canonical-v1",
          version: "1.0.0",
          description: "Deterministic provider-neutral synthetic canonicalization.",
        },
      ],
      evidence,
    },
    engineBindings: [
      {
        engineKey: "baseline-engine",
        policyVersion: "stayopti.v2.synthetic-baseline@1",
        configHash: digestHex(
          { manifest: manifest.ordinal, engine: "baseline-engine" },
          "stayopti-v3-12b2-config"
        ),
      },
      {
        engineKey: "candidate-engine",
        policyVersion: "stayopti.v3.synthetic-shadow@1",
        configHash: digestHex(
          { manifest: manifest.ordinal, engine: "candidate-engine" },
          "stayopti-v3-12b2-config"
        ),
      },
    ],
    expectedReplayPreconditions: {
      providerCallsRequired: false,
      networkRequired: false,
      samePolicyAndConfigRequired: true,
      sourceComplete: true,
    },
    assurances: {
      piiIncluded: false,
      secretsIncluded: false,
      providerPrivateIdentifiersIncluded: false,
      commercialSignalsIncluded: false,
      technicalDiagnosticOnly: true,
      humanVerdictIncluded: false,
      goldenAdmissionAllowed: false,
      tuningAllowed: false,
      scoringAllowed: false,
      rankingAllowed: false,
      promotionAllowed: false,
    },
  };
}

function createAlternative(
  capsule: StayOptiFreshRoleAwareCapsuleV3,
  engineKey: "baseline-engine" | "candidate-engine",
  solutionIndex: number,
  decisionState: "recommended" | "abstained"
): StayOptiFreshBlindAlternativeV3 {
  const solution = capsule.staySolutions[solutionIndex];
  const solutionId = decisionState === "abstained"
    ? null
    : solution?.solutionId ?? null;
  return {
    engineKey,
    role: capsule.evaluationIntent.role,
    decisionState,
    solutionId,
    decisionFingerprint: createFreshRoleAwareSha256V3(
      {
        capsuleFingerprint: capsule.fingerprint,
        engineKey,
        role: capsule.evaluationIntent.role,
        solutionId,
      },
      "stayopti-v3-12b2-synthetic-decision"
    ),
    reasonCodes: [
      `role:${capsule.evaluationIntent.role}`,
      engineKey === "baseline-engine"
        ? "evidence:complete-baseline"
        : "evidence:complete-candidate",
    ],
  };
}

function createBlindBundle(capsule: StayOptiFreshRoleAwareCapsuleV3) {
  const abstention = capsule.evaluationIntent.role === "abstention-near-tie";
  return createFreshRoleAwareBlindBundleV3({
    caseId: capsule.caseId,
    capsule,
    evaluationRole: capsule.evaluationIntent.role,
    alternatives: [
      createAlternative(capsule, "baseline-engine", 0, "recommended"),
      createAlternative(
        capsule,
        "candidate-engine",
        1,
        abstention ? "abstained" : "recommended"
      ),
    ],
  });
}

function fixtureIssues(value: unknown): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["corpus-fixture-structure-invalid"];
  }
  const fixture = value as StayOptiFreshRoleAwareCorpusFixtureV3;
  const issues: string[] = [];
  if (
    fixture.schemaVersion !== STAYOPTI_FRESH_ROLE_AWARE_CORPUS_SCHEMA_VERSION_V3 ||
    fixture.application !== "private-offline-technical-evaluation-only" ||
    !SHA256.test(fixture.sourceSha) ||
    Number.isNaN(Date.parse(fixture.createdAt)) ||
    fixture.syntheticOnly !== true ||
    fixture.providerNeutral !== true ||
    fixture.technicalDiagnosticOnly !== true ||
    fixture.humanVerdictsIncluded !== false ||
    fixture.goldenAdmissionAllowed !== false ||
    fixture.tuningAllowed !== false ||
    fixture.scoringAllowed !== false ||
    fixture.rankingAllowed !== false ||
    fixture.promotionAllowed !== false ||
    fixture.publicV2Changed !== false ||
    fixture.publicV3Enabled !== false ||
    fixture.splitPublicEnabled !== false ||
    !Array.isArray(fixture.cases) ||
    fixture.cases.length !== 30
  ) {
    issues.push("corpus-fixture-header-invalid");
  }
  if (!Array.isArray(fixture.cases)) {
    return [...new Set(issues)].sort();
  }
  for (const item of fixture.cases) {
    if (
      !Number.isInteger(item.ordinal) ||
      item.ordinal < 1 ||
      item.ordinal > 30 ||
      !CASE_ID.test(item.caseId) ||
      !STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3.includes(item.role) ||
      !STAYOPTI_FRESH_ROLE_AWARE_CORPUS_DURATIONS_V3.includes(item.nights) ||
      !STAYOPTI_FRESH_ROLE_AWARE_CORPUS_PARTITIONS_V3.includes(item.partition) ||
      typeof item.destinationCode !== "string" ||
      item.destinationCode.length < 8 ||
      !PROFILES.includes(item.profile) ||
      !SHA256.test(item.expectedContentDigest) ||
      !SHA256.test(item.expectedCapsuleFingerprint) ||
      !SHA256.test(item.expectedPacketFingerprint) ||
      !SHA256.test(item.expectedAssignmentFingerprint) ||
      !SHA256.test(item.expectedBundleFingerprint)
    ) {
      issues.push(`corpus-case-manifest-invalid:${String(item.ordinal)}`);
    }
  }
  if (
    new Set(fixture.cases.map((item) => item.ordinal)).size !== 30 ||
    new Set(fixture.cases.map((item) => item.caseId)).size !== 30
  ) {
    issues.push("corpus-case-identity-duplicate");
  }
  return [...new Set(issues)].sort();
}

export function createFreshRoleAwareEvaluationCorpusV3(
  value: unknown
): StayOptiFreshRoleAwareEvaluationCorpusV3 {
  const issues = fixtureIssues(value);
  if (issues.length > 0) {
    throw new Error(`Fresh role-aware corpus fixture invalid: ${issues.join(", ")}.`);
  }
  const fixture = value as StayOptiFreshRoleAwareCorpusFixtureV3;
  const records = fixture.cases
    .map((manifest) => {
      const input = createCapsuleInput(manifest);
      const capsule = createFreshReplayableRoleAwareCapsuleV3(input);
      const blindBundle = createBlindBundle(capsule);
      return {
        ordinal: manifest.ordinal,
        partition: manifest.partition,
        input,
        capsule,
        blindBundle,
        verdictReceipt: null,
        deblindReport: null,
      } satisfies StayOptiFreshRoleAwareCorpusRecordV3;
    })
    .sort((left, right) => left.ordinal - right.ordinal);
  return {
    schemaVersion: fixture.schemaVersion,
    application: fixture.application,
    sourceSha: fixture.sourceSha,
    records,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitPublicEnabled: false,
    legacyCasesUsedAsInput: 0,
    humanVerdictsCreated: 0,
    goldenAdmissionAllowed: false,
    tuningAllowed: false,
    scoringAllowed: false,
    rankingAllowed: false,
    promotionAllowed: false,
  };
}

function splitIssues(record: StayOptiFreshRoleAwareCorpusRecordV3) {
  if (record.capsule.evaluationIntent.role !== "split-saver") {
    return [];
  }
  const issues: string[] = [];
  const splitSolutions = record.capsule.staySolutions.filter(
    (solution) => solution.segments.length > 1
  );
  const singleSolutions = record.capsule.staySolutions.filter(
    (solution) => solution.segments.length === 1
  );
  if (splitSolutions.length !== 2 || singleSolutions.length !== 1) {
    issues.push(`split-comparator-invalid:${record.ordinal}`);
  }
  for (const solution of splitSolutions) {
    const [first, second] = solution.segments;
    if (
      solution.segments.length !== 2 ||
      first === undefined ||
      second === undefined ||
      first.nights < 2 ||
      second.nights < 2 ||
      first.checkOut !== second.checkIn ||
      first.nights + second.nights !== record.capsule.searchContext.nights
    ) {
      issues.push(`split-segments-invalid:${record.ordinal}`);
    }
  }
  return issues;
}

function partitionDiversityIssues(
  fixture: StayOptiFreshRoleAwareCorpusFixtureV3
) {
  const issues: string[] = [];
  for (const partition of STAYOPTI_FRESH_ROLE_AWARE_CORPUS_PARTITIONS_V3) {
    const cases = fixture.cases.filter((item) => item.partition === partition);
    if (
      new Set(cases.map((item) => item.nights)).size < 2 ||
      new Set(cases.map((item) => item.destinationCode)).size < 2 ||
      new Set(cases.map((item) => item.profile)).size < 2
    ) {
      issues.push(`partition-diversity-invalid:${partition}`);
    }
  }
  return issues;
}

export function validateFreshRoleAwareEvaluationCorpusV3(
  fixtureValue: unknown,
  corpusValue: unknown
): StayOptiFreshRoleAwareCorpusValidationV3 {
  const issues = fixtureIssues(fixtureValue);
  if (
    corpusValue === null ||
    typeof corpusValue !== "object" ||
    Array.isArray(corpusValue)
  ) {
    return {
      valid: false,
      issues: [...new Set([...issues, "corpus-structure-invalid"])].sort(),
    };
  }
  const fixture = fixtureValue as StayOptiFreshRoleAwareCorpusFixtureV3;
  const corpus = corpusValue as StayOptiFreshRoleAwareEvaluationCorpusV3;
  if (!Array.isArray(fixture.cases) || !Array.isArray(corpus.records)) {
    return {
      valid: false,
      issues: [...new Set([...issues, "corpus-records-invalid"])].sort(),
    };
  }
  if (
    corpus.schemaVersion !== STAYOPTI_FRESH_ROLE_AWARE_CORPUS_SCHEMA_VERSION_V3 ||
    corpus.application !== "private-offline-technical-evaluation-only" ||
    corpus.sourceSha !== fixture.sourceSha ||
    corpus.records.length !== 30 ||
    corpus.publicV2Changed !== false ||
    corpus.publicV3Enabled !== false ||
    corpus.splitPublicEnabled !== false ||
    corpus.legacyCasesUsedAsInput !== 0 ||
    corpus.humanVerdictsCreated !== 0 ||
    corpus.goldenAdmissionAllowed !== false ||
    corpus.tuningAllowed !== false ||
    corpus.scoringAllowed !== false ||
    corpus.rankingAllowed !== false ||
    corpus.promotionAllowed !== false
  ) {
    issues.push("corpus-boundary-invalid");
  }
  const roleDuration = new Set<string>();
  const fingerprints = new Set<string>();
  const contentDigests = new Set<string>();
  for (const record of corpus.records) {
    const manifest = fixture.cases.find((item) => item.ordinal === record.ordinal);
    if (manifest === undefined) {
      issues.push(`corpus-manifest-binding-missing:${record.ordinal}`);
      continue;
    }
    roleDuration.add(`${manifest.role}:${manifest.nights}`);
    fingerprints.add(record.capsule.fingerprint);
    contentDigests.add(record.capsule.contentDigest);
    const capsuleValidation = validateFreshReplayableRoleAwareCapsuleV3(
      record.capsule
    );
    const recordBoundaryInvalid =
      record.verdictReceipt !== null ||
      record.deblindReport !== null ||
      containsLegacyDiagnosticIdentifierV3(record) ||
      (capsuleValidation.valid &&
        (record.capsule.provenance.sourceKind !== "synthetic-contract-fixture" ||
          record.capsule.expectedReplayPreconditions.networkRequired !== false ||
          record.capsule.expectedReplayPreconditions.providerCallsRequired !== false));
    if (!capsuleValidation.valid) {
      issues.push(`capsule-invalid:${record.ordinal}`);
    }
    if (recordBoundaryInvalid) {
      issues.push(`corpus-record-boundary-invalid:${record.ordinal}`);
    }
    if (!capsuleValidation.valid || recordBoundaryInvalid) {
      continue;
    }
    if (!verifyFreshReplayableRoleAwareCapsuleReplayV3(record.input, record.capsule)) {
      issues.push(`capsule-replay-invalid:${record.ordinal}`);
    }
    const blindValidation = validateFreshRoleAwareBlindBundleV3(
      record.blindBundle
    );
    if (!blindValidation.valid) {
      issues.push(`blind-bundle-invalid:${record.ordinal}`);
    }
    if (
      record.partition !== manifest.partition ||
      record.capsule.caseId !== manifest.caseId ||
      record.capsule.evaluationIntent.role !== manifest.role ||
      record.capsule.searchContext.nights !== manifest.nights ||
      record.capsule.contentDigest !== manifest.expectedContentDigest ||
      record.capsule.fingerprint !== manifest.expectedCapsuleFingerprint ||
      record.blindBundle.packet.fingerprint !== manifest.expectedPacketFingerprint ||
      record.blindBundle.sealedAssignment.fingerprint !== manifest.expectedAssignmentFingerprint ||
      record.blindBundle.fingerprint !== manifest.expectedBundleFingerprint
    ) {
      issues.push(`corpus-manifest-binding-invalid:${record.ordinal}`);
    }
    issues.push(...splitIssues(record));
  }
  if (roleDuration.size !== 30) {
    issues.push("role-duration-matrix-invalid");
  }
  if (fingerprints.size !== 30 || contentDigests.size !== 30) {
    issues.push("corpus-content-bindings-not-unique");
  }
  for (const role of STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3) {
    const cases = fixture.cases.filter((item) => item.role === role);
    const partitionCounts = Object.fromEntries(
      STAYOPTI_FRESH_ROLE_AWARE_CORPUS_PARTITIONS_V3.map((partition) => [
        partition,
        cases.filter((item) => item.partition === partition).length,
      ])
    );
    if (
      cases.length !== 6 ||
      partitionCounts["development"] !== 2 ||
      partitionCounts["frozen-regression"] !== 1 ||
      partitionCounts["blind-evaluation"] !== 2 ||
      partitionCounts["sealed-holdout"] !== 1
    ) {
      issues.push(`role-partition-balance-invalid:${role}`);
    }
  }
  const globalPartitionCounts = Object.fromEntries(
    STAYOPTI_FRESH_ROLE_AWARE_CORPUS_PARTITIONS_V3.map((partition) => [
      partition,
      fixture.cases.filter((item) => item.partition === partition).length,
    ])
  );
  if (
    globalPartitionCounts["development"] !== 10 ||
    globalPartitionCounts["frozen-regression"] !== 5 ||
    globalPartitionCounts["blind-evaluation"] !== 10 ||
    globalPartitionCounts["sealed-holdout"] !== 5
  ) {
    issues.push("global-partition-balance-invalid");
  }
  issues.push(...partitionDiversityIssues(fixture));
  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

export const STAYOPTI_FRESH_ROLE_AWARE_CORPUS_AUDIT_V3 = Object.freeze({
  application: "private-offline-technical-evaluation-only" as const,
  expectedCases: 30 as const,
  expectedCasesPerRole: 6 as const,
  expectedCasesPerDuration: 5 as const,
  legacyCasesAccepted: false as const,
  humanVerdictsCreated: false as const,
  goldenAdmissionAllowed: false as const,
  tuningAllowed: false as const,
  scoringAllowed: false as const,
  rankingAllowed: false as const,
  promotionAllowed: false as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitPublicEnabled: false as const,
});
