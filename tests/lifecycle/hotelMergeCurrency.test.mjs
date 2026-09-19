import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { mergeProviderHotelResults, mergeHotelRecords } = require('../../server/providers/common/hotelMergeService.js');
const record = (id, price, currency, extra = {}) => ({
  id: 'synthetic-property', sourceProvider: 'invented-provider', sourceHotelId: 'opaque-P/1',
  name: 'Invented stay', price, currency, availableData: { hasPrice: true },
  offers: [{ id, price, totalKnownCost: price, currency, provider: 'Invented Provider',
    sourceProvider: 'invented-provider', roomName: `Room ${id}`, refundable: true, ...extra }],
});
const pair = () => [record('opaque-EUR/1', 600, 'EUR'), record('opaque-USD+1', 500, 'USD')];

test('R07 initial counterexample: search EUR summary is independent of record order', () => {
  const inputs = pair();
  const forward = mergeProviderHotelResults(inputs, { searchCurrency: 'EUR' })[0];
  const reverse = mergeProviderHotelResults([...inputs].reverse(), { searchCurrency: 'EUR' })[0];
  assert.deepEqual([forward.price, forward.currency], [600, 'EUR']);
  assert.deepEqual([reverse.price, reverse.currency], [600, 'EUR']);
});

const { createPublicHotel } = require('../../server/presenters/publicHotelPresenter.js');
const { createPublicSearchPayload } = require('../../server/presenters/publicSearchPresenter.js');
const { offerFingerprint } = require('../../server/providers/common/commercialSummary.js');
const { createPublicOfferId } = require('../../server/services/bookingOfferIntegrityService.js');
const permutations = values => values.length < 2 ? [values] :
  values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map(rest => [value, ...rest]));
const commercial = hotel => ({
  price: hotel.price, currency: hotel.currency, totalKnownCost: hotel.totalKnownCost,
  roomName: hotel.roomName, refundable: hotel.refundable, summary: hotel.commercialSummary,
});

for (const currency of ['EUR', 'USD', 'JPY']) {
  test(`every permutation uses search ${currency}, not provider order or property currency`, () => {
    const inputs = [...pair(), record('opaque-JPY=2', 12000, 'JPY')];
    const before = structuredClone(inputs);
    const outputs = permutations(inputs).map(p => mergeProviderHotelResults(p, { searchCurrency: currency })[0]);
    const expected = outputs[0];
    for (const output of outputs) {
      assert.deepEqual(commercial(output), commercial(expected));
      assert.equal(output.offers.length, 3);
      const offer = output.offers.find(o => offerFingerprint(o) === output.commercialSummary.selectedOfferFingerprint);
      assert(offer);
      assert.equal(output.price, offer.price);
      assert.equal(output.currency, offer.currency);
      assert.equal(output.roomName, offer.roomName);
      assert.equal(output.commercialSummary.selectedOfferId, offer.id);
    }
    assert.deepEqual(inputs, before);
  });
}

for (const [context, status] of [
  [{}, 'SEARCH_CURRENCY_MISSING'],
  [{ searchCurrency: null }, 'SEARCH_CURRENCY_MISSING'],
  [{ searchCurrency: 'euros' }, 'SEARCH_CURRENCY_INVALID'],
  [{ searchCurrency: 'GBP' }, 'NO_COMPARABLE_OFFER'],
]) {
  test(`explicit ${status} without a first-record commercial fallback: ${JSON.stringify(context)}`, () => {
    for (const p of permutations(pair())) {
      const hotel = mergeProviderHotelResults(p, context)[0];
      assert.equal(hotel.commercialSummary.status, status);
      assert.equal(hotel.price, null); assert.equal(hotel.currency, null);
      assert.equal(hotel.totalKnownCost, null);
      assert.equal(hotel.availableData.hasPrice, false);
      assert.equal(hotel.commercialSummary.selectedOfferId, null);
      assert.equal(hotel.offers.length, 2);
      const publicHotel = createPublicHotel(hotel);
      assert.equal(publicHotel.price, null); assert.equal(publicHotel.currency, null);
      assert.equal(publicHotel.commercialSummary.status, status);
    }
  });
}

test('one record is checked too; unknown currency is not implicitly the search currency', () => {
  for (const currency of [undefined, '', null, '???', 'USD']) {
    const hotel = mergeProviderHotelResults([record('o1', 500, currency)], { searchCurrency: 'EUR' })[0];
    assert.equal(hotel.price, null);
    assert.equal(hotel.commercialSummary.status, 'NO_COMPARABLE_OFFER');
    assert.equal(hotel.offers.length, 1);
    assert.equal(hotel.offers[0].currency, currency);
  }
  assert.equal(mergeProviderHotelResults([record('o1', 500, 'EUR')])[0].price, null);
});

