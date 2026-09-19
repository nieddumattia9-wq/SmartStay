import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../src/utils/hotelDetailsPresentation";
import { createSyntheticCapabilityInput } from "../../src/engine-v3/evaluation/diagnosticCapabilityProbeV3";
import { evaluateSmartStaySearchV2 } from "../../src/engine-v2/orchestrator/smartStayEngineV2";

function feature(labels: string[], code: string) {
  const input = createSyntheticCapabilityInput("COMPLETE");
  for (const hotel of input.hotels) {
    hotel.amenities = labels;
    hotel.facilities = [];
  }
  return evaluateSmartStaySearchV2(input).evaluations[0].evidence.find((fact) => fact.code === `feature.${code}`)!;
}

for (const [positive, negative, code] of [
  ["Parking", "No parking available", "parking"],
  ["WiFi", "WiFi is not available", "wifi"],
  ["Kitchen", "No kitchen", "kitchen"],
  ["Ascensore", "Ascensore non disponibile", "elevator"],
]) {
  test(`V2 distinguishes a service assertion from its negation: ${code}`, () => {
    assert.equal(feature([positive], code).value, true);
    const absent = feature([negative], code);
    assert.equal(absent.availability, "known");
    assert.equal(absent.value, false);
  });
}

for (const labels of [["Parking", "No parking available"], ["No parking available", "Parking"]]) {
  test(`V2 retains contradictory service claims in order ${labels.join(" / ")}`, () => {
    assert.equal(feature(labels, "parking").availability, "conflicting");
  });
}

for (const label of ["Parking on request", "Parking nearby", "No free parking", "Parking subject to availability"]) {
  test(`qualified service does not become unconditional presence: ${label}`, () => {
    assert.equal(feature([label], "parking").availability, "unknown");
  });
}

test("negation of one service does not negate another service", () => {
  assert.equal(feature(["No parking available", "WiFi"], "wifi").value, true);
});

test("a paid service can be present without being free", () => {
  assert.equal(feature(["Wi-Fi (surcharge)"], "wifi").value, true);
  assert.deepEqual(buildHotelAmenityPresentation(["Wi-Fi (surcharge)"]).highlights, ["Wi-Fi (surcharge)"]);
});

test("an unpriced service is not labeled free", () => {
  assert.deepEqual(buildHotelAmenityPresentation(["Wireless internet"]).highlights, ["Wi-Fi"]);
});

for (const label of ["No parking available", "No wheelchair access", "Parking on request", "Breakfast not included"]) {
  test(`presentation retains material qualification: ${label}`, () => {
    const p = buildHotelAmenityPresentation([label]);
    assert.ok(p.groups.flatMap((group) => group.items).includes(label));
    assert.ok(!p.highlights.includes(label));
  });
}

test("price conflicts are not resolved by amenity input order", () => {
  const forward = buildHotelAmenityPresentation(["Free WiFi", "Wi-Fi (surcharge)"]);
  const reverse = buildHotelAmenityPresentation(["Wi-Fi (surcharge)", "Free WiFi"]);
  assert.deepEqual(forward, reverse);
  assert.ok(!forward.highlights.includes("Free Wi-Fi"));
  assert.ok(forward.groups.flatMap((group) => group.items).includes("Wi-Fi (surcharge)"));
});

for (const label of ["Air-conditioned", "Air conditioned", "Air conditioning"]) {
  test(`bounded air-conditioning synonyms agree in evidence and presentation: ${label}`, () => {
    assert.equal(feature([label], "air-conditioning").value, true);
    assert.deepEqual(buildHotelAmenityPresentation([label]).highlights, ["Air conditioning"]);
  });
}

for (const [label, availability, value] of [
  ["Air-conditioned not available", "known", false],
  ["Air conditioned on request", "unknown", null],
  ["Air-conditioned subject to availability", "unknown", null],
  ["Air-conditioned nearby", "unknown", null],
] as const) {
  test(`air-conditioning spelling does not erase a qualification: ${label}`, () => {
    const fact = feature([label], "air-conditioning");
    assert.equal(fact.availability, availability);
    assert.equal(fact.value, value);
    const presentation = buildHotelAmenityPresentation([label]);
    assert.deepEqual(presentation.highlights, []);
    assert.ok(presentation.groups.flatMap((group) => group.items).includes(label));
  });
}

for (const [hyphenated, spaced, expected] of [
  ["Wi-Fi", "Wi Fi", "Wi-Fi"],
  ["Non-smoking", "Non smoking", "Non-smoking rooms"],
  ["Smoke-free", "Smoke free", "Non-smoking rooms"],
  ["24-hour front desk", "24 hour front desk", "24-hour front desk"],
  ["24-hour reception", "24 hour reception", "24-hour front desk"],
]) {
  test(`existing hyphenated amenity patterns remain equivalent: ${hyphenated}`, () => {
    assert.deepEqual(buildHotelAmenityPresentation([hyphenated]).highlights, [expected]);
    assert.deepEqual(buildHotelAmenityPresentation([spaced]).highlights, [expected]);
    for (const label of [`${hyphenated} not available`, `${spaced} on request`]) {
      const presentation = buildHotelAmenityPresentation([label]);
      assert.deepEqual(presentation.highlights, []);
      assert.ok(presentation.groups.flatMap((group) => group.items).includes(label));
    }
  });
}
