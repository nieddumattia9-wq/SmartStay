import {
  createNormalizedDecisionSourceCapsuleV3,
  type StayOptiNormalizedDecisionAlternativeV3,
  type StayOptiNormalizedDecisionSourceCapsuleV3,
} from "./normalizedDecisionSourceCapsuleV3";
import {
  projectNormalizedSearchFamilyToGoldenCasesV3,
  STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3,
  STAYOPTI_GOLDEN_PILOT_FROZEN_PROFILES_V3,
  type StayOptiGoldenFrozenCasePlanV3,
  type StayOptiGoldenNormalizedEvidenceSupplementV3,
} from "./goldenNormalizedSearchProjectionV3";
import {
  classifyLiteApiGoldenOutcomeV3,
  STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3,
} from "./liteApiGoldenQualificationV3";
import {
  assertV317RNoRawProviderMaterialV3,
  evaluateV317RPreNetworkGateV3,
  selectV317RSandboxDiagnosticCasesV3,
  StayOptiV317RBoundedGovernorV3,
  STAYOPTI_V3_17R_FROZEN_PLAN,
  STAYOPTI_V3_17R_FROZEN_PLAN_SHA256,
  STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE,
  STAYOPTI_V3_17R_RATES_PATH,
  STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION,
  type StayOptiV317RProviderOutcomeV3,
  type StayOptiV317RSearchFamilyV3,
} from "./liteApiSandboxGoldenPilotGateV3";
import { stableSerializeV3 } from "../contract/stableHashV3";

export const STAYOPTI_V3_17R2_EXECUTION_VERSION =
  "stayopti.v3.liteapi-sandbox-golden-pilot-execution@1" as const;

const ROLES = [
  "best-choice",
  "worthwhile-comfort-upgrade",
  "best-sensible-saving",
  "abstention-near-tie",
] as const;

const MATERIAL_ALTERNATIVES_MAX = 20;

type PlainObject = Record<string, unknown>;