test('incomplete observations are retained, not compared as zero or lost to a complete record', () => {
  const inputs = [record('unknown', null, 'EUR'), record('malformed', 'not-a-price', 'EUR'),
    record('boolean', true, 'EUR'), ...pair()];
  const result = mergeProviderHotelResults(inputs, { searchCurrency: 'EUR' })[0];
  assert.equal(result.offers.length, 5); assert.equal(result.price, 600);
  assert.equal(result.commercialSummary.comparableOfferCount, 1);
  assert.equal(createPublicHotel(result).offers.find(o => o.id === createPublicOfferId(inputs[0].offers[0])).price, null);
  assert.equal(createPublicHotel(result).offers.find(o => o.id === createPublicOfferId(inputs[2].offers[0])).price, null);
  const unknown = mergeProviderHotelResults(inputs.slice(0, 3), { searchCurrency: 'EUR' })[0];
  assert.equal(unknown.commercialSummary.status, 'NO_COMPARABLE_OFFER');
});

test('monocurrency retains known-cost selection, original strings and tax/cancellation provenance', () => {
  const inputs = [record('a', 500, 'EUR', { totalKnownCost: 620, excludedTaxes: 120 }),
    record('b', '580', 'eur', { totalKnownCost: '600', excludedTaxes: 20,
      cancellationPolicy: 'Invented refundable conditions', provenance: { response: 'synthetic-response-2' } })];
  for (const p of permutations(inputs)) {
    const result = mergeProviderHotelResults(p, { searchCurrency: ' eur ' })[0];
    assert.equal(result.price, '580'); assert.equal(result.currency, 'EUR');
    assert.equal(result.totalKnownCost, '600'); assert.equal(result.excludedTaxes, 20);
    assert.equal(result.cancellationPolicy, inputs[1].offers[0].cancellationPolicy);
    assert.deepEqual(result.offers.find(o => o.id === 'b'), inputs[1].offers[0]);
    const publicHotel = createPublicHotel(result);
    assert.equal(publicHotel.currency, publicHotel.offers.find(o => o.id === publicHotel.commercialSummary.selectedOfferId).currency);
  }
});

test('same opaque ID observations in different currencies or with disagreeing conditions all survive', () => {
  const inputs = [record('opaque:/A+==', 600, 'EUR'), record('opaque:/A+==', 500, 'USD'),
    record('opaque:/A+==', 600, 'EUR', { refundable: false, provenance: { response: 'second' } })];
  const outputs = permutations(inputs).map(p => mergeProviderHotelResults(p, { searchCurrency: 'EUR' })[0]);
  for (const result of outputs) {
    assert.equal(result.offers.length, 3);
    assert.deepEqual(result.offers, outputs[0].offers);
    assert.deepEqual(commercial(result), commercial(outputs[0]));
  }
  assert.equal(mergeHotelRecords(inputs[0], inputs[0], { searchCurrency: 'EUR' }).offers.length, 1);
});

test('stable display tie and public binding are coherent without assigning a recommendation role', () => {
  for (const sourceProvider of ['invented-alpha', 'invented-beta']) {
    const inputs = [record('B/opaque', 400, 'CHF'), record('A+opaque', 400, 'CHF')]
      .map(h => ({ ...h, sourceProvider, offers: h.offers.map(o => ({ ...o, sourceProvider })) }));
    const outputs = permutations(inputs).map(p => createPublicHotel(mergeProviderHotelResults(p, { searchCurrency: 'CHF' })[0]));
    assert.deepEqual(outputs[0].commercialSummary, outputs[1].commercialSummary);
    const selected = outputs[0].offers.find(o => o.id === outputs[0].commercialSummary.selectedOfferId);
    assert.equal(selected.price, outputs[0].price); assert.equal(selected.currency, outputs[0].currency);
    assert.equal(outputs[0].bestChoice, undefined);
  }
});

test('public summary binds the exact observation even when the legacy public offer ID is shared', () => {
  const inputs = [record('same-opaque-id', 100, 'EUR', { totalKnownCost: 200 }),
    record('same-opaque-id', 60, 'EUR', { totalKnownCost: 200 })];
  assert.equal(createPublicOfferId(inputs[0].offers[0]), createPublicOfferId(inputs[1].offers[0]));
  for (const p of permutations(inputs)) {
    const hotel = createPublicHotel(mergeProviderHotelResults(p, { searchCurrency: 'EUR' })[0]);
    assert.equal(hotel.price, 60);
    assert.equal(hotel.offers.filter(o => o.observationId === hotel.commercialSummary.selectedObservationId).length, 1);
    assert.equal(hotel.offers.find(o => o.observationId === hotel.commercialSummary.selectedObservationId).price, hotel.price);
  }
});

const liteMapper = require('../../server/providers/liteApi/liteApiProvider.js');
const { createLiteApiAdapter } = require('../../server/providers/liteApi/liteApiAdapter.js');
const routeMapper = require('../../server/providers/routeStack/routeStackProvider.js');
const { createRouteStackAdapter } = require('../../server/providers/routeStack/routeStackAdapter.js');
const request = {
  destination: { cityName: 'Invented City', countryCode: 'FR', latitude: 45, longitude: 3 },
  stay: { checkin: '2028-03-02', checkout: '2028-03-05' },
  rooms: [{ adults: 2, childAges: [] }], currency: 'EUR',
};

