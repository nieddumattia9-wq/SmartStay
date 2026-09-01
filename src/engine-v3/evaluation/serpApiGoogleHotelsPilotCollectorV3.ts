import {
  STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
  STAYOPTI_SERPAPI_MAX_DETAILS_PER_SESSION_V3,
  STAYOPTI_SERPAPI_PILOT_ID_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3,
  STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3,
  STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
  assertSerpApiPilotRequestAllowedV3,
  createSerpApiPilotManifestHashV3,
  redactSerpApiDiagnosticV3,
  selectSerpApiPropertyDetailCandidatesV3,
  type StayOptiSerpApiDetailCandidateV3,
  type StayOptiSerpApiPilotAuthorizationEnvelopeV3,
  type StayOptiSerpApiPilotRawStoreV3,
  type StayOptiSerpApiPilotRequestV3,
  type StayOptiSerpApiPilotSessionV3,
  type StayOptiSerpApiPilotTransportV3,
} from "./serpApiGoogleHotelsPilotGateV3";
import {
  StayOptiSerpApiStagedRequestLedgerV3,
  createSerpApiRemainingAuthorizationLiteralV3,
  stageRequestCapV3,
  stageSessionIndexesV3,
  type StayOptiSerpApiPilotStageV3,
  type StayOptiSerpApiStagedLedgerEntryV3,
  type StayOptiSerpApiValidatedCanaryEvidenceV3,
} from "./serpApiGoogleHotelsPilotStageV3";
import {
  STAYOPTI_SERPAPI_PILOT_EVIDENCE_SCHEMA_VERSION_V3,
  createSerpApiSanitizedSnapshotV3,
  mergeSerpApiDetailResponseV3,
  sha256SerpApiEvidenceV3,
  validateSerpApiSanitizedSnapshotV3,
  type StayOptiSerpApiDetailEnrichmentStatusV3,
  type StayOptiSerpApiRawDeletionReceiptV3,
  type StayOptiSerpApiSanitizedSnapshotV3,
} from "./serpApiGoogleHotelsPilotEvidenceV3";
import type {
  SerpApiGoogleHotelsPropertyV3,
  SerpApiGoogleHotelsResponseV3,
} from "./serpApiGoogleHotelsExternalAdapterV3";

export interface StayOptiSerpApiPilotEvidenceStoreV3 {
  writeSnapshotAtomic(name: string, serializedSnapshot: string): void;
  readSnapshot(name: string): string;
}

export type StayOptiSerpApiPilotSanitizedLedgerEntryV3 = StayOptiSerpApiStagedLedgerEntryV3;

export interface StayOptiSerpApiPilotSessionSummaryV3 {
  sessionOrdinal: number;
  sessionId: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  mainRequestExecuted: boolean;
  detailRequestsExecuted: number;
  snapshotExported: boolean;
  resultCount: number;
  mappingCompleteness: "COMPLETE_FOR_REPLAY" | "PARTIAL_DIAGNOSTIC_ONLY" | "NOT_AVAILABLE";
  snapshotHash: string | null;
  failureClassification: string | null;
}

export interface StayOptiSerpApiPilotEvidenceReceiptV3 {
  receiptVersion: typeof STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3;
  evidenceSchemaVersion: typeof STAYOPTI_SERPAPI_PILOT_EVIDENCE_SCHEMA_VERSION_V3;
  pilotId: typeof STAYOPTI_SERPAPI_PILOT_ID_V3;
  status: "COMPLETED" | "ABORTED";
  stage: StayOptiSerpApiPilotStageV3;
  manifestHash: string;
  runnerBundleHash: string;
  authorizationConsumed: boolean;
  actualRequestsTransmitted: number;
  canarySessionId: string;
  canarySessionIndex: 0;
  remainingStageNotStarted: boolean;
  requestCount: number;
  mainSearchCount: number;
  propertyDetailCount: number;
  requestLedgerHash: string;
  sanitizedSnapshotFingerprints: string[];
  rawDeletionReceiptCount: number;
  rawPayloadsPersisted: 0;
  apiKeyPersisted: false;
  sensitiveUrlsPersisted: false;
  automaticGoldenAdmission: false;
  v3_17GateMet: false;
  v3_18EntryAllowed: false;
  failureClassification: string | null;
  receiptHash: string;
}

