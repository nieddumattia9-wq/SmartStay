import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import { resolveDecisionTieV3 } from "../../src/engine-v3/decision/decisionTieProjectionV3";
import {
  adaptSerpApiGoogleHotelsExternalSessionV3,
  STAYOPTI_SERPAPI_GOOGLE_HOTELS_BIAS_REGISTER_V3,
  STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3,
  STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3,
  STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3,
  STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3,
  type SerpApiGoogleHotelsResponseV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3";
import {
  deduplicateExternalChoiceSessionsV3,
  validateExternalHotelChoiceSessionV3,
} from "../../src/engine-v3/evaluation/externalHotelChoiceReplayV3";

const ROOT = process.cwd();

function source(path: string) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function filesUnder(directory: string): string[] {
  const absolute = resolve(ROOT, directory);
  const files: string[] = [];
  for (const entry of readdirSync(absolute)) {
    const candidate = join(absolute, entry);
    if (statSync(candidate).isDirectory()) files.push(...filesUnder(relative(ROOT, candidate)));
    else files.push(relative(ROOT, candidate).replaceAll("\\", "/"));
  }
  return files.sort();
}

function fixture(): SerpApiGoogleHotelsResponseV3 {
  return {
    search_metadata: {
      created_at: "2026-09-01T10:15:00Z",
      processed_at: "2026-09-01T10:15:01Z",
      status: "Success",
    },
    search_parameters: {
      q: "Synthetic European market",
      check_in_date: "2027-04-10",
      check_out_date: "2027-04-13",
      adults: 2,
      children: 0,
      rooms: 1,
      currency: "EUR",
      gl: "it",
      hl: "en",
      free_cancellation: true,
      no_cache: false,
    },
    ads: [{
      type: "hotel",
      name: "Synthetic Sponsored Stay",
      property_token: "synthetic-property-token-sponsored",
      gps_coordinates: { latitude: 45.01, longitude: 9.01 },
      hotel_class: "4-star hotel",
      overall_rating: 4.2,
      reviews: 120,
      rate_per_night: { extracted_lowest: 120, extracted_before_taxes_fees: 105 },
      total_rate: { extracted_lowest: 360, extracted_before_taxes_fees: 315 },
      prices: [{ source: "Synthetic Seller Sponsored", extracted_lowest: 360 }],
      amenities: ["Wi-Fi", "Breakfast"],
      free_cancellation: true,
    }],
    properties: [
      {
        type: "hotel",
        name: "Synthetic Hotel Alpha",
        property_token: "synthetic-property-token-alpha",
        gps_coordinates: { latitude: 45.02, longitude: 9.02 },
        hotel_class: "5-star hotel",
        overall_rating: 4.8,
        reviews: 820,
        rate_per_night: { extracted_lowest: 150 },
        total_rate: { extracted_lowest: 450, extracted_before_taxes_fees: 410 },
        prices: [
          { source: "Synthetic Seller A", extracted_lowest: 450 },
          { source: "Synthetic Seller B", extracted_lowest: 465 },
        ],
        amenities: ["Spa", "Wi-Fi"],
      },
      {
        type: "hotel",
        name: "Synthetic Hotel Beta",
        property_token: "synthetic-property-token-beta",
        overall_rating: 4.1,
        reviews: 45,
        rate_per_night: { extracted_lowest: 90 },
      },
    ],
    serpapi_pagination: { next_page_token: "synthetic-next-page-token" },
  };
}

function semanticWinner(response: SerpApiGoogleHotelsResponseV3) {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(response);
  const candidates = projection.session.alternatives.map((alternative) => ({
    opaqueId: alternative.anonymousPropertyId,
    rating: alternative.reviewRating.state === "KNOWN" ? alternative.reviewRating.value : 0,
    reviews: alternative.reviewCount.state === "KNOWN" ? alternative.reviewCount.value : 0,
  }));
  const resolution = resolveDecisionTieV3(
    candidates,
    (left, right) => right.rating - left.rating || right.reviews - left.reviews,
    ({ rating, reviews }) => ({ rating, reviews }),
  );
  const leader = resolution.leaders[0];
  return {
    classification: resolution.classification,
    decisionTieProjection: leader === undefined
      ? null
      : { rating: leader.rating, reviews: leader.reviews },
  };
}

test("V3-17T qualification freezes a conditional real-market evaluation source", () => {
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3, "REAL_PUBLIC_MARKET_CHOICE_SET_SOURCE");
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3, "REAL_PUBLIC_MARKET_SNAPSHOT_CANDIDATE");
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3.qualification, "CONDITIONAL");
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3.pivaRequirement, "NOT_STATED");
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3.freePlanSearchesPerMonth, 250);
});

