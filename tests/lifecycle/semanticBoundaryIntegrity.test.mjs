import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const mapper = require("../../server/providers/liteApi/liteApiProvider.js");
const { createLiteApiAdapter } = require("../../server/providers/liteApi/liteApiAdapter.js");
const { createPublicOfferId, resolveOfferByPublicId } = require("../../server/services/bookingOfferIntegrityService.js");
const { mapHotel } = require("../../server/mappers/hotelMapper.js");
const { classifyProviderResult } = require("../../server/providers/common/providerSearchOutcomeService.js");

const request = {
  destination: { cityName: "InventedCity", countryCode: "FR" },
  stay: { checkin: "2027-02-02", checkout: "2027-02-05" },
  rooms: [{ adults: 2, childAges: [] }], currency: "EUR",
};

async function search(body, overrides = {}, dependencies = {}) {
  let requests = 0;
  const adapter = createLiteApiAdapter({
    ...mapper,
    searchLiteApiRates: async () => {
      requests++;
      return { status: 200, noContent: false, data: body, ...overrides };
    },
    getLiteApiHotels: async () => { throw new Error("UNEXPECTED_METADATA_REQUEST"); },
    mapLiteApiHotelDetailsResponse: () => null,
    mergeProviderHotelResults: (hotels) => hotels,
    ...dependencies,
  });
  const result = await adapter.searchHotels({ request });
  assert.equal(requests, 1);
  return result;
}

for (const [name, body] of [
  ["unknown application error", { error: { code: 9999 } }],
  ["unknown envelope", { nextSchema: { records: [] } }],
  ["missing data", {}],
  ["null data", { data: null }],
  ["contradictory absence and records", { error: { code: 2001 }, data: [{ hotelId: "H1" }] }],
  ["contradictory errors", { error: { code: 2001 }, errors: [{ code: 9999 }] }],
  ["record-scoped error", { data: [{ hotelId: "H1", error: { code: 2001 } }] }],
  ["unusable successful record", { data: [{}] }],
]) {
  test(`Rates ${name} is a failure, not no availability`, async () => {
    const result = await search(body);
    assert.equal(result.outcome, "error");
    assert.equal(classifyProviderResult(result), "error");
    assert.equal(result.failedResponse.retryable, false);
    assert.notEqual(result.failedResponse.code, "NO_RESULTS");
  });
}

for (const body of [{ data: [] }, { error: { code: 2001 } }, { error: { code: "2001" }, data: null }]) {
  test(`Rates documented absence ${JSON.stringify(body)} remains no results`, async () => {
    assert.equal((await search(body)).outcome, "no_results");
  });
}

test("irrelevant metadata does not become a protocol error", async () => {
  assert.equal((await search({ data: [], metadata: { error: "unrelated label" } })).outcome, "no_results");
});

for (const [name, body] of [
  ["legacy record", { results: [{ hotelId: "H1", error: { code: 9999 } }] }],
  ["legacy response wrapper", { response: { data: [], error: { code: 9999 } } }],
]) {
  test(`Rates ${name} retains its application error`, () => {
    const { classifyLiteApiRatesResponse } = require("../../server/providers/liteApi/liteApiRatesResponse.js");
    const result = classifyLiteApiRatesResponse({ payload: body, allowLegacyEnvelopes: true });
    assert.equal(result.classification, "PROVIDER_ERROR");
    assert.equal(result.status, "SEMANTIC_ERROR");
    assert.equal(result.rawRecordCount, null);
  });
}

test("HTTP 204 with no body differs from a contradictory nonempty body", async () => {
  assert.equal((await search(null, { status: 204, noContent: true })).outcome, "no_results");
  assert.equal((await search({ data: [{ hotelId: "H1" }] }, { status: 204, noContent: true })).outcome, "error");
});

const offer = {
  id: "RateToken-Aa", sourceProvider: "invented-provider", roomName: "Twin room",
  mealPlan: "Room only", price: 600, totalKnownCost: 600, currency: "EUR",
  refundable: true, freeCancellationUntil: "2027-01-01T12:00:00Z",
  excludedTaxes: 0, unknownTaxes: 0, cancellationPolicy: "Refundable",
  deepLink: "https://example.test/Booking?token=Aa",
};

for (const [name, changed] of [
  ["token case", { id: "RateToken-aa" }],
  ["token whitespace", { id: "RateToken-Aa " }],
  ["opaque token resembling an old generated id", { id: "rate_1" }],
  ["URL path case", { deepLink: "https://example.test/booking?token=Aa" }],
  ["URL query case", { deepLink: "https://example.test/Booking?token=aa" }],
  ["provider namespace", { sourceProvider: "another-provider" }],
]) {
  test(`opaque identity preserves ${name} in either input order`, () => {
    const other = { ...offer, ...changed };
    const id = createPublicOfferId(offer);
    assert.notEqual(id, createPublicOfferId(other));
    assert.equal(resolveOfferByPublicId([offer, other], id), offer);
    assert.equal(resolveOfferByPublicId([other, offer], id), offer);
  });
}

