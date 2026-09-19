// Pure provider boundary. No transport, credentials, custody or engine imports.
const { isDeepStrictEqual } = require("node:util");
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function semanticErrors(value, pointer = "$", recordKeys = ["data", "roomTypes", "rates"]) {
  const errors = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => errors.push(...semanticErrors(item, `${pointer}[${index}]`, recordKeys)));
  } else if (plain(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (["error", "errors"].includes(key) && item !== null && !(Array.isArray(item) && item.length === 0)) {
        errors.push(`${pointer}.${key}`);
      } else if (recordKeys.includes(key) && item && typeof item === "object") {
        errors.push(...semanticErrors(item, `${pointer}.${key}`, recordKeys));
      }
    }
  }
  return errors;
}

// These are the pre-existing public mapper envelopes. The documentary
// capture profile continues to require its explicitly versioned root data array.
const PUBLIC_RECORD_KEYS = ["roomTypes", "rooms", "roomRates", "availableRooms",
  "offers", "rates", "rate", "availableRates"];

function directErrors(value, pointer) {
  return semanticErrors(value, pointer, []);
}

function inspectLegacyEnvelope(payload) {
  if (Array.isArray(payload)) {
    return { records: payload, errors: semanticErrors(payload, "$", PUBLIC_RECORD_KEYS), conflicting: false };
  }
  if (!plain(payload)) return { records: null, errors: [], conflicting: false };

  // Match extractRecords' supported paths and precedence, not arbitrary JSON.
  const paths = [["data"], ["data", "rates"], ["data", "results"], ["data", "items"],
    ["data", "hotels"], ["rates"], ["results"], ["items"], ["hotels"], ["response"]];
  const arrays = new Map();
  const containers = new Map([["$", { value: payload, path: [] }]]);
  const at = (path) => path.reduce((value, key) => value?.[key], payload);
  const pointer = (path) => "$" + path.map((key) => "." + key).join("");
  const addArray = (value, path) => {
    if (Array.isArray(value)) arrays.set(pointer(path), { value, path });
  };
  for (const path of paths) {
    const value = at(path);
    addArray(value, path);
    if (plain(value)) {
      containers.set(pointer(path), { value, path });
      for (const key of ["rates", "results", "items", "hotels", "data"]) {
        addArray(value[key], [...path, key]);
      }
    }
  }
  const found = [...arrays.values()];
  const chosen = found[0];
  // The mapper also uses hotels/data.hotels as static enrichment alongside a
  // rates envelope. Such metadata is not an alternative availability response.
  const hasPrimaryRates = chosen && !chosen.path.includes("hotels");
  const active = (entry) => !hasPrimaryRates || !entry.path.includes("hotels");
  const relevant = found.filter(active);
  const errors = [...containers.values()].filter(active)
    .flatMap((entry) => directErrors(entry.value, pointer(entry.path)));
  for (const entry of relevant) {
    errors.push(...semanticErrors(entry.value, pointer(entry.path), PUBLIC_RECORD_KEYS));
  }
  return {
    records: chosen?.value ?? null,
    errors: [...new Set(errors)],
    conflicting: relevant.some((entry) => !isDeepStrictEqual(entry.value, chosen.value)),
  };
}

function classifyLiteApiRatesResponse({ payload, httpStatus = 200, bodyIsEmpty = false, allowLegacyEnvelopes = false }) {
  const base = { semanticErrors: [], noResultsBasis: null, rawRecordCount: null };
  if (httpStatus !== 200 && httpStatus !== 204) {
    return { ...base, classification: "PROVIDER_ERROR", status: "HTTP_ERROR", reason: "HTTP_STATUS_NOT_SUCCESS", semanticErrors: ["$http"] };
  }
  if (httpStatus === 204) {
    return bodyIsEmpty
      ? { ...base, classification: "DOCUMENTED_NO_RESULTS", status: "NO_CONTENT", reason: null, noResultsBasis: "HTTP_204", rawRecordCount: 0 }
      : { ...base, classification: "UNKNOWN_FORMAT", status: "UNKNOWN_FORMAT", reason: "NO_CONTENT_WITH_BYTES" };
  }
  const legacy = allowLegacyEnvelopes ? inspectLegacyEnvelope(payload) : null;
  const records = legacy ? legacy.records : plain(payload) && Array.isArray(payload.data) ? payload.data : null;
  const errors = legacy ? legacy.errors : semanticErrors(payload);
  // Code scope and type matter. A record error never means the whole search is empty.
  const noAvailability = plain(payload?.error) && (payload.error.code === 2001 || payload.error.code === "2001");
  const emptyData = plain(payload) && (!Object.hasOwn(payload, "data") || payload.data === null || Array.isArray(payload.data) && payload.data.length === 0);
  if (noAvailability && errors.length === 1 && errors[0] === "$.error" && emptyData && !(records?.length) && !legacy?.conflicting) {
    return { ...base, classification: "DOCUMENTED_NO_RESULTS", status: "NO_AVAILABILITY", reason: null, noResultsBasis: "LITEAPI_RATES_ERROR_CODE_2001", rawRecordCount: 0 };
  }
  if (errors.length) {
    return { ...base, classification: "PROVIDER_ERROR", status: "SEMANTIC_ERROR", reason: noAvailability ? "NO_AVAILABILITY_ENVELOPE_CONFLICT" : "PROVIDER_APPLICATION_ERROR", semanticErrors: errors };
  }
  if (legacy?.conflicting) {
    return { ...base, classification: "UNKNOWN_FORMAT", status: "UNKNOWN_FORMAT", reason: "CONFLICTING_RECORD_ENVELOPES" };
  }
  if (records === null) {
    return { ...base, classification: "UNKNOWN_FORMAT", status: "UNKNOWN_FORMAT", reason: "ROOT_SCHEMA_UNSUPPORTED" };
  }
  return { ...base, classification: records.length ? "SUCCESS" : "DOCUMENTED_NO_RESULTS",
    status: records.length ? "OBSERVATIONS_COUNTED" : "EMPTY_DATA_ARRAY", reason: null,
    noResultsBasis: records.length ? null : "EXPLICIT_EMPTY_DATA_ARRAY", rawRecordCount: records.length };
}

module.exports = { classifyLiteApiRatesResponse, semanticErrors };