export interface StayOptiSerpApiPilotEvidenceExecutionV3 {
  receipt: StayOptiSerpApiPilotEvidenceReceiptV3;
  snapshots: StayOptiSerpApiSanitizedSnapshotV3[];
  sanitizedRequestLedger: StayOptiSerpApiPilotSanitizedLedgerEntryV3[];
  rawDeletionReceipts: StayOptiSerpApiRawDeletionReceiptV3[];
  sessionSummaries: StayOptiSerpApiPilotSessionSummaryV3[];
}

function dateIsValidFuture(date: string, nowIso: string) {
  const value = Date.parse(`${date}T00:00:00Z`);
  const now = Date.parse(nowIso);
  return Number.isFinite(value) && Number.isFinite(now) && value > now;
}

function validateAuthorization(input: {
  authorization: StayOptiSerpApiPilotAuthorizationEnvelopeV3 | null;
  apiKey: string;
  observedSourceSha: string;
  nowIso: string;
  validatedCanaryEvidence?: StayOptiSerpApiValidatedCanaryEvidenceV3;
}) {
  const authorization = input.authorization;
  if (authorization === null) throw new Error("SERPAPI_PILOT_AUTHORIZATION_REQUIRED");
  if (authorization.authorizationState !== "AUTHORIZED_NOT_STARTED") throw new Error("SERPAPI_PILOT_AUTHORIZATION_STATE_INVALID");
  if (!(["CANARY", "REMAINING_11"] as string[]).includes(authorization.stage)) throw new Error("SERPAPI_PILOT_STAGE_REQUIRED");
  if (authorization.stage === "CANARY") {
    if (authorization.literal !== STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3) throw new Error("SERPAPI_PILOT_AUTHORIZATION_LITERAL_MISMATCH");
    if (authorization.canaryEvidenceZipSha256 !== undefined || input.validatedCanaryEvidence !== undefined) throw new Error("SERPAPI_PILOT_CANARY_RESUME_INPUT_PROHIBITED");
  } else {
    const evidence = input.validatedCanaryEvidence;
    if (evidence?.valid !== true || evidence.status !== "PASS") throw new Error("SERPAPI_PILOT_CANARY_EVIDENCE_REQUIRED");
    if (authorization.canaryEvidenceZipSha256 !== evidence.canaryEvidenceZipSha256) throw new Error("SERPAPI_PILOT_CANARY_ZIP_HASH_MISMATCH");
    if (evidence.manifestHash !== STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3 || evidence.runnerBundleHash !== STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3) throw new Error("SERPAPI_PILOT_CANARY_EVIDENCE_BINDING_MISMATCH");
    const required = createSerpApiRemainingAuthorizationLiteralV3({
      manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
      runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
      canaryEvidenceZipSha256: evidence.canaryEvidenceZipSha256,
    });
    if (authorization.literal !== required) throw new Error("SERPAPI_PILOT_AUTHORIZATION_LITERAL_MISMATCH");
  }
  if (input.observedSourceSha !== STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3 || authorization.sourceCommitSha !== STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3) throw new Error("SERPAPI_PILOT_SOURCE_SHA_MISMATCH");
  if (authorization.manifestHash !== STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3 || createSerpApiPilotManifestHashV3() !== authorization.manifestHash) throw new Error("SERPAPI_PILOT_MANIFEST_HASH_MISMATCH");
  if (authorization.accountPlan !== "FREE") throw new Error("SERPAPI_PILOT_ACCOUNT_PLAN_MISMATCH");
  if (authorization.retentionAuthorized !== true) throw new Error("SERPAPI_PILOT_RETENTION_NOT_AUTHORIZED");
  if (input.apiKey.length === 0) throw new Error("SERPAPI_PILOT_API_KEY_MISSING");
  if (STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.some((session) => !dateIsValidFuture(session.checkIn, input.nowIso))) throw new Error("SERPAPI_PILOT_MANIFEST_EXPIRED");
  return stageSessionIndexesV3(authorization.stage, STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.length);
}