// Independent reproduction of the historic v1 public token, for open sessions.
function legacyId(value) {
  const text = (x) => typeof x === "string" ? x.trim().toLowerCase().replace(/\s+/g, " ") : "";
  const number = (x) => x === null || x === undefined || x === "" ? "" : Number.isFinite(Number(x)) ? Number(x).toFixed(2) : "";
  const payload = [text(value.sourceProvider), text(value.id), text(value.roomName), text(value.mealPlan),
    number(value.totalKnownCost ?? value.price), text(value.currency), String(value.refundable),
    text(value.freeCancellationUntil), number(value.excludedTaxes), number(value.unknownTaxes),
    text(value.cancellationPolicy), text(value.deepLink)].join("\u001f");
  return "offer-" + crypto.createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

test("existing unambiguous public tokens still resolve", () => {
  assert.equal(resolveOfferByPublicId([offer], legacyId(offer)), offer);
});

test("identical duplicate records do not create booking ambiguity", () => {
  const duplicate = structuredClone(offer);
  const token = createPublicOfferId(offer);
  assert.deepEqual(resolveOfferByPublicId([duplicate, offer], token), offer);
  assert.deepEqual(resolveOfferByPublicId([offer, duplicate], token), offer);
});

test("an ambiguous legacy token never selects the first offer", () => {
  const other = { ...offer, id: "RateToken-aa" };
  const token = legacyId(offer);
  assert.equal(token, legacyId(other));
  assert.equal(resolveOfferByPublicId([offer, other], token), null);
  assert.equal(resolveOfferByPublicId([other, offer], token), null);
});

test("opaque tokens are not classified as synthetic by their spelling", () => {
  assert.notEqual(createPublicOfferId({ ...offer, id: "rate_1" }), createPublicOfferId({ ...offer, id: "rate_2" }));
});

test("documentary and public classifiers agree on their shared wire profile", async () => {
  const { classifyCoverageRatesResponse } = await import("../../scripts/liteapi-search-coverage-diagnostics-v1.mjs");
  const { classifyLiteApiRatesResponse } = require("../../server/providers/liteApi/liteApiRatesResponse.js");
  for (const payload of [
    {}, { data: null }, { data: [] }, { data: [{ hotelId: "H1" }] },
    { error: { code: 2001 } }, { error: { code: "2001" }, data: [] },
    { error: { code: 9999 } }, { error: { code: 2001 }, data: [{ hotelId: "H1" }] },
    { data: [], metadata: { error: "decorative" } },
  ]) {
    const bytes = Buffer.from(JSON.stringify(payload));
    const expectedSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const documentary = classifyCoverageRatesResponse({ bytes, status: 200, expectedSha256 });
    const publicResult = classifyLiteApiRatesResponse({ payload });
    assert.equal(publicResult.classification, documentary.classification);
    assert.equal(publicResult.status, documentary.status);
    assert.equal(publicResult.noResultsBasis, documentary.noResultsBasis);
  }
});

test("recognized data survives the real public mapper", async () => {
  const body = { data: [{ hotelId: "H1", roomTypes: [{ offerId: "O1", rates: [{
    rateId: "R1", name: "Twin room", retailRate: { total: [{ amount: 600, currency: "EUR" }] },
  }] }] }] };
  const result = await search(body, {}, {
    getLiteApiHotels: async () => ({ noContent: true, data: null }),
  });
  assert.equal(result.outcome, "success");
  assert.equal(result.hotels.length, 1);
  assert.ok(result.hotels[0].offers.length > 0);
});

test("unknown records have an undetermined provider count", async () => {
  const result = await search({ unrecognized: [] });
  assert.equal(result.providerObservation.rawRecordCount, null);
  // totalHotels is the existing public delivered-list count, not provider stock.
  assert.equal(result.hotels.length, 0);
  assert.equal(result.outcome, "error");
});

for (const value of [undefined, null, "", "  ", false, true, [], [0], {}, "NaN", Infinity]) {
  test(`missing or nonnumeric distance ${JSON.stringify(value)} is unavailable`, () => {
    const hotel = mapHotel({ id: "H", name: "Invented", ourprice: 600, distance: value });
    assert.equal(hotel.distance, null);
    assert.equal(hotel.availableData.hasDistance, false);
  });
}

for (const value of [0, "0", 1.25, "1.25"]) {
  test(`explicit distance ${JSON.stringify(value)} retains its value`, () => {
    const hotel = mapHotel({ id: "H", name: "Invented", ourprice: 600, distance: value });
    assert.equal(hotel.distance, Number(value));
    assert.equal(hotel.availableData.hasDistance, true);
  });
}
