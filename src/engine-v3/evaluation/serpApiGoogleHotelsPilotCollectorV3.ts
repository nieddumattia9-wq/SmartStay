import {
  STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
  STAYOPTI_SERPAPI_MAX_DETAILS_PER_SESSION_V3,
  STAYOPTI_SERPAPI_PILOT_ID_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3,
  STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
  StayOptiSerpApiRequestLedgerV3,
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

export interface StayOptiSerpApiPilotSanitizedLedgerEntryV3 {
  requestOrdinal: number;
  sessionOrdinal: number;
  sessionId: string;
  requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL";
  alternativeRank: number | null;
  requestedAt: string;
  completedAt: string;
  httpStatus: number | null;
  outcome: "PROCESSABLE" | "FAILED_SANITIZED";
  noCacheRequested: true;
  endpointClass: "SERPAPI_GOOGLE_HOTELS";
  sensitiveUrlPersisted: false;
}

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
  manifestHash: string;
  authorizationConsumed: boolean;
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
}) {
  const authorization = input.authorization;
  if (authorization === null) throw new Error("SERPAPI_PILOT_AUTHORIZATION_REQUIRED");
  if (authorization.authorizationState !== "AUTHORIZED_NOT_STARTED") throw new Error("SERPAPI_PILOT_AUTHORIZATION_STATE_INVALID");
  if (authorization.literal !== STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3) throw new Error("SERPAPI_PILOT_AUTHORIZATION_LITERAL_MISMATCH");
  if (input.observedSourceSha !== STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3 || authorization.sourceCommitSha !== STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3) throw new Error("SERPAPI_PILOT_SOURCE_SHA_MISMATCH");
  if (authorization.manifestHash !== STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3 || createSerpApiPilotManifestHashV3() !== authorization.manifestHash) throw new Error("SERPAPI_PILOT_MANIFEST_HASH_MISMATCH");
  if (authorization.accountPlan !== "FREE") throw new Error("SERPAPI_PILOT_ACCOUNT_PLAN_MISMATCH");
  if (authorization.retentionAuthorized !== true) throw new Error("SERPAPI_PILOT_RETENTION_NOT_AUTHORIZED");
  if (input.apiKey.length === 0) throw new Error("SERPAPI_PILOT_API_KEY_MISSING");
  if (STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.some((session) => !dateIsValidFuture(session.checkIn, input.nowIso))) throw new Error("SERPAPI_PILOT_MANIFEST_EXPIRED");
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
  ledger: StayOptiSerpApiRequestLedgerV3,
  snapshots: readonly StayOptiSerpApiSanitizedSnapshotV3[],
  deletions: readonly StayOptiSerpApiRawDeletionReceiptV3[],
  failureClassification: string | null,
): StayOptiSerpApiPilotEvidenceReceiptV3 {
  const entries = ledger.snapshot();
  const body = {
    receiptVersion: STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3,
    evidenceSchemaVersion: STAYOPTI_SERPAPI_PILOT_EVIDENCE_SCHEMA_VERSION_V3,
    pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
    status,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    authorizationConsumed: entries.length > 0,
    requestCount: entries.length,
    mainSearchCount: entries.filter((entry) => entry.requestKind === "MAIN_SEARCH").length,
    propertyDetailCount: entries.filter((entry) => entry.requestKind === "PROPERTY_DETAIL").length,
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
  clock?: () => string;
}): Promise<StayOptiSerpApiPilotEvidenceExecutionV3> {
  validateAuthorization(input);
  if (typeof input.rawStore.existsEphemeral !== "function") throw new Error("SERPAPI_PILOT_RAW_DELETE_VERIFICATION_REQUIRED");
  const ledger = new StayOptiSerpApiRequestLedgerV3();
  const snapshots: StayOptiSerpApiSanitizedSnapshotV3[] = [];
  const sanitizedRequestLedger: StayOptiSerpApiPilotSanitizedLedgerEntryV3[] = [];
  const rawDeletionReceipts: StayOptiSerpApiRawDeletionReceiptV3[] = [];
  const sessionSummaries: StayOptiSerpApiPilotSessionSummaryV3[] = [];
  const clock = input.clock ?? (() => input.nowIso);
  let failureClassification: string | null = null;

  const deleteRaw = (name: string, receipt: Omit<StayOptiSerpApiRawDeletionReceiptV3, "rawDeleted" | "verifiedAbsent">) => {
    input.rawStore.removeEphemeral(name);
    if (input.rawStore.existsEphemeral!(name)) throw new Error("SERPAPI_PILOT_RAW_DELETE_VERIFICATION_FAILED");
    rawDeletionReceipts.push({ ...receipt, rawDeleted: true, verifiedAbsent: true });
  };

  try {
    sessionLoop: for (let sessionIndex = 0; sessionIndex < STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.length; sessionIndex += 1) {
      const session = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex];
      const sessionOrdinal = sessionIndex + 1;
      const statuses: Record<number, StayOptiSerpApiDetailEnrichmentStatusV3> = {};
      let responseBody: SerpApiGoogleHotelsResponseV3 | null = null;
      let currentSnapshot: StayOptiSerpApiSanitizedSnapshotV3 | null = null;
      let detailRequestsExecuted = 0;
      let sessionFailure: string | null = null;

      const runRequest = async (
        requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL",
        url: string,
        alternativeRank: number | null,
      ) => {
        assertSerpApiPilotRequestAllowedV3({
          endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
          engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
          requestKind,
        });
        const reservation = ledger.reserve(session.sessionId, requestKind);
        const requestedAt = clock();
        let rawCreated = false;
        let rawName = "";
        let rawHash = "";
        let succeeded = false;
        let observedHttpStatus: number | null = null;
        try {
          const request: StayOptiSerpApiPilotRequestV3 = {
            requestOrdinal: reservation.ordinal,
            sessionId: session.sessionId,
            requestKind,
            engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
            endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
            url,
            sanitizedUrl: redactSerpApiDiagnosticV3(url),
          };
          const transportResponse = await input.transport.send(request);
          observedHttpStatus = Number.isInteger(transportResponse.httpStatus) ? transportResponse.httpStatus : null;
          if (!Number.isInteger(transportResponse.httpStatus) || transportResponse.httpStatus < 200 || transportResponse.httpStatus >= 300) {
            throw new Error("SERPAPI_PILOT_HTTP_OR_TRANSPORT_FAILURE");
          }
          const serializedRaw = JSON.stringify(transportResponse.body);
          rawName = `request-${String(reservation.ordinal).padStart(2, "0")}.json`;
          rawHash = sha256SerpApiEvidenceV3(serializedRaw);
          input.rawStore.writeEphemeral(rawName, serializedRaw);
          rawCreated = true;
          sanitizedRequestLedger.push({
            requestOrdinal: reservation.ordinal,
            sessionOrdinal,
            sessionId: session.sessionId,
            requestKind,
            alternativeRank,
            requestedAt,
            completedAt: clock(),
            httpStatus: transportResponse.httpStatus,
            outcome: "PROCESSABLE",
            noCacheRequested: true,
            endpointClass: "SERPAPI_GOOGLE_HOTELS",
            sensitiveUrlPersisted: false,
          });
          succeeded = true;
          return { body: transportResponse.body, rawName, rawHash, requestOrdinal: reservation.ordinal };
        } catch (error) {
          sanitizedRequestLedger.push({
            requestOrdinal: reservation.ordinal,
            sessionOrdinal,
            sessionId: session.sessionId,
            requestKind,
            alternativeRank,
            requestedAt,
            completedAt: clock(),
            httpStatus: observedHttpStatus,
            outcome: "FAILED_SANITIZED",
            noCacheRequested: true,
            endpointClass: "SERPAPI_GOOGLE_HOTELS",
            sensitiveUrlPersisted: false,
          });
          throw error;
        } finally {
          ledger.complete();
          if (!succeeded && rawCreated && input.rawStore.existsEphemeral!(rawName)) {
            deleteRaw(rawName, {
              requestOrdinal: reservation.ordinal,
              sessionId: session.sessionId,
              requestKind,
              ephemeralPayloadSha256: rawHash,
              rawCreated: true,
            });
          }
        }
      };

      try {
        const main = await runRequest("MAIN_SEARCH", buildMainUrl(session, input.apiKey), null);
        try {
          responseBody = main.body;
          currentSnapshot = createSerpApiSanitizedSnapshotV3({
            pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
            manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
            session,
            response: responseBody,
            captureTimestamp: clock(),
            detailStatuses: statuses,
          });
          exportAndVerifySnapshot(input.evidenceStore, snapshotName(sessionOrdinal), currentSnapshot);
        } finally {
          if (input.rawStore.existsEphemeral!(main.rawName)) {
            deleteRaw(main.rawName, {
              requestOrdinal: main.requestOrdinal,
              sessionId: session.sessionId,
              requestKind: "MAIN_SEARCH",
              ephemeralPayloadSha256: main.rawHash,
              rawCreated: true,
            });
          }
        }

        const selected = selectSerpApiPropertyDetailCandidatesV3(detailCandidates(responseBody))
          .slice(0, STAYOPTI_SERPAPI_MAX_DETAILS_PER_SESSION_V3);
        for (const candidate of selected) {
          const rank = Number(candidate.localReference.slice("RANK_".length));
          statuses[rank] = "SELECTED_PENDING";
          detailRequestsExecuted += 1;
          try {
            const detail = await runRequest(
              "PROPERTY_DETAIL",
              buildDetailUrl(session, candidate.propertyToken, input.apiKey),
              rank,
            );
            try {
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
            } finally {
              if (input.rawStore.existsEphemeral!(detail.rawName)) {
                deleteRaw(detail.rawName, {
                  requestOrdinal: detail.requestOrdinal,
                  sessionId: session.sessionId,
                  requestKind: "PROPERTY_DETAIL",
                  ephemeralPayloadSha256: detail.rawHash,
                  rawCreated: true,
                });
              }
            }
          } catch (error) {
            statuses[rank] = "FAILED_SANITIZED";
            sessionFailure = sanitizedFailure(error);
            currentSnapshot = createSerpApiSanitizedSnapshotV3({
              pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
              manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
              session,
              response: responseBody,
              captureTimestamp: clock(),
              detailStatuses: statuses,
            });
            exportAndVerifySnapshot(input.evidenceStore, snapshotName(sessionOrdinal), currentSnapshot);
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
        if (currentSnapshot !== null) snapshots.push(currentSnapshot);
        sessionSummaries.push({
          sessionOrdinal,
          sessionId: session.sessionId,
          status: currentSnapshot === null ? "FAILED" : "PARTIAL",
          mainRequestExecuted: responseBody !== null,
          detailRequestsExecuted,
          snapshotExported: currentSnapshot !== null,
          resultCount: currentSnapshot?.resultCount ?? 0,
          mappingCompleteness: currentSnapshot?.mappingCompleteness ?? "NOT_AVAILABLE",
          snapshotHash: currentSnapshot?.normalizedSnapshotHash ?? null,
          failureClassification,
        });
        break sessionLoop;
      }
    }
  } finally {
    input.rawStore.removeAllEphemeral();
  }

  const status = failureClassification === null && snapshots.length === 12 ? "COMPLETED" : "ABORTED";
  return {
    receipt: createReceipt(status, ledger, snapshots, rawDeletionReceipts, failureClassification),
    snapshots,
    sanitizedRequestLedger,
    rawDeletionReceipts,
    sessionSummaries,
  };
}
