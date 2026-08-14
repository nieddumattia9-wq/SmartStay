import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_DECISION_SCIENCE_BIAS_AXES_V3,
  STAYOPTI_DECISION_SCIENCE_DOMAINS_V3,
  STAYOPTI_DECISION_SCIENCE_LIBRARY_AUDIT_V3,
  STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3,
  assertDecisionScienceLibraryV3,
  createDecisionScienceLibraryV3,
  validateDecisionScienceLibraryV3,
  type StayOptiDecisionScienceLibraryInputV3,
  type StayOptiDecisionScienceLibraryV3,
} from "../../src/engine-v3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-13-decision-science-library-v1.json"
);

function loadInput(): StayOptiDecisionScienceLibraryInputV3 {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as StayOptiDecisionScienceLibraryInputV3;
}

function createLibrary(): StayOptiDecisionScienceLibraryV3 {
  return createDecisionScienceLibraryV3(loadInput());
}

function violationCodes(library: StayOptiDecisionScienceLibraryV3): string[] {
  return validateDecisionScienceLibraryV3(library).violations.map(({ code }) => code);
}

test("V3-13 builds a valid, deterministic and fingerprinted research library", () => {
  const library = createLibrary();
  const validation = validateDecisionScienceLibraryV3(library);

  assert.equal(library.libraryVersion, STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3);
  assert.equal(library.application, "offline-research-only");
  assert.equal(validation.valid, true, JSON.stringify(validation.violations));
  assert.doesNotThrow(() => assertDecisionScienceLibraryV3(library));
  assert.match(library.fingerprint, /^fnv1a32-[a-f0-9]{8}$/);
  assert.deepEqual(library.counts, {
    sources: 12,
    claims: 13,
    testMappings: 10,
    biasControls: 7,
    domains: 7,
  });
});

test("V3-13 covers every core domain and required red-team bias axis", () => {
  const library = createLibrary();
  const domains = [...new Set(library.claims.map(({ domain }) => domain))].sort();
  const sourceDomains = [...new Set(library.sources.flatMap(({ domains: values }) => values))].sort();
  const axes = [...new Set(library.biasControls.map(({ axis }) => axis))].sort();

  assert.deepEqual(domains, [...STAYOPTI_DECISION_SCIENCE_DOMAINS_V3].sort());
  assert.deepEqual(sourceDomains, [...STAYOPTI_DECISION_SCIENCE_DOMAINS_V3].sort());
  assert.deepEqual(axes, [...STAYOPTI_DECISION_SCIENCE_BIAS_AXES_V3].sort());
});

test("V3-13 canonicalization is order independent", () => {
  const input = loadInput();
  const reversed = createDecisionScienceLibraryV3({
    sources: [...input.sources].reverse(),
    claims: [...input.claims].reverse(),
    testMappings: [...input.testMappings].reverse(),
    biasControls: [...input.biasControls].reverse(),
  });

  assert.deepEqual(reversed, createLibrary());
});

test("every claim carries source, scope, strength, limits, dimensions, exclusions and reciprocal tests", () => {
  const library = createLibrary();
  const sourceIds = new Set(library.sources.map(({ id }) => id));
  const tests = new Map(library.testMappings.map((mapping) => [mapping.id, mapping]));

  for (const claim of library.claims) {
    assert.ok(claim.sourceIds.length > 0);
    assert.ok(claim.sourceIds.every((sourceId) => sourceIds.has(sourceId)));
    assert.ok(claim.scope.population.length > 0);
    assert.ok(claim.scope.geographies.length > 0);
    assert.ok(claim.scope.tripContexts.length > 0);
    assert.ok(claim.limits.length > 0);
    assert.ok(claim.biases.length > 0);
    assert.ok(claim.dimensions.includes(claim.domain));
    assert.ok(claim.nonApplicableWhen.length > 0);
    assert.ok(claim.testIds.length > 0);
    assert.equal(claim.status, "candidate-research-only");
    assert.equal(claim.directPolicyUseAllowed, false);
    assert.equal(claim.directWeightAssignmentAllowed, false);

    for (const testId of claim.testIds) {
      assert.ok(tests.get(testId)?.claimIds.includes(claim.id));
    }
  }
});

