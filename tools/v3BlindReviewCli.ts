import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  createBlindEvaluationFromReviewResponsesV3,
  createRealCaseBlindReviewBundleV3,
  renderBlindReviewHtmlV3,
  validateRealCaseBlindReviewBundleV3,
  type StayOptiBlindReviewAssignmentsV3,
  type StayOptiBlindReviewPacketV3,
  type StayOptiBlindReviewResponseV3,
  type StayOptiRealCaseBlindReviewSourceV3,
} from "../src/engine-v3";

interface CreateInputDocument {
  schemaVersion:
    "3.0.0-real-case-capture-input.1";

  cases:
    StayOptiRealCaseBlindReviewSourceV3[];
}

interface ResponseDocument {
  packetId:
    string;

  packetFingerprint:
    string;

  responses:
    StayOptiBlindReviewResponseV3[];
}

function fail(
  message:
    string
): never {
  throw new Error(
    message
  );
}

function parseOptions(
  values:
    readonly string[]
) {
  const parsed:
    Record<string, string> = {};

  for (
    let index =
      0;
    index <
      values.length;
    index +=
      2
  ) {
    const key =
      values[index];

    const value =
      values[index +
        1];

    if (
      key ===
        undefined ||
      value ===
        undefined ||
      !key.startsWith(
        "--"
      )
    ) {
      fail(
        `Invalid option near ${key ?? "<end>"}.`
      );
    }

    parsed[
      key.slice(
        2
      )
    ] =
      value;
  }

  return parsed;
}

function requireOption(
  options:
    Record<string, string>,
  name:
    string
) {
  const value =
    options[name];

  if (
    value ===
      undefined ||
    value.trim().length ===
      0
  ) {
    fail(
      `Missing required option --${name}.`
    );
  }

  return resolve(
    value
  );
}

function readJson<
  Value
>(
  path:
    string
) {
  if (
    !existsSync(
      path
    )
  ) {
    fail(
      `Input file not found: ${path}`
    );
  }

  return JSON.parse(
    readFileSync(
      path,
      "utf8"
    )
  ) as Value;
}

function writeJson(
  path:
    string,
  value:
    unknown
) {
  writeFileSync(
    path,
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    "utf8"
  );
}

function runCreate(
  options:
    Record<string, string>
) {
  const inputPath =
    requireOption(
      options,
      "input"
    );

  const outputRoot =
    requireOption(
      options,
      "output"
    );

  const document =
    readJson<CreateInputDocument>(
      inputPath
    );

  if (
    document.schemaVersion !==
      "3.0.0-real-case-capture-input.1" ||
    !Array.isArray(
      document.cases
    )
  ) {
    fail(
      "Input must use schema 3.0.0-real-case-capture-input.1 and contain a cases array."
    );
  }

  const bundle =
    createRealCaseBlindReviewBundleV3(
      document.cases
    );

  const validation =
    validateRealCaseBlindReviewBundleV3(
      bundle
    );

  if (
    !validation.valid
  ) {
    fail(
      `Generated bundle failed validation: ${validation.issues.join(", ")}.`
    );
  }

  mkdirSync(
    outputRoot,
    {
      recursive:
        true,
    }
  );

  writeJson(
    resolve(
      outputRoot,
      "blind-review-packet.json"
    ),
    bundle.packet
  );

  writeJson(
    resolve(
      outputRoot,
      "sealed-assignments.json"
    ),
    bundle.assignments
  );

  writeFileSync(
    resolve(
      outputRoot,
      "blind-review.html"
    ),
    renderBlindReviewHtmlV3(
      bundle.packet
    ),
    "utf8"
  );

  const summary = {
    status:
      "PASS",
    operation:
      "create-blind-review-kit",
    application:
      "offline-human-review-only",
    packetId:
      bundle.packet
        .packetId,
    packetFingerprint:
      bundle.packet
        .fingerprint,
    thresholdFingerprint:
      bundle.packet
        .thresholdFingerprint,
    counts:
      bundle.packet
        .counts,
    rawInputCopied:
      false,
    providerIdentityInReviewPacket:
      false,
    propertyIdentityInReviewPacket:
      false,
    publicV2Changed:
      false,
    publicV3Enabled:
      false,
    splitEnabled:
      false,
    automaticPromotionAllowed:
      false,
  };

  writeJson(
    resolve(
      outputRoot,
      "capture-summary.json"
    ),
    summary
  );

  writeFileSync(
    resolve(
      outputRoot,
      "README.txt"
    ),
    [
      "STAYOPTI V3-10B - BLIND REVIEW KIT",
      "",
      "1. Give the reviewer only blind-review.html.",
      "2. Keep sealed-assignments.json unavailable to reviewers.",
      "3. The reviewer opens the HTML offline and downloads a response JSON.",
      "4. Use the deblind command only after response collection is closed.",
      "5. This kit does not prove V3 superiority and cannot enable production.",
      "",
    ].join(
      "\n"
    ),
    "utf8"
  );

  console.log(
    JSON.stringify(
      summary,
      null,
      2
    )
  );
}

function runDeblind(
  options:
    Record<string, string>
) {
  const packetPath =
    requireOption(
      options,
      "packet"
    );

  const assignmentsPath =
    requireOption(
      options,
      "assignments"
    );

  const responsesPath =
    requireOption(
      options,
      "responses"
    );

  const outputPath =
    requireOption(
      options,
      "output"
    );

  const packet =
    readJson<StayOptiBlindReviewPacketV3>(
      packetPath
    );

  const assignments =
    readJson<StayOptiBlindReviewAssignmentsV3>(
      assignmentsPath
    );

  const responses =
    readJson<ResponseDocument>(
      responsesPath
    );

  if (
    responses.packetId !==
      packet.packetId ||
    responses.packetFingerprint !==
      packet.fingerprint ||
    !Array.isArray(
      responses.responses
    )
  ) {
    fail(
      "Response document does not match the sealed packet."
    );
  }

  const evaluation =
    createBlindEvaluationFromReviewResponsesV3(
      {
        packet,
        assignments,
      },
      responses.responses
    );

  mkdirSync(
    resolve(
      outputPath,
      ".."
    ),
    {
      recursive:
        true,
    }
  );

  writeJson(
    outputPath,
    evaluation
  );

  console.log(
    JSON.stringify(
      {
        status:
          "PASS",
        operation:
          "deblind-review-responses",
        output:
          outputPath,
        counts:
          evaluation.counts,
        automaticPromotionAllowed:
          false,
      },
      null,
      2
    )
  );
}

const command =
  process.argv[2];

const options =
  parseOptions(
    process.argv.slice(
      3
    )
  );

if (
  command ===
    "create"
) {
  runCreate(
    options
  );
}
else if (
  command ===
    "deblind"
) {
  runDeblind(
    options
  );
}
else {
  fail(
    "Usage: create --input <json> --output <directory> OR deblind --packet <json> --assignments <json> --responses <json> --output <json>."
  );
}
