import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mapper = require("../../server/providers/liteApi/liteApiProvider.js");
const { createLiteApiAdapter } = require("../../server/providers/liteApi/liteApiAdapter.js");
const { classifyLiteApiRatesResponse } = require("../../server/providers/liteApi/liteApiRatesResponse.js");

const request = {
  destination: { cityName: "SyntheticHarbor", countryCode: "FR" },
  stay: { checkin: "2028-04-12", checkout: "2028-04-15" },
  rooms: [{ adults: 2, childAges: [] }], currency: "EUR",
};
const rate = () => ({ rateId: "fictional-rate", name: "Twin room",
  retailRate: { total: [{ amount: 510, currency: "EUR" }] } });
const hotel = () => ({ hotelId: "fictional-property", rates: [rate()] });
const classify = (payload) => classifyLiteApiRatesResponse({ payload, allowLegacyEnvelopes: true });

async function search(payload) {
  let ratesCalls = 0;
  let metadataCalls = 0;
  const adapter = createLiteApiAdapter({
    ...mapper,
    searchLiteApiRates: async () => { ratesCalls++; return { status: 200, data: payload }; },
    getLiteApiHotels: async () => { metadataCalls++; return { noContent: true, data: null }; },
    mapLiteApiHotelDetailsResponse: () => null,
    mergeProviderHotelResults: (hotels) => hotels,
  });
  const result = await adapter.searchHotels({ request });
  assert.equal(ratesCalls, 1);
  return { result, metadataCalls };
}

const roomAliases = ["roomTypes", "rooms", "roomRates", "availableRooms", "offers"];
const rateAliases = ["rates", "rate", "offers", "availableRates", "roomRates"];
for (const roomKey of roomAliases) for (const rateKey of rateAliases) {
  test(`R01 mapper-consumed ${roomKey}/${rateKey} retains nested application errors`, async () => {
    const badRate = { ...rate(), error: { code: "synthetic-invalid-rate" } };
    const payload = { data: [{ hotelId: "fictional-property", [roomKey]: [{ [rateKey]: badRate }] }] };
    // This shape is actually consumed by the production mapper, not invented
    // metadata that merely happens to contain an error-named field.
    assert.equal(mapper.mapLiteApiHotelResponse(payload, "EUR").length, 1);
    const observed = classify(payload);
    assert.equal(observed.classification, "PROVIDER_ERROR");
    assert.ok(observed.semanticErrors.some((path) => path.endsWith(`.${rateKey}.error`)));
    const { result, metadataCalls } = await search(payload);
    assert.equal(result.outcome, "error");
    assert.equal(metadataCalls, 0);
    assert.equal(result.hotels.length, 0);
    const good = structuredClone(payload);
    delete good.data[0][roomKey][0][rateKey].error;
    assert.equal((await search(good)).result.outcome, "success");
  });
}

for (const rateKey of ["rates", "rate", "availableRates", "roomRates"]) {
  test(`R01 direct ${rateKey} errors cannot be consumed as success`, async () => {
    const payload = { data: [{ hotelId: "fictional-property",
      [rateKey]: [{ ...rate(), errors: [{ code: "synthetic-invalid-rate" }] }] }] };
    assert.equal(mapper.mapLiteApiHotelResponse(payload, "EUR").length, 1);
    assert.equal(classify(payload).classification, "PROVIDER_ERROR");
    assert.equal((await search(payload)).result.outcome, "error");
  });
}

test("R01 original array-shaped room/rates counterexample reaches adapter error", async () => {
  const payload = { data: [{ hotelId: "fictional-property", rooms: [{ rates: [
    { ...rate(), error: { code: "synthetic-invalid-rate" } },
  ] }] }] };
  assert.equal(classify(payload).classification, "PROVIDER_ERROR");
  assert.equal((await search(payload)).result.outcome, "error");
});

for (const key of ["rates", "results", "items", "response"]) {
  test(`R01 competing data/${key} envelopes cannot hide records as no availability`, async () => {
    const payload = { data: [], [key]: [hotel()] };
    const observed = classify(payload);
    assert.equal(observed.classification, "UNKNOWN_FORMAT");
    assert.equal(observed.reason, "CONFLICTING_RECORD_ENVELOPES");
    assert.equal(observed.rawRecordCount, null);
    assert.equal((await search(payload)).result.outcome, "error");
    const rootCode = classify({ ...payload, error: { code: 2001 } });
    assert.equal(rootCode.classification, "PROVIDER_ERROR");
  });
}

test("R01 two nonempty inconsistent wrappers are not selected by precedence", () => {
  assert.equal(classify({ data: [hotel()], results: [{ ...hotel(), hotelId: "other-property" }] }).reason,
    "CONFLICTING_RECORD_ENVELOPES");
});

test("R01 duplicate equivalent record wrappers are supported", async () => {
  const records = [hotel()];
  const payload = { data: records, results: structuredClone(records) };
  assert.equal(classify(payload).classification, "SUCCESS");
  assert.equal((await search(payload)).result.outcome, "success");
});

test("R01 hotels enrichment is not a competing availability envelope", async () => {
  const payload = { data: [hotel()], hotels: [{ id: "fictional-property", name: "Invented",
    error: "Unrelated static label" }], metadata: { error: "Unrelated envelope label" } };
  assert.equal(classify(payload).classification, "SUCCESS");
  assert.equal((await search(payload)).result.outcome, "success");
  assert.equal(classify({ ...payload, data: [] }).classification, "DOCUMENTED_NO_RESULTS");
});

test("R01 nested hotels enrichment remains separate from nested rates", () => {
  assert.equal(classify({ data: { rates: [hotel()], hotels: [{ name: "Invented", error: "metadata" }] } }).classification,
    "SUCCESS");
});

for (const wrap of [
  (rows) => rows,
  (rows) => ({ data: rows }),
  (rows) => ({ data: { results: rows } }),
  (rows) => ({ response: { data: rows } }),
  (rows) => ({ hotels: rows }),
]) {
  test("R01 supported wrappers preserve success, documented absence and record errors", async () => {
    assert.equal(classify(wrap([hotel()])).classification, "SUCCESS");
    assert.equal((await search(wrap([hotel()]))).result.outcome, "success");
    assert.equal(classify(wrap([])).classification, "DOCUMENTED_NO_RESULTS");
    assert.equal(classify(wrap([{ ...hotel(), error: { code: 2001 } }])).classification, "PROVIDER_ERROR");
  });
}

test("R01 arbitrary fields below a rate do not become protocol error paths", () => {
  const payload = { data: [{ hotelId: "fictional-property", rates: [{ ...rate(),
    metadata: { rooms: [{ error: "decorative" }] }, commentary: { error: "decorative" },
  }] }] };
  assert.equal(classify(payload).classification, "SUCCESS");
});

test("R01 documentary strict profile is unchanged by public legacy support", () => {
  const payload = { results: [hotel()] };
  assert.equal(classify(payload).classification, "SUCCESS");
  assert.equal(classifyLiteApiRatesResponse({ payload }).reason, "ROOT_SCHEMA_UNSUPPORTED");
});
