import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";

export const STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3 =
  "3.0.0-decision-science-library.1" as const;

export const STAYOPTI_DECISION_SCIENCE_LIBRARY_SCHEMA_VERSION_V3 =
  "3.0.0-decision-science-library-schema.1" as const;

export const STAYOPTI_DECISION_SCIENCE_DOMAINS_V3 = [
  "budget",
  "quality",
  "comfort",
  "location",
  "room",
  "flexibility",
  "long-stays",
] as const;

export const STAYOPTI_DECISION_SCIENCE_BIAS_AXES_V3 = [
  "geography-culture",
  "trip-purpose",
  "hotel-segment",
  "travel-party",
  "time-period",
  "platform-measurement",
  "accessibility",
] as const;

export type StayOptiDecisionScienceDomainV3 =
  typeof STAYOPTI_DECISION_SCIENCE_DOMAINS_V3[number];

export type StayOptiDecisionScienceBiasAxisV3 =
  typeof STAYOPTI_DECISION_SCIENCE_BIAS_AXES_V3[number];

export type StayOptiDecisionScienceSourceTypeV3 =
  | "peer-reviewed-experiment"
  | "peer-reviewed-observational"
  | "peer-reviewed-qualitative"
  | "institutional-report"
  | "industry-survey";

export type StayOptiDecisionScienceEvidenceStrengthV3 =
  | "exploratory"
  | "directional"
  | "moderate"
  | "strong";

export type StayOptiDecisionScienceCommercialRiskV3 =
  | "low"
  | "medium"
  | "high";

export interface StayOptiDecisionScienceSourceV3 {
  id: string;
  version: string;
  title: string;
  authors: string[];
  publicationYear: number;
  sourceType: StayOptiDecisionScienceSourceTypeV3;
  locator: string;
  peerReviewed: boolean;
  domains: StayOptiDecisionScienceDomainV3[];
  population: string;
  geography: string[];
  context: string;
  method: string;
  sampleSize: number | null;
  limitations: string[];
  commercialInterestRisk: StayOptiDecisionScienceCommercialRiskV3;
  fundingDisclosure: string;
  reviewedOn: string;
  reviewBy: string;
}

export interface StayOptiDecisionScienceClaimScopeV3 {
  population: string;
  geographies: string[];
  tripContexts: string[];
}

export interface StayOptiDecisionScienceClaimV3 {
  id: string;
  version: string;
  domain: StayOptiDecisionScienceDomainV3;
  proposition: string;
  sourceIds: string[];
  scope: StayOptiDecisionScienceClaimScopeV3;
  strength: StayOptiDecisionScienceEvidenceStrengthV3;
  limits: string[];
  biases: StayOptiDecisionScienceBiasAxisV3[];
  validFrom: string;
  reviewBy: string;
  dimensions: StayOptiDecisionScienceDomainV3[];
  nonApplicableWhen: string[];
  testIds: string[];
  status: "candidate-research-only";
  directPolicyUseAllowed: false;
  directWeightAssignmentAllowed: false;
}

export interface StayOptiDecisionScienceTestMapV3 {
  id: string;
  claimIds: string[];
  dimensions: StayOptiDecisionScienceDomainV3[];
  targetPhase: "v3-13-library-guard" | "v3-14-curriculum" | "v3-15-policy-candidate";
  assertion: string;
  status: "automated" | "specified";
}

export interface StayOptiDecisionScienceBiasControlV3 {
  id: string;
  axis: StayOptiDecisionScienceBiasAxisV3;
  risk: string;
  mitigation: string;
  linkedClaimIds: string[];
  requiredReview: string;
}

export interface StayOptiDecisionScienceLibraryInputV3 {
  sources: StayOptiDecisionScienceSourceV3[];
  claims: StayOptiDecisionScienceClaimV3[];
  testMappings: StayOptiDecisionScienceTestMapV3[];
  biasControls: StayOptiDecisionScienceBiasControlV3[];
}

export interface StayOptiDecisionScienceLibraryV3
  extends StayOptiDecisionScienceLibraryInputV3 {
  schemaVersion: typeof STAYOPTI_DECISION_SCIENCE_LIBRARY_SCHEMA_VERSION_V3;
  libraryVersion: typeof STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3;
  application: "offline-research-only";
  directPolicyAdoptionAllowed: false;
  directWeightAssignmentAllowed: false;
  rankingMutationAllowed: false;
  publicPromotionAllowed: false;
  providerCallsAllowed: false;
  counts: {
    sources: number;
    claims: number;
    testMappings: number;
    biasControls: number;
    domains: number;
  };
  fingerprint: string;
}

