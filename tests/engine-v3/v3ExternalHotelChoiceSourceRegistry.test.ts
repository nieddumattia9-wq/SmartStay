import assert from "node:assert/strict";
import test from "node:test";

import {
  STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3,
  type StayOptiExternalHotelChoiceSourceV3,
  classifyExternalObservedOutcomeV3,
  evaluateExternalSourceIngestionV3,
  validateExternalHotelChoiceSourceRegistryV3,
} from "../../src/engine-v3/evaluation/externalHotelChoiceSourceRegistryV3";

function source(sourceId: string) {
  const entry = STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3.find(
    (candidate) => candidate.sourceId === sourceId,
  );
  assert.ok(entry, `missing source ${sourceId}`);
  return entry;
}

test("V3-17S.1 freezes the corrected source-role strategy", () => {
  assert.equal(source("EXPEDIA_RECTOUR_2021").sourceRole, "PRIMARY_BOOKING_CHOICE_DATASET_TARGET");
  assert.equal(
    source("TRIVAGO_RECSYS_CHALLENGE_2019").sourceRole,
    "SECONDARY_SESSION_INTENT_AND_CLICK_BENCHMARK",
  );
  assert.equal(
    source("EXPEDIA_PERSONALIZED_SORT_2013").sourceRole,
    "CONDITIONAL_CLICK_AND_BOOKING_RANKING_BENCHMARK",
  );
  assert.equal(validateExternalHotelChoiceSourceRegistryV3().valid, true);
});

test("V3-17S.1 click-out is not promoted to booking", () => {
  const trivago = source("TRIVAGO_RECSYS_CHALLENGE_2019");
  assert.equal(trivago.hasClick, true);
  assert.equal(trivago.hasBooking, false);
  assert.equal(trivago.observedOutcomeType.includes("CLICK_OUT"), true);
  assert.equal(trivago.observedOutcomeType.includes("BOOKING_OBSERVED"), false);
});

test("V3-17S.1 booking remains a confounded revealed preference rather than objective best", () => {
  assert.equal(
    classifyExternalObservedOutcomeV3("BOOKING_OBSERVED"),
    "STRONG_REVEALED_PREFERENCE_WITH_CONFOUNDERS",
  );
  assert.equal(
    classifyExternalObservedOutcomeV3("CLICK_OUT"),
    "MODERATE_REVEALED_PREFERENCE_WITH_CONFOUNDERS",
  );
  assert.ok(source("EXPEDIA_RECTOUR_2021").forbiddenClaims.includes("OBJECTIVE_BEST_CHOICE"));
});

test("V3-17S.1 Trivago cannot be promoted to primary booking source", () => {
  const invalid = {
    ...source("TRIVAGO_RECSYS_CHALLENGE_2019"),
    sourceRole: "PRIMARY_BOOKING_CHOICE_DATASET_TARGET",
  } as unknown as StayOptiExternalHotelChoiceSourceV3;
  const result = validateExternalHotelChoiceSourceRegistryV3([invalid]);
  assert.ok(result.issues.some((entry) => entry.reasonCode === "EXTERNAL_SOURCE_ROLE_INVALID"));
});

test("V3-17S.1 ingestion is denied without file-level provenance and license", () => {
  for (const entry of STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3) {
    const admission = evaluateExternalSourceIngestionV3(entry);
    assert.equal(admission.ingestionAllowed, false);
    assert.ok(admission.reasonCodes.includes("EXTERNAL_SOURCE_INGESTION_WITHOUT_FILE_PROVENANCE"));
    assert.ok(admission.reasonCodes.includes("EXTERNAL_SOURCE_INGESTION_WITHOUT_FILE_LICENSE"));
  }
});

test("V3-17S.1 an unverified mirror remains inadmissible", () => {
  const mirror = {
    ...source("EXPEDIA_RECTOUR_2021"),
    accessStatus: "OFFICIAL_FILE_AVAILABLE",
    provenanceStatus: "UNVERIFIED_MIRROR",
    licenseStatus: "FILE_LEVEL_LICENSE_VERIFIED",
    commercialUseStatus: "YES",
    ingestionAllowed: true,
  } as const satisfies StayOptiExternalHotelChoiceSourceV3;
  const result = validateExternalHotelChoiceSourceRegistryV3([mirror]);
  assert.ok(result.issues.some((entry) => entry.reasonCode === "EXTERNAL_SOURCE_MIRROR_NOT_ADMISSIBLE"));
  assert.equal(evaluateExternalSourceIngestionV3(mirror).ingestionAllowed, false);
});

test("V3-17S.1 external observations cannot modify V3 automatically", () => {
  const invalid = {
    ...source("EXPEDIA_RECTOUR_2021"),
    automaticV3ChangeAllowed: true,
  } as unknown as StayOptiExternalHotelChoiceSourceV3;
  const result = validateExternalHotelChoiceSourceRegistryV3([invalid]);
  assert.ok(
    result.issues.some(
      (entry) => entry.reasonCode === "EXTERNAL_SOURCE_AUTOMATIC_V3_CHANGE_FORBIDDEN",
    ),
  );
});

test("V3-17S.1 external replays never become real Golden cases", () => {
  const invalid = {
    ...source("EXPEDIA_PERSONALIZED_SORT_2013"),
    goldenEligibility: "REAL_GOLDEN",
  } as unknown as StayOptiExternalHotelChoiceSourceV3;
  const result = validateExternalHotelChoiceSourceRegistryV3([invalid]);
  assert.ok(
    result.issues.some((entry) => entry.reasonCode === "EXTERNAL_SOURCE_GOLDEN_BOUNDARY_VIOLATION"),
  );
  for (const entry of STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3) {
    assert.equal(entry.goldenEligibility, "EXTERNAL_OBSERVATIONAL_NOT_REAL_GOLDEN");
  }
});

test("V3-17S.1 external access hold does not block real Golden collection", () => {
  const result = validateExternalHotelChoiceSourceRegistryV3();
  assert.equal(result.externalDataBlocksRealGoldenCollection, false);
  assert.equal(result.externalDataAutomaticallyChangesV3, false);
  assert.equal(result.ingestedSourceCount, 0);
});

test("V3-17S.1 registry is deterministic, unique and contains no admitted source", () => {
  const first = validateExternalHotelChoiceSourceRegistryV3();
  const second = validateExternalHotelChoiceSourceRegistryV3(
    [...STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3],
  );
  assert.deepEqual(first, second);
  assert.equal(new Set(STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3.map((entry) => entry.sourceId)).size, 3);
  assert.equal(STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3.every((entry) => !entry.ingestionAllowed), true);
});