for (const reverse of [false, true]) {
  test(`LiteAPI public path uses request currency in both merge calls (reverse=${reverse})`, async () => {
    const values = reverse ? [...pair()].reverse() : pair();
    const body = { currency: 'USD', data: values.map(h => ({
      hotelId: 'opaque:P1', name: 'Synthetic stay', roomTypes: [{ offerId: h.offers[0].id, rates: [{
        rateId: h.offers[0].id, name: 'Twin room',
        retailRate: { total: [{ amount: h.price, currency: h.currency }] },
      }] }],
    })) };
    const contexts = [];
    const adapter = createLiteApiAdapter({
      ...liteMapper,
      searchLiteApiRates: async input => { assert.equal(input.currency, 'EUR'); return { status: 200, noContent: false, data: body }; },
      getLiteApiHotels: async () => ({ data: [], noContent: false }),
      getLiteApiFacilities: async () => ({ data: [], noContent: false }),
      mapLiteApiHotelDetailsResponse: () => null,
      mergeProviderHotelResults: (hotels, context) => {
        contexts.push(context); return mergeProviderHotelResults(hotels, context);
      },
    });
    const result = await adapter.searchHotels({ request });
    assert.equal(result.outcome, 'success');
    assert.deepEqual(contexts, [{ searchCurrency: 'EUR' }, { searchCurrency: 'EUR' }]);
    const hotel = createPublicSearchPayload({ success: true, hotels: result.hotels }).hotels[0];
    assert.equal(hotel.price, 600); assert.equal(hotel.currency, 'EUR');
    assert.equal(hotel.offers.length, 2);
    assert.equal(hotel.offers.find(o => o.id === hotel.commercialSummary.selectedOfferId).price, 600);
  });

  test(`RouteStack public initial and continuation path keep request currency (reverse=${reverse})`, async () => {
    const values = reverse ? [...pair()].reverse() : pair();
    const body = { success: true, result: { currency: 'USD', result: values.map(h => ({
      id: 'opaque:P1', name: h.name, ourprice: h.price, currency: h.currency,
    })) } };
    const contexts = [];
    const adapter = createRouteStackAdapter({
      ...routeMapper,
      resolveRouteStackDestination: async () => ({ destination: { id: 'city-synthetic', type: 'City' } }),
      searchRouteStackHotels: async payload => { assert.equal(payload.currency, 'EUR'); return body; },
      mergeHotels: (hotels, context) => { contexts.push(context); return mergeProviderHotelResults(hotels, context); },
    });
    const first = await adapter.searchHotels({ request });
    const continuation = await adapter.continueHotelSearch({ request: {
      ...request, continuation: { providerId: 'routestack', cursor: 'synthetic-page' },
      providerContext: { destination: { id: 'city-synthetic', type: 'City' }, token: 'synthetic-token', correlationId: 'synthetic-correlation' },
    } });
    for (const result of [first, continuation]) {
      const hotel = createPublicSearchPayload({ success: true, hotels: result.hotels }).hotels[0];
      assert.equal(hotel.price, 600); assert.equal(hotel.currency, 'EUR');
      assert.equal(hotel.offers.length, 2);
      assert.equal(hotel.offers.find(o => o.id === hotel.commercialSummary.selectedOfferId).price, 600);
    }
    assert.deepEqual(contexts, [{ searchCurrency: 'EUR' }, { searchCurrency: 'EUR' }]);
  });
}

test('both real public adapters expose unavailable summary when request currency has no observed offer', async () => {
  const hotels = pair();
  const route = createRouteStackAdapter({
    ...routeMapper,
    resolveRouteStackDestination: async () => ({ destination: { id: 'synthetic-city', type: 'City' } }),
    searchRouteStackHotels: async () => ({ success: true, result: { currency: 'USD', result:
      hotels.map(h => ({ id: 'P', name: h.name, ourprice: h.price, currency: h.currency })) } }),
    mergeHotels: mergeProviderHotelResults,
  });
  const lite = createLiteApiAdapter({
    ...liteMapper,
    searchLiteApiRates: async () => ({ status: 200, data: { data: hotels.map(h => ({
      hotelId: 'P', roomTypes: [{ offerId: h.offers[0].id, rates: [{
        rateId: h.offers[0].id, name: 'Synthetic room', retailRate: { total: [{ amount: h.price, currency: h.currency }] },
      }] }],
    })) } }),
    getLiteApiHotels: async () => ({ data: [], noContent: false }),
    getLiteApiFacilities: async () => ({ data: [], noContent: false }),
    mapLiteApiHotelDetailsResponse: () => null,
    mergeProviderHotelResults,
  });
  for (const adapter of [route, lite]) {
    const result = await adapter.searchHotels({ request: { ...request, currency: 'GBP' } });
    const hotel = createPublicSearchPayload({ success: true, hotels: result.hotels }).hotels[0];
    assert.equal(hotel.price, null); assert.equal(hotel.currency, null);
    assert.equal(hotel.commercialSummary.status, 'NO_COMPARABLE_OFFER');
    assert.equal(hotel.commercialSummary.searchCurrency, 'GBP');
    assert.equal(hotel.offers.length, 2); assert.equal(hotel.availableData.hasPrice, false);
  }
});