export type StayOptiDecisionScienceViolationCodeV3 =
  | "schema-invalid"
  | "fingerprint-invalid"
  | "duplicate-id"
  | "domain-coverage-missing"
  | "bias-axis-missing"
  | "source-invalid"
  | "claim-source-missing"
  | "claim-scope-incomplete"
  | "claim-strength-invalid"
  | "claim-limits-missing"
  | "claim-dimension-missing"
  | "claim-non-applicability-missing"
  | "claim-test-missing"
  | "test-link-invalid"
  | "policy-firewall-open";

export interface StayOptiDecisionScienceViolationV3 {
  code: StayOptiDecisionScienceViolationCodeV3;
  entityId: string;
  detail: string;
}

export interface StayOptiDecisionScienceValidationV3 {
  valid: boolean;
  violations: StayOptiDecisionScienceViolationV3[];
}

const STRENGTH_RANK: Record<StayOptiDecisionScienceEvidenceStrengthV3, number> = {
  exploratory: 0,
  directional: 1,
  moderate: 2,
  strong: 3,
};

function compareById<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort() as T[];
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isSourceLocator(value: string): boolean {
  return /^https:\/\/(doi\.org\/10\.|[^\s/]+\/)/.test(value);
}

function fingerprintPayload(
  library: Omit<StayOptiDecisionScienceLibraryV3, "fingerprint">
): string {
  return createStableHashV3(library, "stayopti-v3-decision-science-library");
}

export function createDecisionScienceLibraryV3(
  input: StayOptiDecisionScienceLibraryInputV3
): StayOptiDecisionScienceLibraryV3 {
  const sources = input.sources
    .map((source) => ({
      ...source,
      authors: [...source.authors],
      domains: uniqueSorted(source.domains),
      geography: uniqueSorted(source.geography),
      limitations: [...source.limitations],
    }))
    .sort(compareById);

  const claims = input.claims
    .map((claim) => ({
      ...claim,
      sourceIds: uniqueSorted(claim.sourceIds),
      scope: {
        ...claim.scope,
        geographies: uniqueSorted(claim.scope.geographies),
        tripContexts: uniqueSorted(claim.scope.tripContexts),
      },
      limits: [...claim.limits],
      biases: uniqueSorted(claim.biases),
      dimensions: uniqueSorted(claim.dimensions),
      nonApplicableWhen: [...claim.nonApplicableWhen],
      testIds: uniqueSorted(claim.testIds),
    }))
    .sort(compareById);

  const testMappings = input.testMappings
    .map((mapping) => ({
      ...mapping,
      claimIds: uniqueSorted(mapping.claimIds),
      dimensions: uniqueSorted(mapping.dimensions),
    }))
    .sort(compareById);

  const biasControls = input.biasControls
    .map((control) => ({
      ...control,
      linkedClaimIds: uniqueSorted(control.linkedClaimIds),
    }))
    .sort(compareById);

  const payload: Omit<StayOptiDecisionScienceLibraryV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_DECISION_SCIENCE_LIBRARY_SCHEMA_VERSION_V3,
    libraryVersion: STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3,
    application: "offline-research-only",
    directPolicyAdoptionAllowed: false,
    directWeightAssignmentAllowed: false,
    rankingMutationAllowed: false,
    publicPromotionAllowed: false,
    providerCallsAllowed: false,
    sources,
    claims,
    testMappings,
    biasControls,
    counts: {
      sources: sources.length,
      claims: claims.length,
      testMappings: testMappings.length,
      biasControls: biasControls.length,
      domains: new Set(claims.map((claim) => claim.domain)).size,
    },
  };

  return {
    ...payload,
    fingerprint: fingerprintPayload(payload),
  };
}

