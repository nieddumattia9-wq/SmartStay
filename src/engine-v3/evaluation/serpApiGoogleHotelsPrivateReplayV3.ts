import { stableSerializeV3 } from "../contract/stableHashV3";

import {
  decryptProviderRawQuarantineEnvelopeV3,
  type StayOptiProviderRawKeyProtectorV3,
  type StayOptiProviderRawQuarantineEnvelopeV3,
} from "./providerRawQuarantineV3";
import {
  createSerpApiSanitizedSnapshotV3,
  mergeSerpApiDetailResponseV3,
  sha256SerpApiEvidenceV3,
  validateSerpApiSanitizedSnapshotV3,
  type StayOptiSerpApiSanitizedSnapshotV3,
} from "./serpApiGoogleHotelsPilotEvidenceV3";
import type { SerpApiGoogleHotelsResponseV3 } from "./serpApiGoogleHotelsExternalAdapterV3";

export const STAYOPTI_SERPAPI_PRIVATE_REPLAY_PARSER_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-private-replay-parser@1" as const;

export interface StayOptiSerpApiPrivateReplayResultV3 {
  parserVersion: typeof STAYOPTI_SERPAPI_PRIVATE_REPLAY_PARSER_VERSION_V3;
  schemaFingerprint: string;
  unknownTopLevelFields: string[];
  suppressedUnknownFieldCount: number;
  encryptedInputsVerified: number;
  plaintextTemporaryFilesCreated: 0;
  networkRequests: 0;
  credentialsLoaded: false;
  snapshot: StayOptiSerpApiSanitizedSnapshotV3;
}

const KNOWN_TOP_LEVEL_FIELDS = new Set([
  "ads",
  "brands",
  "error",
  "properties",
  "property",
  "search_information",
  "search_metadata",
  "search_parameters",
  "serpapi_pagination",
]);

function plainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function schemaShape(value: unknown, depth = 0): unknown {
  if (depth >= 5) return "DEPTH_LIMIT";
  if (value === null) return "NULL";
  if (Array.isArray(value)) return value.length === 0 ? ["EMPTY"] : [schemaShape(value[0], depth + 1)];
  if (plainRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, schemaShape(value[key], depth + 1)]));
  }
  return typeof value;
}

function unknownFields(value: unknown) {
  if (!plainRecord(value)) return { allowed: [] as string[], suppressed: 0 };
  const unknown = Object.keys(value).filter((key) => !KNOWN_TOP_LEVEL_FIELDS.has(key)).sort();
  const allowed = unknown.filter((key) => /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) && !/(?:id|token|secret|key|url|raw|authorization)/i.test(key));
  return { allowed, suppressed: unknown.length - allowed.length };
}

function parseQuarantinedResponse(
  envelope: StayOptiProviderRawQuarantineEnvelopeV3,
  keyProtector: StayOptiProviderRawKeyProtectorV3,
) {
  if (envelope.providerKey !== "SERPAPI_GOOGLE_HOTELS") throw new Error("SERPAPI_PRIVATE_REPLAY_PROVIDER_MISMATCH");
  const plaintext = decryptProviderRawQuarantineEnvelopeV3(envelope, keyProtector);
  try {
    const parsed = JSON.parse(plaintext) as unknown;
    if (!plainRecord(parsed)) throw new Error("SERPAPI_PRIVATE_REPLAY_RESPONSE_NOT_OBJECT");
    return parsed as SerpApiGoogleHotelsResponseV3;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("SERPAPI_PRIVATE_REPLAY_")) throw error;
    throw new Error("SERPAPI_PRIVATE_REPLAY_JSON_INVALID");
  }
}

export function replaySerpApiGoogleHotelsPrivateRawV3(input: {
  mainEnvelope: StayOptiProviderRawQuarantineEnvelopeV3;
  detailEnvelopes?: ReadonlyArray<{
    envelope: StayOptiProviderRawQuarantineEnvelopeV3;
    alternativeRank: number;
  }>;
  keyProtector: StayOptiProviderRawKeyProtectorV3;
  pilotId: string;
  manifestHash: string;
  session: Parameters<typeof createSerpApiSanitizedSnapshotV3>[0]["session"];
  replayTimestamp: string;
}): StayOptiSerpApiPrivateReplayResultV3 {
  let response = parseQuarantinedResponse(input.mainEnvelope, input.keyProtector);
  const observedShapes: unknown[] = [schemaShape(response)];
  const unknown = unknownFields(response);
  const unknownTopLevelFields = [...unknown.allowed];
  let suppressedUnknownFieldCount = unknown.suppressed;
  const detailStatuses: Record<number, "MERGED"> = {};
  for (const detail of [...(input.detailEnvelopes ?? [])].sort((left, right) => left.alternativeRank - right.alternativeRank)) {
    if (!Number.isInteger(detail.alternativeRank) || detail.alternativeRank < 1) throw new Error("SERPAPI_PRIVATE_REPLAY_DETAIL_RANK_INVALID");
    const body = parseQuarantinedResponse(detail.envelope, input.keyProtector);
    observedShapes.push(schemaShape(body));
    const detailUnknown = unknownFields(body);
    unknownTopLevelFields.push(...detailUnknown.allowed);
    suppressedUnknownFieldCount += detailUnknown.suppressed;
    response = mergeSerpApiDetailResponseV3(response, detail.alternativeRank, body);
    detailStatuses[detail.alternativeRank] = "MERGED";
  }
  const snapshot = createSerpApiSanitizedSnapshotV3({
    pilotId: input.pilotId,
    manifestHash: input.manifestHash,
    session: input.session,
    response,
    captureTimestamp: input.replayTimestamp,
    detailStatuses,
  });
  if (!validateSerpApiSanitizedSnapshotV3(snapshot).valid) throw new Error("SERPAPI_PRIVATE_REPLAY_SNAPSHOT_INVALID");
  return {
    parserVersion: STAYOPTI_SERPAPI_PRIVATE_REPLAY_PARSER_VERSION_V3,
    schemaFingerprint: sha256SerpApiEvidenceV3(`stayopti-v3-serpapi-private-replay-schema\n${stableSerializeV3(observedShapes)}`),
    unknownTopLevelFields: [...new Set(unknownTopLevelFields)].sort(),
    suppressedUnknownFieldCount,
    encryptedInputsVerified: 1 + (input.detailEnvelopes?.length ?? 0),
    plaintextTemporaryFilesCreated: 0,
    networkRequests: 0,
    credentialsLoaded: false,
    snapshot,
  };
}