function buildMainUrl(session: StayOptiSerpApiPilotSessionV3, apiKey: string) {
  const url = new URL(STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3);
  url.searchParams.set("engine", STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3);
  url.searchParams.set("q", session.destination);
  url.searchParams.set("check_in_date", session.checkIn);
  url.searchParams.set("check_out_date", session.checkOut);
  url.searchParams.set("adults", String(session.adults));
  if (session.childAges.length > 0) url.searchParams.set("children", session.childAges.join(","));
  url.searchParams.set("currency", session.currency);
  url.searchParams.set("gl", session.gl);
  url.searchParams.set("hl", session.hl);
  url.searchParams.set("no_cache", "true");
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function buildDetailUrl(session: StayOptiSerpApiPilotSessionV3, propertyToken: string, apiKey: string) {
  const url = new URL(buildMainUrl(session, apiKey));
  url.searchParams.set("property_token", propertyToken);
  return url.toString();
}

function rawProperties(response: SerpApiGoogleHotelsResponseV3) {
  return [...(response.ads ?? []), ...(response.properties ?? [])];
}

function completeness(property: SerpApiGoogleHotelsPropertyV3) {
  const fields = [
    property.type, property.gps_coordinates, property.hotel_class,
    property.overall_rating, property.reviews, property.rate_per_night,
    property.total_rate, property.prices, property.amenities,
    property.free_cancellation,
  ];
  return Math.round(fields.filter((value) => value !== undefined).length * 10_000 / fields.length);
}

function detailCandidates(response: SerpApiGoogleHotelsResponseV3): StayOptiSerpApiDetailCandidateV3[] {
  return rawProperties(response).map((property, index) => ({
    localReference: `RANK_${String(index + 1).padStart(3, "0")}`,
    propertyToken: property.property_token ?? "",
    selectedByV2: false,
    selectedByV3: false,
    decisionScoreBps: 0,
    evidenceCompletenessBps: completeness(property),
    totalPriceMinorUnits: typeof property.total_rate?.extracted_lowest === "number"
      ? Math.round(property.total_rate.extracted_lowest * 100)
      : null,
    ratingNormalizedBps: typeof property.overall_rating === "number"
      ? Math.round(property.overall_rating * 2_000)
      : null,
  })).filter((candidate) => candidate.propertyToken.length > 0);
}

function snapshotName(sessionOrdinal: number) {
  return `snapshots/session-${String(sessionOrdinal).padStart(2, "0")}.json`;
}

function exportAndVerifySnapshot(
  store: StayOptiSerpApiPilotEvidenceStoreV3,
  name: string,
  snapshot: StayOptiSerpApiSanitizedSnapshotV3,
) {
  const validation = validateSerpApiSanitizedSnapshotV3(snapshot);
  if (!validation.valid) throw new Error("SERPAPI_PILOT_SNAPSHOT_VALIDATION_FAILED");
  const serialized = `${JSON.stringify(snapshot)}\n`;
  store.writeSnapshotAtomic(name, serialized);
  const reread = store.readSnapshot(name);
  if (sha256SerpApiEvidenceV3(reread) !== sha256SerpApiEvidenceV3(serialized)) {
    throw new Error("SERPAPI_PILOT_SNAPSHOT_EXPORT_HASH_MISMATCH");
  }
  const rereadValidation = validateSerpApiSanitizedSnapshotV3(JSON.parse(reread));
  if (!rereadValidation.valid) throw new Error("SERPAPI_PILOT_SNAPSHOT_EXPORT_FAILED");
}

function sanitizedFailure(error: unknown) {
  return error instanceof Error && /^(?:SERPAPI_PILOT_|SNAPSHOT_)[A-Z0-9_]+$/.test(error.message)
    ? error.message
    : "SERPAPI_PILOT_SANITIZED_ABORT";
}

function createReceipt(
  status: "COMPLETED" | "ABORTED",
  stage: StayOptiSerpApiPilotStageV3,
  ledger: StayOptiSerpApiStagedRequestLedgerV3,
  snapshots: readonly StayOptiSerpApiSanitizedSnapshotV3[],
  deletions: readonly StayOptiSerpApiRawDeletionReceiptV3[],
  failureClassification: string | null,
): StayOptiSerpApiPilotEvidenceReceiptV3 {
  const entries = ledger.snapshot();
  const canarySession = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!;
  const body = {
    receiptVersion: STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3,
    evidenceSchemaVersion: STAYOPTI_SERPAPI_PILOT_EVIDENCE_SCHEMA_VERSION_V3,
    pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
    status,
    stage,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
    authorizationConsumed: ledger.transmittedCount() > 0,
    actualRequestsTransmitted: ledger.transmittedCount(),
    canarySessionId: canarySession.sessionId,
    canarySessionIndex: 0 as const,
    remainingStageNotStarted: stage === "CANARY",
    requestCount: entries.length,
    mainSearchCount: entries.filter((entry) => entry.requestType === "MAIN_SEARCH" && entry.transmittedAt !== null).length,
    propertyDetailCount: entries.filter((entry) => entry.requestType === "PROPERTY_DETAIL" && entry.transmittedAt !== null).length,
    requestLedgerHash: ledger.hash(),
    sanitizedSnapshotFingerprints: snapshots.map((snapshot) => snapshot.normalizedSnapshotHash).sort(),
    rawDeletionReceiptCount: deletions.length,
    rawPayloadsPersisted: 0 as const,
    apiKeyPersisted: false as const,
    sensitiveUrlsPersisted: false as const,
    automaticGoldenAdmission: false as const,
    v3_17GateMet: false as const,
    v3_18EntryAllowed: false as const,
    failureClassification,
  };
  return { ...body, receiptHash: sha256SerpApiEvidenceV3(JSON.stringify(body)) };
}

export async function executeSerpApiGoogleHotelsPilotEvidenceV3(input: {
  authorization: StayOptiSerpApiPilotAuthorizationEnvelopeV3 | null;
  apiKey: string;
  observedSourceSha: string;
  nowIso: string;
  transport: StayOptiSerpApiPilotTransportV3;
  rawStore: StayOptiSerpApiPilotRawStoreV3;
  evidenceStore: StayOptiSerpApiPilotEvidenceStoreV3;
  validatedCanaryEvidence?: StayOptiSerpApiValidatedCanaryEvidenceV3;
  clock?: () => string;
  faultInjector?: (point: StayOptiSerpApiPilotFaultPointV3) => void;
}): Promise<StayOptiSerpApiPilotEvidenceExecutionV3> {
  const sessionIndexes = validateAuthorization(input);
  const stage = input.authorization!.stage;
  if (typeof input.rawStore.existsEphemeral !== "function") throw new Error("SERPAPI_PILOT_RAW_DELETE_VERIFICATION_REQUIRED");
  const ledger = new StayOptiSerpApiStagedRequestLedgerV3({
    pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
    stage,
    allowedSessionIndexes: sessionIndexes,
    maximumRequests: stageRequestCapV3(stage),
  });
  const snapshots: StayOptiSerpApiSanitizedSnapshotV3[] = [];
  const sanitizedRequestLedger: StayOptiSerpApiPilotSanitizedLedgerEntryV3[] = [];
  const rawDeletionReceipts: StayOptiSerpApiRawDeletionReceiptV3[] = [];
  const sessionSummaries: StayOptiSerpApiPilotSessionSummaryV3[] = [];
  const clock = input.clock ?? (() => input.nowIso);
  let failureClassification: string | null = null;

  const fault = (point: StayOptiSerpApiPilotFaultPointV3) => input.faultInjector?.(point);
  const deleteRaw = (name: string, receipt: Omit<StayOptiSerpApiRawDeletionReceiptV3, "rawDeleted" | "verifiedAbsent">) => {
    input.rawStore.removeEphemeral(name);
    if (input.rawStore.existsEphemeral!(name)) throw new Error("SERPAPI_PILOT_RAW_DELETE_VERIFICATION_FAILED");
    rawDeletionReceipts.push({ ...receipt, rawDeleted: true, verifiedAbsent: true });
  };

  try {
    sessionLoop: for (const sessionIndex of sessionIndexes) {
      const session = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex];
      if (session === undefined) throw new Error("SERPAPI_PILOT_STAGE_SESSION_NOT_ALLOWED");
      const sessionOrdinal = sessionIndex + 1;
      const statuses: Record<number, StayOptiSerpApiDetailEnrichmentStatusV3> = {};
      let responseBody: SerpApiGoogleHotelsResponseV3 | null = null;
      let currentSnapshot: StayOptiSerpApiSanitizedSnapshotV3 | null = null;
      let snapshotWasExported = false;
      let detailRequestsExecuted = 0;
      let sessionFailure: string | null = null;

      type PendingRequest = {
        ordinal: number;
        requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL";
        rawName: string;
        rawHash: string;
        rawCreated: boolean;
        alternativeRank: number | null;
      };
      const runRequest = async (
        requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL",
        url: string,
        alternativeRank: number | null,
      ) => {
        if (ledger.snapshot().length === 0) fault("BEFORE_FIRST_REQUEST");
        assertSerpApiPilotRequestAllowedV3({
          endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
          engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
          requestKind,
        });
        const ordinal = ledger.plan({ sessionId: session.sessionId, sessionIndex, requestType: requestKind, alternativeRank });
        const pending: PendingRequest = { ordinal, requestKind, rawName: "", rawHash: "", rawCreated: false, alternativeRank };
        const request: StayOptiSerpApiPilotRequestV3 = {
            requestOrdinal: ordinal,
            sessionId: session.sessionId,
            requestKind,
            engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
            endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
            url,
            sanitizedUrl: redactSerpApiDiagnosticV3(url),
          };
        try {
          ledger.transmit(ordinal, clock());
          const transportResponse = await input.transport.send(request);
          if (requestKind === "MAIN_SEARCH") fault("AFTER_SEARCH_TRANSMITTED");
          if (!Number.isInteger(transportResponse.httpStatus) || transportResponse.httpStatus < 200 || transportResponse.httpStatus >= 300) {
            throw new Error("SERPAPI_PILOT_HTTP_OR_TRANSPORT_FAILURE");
          }
          if (requestKind === "MAIN_SEARCH") fault("DURING_SEARCH_PARSING");
          const serializedRaw = JSON.stringify(transportResponse.body);
          pending.rawName = `request-${String(ordinal).padStart(2, "0")}.json`;
          pending.rawHash = sha256SerpApiEvidenceV3(serializedRaw);
          input.rawStore.writeEphemeral(pending.rawName, serializedRaw);
          pending.rawCreated = true;
          return { body: transportResponse.body, pending };
        } catch (error) {
          if (pending.rawCreated && input.rawStore.existsEphemeral!(pending.rawName)) {
            deleteRaw(pending.rawName, {
              requestOrdinal: pending.ordinal,
              sessionId: session.sessionId,
              requestKind: pending.requestKind,
              ephemeralPayloadSha256: pending.rawHash,
              rawCreated: true,
            });
          }
          ledger.fail(pending.ordinal, sanitizedFailure(error), !pending.rawCreated || !input.rawStore.existsEphemeral!(pending.rawName), false);
          throw error;
        }
      };

      const finishValidated = (pending: PendingRequest, snapshotExported: boolean) => {
        if (pending.rawCreated && input.rawStore.existsEphemeral!(pending.rawName)) {
          deleteRaw(pending.rawName, {
            requestOrdinal: pending.ordinal,
            sessionId: session.sessionId,
            requestKind: pending.requestKind,
            ephemeralPayloadSha256: pending.rawHash,
            rawCreated: true,
          });
        }
        ledger.validate(pending.ordinal, pending.rawHash, snapshotExported, true);
      };

      const finishFailed = (pending: PendingRequest | null, error: unknown, snapshotExported: boolean) => {
        if (pending === null) return;
        if (pending.rawCreated && input.rawStore.existsEphemeral!(pending.rawName)) {
          deleteRaw(pending.rawName, {
            requestOrdinal: pending.ordinal,
            sessionId: session.sessionId,
            requestKind: pending.requestKind,
            ephemeralPayloadSha256: pending.rawHash,
            rawCreated: true,
          });
        }
        ledger.fail(pending.ordinal, sanitizedFailure(error), !pending.rawCreated || !input.rawStore.existsEphemeral!(pending.rawName), snapshotExported);
      };

      try {
        let main: Awaited<ReturnType<typeof runRequest>> | null = null;
        let mainSnapshotExported = false;
        try {
          main = await runRequest("MAIN_SEARCH", buildMainUrl(session, input.apiKey), null);
          responseBody = main.body;
          fault("DURING_NORMALIZATION");
          currentSnapshot = createSerpApiSanitizedSnapshotV3({
            pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
            manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
            session,
            response: responseBody,
            captureTimestamp: clock(),
            detailStatuses: statuses,
          });
          fault("DURING_SNAPSHOT_EXPORT");
          exportAndVerifySnapshot(input.evidenceStore, snapshotName(sessionOrdinal), currentSnapshot);
          mainSnapshotExported = true;
          snapshotWasExported = true;
          fault("DURING_SNAPSHOT_REREAD");
          finishValidated(main.pending, true);
        } catch (error) {
          finishFailed(main?.pending ?? null, error, mainSnapshotExported);
          throw error;
        }

        const selected = selectSerpApiPropertyDetailCandidatesV3(detailCandidates(responseBody))
          .slice(0, STAYOPTI_SERPAPI_MAX_DETAILS_PER_SESSION_V3);
        for (let detailIndex = 0; detailIndex < selected.length; detailIndex += 1) {
          const candidate = selected[detailIndex]!;
          if (detailIndex === 0) fault("BEFORE_DETAIL_1");
          const rank = Number(candidate.localReference.slice("RANK_".length));
          statuses[rank] = "SELECTED_PENDING";
          let detail: Awaited<ReturnType<typeof runRequest>> | null = null;
          let detailSnapshotExported = false;
          try {
            detailRequestsExecuted += 1;
            detail = await runRequest(
              "PROPERTY_DETAIL",
              buildDetailUrl(session, candidate.propertyToken, input.apiKey),
              rank,
            );
            responseBody = mergeSerpApiDetailResponseV3(responseBody, rank, detail.body);
            statuses[rank] = "MERGED";
            currentSnapshot = createSerpApiSanitizedSnapshotV3({
              pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
              manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
              session,
              response: responseBody,
              captureTimestamp: clock(),
              detailStatuses: statuses,
            });
            exportAndVerifySnapshot(input.evidenceStore, snapshotName(sessionOrdinal), currentSnapshot);
            detailSnapshotExported = true;
            snapshotWasExported = true;
            finishValidated(detail.pending, true);
            detail = null;
            if (detailIndex === 0) fault("AFTER_DETAIL_1");
            if (detailIndex === 1) fault("AFTER_DETAIL_2");
          } catch (error) {
            statuses[rank] = "FAILED_SANITIZED";
            sessionFailure = sanitizedFailure(error);
            finishFailed(detail?.pending ?? null, error, detailSnapshotExported);
            currentSnapshot = createSerpApiSanitizedSnapshotV3({
              pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
              manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
              session,
              response: responseBody,
              captureTimestamp: clock(),
              detailStatuses: statuses,
            });
            exportAndVerifySnapshot(input.evidenceStore, snapshotName(sessionOrdinal), currentSnapshot);
            snapshotWasExported = true;
            throw error;
          }
        }
        snapshots.push(currentSnapshot);
        sessionSummaries.push({
          sessionOrdinal,
          sessionId: session.sessionId,
          status: "COMPLETED",
          mainRequestExecuted: true,
          detailRequestsExecuted,
          snapshotExported: true,
          resultCount: currentSnapshot.resultCount,
          mappingCompleteness: currentSnapshot.mappingCompleteness,
          snapshotHash: currentSnapshot.normalizedSnapshotHash,
          failureClassification: null,
        });
      } catch (error) {
        failureClassification = sessionFailure ?? sanitizedFailure(error);
        if (currentSnapshot !== null && snapshotWasExported) snapshots.push(currentSnapshot);
        sessionSummaries.push({
          sessionOrdinal,
          sessionId: session.sessionId,
          status: currentSnapshot === null || !snapshotWasExported ? "FAILED" : "PARTIAL",
          mainRequestExecuted: responseBody !== null,
          detailRequestsExecuted,
          snapshotExported: snapshotWasExported,
          resultCount: currentSnapshot?.resultCount ?? 0,
          mappingCompleteness: currentSnapshot?.mappingCompleteness ?? "NOT_AVAILABLE",
          snapshotHash: snapshotWasExported ? currentSnapshot?.normalizedSnapshotHash ?? null : null,
          failureClassification,
        });
        break sessionLoop;
      }
    }
  } finally {
    input.rawStore.removeAllEphemeral();
  }

  const status = failureClassification === null && snapshots.length === sessionIndexes.length ? "COMPLETED" : "ABORTED";
  sanitizedRequestLedger.push(...ledger.snapshot());
  return {
    receipt: createReceipt(status, stage, ledger, snapshots, rawDeletionReceipts, failureClassification),
    snapshots,
    sanitizedRequestLedger,
    rawDeletionReceipts,
    sessionSummaries,
  };
}

export type StayOptiSerpApiPilotFaultPointV3 =
  | "BEFORE_FIRST_REQUEST"
  | "AFTER_SEARCH_TRANSMITTED"
  | "DURING_SEARCH_PARSING"
  | "DURING_NORMALIZATION"
  | "DURING_SNAPSHOT_EXPORT"
  | "DURING_SNAPSHOT_REREAD"
  | "BEFORE_DETAIL_1"
  | "AFTER_DETAIL_1"
  | "AFTER_DETAIL_2";