test("V3-17T adapter is evaluation-only and contains no network or credential loader", () => {
  const adapterPath = "src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3.ts";
  const adapter = source(adapterPath);
  assert.doesNotMatch(adapter, /\bfetch\s*\(|https?\.request|process\.env|dotenv|server[\\/]providers/);
  assert.equal(adapterPath.startsWith("src/engine-v3/evaluation/"), true);
});

test("V3-17T Engine V3 core does not import the SerpApi adapter", () => {
  const forbidden = /serpApiGoogleHotelsExternalAdapterV3|SERPAPI_GOOGLE_HOTELS/;
  const evaluationBoundaries = new Set([
    "src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3.ts",
    "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts",
    "src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3.ts",
    "src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3.ts",
    "src/engine-v3/evaluation/serpApiGoogleHotelsPrivateReplayV3.ts",
    "src/engine-v3/evaluation/repairedMarketSnapshotEligibilityV3.ts",
    "src/engine-v3/evaluation/providerRawQuarantineV3.ts",
  ]);
  for (const file of filesUnder("src/engine-v3").filter((entry) => entry.endsWith(".ts") && !evaluationBoundaries.has(entry))) {
    assert.doesNotMatch(source(file), forbidden, file);
  }
});

test("V3-17T provider runtime and registry do not import SerpApi", () => {
  for (const file of filesUnder("server/providers").filter((entry) => /\.[cm]?[jt]s$/.test(entry))) {
    assert.doesNotMatch(source(file), /serpapi|google.hotels/i, file);
  }
});

test("V3-17T payload is never converted through LiteAPI", () => {
  const adapter = source("src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3.ts");
  assert.doesNotMatch(adapter, /from\s+["'][^"']*liteApi|liteApiProvider|liteApiGolden/i);
});

test("V3-17T one Google Hotels page maps to exactly one external session", () => {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(fixture());
  assert.equal(projection.session.sourceDatasetId, "SERPAPI_GOOGLE_HOTELS");
  assert.equal(projection.session.alternatives.length, 3);
  assert.equal(projection.session.corpusClass, "EXTERNAL_OBSERVATIONAL_CORPUS");
});

test("V3-17T pagination stays partial and never creates independent sessions", () => {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(fixture());
  assert.equal(projection.session.choiceSetCompleteness, "PARTIAL_VISIBLE_SET");
  assert.ok(projection.session.biasFlags.includes("UNOBSERVED_ALTERNATIVES"));
  assert.equal(Array.isArray(projection.session), false);
});

test("V3-17T repeated snapshots do not inflate the replay denominator", () => {
  const session = adaptSerpApiGoogleHotelsExternalSessionV3(fixture()).session;
  const result = deduplicateExternalChoiceSessionsV3([session, structuredClone(session)]);
  assert.equal(result.sessionDenominator, 1);
  assert.equal(result.duplicateFingerprints.length, 1);
});

test("V3-17T sponsored exposure is recorded as bias rather than quality", () => {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(fixture());
  const sponsored = projection.session.alternatives[0];
  assert.equal(sponsored?.sponsored.state, "KNOWN");
  assert.equal(sponsored?.sponsored.value, true);
  assert.ok(projection.session.biasFlags.includes("ADVERTISING_BIAS"));
  assert.equal(sponsored?.starRating.value, 4);
});

test("V3-17T nightly price is never promoted to total stay price", () => {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(fixture());
  const beta = projection.priceSemantics[2];
  assert.deepEqual(beta?.nightlyPrice, { state: "OBSERVED", value: 90 });
  assert.deepEqual(beta?.totalStayPrice, { state: "UNKNOWN", value: null });
});

test("V3-17T before-tax price never becomes an after-tax exact total", () => {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(fixture());
  const alpha = projection.priceSemantics[1];
  assert.deepEqual(alpha?.beforeTaxesAndFees, { state: "OBSERVED", value: 410 });
  assert.deepEqual(alpha?.taxesAndFeesKnown, { state: "UNKNOWN", value: null });
  assert.equal(projection.session.alternatives[1]?.exactPriceMinorUnits.state, "UNKNOWN");
});

test("V3-17T lowest observed price never becomes exact bookable total", () => {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(fixture());
  assert.equal(projection.priceSemantics[1]?.lowestObservedPrice.state, "OBSERVED");
  assert.deepEqual(projection.priceSemantics[1]?.exactBookableOfferKnown, { state: "UNKNOWN", value: null });
  assert.equal(projection.session.exactPriceAvailable, false);
});

test("V3-17T cache and freshness are explicit unknowns", () => {
  const price = adaptSerpApiGoogleHotelsExternalSessionV3(fixture()).priceSemantics[0];
  assert.deepEqual(price?.cachedResult, { state: "UNKNOWN", value: null });
  assert.deepEqual(price?.priceFreshness, { state: "UNKNOWN", value: null });
});

test("V3-17T missing evidence remains unknown rather than false or zero", () => {
  const beta = adaptSerpApiGoogleHotelsExternalSessionV3(fixture()).session.alternatives[2];
  assert.equal(beta?.freeCancellation.state, "UNKNOWN");
  assert.equal(beta?.amenities.state, "UNKNOWN");
  assert.equal(beta?.starRating.state, "UNKNOWN");
  assert.equal(beta?.availabilityStatus.state, "UNKNOWN");
});

test("V3-17T no click booking or post-stay outcome is fabricated", () => {
  const session = adaptSerpApiGoogleHotelsExternalSessionV3(fixture()).session;
  assert.equal(session.bookingObserved, false);
  assert.equal(session.evidenceStrength, "IMPRESSION_ONLY");
  assert.equal(session.alternatives.some((entry) => entry.clicked || entry.booked), false);
  assert.deepEqual(session.observedActions.map((entry) => entry.actionType), ["IMPRESSION"]);
});

test("V3-17T source snapshot is never automatically Golden or policy-changing", () => {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(fixture());
  assert.equal(projection.automaticGoldenAdmission, false);
  assert.equal(projection.automaticV3WeightChange, false);
  assert.equal(projection.session.automaticGoldenAdmission, false);
  assert.ok(projection.session.prohibitedClaims.includes("LIVE_GOLDEN_CORPUS"));
});

test("V3-17T terms uncertainty blocks persistent replay admission", () => {
  const session = adaptSerpApiGoogleHotelsExternalSessionV3(fixture()).session;
  const validation = validateExternalHotelChoiceSessionV3(session);
  assert.equal(validation.valid, true);
  assert.equal(validation.persistentIngestionAllowed, false);
  assert.deepEqual(validation.issues.map((entry) => entry.reasonCode), ["EXTERNAL_LICENSE_BLOCKS_PERSISTENCE"]);
});

test("V3-17T raw property tokens seller values names and pagination tokens do not persist", () => {
  const projectionText = JSON.stringify(adaptSerpApiGoogleHotelsExternalSessionV3(fixture()));
  for (const rawValue of [
    "synthetic-property-token-sponsored",
    "synthetic-property-token-alpha",
    "synthetic-property-token-beta",
    "Synthetic Hotel Alpha",
    "Synthetic Seller A",
    "synthetic-next-page-token",
  ]) assert.equal(projectionText.includes(rawValue), false, rawValue);
  assert.equal(JSON.parse(projectionText).rawProviderIdentifiersPersisted, 0);
});

test("V3-17T property token changes do not change the identity-elided winner", () => {
  const first = semanticWinner(fixture());
  const changed = fixture();
  changed.properties![0]!.property_token = "synthetic-property-token-alpha-randomized";
  changed.properties![1]!.property_token = "synthetic-property-token-beta-randomized";
  const second = semanticWinner(changed);
  assert.deepEqual(first.decisionTieProjection, second.decisionTieProjection);
  assert.equal(first.classification, second.classification);
});

test("V3-17T seller identity and provider identity do not change the decision", () => {
  const first = semanticWinner(fixture());
  const changed = fixture();
  changed.properties![0]!.prices![0]!.source = "Different Synthetic Seller";
  changed.properties![0]!.prices![1]!.source = "Another Synthetic Seller";
  const second = semanticWinner(changed);
  assert.deepEqual(first.decisionTieProjection, second.decisionTieProjection);
});

test("V3-17T input order does not change the semantic decision", () => {
  const first = semanticWinner(fixture());
  const reordered = fixture();
  reordered.properties = [...reordered.properties!].reverse();
  const second = semanticWinner(reordered);
  assert.deepEqual(first.decisionTieProjection, second.decisionTieProjection);
});

test("V3-17T meaningful evidence difference still selects a semantic winner", () => {
  const decision = semanticWinner(fixture());
  assert.equal(decision.classification, "DECISIONALLY_DISTINCT");
  assert.deepEqual(decision.decisionTieProjection, { rating: 4.8, reviews: 820 });
});

test("V3-17T source bias register contains every frozen real-market limitation", () => {
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_BIAS_REGISTER_V3.length, 18);
  for (const expected of [
    "GOOGLE_RANKING_BIAS",
    "SPONSORED_OR_ADVERTISING_BIAS",
    "INCOMPLETE_TAX_VISIBILITY",
    "PERSONALIZATION_UNCERTAINTY",
    "PAGINATION_TRUNCATION",
  ]) assert.ok(STAYOPTI_SERPAPI_GOOGLE_HOTELS_BIAS_REGISTER_V3.includes(expected as never));
});

test("V3-17T qualification does not authorize API calls or V3-18", () => {
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3.apiCallsAuthorizedInQualification, false);
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3.automaticGoldenAdmission, false);
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3.automaticV3WeightChange, false);
});

test("V3-17T future pilot freezes twelve independent sessions and a 48-call proposal", () => {
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3.sessions.length, 12);
  assert.equal(new Set(STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3.sessions.map((entry) => entry.id)).size, 12);
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3.maximumMainSearches, 12);
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3.maximumPropertyDetailEnrichmentsPerSession, 3);
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3.proposedMaximumApiCalls, 48);
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3.concurrency, 1);
  assert.equal(STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3.noCacheDecision, "DEFERRED_TO_AUTHORIZATION_GATE");
});