export function validateDecisionScienceLibraryV3(
  library: StayOptiDecisionScienceLibraryV3
): StayOptiDecisionScienceValidationV3 {
  const violations: StayOptiDecisionScienceViolationV3[] = [];
  const add = (
    code: StayOptiDecisionScienceViolationCodeV3,
    entityId: string,
    detail: string
  ) => violations.push({ code, entityId, detail });

  if (
    library.schemaVersion !== STAYOPTI_DECISION_SCIENCE_LIBRARY_SCHEMA_VERSION_V3 ||
    library.libraryVersion !== STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3 ||
    library.application !== "offline-research-only"
  ) {
    add("schema-invalid", "library", "Version or offline application boundary is invalid.");
  }

  const { fingerprint: _fingerprint, ...payload } = library;
  if (!isStableHashV3(library.fingerprint) || library.fingerprint !== fingerprintPayload(payload)) {
    add("fingerprint-invalid", "library", "Fingerprint does not bind the canonical library payload.");
  }

  if (
    library.directPolicyAdoptionAllowed !== false ||
    library.directWeightAssignmentAllowed !== false ||
    library.rankingMutationAllowed !== false ||
    library.publicPromotionAllowed !== false ||
    library.providerCallsAllowed !== false
  ) {
    add("policy-firewall-open", "library", "Research evidence cannot directly alter policy or runtime behavior.");
  }

  const allEntities: Array<{ kind: string; id: string }> = [
    ...library.sources.map(({ id }) => ({ kind: "source", id })),
    ...library.claims.map(({ id }) => ({ kind: "claim", id })),
    ...library.testMappings.map(({ id }) => ({ kind: "test", id })),
    ...library.biasControls.map(({ id }) => ({ kind: "bias", id })),
  ];
  const seenIds = new Set<string>();
  for (const entity of allEntities) {
    if (!hasText(entity.id) || seenIds.has(entity.id)) {
      add("duplicate-id", entity.id || entity.kind, "Entity IDs must be non-empty and globally unique.");
    }
    seenIds.add(entity.id);
  }

  const sourceById = new Map(library.sources.map((source) => [source.id, source]));
  const claimById = new Map(library.claims.map((claim) => [claim.id, claim]));
  const testById = new Map(library.testMappings.map((mapping) => [mapping.id, mapping]));

  for (const domain of STAYOPTI_DECISION_SCIENCE_DOMAINS_V3) {
    const hasClaim = library.claims.some((claim) => claim.domain === domain);
    const hasSource = library.sources.some((source) => source.domains.includes(domain));
    if (!hasClaim || !hasSource) {
      add("domain-coverage-missing", domain, "Every core domain requires at least one claim and one registered source.");
    }
  }

  for (const axis of STAYOPTI_DECISION_SCIENCE_BIAS_AXES_V3) {
    if (!library.biasControls.some((control) => control.axis === axis)) {
      add("bias-axis-missing", axis, "Required red-team bias axis has no control.");
    }
  }

  for (const source of library.sources) {
    if (
      !hasText(source.version) ||
      !hasText(source.title) ||
      source.authors.length === 0 ||
      !source.authors.every(hasText) ||
      source.publicationYear < 1900 ||
      source.publicationYear > 2100 ||
      !isSourceLocator(source.locator) ||
      source.domains.length === 0 ||
      !hasText(source.population) ||
      source.geography.length === 0 ||
      !hasText(source.context) ||
      !hasText(source.method) ||
      source.limitations.length === 0 ||
      !source.limitations.every(hasText) ||
      !hasText(source.fundingDisclosure) ||
      !isIsoDate(source.reviewedOn) ||
      !isIsoDate(source.reviewBy) ||
      source.reviewBy <= source.reviewedOn ||
      (source.sampleSize !== null && (!Number.isInteger(source.sampleSize) || source.sampleSize <= 0))
    ) {
      add("source-invalid", source.id, "Source metadata, scope, limitations or review lifecycle is incomplete.");
    }
  }

  for (const claim of library.claims) {
    const sources = claim.sourceIds
      .map((sourceId) => sourceById.get(sourceId))
      .filter((source): source is StayOptiDecisionScienceSourceV3 => source !== undefined);

    if (claim.sourceIds.length === 0 || sources.length !== claim.sourceIds.length) {
      add("claim-source-missing", claim.id, "Claim must resolve every source ID in the registry.");
    }
    if (
      !hasText(claim.scope.population) ||
      claim.scope.geographies.length === 0 ||
      claim.scope.tripContexts.length === 0 ||
      !isIsoDate(claim.validFrom) ||
      !isIsoDate(claim.reviewBy) ||
      claim.reviewBy <= claim.validFrom
    ) {
      add("claim-scope-incomplete", claim.id, "Claim population, geography, context and validity window are required.");
    }
    if (
      (sources.length > 0 && sources.every((source) =>
        source.sourceType === "industry-survey" || source.sourceType === "institutional-report"
      ) && STRENGTH_RANK[claim.strength] > STRENGTH_RANK.exploratory) ||
      claim.status !== "candidate-research-only"
    ) {
      add("claim-strength-invalid", claim.id, "Non-peer evidence remains exploratory and every claim remains research-only.");
    }
    if (claim.limits.length === 0 || !claim.limits.every(hasText) || claim.biases.length === 0) {
      add("claim-limits-missing", claim.id, "Claim requires explicit limits and bias axes.");
    }
    if (claim.dimensions.length === 0 || !claim.dimensions.includes(claim.domain)) {
      add("claim-dimension-missing", claim.id, "Claim must map to its primary StayOpti dimension.");
    }
    if (claim.nonApplicableWhen.length === 0 || !claim.nonApplicableWhen.every(hasText)) {
      add("claim-non-applicability-missing", claim.id, "Claim requires explicit non-applicability conditions.");
    }
    if (claim.testIds.length === 0) {
      add("claim-test-missing", claim.id, "Claim requires at least one linked test.");
    }
    if (claim.directPolicyUseAllowed !== false || claim.directWeightAssignmentAllowed !== false) {
      add("policy-firewall-open", claim.id, "Claim cannot authorize direct policy or weight changes.");
    }

    for (const testId of claim.testIds) {
      const mapping = testById.get(testId);
      if (!mapping || !mapping.claimIds.includes(claim.id)) {
        add("test-link-invalid", claim.id, `Claim/test link is not reciprocal: ${testId}.`);
      }
    }
  }

  for (const mapping of library.testMappings) {
    if (
      mapping.claimIds.length === 0 ||
      mapping.dimensions.length === 0 ||
      !hasText(mapping.assertion) ||
      mapping.claimIds.some((claimId) => !claimById.has(claimId))
    ) {
      add("test-link-invalid", mapping.id, "Test mapping must resolve claims, dimensions and an assertion.");
    }
    for (const claimId of mapping.claimIds) {
      if (!claimById.get(claimId)?.testIds.includes(mapping.id)) {
        add("test-link-invalid", mapping.id, `Test/claim link is not reciprocal: ${claimId}.`);
      }
    }
  }

  for (const control of library.biasControls) {
    if (
      !hasText(control.risk) ||
      !hasText(control.mitigation) ||
      !hasText(control.requiredReview) ||
      control.linkedClaimIds.length === 0 ||
      control.linkedClaimIds.some((claimId) => !claimById.has(claimId))
    ) {
      add("test-link-invalid", control.id, "Bias control must be actionable and linked to registered claims.");
    }
  }

  if (
    library.counts.sources !== library.sources.length ||
    library.counts.claims !== library.claims.length ||
    library.counts.testMappings !== library.testMappings.length ||
    library.counts.biasControls !== library.biasControls.length ||
    library.counts.domains !== new Set(library.claims.map((claim) => claim.domain)).size
  ) {
    add("schema-invalid", "library-counts", "Derived counts do not match library contents.");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function assertDecisionScienceLibraryV3(
  library: StayOptiDecisionScienceLibraryV3
): void {
  const validation = validateDecisionScienceLibraryV3(library);
  if (!validation.valid) {
    throw new Error(
      `StayOpti Decision Science Library V3 invalid: ${validation.violations
        .map((violation) => `${violation.code}:${violation.entityId}`)
        .join(", ")}`
    );
  }
}

export const STAYOPTI_DECISION_SCIENCE_LIBRARY_AUDIT_V3 = Object.freeze({
  application: "offline-research-only" as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitEnabled: false as const,
  rankingWeightsChanged: false as const,
  thresholdsChanged: false as const,
  offerSelectionChanged: false as const,
  directPolicyAdoptionAllowed: false as const,
  directWeightAssignmentAllowed: false as const,
  providerCallsAllowed: false as const,
  bookingOrPaymentChanged: false as const,
  analyticsChanged: false as const,
});