test("missing source, limits and test links fail the epistemic gate", () => {
  const input = loadInput();
  input.claims[0] = {
    ...input.claims[0],
    sourceIds: ["source-does-not-exist"],
    limits: [],
    testIds: ["test-does-not-exist"],
  };
  const invalid = createDecisionScienceLibraryV3(input);
  const codes = violationCodes(invalid);

  assert.ok(codes.includes("claim-source-missing"));
  assert.ok(codes.includes("claim-limits-missing"));
  assert.ok(codes.includes("test-link-invalid"));
  assert.throws(() => assertDecisionScienceLibraryV3(invalid));
});

test("industry and institutional evidence cannot be elevated above exploratory", () => {
  const input = loadInput();
  const claimIndex = input.claims.findIndex(({ id }) => id === "claim-long-stay-capabilities-exploratory");
  assert.notEqual(claimIndex, -1);
  input.claims[claimIndex] = {
    ...input.claims[claimIndex],
    strength: "strong",
  };

  assert.ok(
    violationCodes(createDecisionScienceLibraryV3(input)).includes("claim-strength-invalid")
  );
});

test("direct policy, ranking, weights, promotion and provider use remain fail-closed", () => {
  const library = createLibrary();

  assert.equal(library.directPolicyAdoptionAllowed, false);
  assert.equal(library.directWeightAssignmentAllowed, false);
  assert.equal(library.rankingMutationAllowed, false);
  assert.equal(library.publicPromotionAllowed, false);
  assert.equal(library.providerCallsAllowed, false);

  const tampered = {
    ...library,
    rankingMutationAllowed: true,
  } as unknown as StayOptiDecisionScienceLibraryV3;
  const codes = violationCodes(tampered);
  assert.ok(codes.includes("policy-firewall-open"));
  assert.ok(codes.includes("fingerprint-invalid"));
});

test("source registry exposes durable locators, explicit uncertainty and review lifecycle", () => {
  const library = createLibrary();

  for (const source of library.sources) {
    assert.match(source.locator, /^https:\/\//);
    assert.ok(source.limitations.length > 0);
    assert.ok(source.fundingDisclosure.length > 0);
    assert.match(source.reviewedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(source.reviewBy, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(source.reviewBy > source.reviewedOn);
  }

  const unknownSampleSources = library.sources.filter(({ sampleSize }) => sampleSize === null);
  assert.ok(unknownSampleSources.length > 0);
  assert.ok(unknownSampleSources.every(({ limitations }) => limitations.length > 0));
});

test("official stars and guest reviews remain distinct research signals", () => {
  const library = createLibrary();
  const claim = library.claims.find(({ id }) => id === "claim-stars-and-reviews-not-substitutes");
  const mapping = library.testMappings.find(({ id }) => id === "test-star-rating-not-review-substitute");

  assert.notEqual(claim, undefined);
  assert.equal(claim?.sourceIds[0], "source-official-vs-review-arzaghi-2023");
  assert.equal(mapping?.status, "automated");
  assert.match(mapping?.assertion ?? "", /separate fields, scales and provenance/i);
});

test("commercially exposed evidence is visible and constrained", () => {
  const library = createLibrary();
  const source = library.sources.find(({ id }) => id === "source-long-stay-gbta-2022");
  const claim = library.claims.find(({ id }) => id === "claim-long-stay-capabilities-exploratory");

  assert.equal(source?.sourceType, "industry-survey");
  assert.equal(source?.commercialInterestRisk, "high");
  assert.match(source?.fundingDisclosure ?? "", /WWStay/);
  assert.equal(claim?.strength, "exploratory");
  assert.equal(claim?.directWeightAssignmentAllowed, false);
});

test("V3-13 audit freezes all public and commercial boundaries", () => {
  assert.deepEqual(STAYOPTI_DECISION_SCIENCE_LIBRARY_AUDIT_V3, {
    application: "offline-research-only",
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    rankingWeightsChanged: false,
    thresholdsChanged: false,
    offerSelectionChanged: false,
    directPolicyAdoptionAllowed: false,
    directWeightAssignmentAllowed: false,
    providerCallsAllowed: false,
    bookingOrPaymentChanged: false,
    analyticsChanged: false,
  });
  assert.equal(Object.isFrozen(STAYOPTI_DECISION_SCIENCE_LIBRARY_AUDIT_V3), true);
});
