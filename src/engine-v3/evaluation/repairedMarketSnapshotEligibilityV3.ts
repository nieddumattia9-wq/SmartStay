import { stableSerializeV3 } from "../contract/stableHashV3";

import type {
  SerpApiObservedValueV3,
} from "./serpApiGoogleHotelsExternalAdapterV3";
import type {
  StayOptiSerpApiSanitizedAlternativeV3,
  StayOptiSerpApiSanitizedSnapshotV3,
} from "./serpApiGoogleHotelsPilotEvidenceV3";

export const STAYOPTI_REPAIRED_MARKET_SNAPSHOT_SCHEMA_VERSION_V3 =
  "stayopti.v3.repaired-market-provider-neutral-snapshot@1" as const;
export const STAYOPTI_REPAIRED_MARKET_ELIGIBILITY_VERSION_V3 =
  "stayopti.v3.repaired-market-eligibility@1" as const;
export const STAYOPTI_REPAIRED_MARKET_EVIDENCE_VERSION_V3 =
  "stayopti.v3.repaired-market-diagnostic-evidence@1" as const;

interface NodeHashV3 {
  update(value: string, encoding: "utf8"): NodeHashV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeHashV3;
}

function sha256TextV3(value: string) {
  const runtimeProcess = (globalThis as typeof globalThis & {
    process?: { getBuiltinModule?: (specifier: string) => unknown };
  }).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as NodeCryptoV3 | undefined;
  if (typeof cryptoModule?.createHash !== "function") throw new Error("T3_NODE_CRYPTO_REQUIRED");
  return cryptoModule.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256ObjectV3(value: unknown, namespace: string) {
  return sha256TextV3(`${namespace}\n${stableSerializeV3(value)}`);
}

export type StayOptiT3FeatureEligibilityV3 =
  | "COMPARABLE_ACROSS_SET"
  | "SINGLE_ITEM_DIAGNOSTIC_ONLY"
  | "AUDIT_ONLY"
  | "MISSING"
  | "UNKNOWN"
  | "EXCLUDED_FROM_DECISION";

export interface StayOptiT3FeatureEligibilityEntryV3 {
  readonly feature: string;
  readonly classification: StayOptiT3FeatureEligibilityV3;
  readonly decisionEligible: boolean;
  readonly rationale: string;
}

export interface StayOptiT3ObservedPriceV3 {
  readonly semantics: "OBSERVED_AGGREGATED_DISPLAY_PRICE";
  readonly currency: "EUR";
  readonly nightlyAmount: number | null;
  readonly totalStayAmount: number | null;
  readonly beforeTaxesAndFeesAmount: number | null;
  readonly exactBookable: false;
  readonly sellerSpecific: false;
  readonly verifiedCheckoutTotal: false;
}

export interface StayOptiT3ProviderNeutralAlternativeV3 {
  readonly blindLabel: string;
  readonly semanticFingerprint: string;
  readonly observedDisplayPrice: StayOptiT3ObservedPriceV3 | null;
  readonly reviewRating: number | null;
  readonly reviewCount: number | null;
  readonly hotelClass: number | null;
  readonly comparableAmenities: readonly string[] | null;
  readonly cancellationKnown: boolean;
  readonly freeCancellation: boolean | null;
  readonly coordinateEvidenceKnown: boolean;
  readonly missingness: readonly string[];
  readonly reliability: "PARTIAL_EXTERNAL_DISPLAY_EVIDENCE";
}

export interface StayOptiT3ProviderNeutralSnapshotV3 {
  readonly schemaVersion: typeof STAYOPTI_REPAIRED_MARKET_SNAPSHOT_SCHEMA_VERSION_V3;
  readonly sessionReference: string;
  readonly sealReference: string;
  readonly stayContext: {
    readonly checkIn: string;
    readonly checkOut: string;
    readonly durationNights: number;
    readonly adults: number;
    readonly children: number;
    readonly rooms: number;
    readonly currency: "EUR";
    readonly budgetMinorUnits: number;
    readonly preferenceProfile: string;
    readonly hardConstraints: readonly string[];
  };
  readonly choiceSetCompleteness: "UNKNOWN" | "PARTIAL_VISIBLE_SET" | "COMPLETE_VISIBLE_SET";
  readonly alternatives: readonly StayOptiT3ProviderNeutralAlternativeV3[];
  readonly diagnosticEnrichment: {
    readonly available: boolean;
    readonly enrichedAlternativeCount: number;
    readonly changedFeatures: readonly string[];
    readonly excludedFromDecision: true;
  };
  readonly observedPriceCount: number;
  readonly missingPriceCount: number;
  readonly snapshotFingerprint: string;
}

export interface StayOptiT3AuditOnlyEntryV3 {
  readonly blindLabel: string;
  readonly originalPosition: number;
  readonly sponsored: boolean | null;
  readonly opaqueSourceReferencePresent: boolean;
  readonly detailEnrichmentSelected: boolean;
}

export interface StayOptiT3AuditOnlyLedgerV3 {
  readonly ledgerVersion: "stayopti.v3.repaired-market-private-audit-ledger@1";
  readonly sealReference: string;
  readonly entries: readonly StayOptiT3AuditOnlyEntryV3[];
  readonly providerIdentityPrivate: true;
  readonly decisionUseProhibited: true;
  readonly ledgerFingerprint: string;
}

export interface StayOptiT3EligibilityDecisionV3 {
  readonly eligibilityVersion: typeof STAYOPTI_REPAIRED_MARKET_ELIGIBILITY_VERSION_V3;
  readonly snapshotEligibility: "DIAGNOSTIC_ONLY";
  readonly blindJudgmentEligibility: "NO";
  readonly goldenEligibility: "NO";
  readonly v3ReplayExecuted: false;
  readonly v3ReplayStatus: "NOT_ELIGIBLE";
  readonly reliabilityClassification: "PARTIAL_NON_BOOKABLE_EXTERNAL_DISPLAY_EVIDENCE";
  readonly reasons: readonly string[];
  readonly judgmentRecorded: false;
  readonly deblindExecuted: false;
  readonly automaticGoldenAdmission: false;
  readonly remainingStageAuthorized: false;
  readonly remainingStageStarted: false;
}

export interface StayOptiT3AssessmentV3 {
  readonly providerNeutralSnapshot: StayOptiT3ProviderNeutralSnapshotV3;
  readonly featureEligibilityMatrix: readonly StayOptiT3FeatureEligibilityEntryV3[];
  readonly missingnessSummary: {
    readonly alternativeCount: number;
    readonly observedPriceCount: number;
    readonly missingPriceCount: number;
    readonly missingFeatureCounts: Readonly<Record<string, number>>;
  };
  readonly privateAuditOnlyLedger: StayOptiT3AuditOnlyLedgerV3;
  readonly eligibilityDecision: StayOptiT3EligibilityDecisionV3;
  readonly comparableFeatureCount: number;
  readonly singleItemDiagnosticFeatureCount: number;
  readonly excludedDecisionFeatureCount: number;
}

interface MaterialAlternativeV3 {
  readonly sourceIndex: number;
  readonly source: StayOptiSerpApiSanitizedAlternativeV3;
  readonly semanticMaterial: Omit<StayOptiT3ProviderNeutralAlternativeV3, "blindLabel" | "semanticFingerprint">;
  readonly semanticFingerprint: string;
}

function observedNumber(value: SerpApiObservedValueV3<number>): number | null {
  return value.state === "OBSERVED" && Number.isFinite(value.value) ? value.value : null;
}

function knownNumber(value: StayOptiSerpApiSanitizedAlternativeV3["reviewRating"]): number | null {
  return value.state === "KNOWN" && Number.isFinite(value.value) ? value.value : null;
}

function knownBoolean(value: StayOptiSerpApiSanitizedAlternativeV3["freeCancellation"]): boolean | null {
  return value.state === "KNOWN" ? value.value : null;
}

function knownStrings(value: StayOptiSerpApiSanitizedAlternativeV3["amenities"]): readonly string[] | null {
  return value.state === "KNOWN" ? [...new Set(value.value)].sort() : null;
}

function observedPrice(alternative: StayOptiSerpApiSanitizedAlternativeV3): StayOptiT3ObservedPriceV3 | null {
  const nightlyAmount = observedNumber(alternative.nightlyPrice);
  const totalStayAmount = observedNumber(alternative.totalStayPrice);
  const beforeTaxesAndFeesAmount = observedNumber(alternative.beforeTaxesAndFees);
  if (nightlyAmount === null && totalStayAmount === null && beforeTaxesAndFeesAmount === null) return null;
  return {
    semantics: "OBSERVED_AGGREGATED_DISPLAY_PRICE",
    currency: "EUR",
    nightlyAmount,
    totalStayAmount,
    beforeTaxesAndFeesAmount,
    exactBookable: false,
    sellerSpecific: false,
    verifiedCheckoutTotal: false,
  };
}

function blindLabel(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

const DIFFERENTIABLE_FEATURES = [
  "hotelClass",
  "reviewRating",
  "reviewCount",
  "nightlyPrice",
  "totalStayPrice",
  "beforeTaxesAndFees",
  "freeCancellation",
  "amenities",
  "coordinates",
] as const;

function featureValue(alternative: StayOptiSerpApiSanitizedAlternativeV3, feature: typeof DIFFERENTIABLE_FEATURES[number]): unknown {
  if (feature === "coordinates") return alternative.coordinates;
  return alternative[feature];
}

function detailChangedFeatures(
  base: StayOptiSerpApiSanitizedSnapshotV3,
  repaired: StayOptiSerpApiSanitizedSnapshotV3,
) {
  const changed = new Set<string>();
  if (base.alternatives.length !== repaired.alternatives.length) throw new Error("T3_CHOICE_SET_CARDINALITY_CHANGED");
  for (let index = 0; index < base.alternatives.length; index += 1) {
    const before = base.alternatives[index];
    const after = repaired.alternatives[index];
    if (before === undefined || after === undefined) throw new Error("T3_CHOICE_SET_ALIGNMENT_FAILED");
    for (const feature of DIFFERENTIABLE_FEATURES) {
      if (stableSerializeV3(featureValue(before, feature)) !== stableSerializeV3(featureValue(after, feature))) changed.add(feature);
    }
  }
  return [...changed].sort();
}

function materialAlternative(alternative: StayOptiSerpApiSanitizedAlternativeV3, sourceIndex: number): MaterialAlternativeV3 {
  const price = observedPrice(alternative);
  const semanticMaterial = {
    observedDisplayPrice: price,
    reviewRating: knownNumber(alternative.reviewRating),
    reviewCount: knownNumber(alternative.reviewCount),
    hotelClass: knownNumber(alternative.hotelClass),
    comparableAmenities: knownStrings(alternative.amenities),
    cancellationKnown: alternative.freeCancellation.state === "KNOWN",
    freeCancellation: knownBoolean(alternative.freeCancellation),
    coordinateEvidenceKnown:
      alternative.coordinates.latitude.state === "OBSERVED" &&
      alternative.coordinates.longitude.state === "OBSERVED",
    missingness: [...new Set(alternative.missingness)].sort(),
    reliability: "PARTIAL_EXTERNAL_DISPLAY_EVIDENCE" as const,
  };
  return {
    sourceIndex,
    source: alternative,
    semanticMaterial,
    semanticFingerprint: sha256ObjectV3(semanticMaterial, "stayopti-v3-t3-alternative-semantic-material"),
  };
}

function featureMatrix(changedFeatures: readonly string[]): readonly StayOptiT3FeatureEligibilityEntryV3[] {
  const changed = new Set(changedFeatures);
  const rows: StayOptiT3FeatureEligibilityEntryV3[] = [
    { feature: "reviewRating", classification: changed.has("reviewRating") ? "SINGLE_ITEM_DIAGNOSTIC_ONLY" : "COMPARABLE_ACROSS_SET", decisionEligible: !changed.has("reviewRating"), rationale: changed.has("reviewRating") ? "DETAIL_ENRICHMENT_ASYMMETRY" : "SOURCE_WIDE_NORMALIZED_EVIDENCE" },
    { feature: "reviewCount", classification: changed.has("reviewCount") ? "SINGLE_ITEM_DIAGNOSTIC_ONLY" : "COMPARABLE_ACROSS_SET", decisionEligible: !changed.has("reviewCount"), rationale: changed.has("reviewCount") ? "DETAIL_ENRICHMENT_ASYMMETRY" : "SOURCE_WIDE_NORMALIZED_EVIDENCE" },
    { feature: "hotelClass", classification: changed.has("hotelClass") ? "SINGLE_ITEM_DIAGNOSTIC_ONLY" : "COMPARABLE_ACROSS_SET", decisionEligible: !changed.has("hotelClass"), rationale: changed.has("hotelClass") ? "DETAIL_ENRICHMENT_ASYMMETRY" : "SOURCE_WIDE_NORMALIZED_EVIDENCE" },
    { feature: "amenities", classification: changed.has("amenities") ? "SINGLE_ITEM_DIAGNOSTIC_ONLY" : "COMPARABLE_ACROSS_SET", decisionEligible: !changed.has("amenities"), rationale: changed.has("amenities") ? "DETAIL_ENRICHMENT_ASYMMETRY" : "SOURCE_WIDE_NORMALIZED_EVIDENCE" },
    { feature: "freeCancellation", classification: changed.has("freeCancellation") ? "SINGLE_ITEM_DIAGNOSTIC_ONLY" : "UNKNOWN", decisionEligible: false, rationale: changed.has("freeCancellation") ? "DETAIL_ENRICHMENT_ASYMMETRY" : "INCOMPLETE_CANCELLATION_COVERAGE" },
    {
      feature: "observedDisplayPrice",
      classification: ["nightlyPrice", "totalStayPrice", "beforeTaxesAndFees"].some((feature) => changed.has(feature))
        ? "SINGLE_ITEM_DIAGNOSTIC_ONLY"
        : "EXCLUDED_FROM_DECISION",
      decisionEligible: false,
      rationale: ["nightlyPrice", "totalStayPrice", "beforeTaxesAndFees"].some((feature) => changed.has(feature))
        ? "DETAIL_ENRICHMENT_ASYMMETRY_AND_NON_BOOKABLE_PRICE"
        : "NON_BOOKABLE_AGGREGATED_PRICE_WITH_INCOMPLETE_COVERAGE",
    },
    { feature: "coordinates", classification: changed.has("coordinates") ? "SINGLE_ITEM_DIAGNOSTIC_ONLY" : "EXCLUDED_FROM_DECISION", decisionEligible: false, rationale: changed.has("coordinates") ? "DETAIL_ENRICHMENT_ASYMMETRY" : "NO_USER_LOCATION_REFERENCE_FOR_CANONICAL_DISTANCE" },
    { feature: "originalPosition", classification: "AUDIT_ONLY", decisionEligible: false, rationale: "POSITION_BIAS_NOT_DECISION_MERIT" },
    { feature: "sponsoredStatus", classification: "AUDIT_ONLY", decisionEligible: false, rationale: "ADVERTISING_BIAS_NOT_DECISION_MERIT" },
    { feature: "opaqueSourceIdentity", classification: "AUDIT_ONLY", decisionEligible: false, rationale: "PROVENANCE_ONLY" },
    { feature: "detailSelection", classification: "AUDIT_ONLY", decisionEligible: false, rationale: "ENRICHMENT_SELECTION_BIAS" },
    { feature: "parserRoute", classification: "AUDIT_ONLY", decisionEligible: false, rationale: "TECHNICAL_PROVENANCE_ONLY" },
  ];
  return Object.freeze(rows.sort((left, right) => left.feature.localeCompare(right.feature)));
}

function assertAssessmentInput(input: {
  baseSnapshot: StayOptiSerpApiSanitizedSnapshotV3;
  repairedSnapshot: StayOptiSerpApiSanitizedSnapshotV3;
  sealSha256: string;
}) {
  if (!/^[0-9a-f]{64}$/.test(input.sealSha256)) throw new Error("T3_SEAL_SHA256_INVALID");
  if (input.baseSnapshot.sessionId !== input.repairedSnapshot.sessionId) throw new Error("T3_SESSION_MISMATCH");
  if (input.baseSnapshot.manifestHash !== input.repairedSnapshot.manifestHash) throw new Error("T3_MANIFEST_MISMATCH");
  if (input.repairedSnapshot.alternatives.length === 0) throw new Error("T3_CHOICE_SET_EMPTY");
  if (input.repairedSnapshot.alternatives.filter((entry) => entry.detailEnrichmentStatus === "MERGED").length > 1) {
    throw new Error("T3_DETAIL_ENRICHMENT_CARDINALITY_INVALID");
  }
}

export function createRepairedMarketSnapshotAssessmentV3(input: {
  readonly baseSnapshot: StayOptiSerpApiSanitizedSnapshotV3;
  readonly repairedSnapshot: StayOptiSerpApiSanitizedSnapshotV3;
  readonly sealSha256: string;
}): StayOptiT3AssessmentV3 {
  assertAssessmentInput(input);
  const changedFeatures = detailChangedFeatures(input.baseSnapshot, input.repairedSnapshot);
  const material = input.baseSnapshot.alternatives
    .map(materialAlternative)
    .sort((left, right) => left.semanticFingerprint.localeCompare(right.semanticFingerprint) || stableSerializeV3(left.semanticMaterial).localeCompare(stableSerializeV3(right.semanticMaterial)));
  const alternatives = material.map((entry, index): StayOptiT3ProviderNeutralAlternativeV3 => ({
    blindLabel: blindLabel(index),
    semanticFingerprint: entry.semanticFingerprint,
    ...entry.semanticMaterial,
  }));
  const sessionReference = `SESSION_${sha256ObjectV3({
    checkIn: input.baseSnapshot.checkIn,
    checkOut: input.baseSnapshot.checkOut,
    adults: input.baseSnapshot.adults,
    children: input.baseSnapshot.children,
    rooms: input.baseSnapshot.rooms,
    alternatives: alternatives.map((entry) => entry.semanticFingerprint),
  }, "stayopti-v3-t3-session-reference").slice(0, 24).toUpperCase()}`;
  const observedPriceCount = alternatives.filter((entry) => entry.observedDisplayPrice !== null).length;
  const body: Omit<StayOptiT3ProviderNeutralSnapshotV3, "snapshotFingerprint"> = {
    schemaVersion: STAYOPTI_REPAIRED_MARKET_SNAPSHOT_SCHEMA_VERSION_V3,
    sessionReference,
    sealReference: input.sealSha256,
    stayContext: {
      checkIn: input.baseSnapshot.checkIn,
      checkOut: input.baseSnapshot.checkOut,
      durationNights: input.baseSnapshot.durationNights,
      adults: input.baseSnapshot.adults,
      children: input.baseSnapshot.children,
      rooms: input.baseSnapshot.rooms,
      currency: input.baseSnapshot.currency,
      budgetMinorUnits: input.baseSnapshot.budgetMinorUnits,
      preferenceProfile: input.baseSnapshot.preferenceProfile,
      hardConstraints: [...input.baseSnapshot.hardConstraints].sort(),
    },
    choiceSetCompleteness: input.baseSnapshot.choiceSetCompleteness,
    alternatives,
    diagnosticEnrichment: {
      available: input.repairedSnapshot.alternatives.some((entry) => entry.detailEnrichmentStatus === "MERGED"),
      enrichedAlternativeCount: input.repairedSnapshot.alternatives.filter((entry) => entry.detailEnrichmentStatus === "MERGED").length,
      changedFeatures,
      excludedFromDecision: true,
    },
    observedPriceCount,
    missingPriceCount: alternatives.length - observedPriceCount,
  };
  const providerNeutralSnapshot = Object.freeze({
    ...body,
    snapshotFingerprint: sha256ObjectV3({
      schemaVersion: body.schemaVersion,
      sessionReference: body.sessionReference,
      sealReference: body.sealReference,
      stayContext: body.stayContext,
      choiceSetCompleteness: body.choiceSetCompleteness,
      alternatives: body.alternatives,
      observedPriceCount: body.observedPriceCount,
      missingPriceCount: body.missingPriceCount,
    }, "stayopti-v3-t3-provider-neutral-decision-snapshot"),
  });
  const labelBySourceIndex = new Map(material.map((entry, index) => [entry.sourceIndex, blindLabel(index)]));
  const auditEntries = input.repairedSnapshot.alternatives.map((entry, index): StayOptiT3AuditOnlyEntryV3 => ({
    blindLabel: labelBySourceIndex.get(index) ?? "INVALID",
    originalPosition: entry.displayedRank,
    sponsored: entry.sponsored.state === "KNOWN" ? entry.sponsored.value : null,
    opaqueSourceReferencePresent: typeof entry.anonymousPropertyId === "string" && entry.anonymousPropertyId.length > 0,
    detailEnrichmentSelected: entry.detailEnrichmentStatus === "MERGED",
  })).sort((left, right) => left.blindLabel.localeCompare(right.blindLabel));
  const ledgerBody = {
    ledgerVersion: "stayopti.v3.repaired-market-private-audit-ledger@1" as const,
    sealReference: input.sealSha256,
    entries: auditEntries,
    providerIdentityPrivate: true as const,
    decisionUseProhibited: true as const,
  };
  const privateAuditOnlyLedger: StayOptiT3AuditOnlyLedgerV3 = Object.freeze({
    ...ledgerBody,
    ledgerFingerprint: sha256ObjectV3(ledgerBody, "stayopti-v3-t3-private-audit-ledger"),
  });
  const matrix = featureMatrix(changedFeatures);
  const missingFeatureCounts: Record<string, number> = {};
  for (const alternative of input.baseSnapshot.alternatives) {
    for (const missing of new Set(alternative.missingness)) missingFeatureCounts[missing] = (missingFeatureCounts[missing] ?? 0) + 1;
  }
  const eligibilityDecision: StayOptiT3EligibilityDecisionV3 = Object.freeze({
    eligibilityVersion: STAYOPTI_REPAIRED_MARKET_ELIGIBILITY_VERSION_V3,
    snapshotEligibility: "DIAGNOSTIC_ONLY",
    blindJudgmentEligibility: "NO",
    goldenEligibility: "NO",
    v3ReplayExecuted: false,
    v3ReplayStatus: "NOT_ELIGIBLE",
    reliabilityClassification: "PARTIAL_NON_BOOKABLE_EXTERNAL_DISPLAY_EVIDENCE",
    reasons: Object.freeze([
      "AGGREGATED_DISPLAY_PRICE_IS_NOT_VERIFIED_CHECKOUT_TOTAL",
      "CHOICE_SET_PRICE_COVERAGE_INCOMPLETE",
      "DETAIL_ENRICHMENT_ASYMMETRIC",
      "EXACT_BOOKABILITY_UNPROVEN",
      "TAX_AND_FEE_COMPLETENESS_UNPROVEN",
    ]),
    judgmentRecorded: false,
    deblindExecuted: false,
    automaticGoldenAdmission: false,
    remainingStageAuthorized: false,
    remainingStageStarted: false,
  });
  return Object.freeze({
    providerNeutralSnapshot,
    featureEligibilityMatrix: matrix,
    missingnessSummary: Object.freeze({
      alternativeCount: alternatives.length,
      observedPriceCount,
      missingPriceCount: alternatives.length - observedPriceCount,
      missingFeatureCounts: Object.freeze(Object.fromEntries(Object.entries(missingFeatureCounts).sort(([left], [right]) => left.localeCompare(right)))),
    }),
    privateAuditOnlyLedger,
    eligibilityDecision,
    comparableFeatureCount: matrix.filter((entry) => entry.classification === "COMPARABLE_ACROSS_SET").length,
    singleItemDiagnosticFeatureCount: matrix.filter((entry) => entry.classification === "SINGLE_ITEM_DIAGNOSTIC_ONLY").length,
    excludedDecisionFeatureCount: matrix.filter((entry) => !entry.decisionEligible).length,
  });
}

export interface StayOptiT3EvidenceEntryV3 {
  readonly name: string;
  readonly content: string;
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function createRepairedMarketDiagnosticEvidenceEntriesV3(
  assessment: StayOptiT3AssessmentV3,
  integrity: {
    readonly t2eSealIntegrity: "PASS";
    readonly t2eInternalChecksums: "PASS_14_OF_14";
    readonly rawAuthenticity: "PASS";
    readonly rawFileCount: 2;
    readonly rawFilesModified: false;
    readonly plaintextRawAtRest: false;
    readonly networkCalls: 0;
    readonly credentialsLoaded: false;
  },
): readonly StayOptiT3EvidenceEntryV3[] {
  const entries = [
    { name: "source-integrity-receipt.json", content: json({
      sourceSealSha256: assessment.providerNeutralSnapshot.sealReference,
      ...integrity,
    }) },
    { name: "provider-neutral-snapshot.json", content: json(assessment.providerNeutralSnapshot) },
    { name: "feature-eligibility-matrix.json", content: json(assessment.featureEligibilityMatrix) },
    { name: "missingness-summary.json", content: json(assessment.missingnessSummary) },
    { name: "eligibility-decision.json", content: json(assessment.eligibilityDecision) },
  ];
  const manifestBody = {
    evidenceVersion: STAYOPTI_REPAIRED_MARKET_EVIDENCE_VERSION_V3,
    artifactNames: entries.map((entry) => entry.name).sort(),
    sharedEvidenceExcludesPrivateAuditLedger: true,
    rawIncluded: false,
    secretsIncluded: false,
    sourceIdentityIncluded: false,
    judgmentRecorded: false,
    deblindExecuted: false,
  };
  entries.push({ name: "integrity-manifest.json", content: json(manifestBody) });
  const checksums = entries
    .map((entry) => `${sha256TextV3(entry.content)}  ${entry.name}`)
    .sort()
    .join("\n") + "\n";
  return Object.freeze([...entries, { name: "checksums.sha256", content: checksums }]);
}

export function validateRepairedMarketDiagnosticEvidenceEntriesV3(entries: readonly StayOptiT3EvidenceEntryV3[]) {
  const issues: string[] = [];
  const expected = [
    "checksums.sha256",
    "eligibility-decision.json",
    "feature-eligibility-matrix.json",
    "integrity-manifest.json",
    "missingness-summary.json",
    "provider-neutral-snapshot.json",
    "source-integrity-receipt.json",
  ];
  const names = entries.map((entry) => entry.name).sort();
  if (stableSerializeV3(names) !== stableSerializeV3(expected)) issues.push("T3_EVIDENCE_ARTIFACT_SET_INVALID");
  if (new Set(names).size !== names.length) issues.push("T3_EVIDENCE_DUPLICATE_ARTIFACT");
  const map = new Map(entries.map((entry) => [entry.name, entry.content]));
  const checksumLines = (map.get("checksums.sha256") ?? "").split(/\r?\n/).filter(Boolean);
  const checked = new Set<string>();
  for (const line of checksumLines) {
    const match = /^([0-9a-f]{64})  ([a-z0-9-]+\.json)$/.exec(line);
    if (match === null) { issues.push("T3_EVIDENCE_CHECKSUM_LINE_INVALID"); continue; }
    const [, expectedHash, name] = match;
    const content = map.get(name!);
    if (content === undefined || sha256TextV3(content) !== expectedHash) issues.push(`T3_EVIDENCE_CHECKSUM_MISMATCH:${name}`);
    checked.add(name!);
  }
  if (checked.size !== expected.length - 1) issues.push("T3_EVIDENCE_CHECKSUM_COUNT_INVALID");
  for (const entry of entries.filter((candidate) => candidate.name.endsWith(".json"))) {
    try {
      const parsed = JSON.parse(entry.content) as unknown;
      const serialized = stableSerializeV3(parsed);
      if (/(?:SERPAPI|GOOGLE_HOTELS|property[_-]?token|api[_-]?key|https?:\/\/|rawPayload|rawResponse|providerId|hotelId|offerId)/i.test(serialized)) {
        issues.push(`T3_EVIDENCE_FORBIDDEN_VALUE:${entry.name}`);
      }
    } catch { issues.push(`T3_EVIDENCE_JSON_INVALID:${entry.name}`); }
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze([...new Set(issues)].sort()), checksumCount: checked.size });
}