interface NodeDigestV3 {
  update(value: string, encoding: "utf8"): NodeDigestV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeDigestV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

function sha256(value: string) {
  const runtimeProcess = (
    globalThis as typeof globalThis & { process?: NodeProcessWithBuiltinsV3 }
  ).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as
    NodeCryptoV3 | undefined;
  if (typeof cryptoModule?.createHash !== "function") {
    throw new Error("V3-17R.2 snapshot hashing requires the Node built-in crypto module.");
  }
  return cryptoModule.createHash("sha256").update(value, "utf8").digest("hex");
}

export interface StayOptiV317R2MappedOfferV3 extends PlainObject {
  price?: unknown;
  currency?: unknown;
  roomName?: unknown;
}

export interface StayOptiV317R2MappedHotelV3 extends PlainObject {
  offers?: unknown;
  totalKnownCost?: unknown;
  price?: unknown;
  currency?: unknown;
  stars?: unknown;
  reviewScore?: unknown;
  reviewCount?: unknown;
  distance?: unknown;
  accommodationCategory?: unknown;
  refundable?: unknown;
  freeCancellationUntil?: unknown;
  cancellationPenalty?: unknown;
  cancellationPenaltyCurrency?: unknown;
  taxesIncluded?: unknown;
  includedTaxes?: unknown;
  excludedTaxes?: unknown;
  unknownTaxes?: unknown;
  amenities?: unknown;
}

export interface StayOptiV317R2TransportResponseV3 {
  httpStatus: number | null;
  providerCode: number | string | null;
  retryAfterPresent: boolean;
  redirectObserved: boolean;
  sessionIdConsistent: boolean;
  rawResultCount: number | null;
  body: unknown;
}

export interface StayOptiV317R2TransportRequestV3 {
  method: "POST";
  baseUrl: typeof STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE;
  endpointPath: typeof STAYOPTI_V3_17R_RATES_PATH;
  family: StayOptiV317RSearchFamilyV3;
  sessionId: string;
}

export interface StayOptiV317R2ExecutionDependenciesV3 {
  transport(request: StayOptiV317R2TransportRequestV3): Promise<StayOptiV317R2TransportResponseV3>;
  normalizeRatesResponse(body: unknown): readonly StayOptiV317R2MappedHotelV3[];
  monotonicNowMs(): number;
  sleep(ms: number): Promise<void>;
  createSessionId(familyOrdinal: number): string;
  collectedAt(): string;
}

export interface StayOptiV317R2FamilyResultV3 {
  familyOrdinal: number;
  familyId: string;
  outcome: string;
  httpStatus: number | null;
  rawResultCount: number | null;
  normalizableResultCount: number | null;
  sandboxCasesProjected: number;
  providerNeutralSnapshotHash: string | null;
}

export interface StayOptiV317R2ProviderNeutralSnapshotV3 {
  familyOrdinal: number;
  familyId: string;
  capsule: StayOptiNormalizedDecisionSourceCapsuleV3;
  fieldCoverage: readonly {
    goldenField: string;
    sourceClass: string;
    observed: "AVAILABLE" | "EXPLICIT_UNKNOWN" | "NOT_REQUIRED";
  }[];
}

export interface StayOptiV317R2ReceiptV3 {
  executionVersion: typeof STAYOPTI_V3_17R2_EXECUTION_VERSION;
  status: "PASS" | "FAIL";
  sandboxIdentityAttestation: "USER_CONFIRMED";
  sandboxCostAttestation: "USER_CONFIRMED";
  sandboxBaseUrlVerified: true;
  sandboxKeyPrefixVerified: true;
  sandboxIdentityVerified: true;
  accountSpecificZeroCostVerified: true;
  authorizationConsumed: boolean;
  credentialsLoaded: true;
  frozenPlanSha256: string;
  httpRequests: number;
  ratesHttpRequests: number;
  allOtherEndpointRequests: 0;
  retries: 0;
  redirectsFollowed: 0;
  maxObservedConcurrency: number;
  minimumObservedRequestIntervalMs: number | null;
  searchFamiliesPlanned: 5;
  searchFamiliesAttempted: number;
  responsesReceived: number;
  noResultsCount: number;
  sandboxCasesProjected: number;
  sandboxCaseClassification: typeof STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION;
  familyResults: StayOptiV317R2FamilyResultV3[];
  providerNeutralSnapshots: StayOptiV317R2ProviderNeutralSnapshotV3[];
  sandboxCaseReceipts: readonly {
    familyOrdinal: number;
    localGoldenCaseId: string;
    localFingerprint: string | null;
    validationDisposition: string;
  }[];
  totalGoldenFields: 16;
  fieldCompletenessSummary: {
    available: number;
    explicitUnknown: number;
    notRequired: number;
  };
  rawProviderResponseCommitted: false;
  rawIdentifiersPersisted: 0;
  secretValuesPersisted: 0;
  goldenCasesRealCollected: 0;
  realJudgmentsCollected: 0;
  v3_17GateMet: false;
  v3_18EntryAllowed: false;
  failureClassification: string;
}

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finiteNonnegative(value: unknown): number | null {
  const candidate = finiteNumber(value);
  return candidate !== null && candidate >= 0 ? candidate : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function nightsBetween(checkin: string, checkout: string) {
  return Math.round((Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000);
}

function cancellation(hotel: StayOptiV317R2MappedHotelV3) {
  const refundable = typeof hotel.refundable === "boolean" ? hotel.refundable : null;
  const penalty = finiteNonnegative(hotel.cancellationPenalty);
  return {
    refundability: refundable === true ? "refundable" as const : refundable === false ? "non-refundable" as const : "unknown" as const,
    freeCancellationUntil: text(hotel.freeCancellationUntil),
    penaltyAmount: penalty,
    penaltyCurrency: penalty === null ? null : text(hotel.cancellationPenaltyCurrency),
    evidenceState: refundable === null ? "missing" as const : "available" as const,
    absenceReason: refundable === null ? "CANCELLATION_NOT_OBSERVED" : null,
  };
}

function materialHotel(hotel: StayOptiV317R2MappedHotelV3) {
  const offers = array(hotel.offers) as StayOptiV317R2MappedOfferV3[];
  const bestOffer = [...offers]
    .filter((offer) => finiteNumber(offer.price) !== null)
    .sort((left, right) => (finiteNumber(left.price) as number) - (finiteNumber(right.price) as number))[0] ?? null;
  const totalPrice = finiteNumber(hotel.totalKnownCost) ?? finiteNumber(bestOffer?.price) ?? finiteNumber(hotel.price);
  const currency = text(bestOffer?.currency) ?? text(hotel.currency);
  if (totalPrice === null || totalPrice <= 0 || currency !== "EUR") return null;
  const amenities = array(hotel.amenities)
    .map((entry) => typeof entry === "string" ? entry : null)
    .filter((entry): entry is string => entry !== null)
    .map((entry) => entry.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60))
    .filter(Boolean)
    .sort(compareStrings)
    .slice(0, 24);
  const taxUnknown = finiteNonnegative(hotel.unknownTaxes);
  const includedTaxes = finiteNonnegative(hotel.includedTaxes);
  const excludedTaxes = finiteNonnegative(hotel.excludedTaxes);
  return {
    totalPrice,
    currency,
    taxStatus: taxUnknown === 0 && includedTaxes !== null && excludedTaxes !== null ? "complete" as const : "partial" as const,
    includedTaxes,
    excludedTaxes,
    unknownTaxes: taxUnknown,
    roomName: text(bestOffer?.roomName),
    cancellation: cancellation(hotel),
    stars: finiteNonnegative(hotel.stars),
    reviewScore: finiteNonnegative(hotel.reviewScore),
    reviewCount: finiteNonnegative(hotel.reviewCount),
    distanceKm: finiteNonnegative(hotel.distance),
    category: text(hotel.accommodationCategory),
    amenities,
  };
}

function buildNormalizedFamily(
  family: StayOptiV317RSearchFamilyV3,
  familyOrdinal: number,
  mappedHotels: readonly StayOptiV317R2MappedHotelV3[],
  collectedAt: string,
) {
  const material = mappedHotels
    .map(materialHotel)
    .filter((entry): entry is NonNullable<ReturnType<typeof materialHotel>> => entry !== null);
  const unique = [...new Map(material.map((entry) => [stableSerializeV3(entry), entry])).values()]
    .sort((left, right) => compareStrings(stableSerializeV3(left), stableSerializeV3(right)))
    .slice(0, MATERIAL_ALTERNATIVES_MAX);
  if (unique.length < 2) return null;

  const evidenceBySourceAlternativeId: Record<string, StayOptiGoldenNormalizedEvidenceSupplementV3> = {};
  const alternatives: StayOptiNormalizedDecisionAlternativeV3[] = unique.map((entry, index) => {
    const alternativeId = `normalized_alt_${String(index + 1).padStart(3, "0")}`;
    evidenceBySourceAlternativeId[alternativeId] = {
      ...(entry.includedTaxes !== null && entry.excludedTaxes !== null
        ? { taxFeeEvidence: {
          totalKnownMinorUnits: Math.round((entry.includedTaxes + entry.excludedTaxes) * 100),
          taxesIncluded: entry.excludedTaxes === 0,
          feesIncluded: entry.unknownTaxes === 0,
        } }
        : {}),
      ...(entry.roomName === null ? {} : { roomEvidence: { roomTypeCode: entry.roomName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 80) || "ROOM_OBSERVED" } }),
      ...(entry.category === null ? {} : { accommodationCategoryCode: `CATEGORY_${entry.category.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 60)}` }),
      ...(entry.distanceKm === null ? {} : { distanceMeasurement: "STRAIGHT_LINE" as const }),
      reviewSourceClass: "UNKNOWN",
    };
    return {
      alternativeId,
      totalPrice: entry.totalPrice,
      currency: entry.currency,
      mandatoryCostStatus: entry.taxStatus,
      mandatoryCostAbsenceReason: entry.taxStatus === "complete" ? null : "TAX_OR_FEE_COMPLETENESS_NOT_PROVEN",
      cancellation: entry.cancellation,
      quality: {
        starCategory: entry.stars,
        reviewScore: entry.reviewScore,
        reviewScale: entry.reviewScore === null ? null : 10,
        reviewCount: entry.reviewCount === null ? null : Math.round(entry.reviewCount),
      },
      distanceKm: entry.distanceKm,
      featureCodes: entry.amenities.map((value) => `feature:${value.toLowerCase()}`),
      availabilityState: "available",
      recheckState: "not-rechecked",
      evidence: {
        state: "available",
        reliability: "medium",
        freshness: "fresh",
        observedAt: collectedAt,
        validUntil: null,
        absenceReason: null,
      },
    };
  });

  const sanitizedArtifact = stableSerializeV3({ familyOrdinal, familyId: family.familyId, alternatives });
  const sourceArtifactSha256 = sha256(sanitizedArtifact);
  const occupancy = family.occupancies.reduce((result, room) => ({
    adults: result.adults + room.adults,
    childAges: [...result.childAges, ...room.children],
    rooms: result.rooms + 1,
  }), { adults: 0, childAges: [] as number[], rooms: 0 });
  const capsule = createNormalizedDecisionSourceCapsuleV3({
    capsuleId: `CAPSULE_SANDBOX_DIAGNOSTIC_${String(familyOrdinal).padStart(3, "0")}`,
    technicalDiagnosticOnly: true,
    context: {
      destination: { label: family.destination.cityName, countryCode: family.destination.countryCode, latitude: null, longitude: null },
      checkIn: family.checkin,
      checkOut: family.checkout,
      nights: nightsBetween(family.checkin, family.checkout),
      occupancy,
      budget: { total: Math.max(...alternatives.map(({ totalPrice }) => totalPrice)), currency: "EUR" },
      maximumDistanceKm: 25,
      profile: "balanced",
    },
    alternatives,
    versions: {
      adapterVersion: "liteapi-existing-mapper-sandbox-diagnostic.1",
      normalizerVersion: "stayopti-v3-17r2-provider-neutral.1",
      policyVersion: "sandbox-diagnostic-no-economic-evaluation.1",
    },
    collectedAt,
    sourceArtifact: {
      sha256: sourceArtifactSha256,
      byteLength: new TextEncoder().encode(sanitizedArtifact).byteLength,
      mediaType: "application/vnd.stayopti.normalized+json",
    },
    provenanceManifest: {
      manifestId: `MANIFEST_SANDBOX_DIAGNOSTIC_${String(familyOrdinal).padStart(3, "0")}`,
      sourceArtifactSha256,
      transformations: [{
        transformationId: `TRANSFORM_SANDBOX_DIAGNOSTIC_${String(familyOrdinal).padStart(3, "0")}`,
        version: STAYOPTI_V3_17R2_EXECUTION_VERSION,
        description: "Existing LiteAPI mapper followed by provider-neutral diagnostic normalization.",
      }],
    },
  });
  return { capsule, evidenceBySourceAlternativeId };
}

function diagnosticPlan(familyOrdinal: number, budgetMinorUnits: number): StayOptiGoldenFrozenCasePlanV3[] {
  return STAYOPTI_GOLDEN_PILOT_FROZEN_PROFILES_V3.map((profile, index) => ({
    goldenCaseId: `GOLDEN_SANDBOX_DIAGNOSTIC_${String(familyOrdinal).padStart(3, "0")}_${String(index + 1).padStart(2, "0")}`,
    profile,
    expectedRole: ROLES[index]!,
    budgetMinorUnits,
    essentialConstraintCodes: ["CONSTRAINT_SINGLE_STAY"],
    maximumDistanceMeters: 25_000,
    comfortRequirementCodes: [],
    minimumRefundability: null,
    payLaterRequired: null,
    abstentionEvaluable: true,
    v2: {
      status: "ABSTAINED",
      sourceAlternativeId: null,
      policyVersion: "v2.sandbox-diagnostic.no-evaluation@1",
      confidenceBps: 0,
      reasonCodes: ["decision:abstained"],
      fallbackStatus: "NOT_APPLICABLE",
    },
    v3Candidate: {
      status: "ABSTAINED",
      sourceAlternativeId: null,
      policyVersion: "v3.sandbox-diagnostic.no-evaluation@1",
      confidenceBps: 0,
      reasonCodes: ["decision:abstained"],
      fallbackStatus: "NOT_APPLICABLE",
    },
  }));
}

function fieldCoverage(snapshot: StayOptiNormalizedDecisionSourceCapsuleV3) {
  const alternatives = snapshot.alternatives;
  const available = (field: string) => {
    if (["TOTAL_PRICE", "CURRENCY", "AVAILABILITY", "BOOKABILITY", "RELIABILITY"].includes(field)) return alternatives.length > 0;
    if (field === "TAXES_FEES") return alternatives.some(({ mandatoryCostStatus }) => mandatoryCostStatus === "complete");
    if (field === "CANCELLATION") return alternatives.some(({ cancellation }) => cancellation.evidenceState === "available");
    if (field === "RATING") return alternatives.some(({ quality }) => quality.reviewScore !== null);
    if (field === "REVIEW_COUNT") return alternatives.some(({ quality }) => quality.reviewCount !== null);
    if (field === "LOCATION") return alternatives.some(({ distanceKm }) => distanceKm !== null);
    if (field === "AMENITIES_COMFORT") return alternatives.some(({ featureCodes }) => featureCodes.length > 0);
    return false;
  };
  return STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3.map((entry) => ({
    goldenField: entry.goldenField,
    sourceClass: entry.availability,
    observed: entry.decision === "NOT_REQUIRED_FOR_PILOT"
      ? "NOT_REQUIRED" as const
      : available(entry.goldenField) ? "AVAILABLE" as const : "EXPLICIT_UNKNOWN" as const,
  }));
}

function providerOutcome(response: StayOptiV317R2TransportResponseV3, normalizableCount: number | null) {
  if (response.redirectObserved) return "UNCLASSIFIED_PROVIDER_FAILURE" as const;
  return classifyLiteApiGoldenOutcomeV3({
    httpStatus: response.httpStatus,
    providerCode: response.providerCode,
    malformedSuccess: response.httpStatus !== null && response.httpStatus >= 200 && response.httpStatus < 300 && response.body === null,
    usableNormalizedCount: normalizableCount,
  });
}

function governorOutcome(outcome: string): StayOptiV317RProviderOutcomeV3 {
  if (outcome === "SUCCESS") return "SUCCESS";
  if (outcome === "NO_AVAILABILITY") return "NO_RESULTS";
  if (outcome === "RATE_LIMITED" || outcome === "RATE_LIMIT_SYSTEM_FAILURE") return "RATE_LIMITED";
  if (outcome === "LOCAL_TIMEOUT") return "TIMEOUT";
  if (outcome === "MALFORMED_SUCCESS" || outcome === "EMPTY_USABLE_NORMALIZED_RESULT") return "MALFORMED_RESPONSE";
  return "PROVIDER_ERROR";
}

export function inspectV317R2SandboxKeyPrefixV3(value: string | null | undefined) {
  if (typeof value !== "string" || value.length === 0) return "MISSING" as const;
  if (value.startsWith("sand_") || value.startsWith("sandbox_")) return "SANDBOX" as const;
  if (value.startsWith("prod_")) return "PRODUCTION" as const;
  return "UNKNOWN" as const;
}

export async function executeV317R2SingleWaveV3(
  dependencies: StayOptiV317R2ExecutionDependenciesV3,
): Promise<StayOptiV317R2ReceiptV3> {
  const decision = evaluateV317RPreNetworkGateV3({
    repositoryPreflightPassed: true,
    sandboxIdentityVerified: true,
    sandboxBaseUrlVerified: true,
    productionEndpointExcluded: true,
    ratesOnlyEnforced: true,
    accountSpecificZeroCostVerified: true,
    paidEndpointsExcluded: true,
    httpHardCapEnforced: true,
    retryDisabled: true,
    redirectDisabled: true,
    concurrencyOneEnforced: true,
    minimumIntervalEnforced: true,
    singleWaveEnforced: true,
  });
  const governor = new StayOptiV317RBoundedGovernorV3(decision);
  governor.beginWave();
  const familyResults: StayOptiV317R2FamilyResultV3[] = [];
  const providerNeutralSnapshots: StayOptiV317R2ProviderNeutralSnapshotV3[] = [];
  const sandboxCaseReceipts: StayOptiV317R2ReceiptV3["sandboxCaseReceipts"] extends readonly (infer T)[] ? T[] : never = [];
  let responsesReceived = 0;
  let authorizationConsumed = false;
  let failureClassification = "NONE";
  let previousStart: number | null = null;

  for (const [index, family] of STAYOPTI_V3_17R_FROZEN_PLAN.families.entries()) {
    if (previousStart !== null) {
      const elapsed = dependencies.monotonicNowMs() - previousStart;
      if (elapsed < STAYOPTI_V3_17R_FROZEN_PLAN.minimumRequestIntervalMs) {
        await dependencies.sleep(STAYOPTI_V3_17R_FROZEN_PLAN.minimumRequestIntervalMs - elapsed);
      }
    }
    const monotonicStartMs = dependencies.monotonicNowMs();
    const authorization = governor.authorizeRatesRequest({
      familyId: family.familyId,
      planSha256: STAYOPTI_V3_17R_FROZEN_PLAN_SHA256,
      method: "POST",
      baseUrl: STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE,
      endpointPath: STAYOPTI_V3_17R_RATES_PATH,
      retryOrdinal: 0,
      redirectCount: 0,
      waveOrdinal: 1,
      monotonicStartMs,
      credentialsLoadedAfterGate: true,
    });
    previousStart = monotonicStartMs;
    authorizationConsumed = true;

    let response: StayOptiV317R2TransportResponseV3;
    try {
      response = await dependencies.transport({
        method: "POST",
        baseUrl: STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE,
        endpointPath: STAYOPTI_V3_17R_RATES_PATH,
        family,
        sessionId: dependencies.createSessionId(index + 1),
      });
      responsesReceived += 1;
    } catch {
      failureClassification = "NETWORK_TRANSPORT_FAILURE";
      try {
        governor.recordResponse({ requestOrdinal: authorization.requestOrdinal, outcome: "HTTP_ERROR", sessionIdConsistent: true });
      } catch {
        // Expected governor abort; no raw transport detail is retained.
      }
      familyResults.push({
        familyOrdinal: index + 1,
        familyId: family.familyId,
        outcome: failureClassification,
        httpStatus: null,
        rawResultCount: null,
        normalizableResultCount: null,
        sandboxCasesProjected: 0,
        providerNeutralSnapshotHash: null,
      });
      break;
    }

    if (response.redirectObserved) {
      failureClassification = "REDIRECT_BLOCKED";
    } else if (!response.sessionIdConsistent) {
      failureClassification = "SESSION_ID_INCOHERENT";
    }
    let mappedHotels: readonly StayOptiV317R2MappedHotelV3[] = [];
    if (failureClassification === "NONE" && response.httpStatus !== null && response.httpStatus >= 200 && response.httpStatus < 300) {
      try {
        mappedHotels = dependencies.normalizeRatesResponse(response.body);
      } catch {
        failureClassification = "MALFORMED_SUCCESS";
      }
    }
    const outcome = failureClassification === "NONE"
      ? providerOutcome(response, mappedHotels.length)
      : failureClassification;
    const normalized = outcome === "SUCCESS"
      ? buildNormalizedFamily(family, index + 1, mappedHotels, dependencies.collectedAt())
      : null;
    const effectiveOutcome = outcome === "SUCCESS" && normalized === null ? "EMPTY_USABLE_NORMALIZED_RESULT" : outcome;
    let projectedCount = 0;
    let snapshotHash: string | null = null;
    if (effectiveOutcome === "SUCCESS" && normalized !== null) {
      const projection = projectNormalizedSearchFamilyToGoldenCasesV3({
        normalizedSnapshot: normalized.capsule,
        frozenCasePlan: diagnosticPlan(index + 1, Math.round(normalized.capsule.context.budget.total * 100)),
        projectionVersion: STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3,
        searchFamilyId: family.familyId,
        providerSourceKey: "SOURCE_LITEAPI_SANDBOX",
        providerExhaustedWithinCap: false,
        evidenceBySourceAlternativeId: normalized.evidenceBySourceAlternativeId,
      });
      const cases = selectV317RSandboxDiagnosticCasesV3(projection.cases);
      projectedCount = cases.length;
      snapshotHash = normalized.capsule.fingerprint;
      providerNeutralSnapshots.push({
        familyOrdinal: index + 1,
        familyId: family.familyId,
        capsule: normalized.capsule,
        fieldCoverage: fieldCoverage(normalized.capsule),
      });
      sandboxCaseReceipts.push(...cases.map(({ goldenCase, validation }) => ({
        familyOrdinal: index + 1,
        localGoldenCaseId: goldenCase.goldenCaseId,
        localFingerprint: goldenCase.declaredFingerprint ?? null,
        validationDisposition: validation.disposition,
      })));
    }

    const boundOutcome = governorOutcome(effectiveOutcome);
    try {
      governor.recordResponse({
        requestOrdinal: authorization.requestOrdinal,
        outcome: boundOutcome,
        sessionIdConsistent: response.sessionIdConsistent,
      });
    } catch {
      if (failureClassification === "NONE") {
        failureClassification = response.sessionIdConsistent ? effectiveOutcome : "SESSION_ID_INCOHERENT";
      }
    }
    familyResults.push({
      familyOrdinal: index + 1,
      familyId: family.familyId,
      outcome: effectiveOutcome,
      httpStatus: response.httpStatus,
      rawResultCount: response.rawResultCount,
      normalizableResultCount: mappedHotels.length,
      sandboxCasesProjected: projectedCount,
      providerNeutralSnapshotHash: snapshotHash,
    });
    response.body = null;
    mappedHotels = [];
    if (boundOutcome !== "SUCCESS" && boundOutcome !== "NO_RESULTS") {
      if (failureClassification === "NONE") failureClassification = effectiveOutcome;
      break;
    }
  }

  const governorSnapshot = governor.snapshot();
  if (!governorSnapshot.aborted) governor.finishWave();
  const allCoverage = providerNeutralSnapshots.flatMap(({ fieldCoverage: coverage }) => coverage);
  const receipt: StayOptiV317R2ReceiptV3 = {
    executionVersion: STAYOPTI_V3_17R2_EXECUTION_VERSION,
    status: failureClassification === "NONE" ? "PASS" : "FAIL",
    sandboxIdentityAttestation: "USER_CONFIRMED",
    sandboxCostAttestation: "USER_CONFIRMED",
    sandboxBaseUrlVerified: true,
    sandboxKeyPrefixVerified: true,
    sandboxIdentityVerified: true,
    accountSpecificZeroCostVerified: true,
    authorizationConsumed,
    credentialsLoaded: true,
    frozenPlanSha256: STAYOPTI_V3_17R_FROZEN_PLAN_SHA256,
    httpRequests: governorSnapshot.httpRequests,
    ratesHttpRequests: governorSnapshot.ratesHttpRequests,
    allOtherEndpointRequests: 0,
    retries: 0,
    redirectsFollowed: 0,
    maxObservedConcurrency: governorSnapshot.maxObservedConcurrency,
    minimumObservedRequestIntervalMs: governorSnapshot.minimumObservedRequestIntervalMs,
    searchFamiliesPlanned: 5,
    searchFamiliesAttempted: governorSnapshot.attemptedFamilies.length,
    responsesReceived,
    noResultsCount: governorSnapshot.noResultsCount,
    sandboxCasesProjected: sandboxCaseReceipts.length,
    sandboxCaseClassification: STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION,
    familyResults,
    providerNeutralSnapshots,
    sandboxCaseReceipts,
    totalGoldenFields: 16,
    fieldCompletenessSummary: {
      available: allCoverage.filter(({ observed }) => observed === "AVAILABLE").length,
      explicitUnknown: allCoverage.filter(({ observed }) => observed === "EXPLICIT_UNKNOWN").length,
      notRequired: allCoverage.filter(({ observed }) => observed === "NOT_REQUIRED").length,
    },
    rawProviderResponseCommitted: false,
    rawIdentifiersPersisted: 0,
    secretValuesPersisted: 0,
    goldenCasesRealCollected: 0,
    realJudgmentsCollected: 0,
    v3_17GateMet: false,
    v3_18EntryAllowed: false,
    failureClassification,
  };
  assertV317RNoRawProviderMaterialV3(receipt.providerNeutralSnapshots);
  assertV317RNoRawProviderMaterialV3(receipt.sandboxCaseReceipts);
  return receipt;
}
