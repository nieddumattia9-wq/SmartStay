import {
  createHash,
} from "node:crypto";

import fs from "node:fs";
import path from "node:path";

const RELEASE_CANDIDATE_VERSION =
  "39C22C-release-candidate-v1";

const REMOTE_SMOKE_VERSION =
  "39C22B-staging-runtime-smoke-v1";

const LIVE_JOURNEY_VERSION =
  "39C22C-live-staging-journey-v1";

const PRODUCTION_PLAN_VERSION =
  "39C22C-production-release-plan-v1";

const REQUIRED_LIVE_JOURNEY_CHECKS =
  Object.freeze([
    "destinationSearch",
    "hotelSearch",
    "lifecycle",
    "engineSelectedDetails",
    "selectedOfferIntegrity",
    "offerRecheck",
    "secureHandoff",
    "publicRedaction",
    "browserConsole",
  ]);

function fail(
  message,
  {
    code =
      "RELEASE_GATE_FAILED",
    detail =
      null,
  } = {}
) {
  const error =
    new Error(
      message
    );

  error.name =
    "SmartStayReleaseGateError";

  error.code =
    code;

  error.detail =
    detail;

  throw error;
}

function assert(
  condition,
  message,
  options =
    {}
) {
  if (!condition) {
    fail(
      message,
      options
    );
  }
}

function normalizeSha(
  value,
  field =
    "release SHA"
) {
  const candidate =
    typeof value ===
      "string"
      ? value.trim()
      : "";

  assert(
    /^[0-9a-f]{7,64}$/i.test(
      candidate
    ),
    `${field} is invalid.`,
    {
      code:
        "INVALID_RELEASE_SHA",
    }
  );

  return candidate.toLowerCase();
}

function normalizePublicHttpsUrl(
  value,
  field,
  {
    originOnly =
      false,
  } = {}
) {
  const candidate =
    typeof value ===
      "string"
      ? value.trim()
      : "";

  assert(
    candidate,
    `${field} is required.`,
    {
      code:
        "RELEASE_URL_REQUIRED",
    }
  );

  let parsed;

  try {
    parsed =
      new URL(
        candidate
      );
  } catch {
    fail(
      `${field} must be a valid public HTTPS URL.`,
      {
        code:
          "INVALID_RELEASE_URL",
      }
    );
  }

  assert(
    parsed.protocol ===
      "https:" &&
    parsed.hostname &&
    parsed.hostname !==
      "localhost" &&
    parsed.hostname !==
      "127.0.0.1" &&
    !parsed.username &&
    !parsed.password &&
    !parsed.search &&
    !parsed.hash,
    `${field} must be a public HTTPS URL without credentials, query, or hash.`,
    {
      code:
        "HTTPS_RELEASE_URL_REQUIRED",
    }
  );

  if (originOnly) {
    assert(
      parsed.origin ===
        candidate.replace(
          /\/$/,
          ""
        ),
      `${field} must be an exact origin.`,
      {
        code:
          "RELEASE_ORIGIN_REQUIRED",
      }
    );

    return parsed.origin;
  }

  return parsed
    .toString()
    .replace(
      /\/$/,
      ""
    );
}

function sha256Buffer(
  value
) {
  return createHash(
    "sha256"
  )
    .update(
      value
    )
    .digest(
      "hex"
    );
}

function sha256File(
  filePath
) {
  return sha256Buffer(
    fs.readFileSync(
      filePath
    )
  );
}

function normalizeArtifactPath(
  value
) {
  const candidate =
    typeof value ===
      "string"
      ? value
          .trim()
          .replaceAll(
            "\\",
            "/"
          )
      : "";

  assert(
    candidate &&
    !candidate.startsWith(
      "/"
    ) &&
    !candidate.includes(
      "\0"
    ),
    "Release artifact path is invalid.",
    {
      code:
        "INVALID_ARTIFACT_PATH",
    }
  );

  const segments =
    candidate
      .split(
        "/"
      );

  assert(
    segments.every(
      (segment) =>
        segment &&
        segment !==
          "." &&
        segment !==
          ".."
    ),
    "Release artifact path may not traverse directories.",
    {
      code:
        "ARTIFACT_PATH_TRAVERSAL",
    }
  );

  const lower =
    candidate
      .toLowerCase();

  assert(
    !segments.some(
      (segment) =>
        segment.toLowerCase() ===
          "node_modules" ||
        segment.toLowerCase() ===
          ".git"
    ) &&
    !segments.some(
      (segment) =>
        segment.toLowerCase() ===
          ".env" ||
        segment
          .toLowerCase()
          .startsWith(
            ".env."
          )
    ),
    "Release candidate may not contain dependencies, Git metadata, or environment files.",
    {
      code:
        "FORBIDDEN_ARTIFACT_PATH",
      detail:
        candidate,
    }
  );

  return candidate;
}

function createFileEntry(
  rootPath,
  relativePath
) {
  const normalized =
    normalizeArtifactPath(
      relativePath
    );

  const absolutePath =
    path.resolve(
      rootPath,
      normalized
    );

  const root =
    path.resolve(
      rootPath
    );

  assert(
    absolutePath ===
      root ||
    absolutePath.startsWith(
      `${root}${path.sep}`
    ),
    "Release artifact escaped its root.",
    {
      code:
        "ARTIFACT_ROOT_ESCAPE",
    }
  );

  const stat =
    fs.statSync(
      absolutePath
    );

  assert(
    stat.isFile(),
    `Release artifact is not a file: ${normalized}`,
    {
      code:
        "ARTIFACT_FILE_REQUIRED",
    }
  );

  return Object.freeze({
    path:
      normalized,
    sizeBytes:
      stat.size,
    sha256:
      sha256File(
        absolutePath
      ),
  });
}

function aggregateFileEntries(
  entries
) {
  const normalized =
    entries
      .map(
        (entry) => ({
          path:
            normalizeArtifactPath(
              entry.path
            ),
          sizeBytes:
            Number(
              entry.sizeBytes
            ),
          sha256:
            String(
              entry.sha256 ??
              ""
            ).toLowerCase(),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.path.localeCompare(
            right.path
          )
      );

  for (
    const entry of
    normalized
  ) {
    assert(
      Number.isSafeInteger(
        entry.sizeBytes
      ) &&
      entry.sizeBytes >=
        0,
      `Invalid artifact size for ${entry.path}.`,
      {
        code:
          "INVALID_ARTIFACT_SIZE",
      }
    );

    assert(
      /^[0-9a-f]{64}$/.test(
        entry.sha256
      ),
      `Invalid artifact hash for ${entry.path}.`,
      {
        code:
          "INVALID_ARTIFACT_HASH",
      }
    );
  }

  return sha256Buffer(
    normalized
      .map(
        (entry) =>
          `${entry.sha256} ${entry.sizeBytes} ${entry.path}\n`
      )
      .join(
        ""
      )
  );
}

function validateArtifactGroup(
  group,
  field
) {
  assert(
    group &&
    typeof group ===
      "object",
    `${field} artifact group is required.`,
    {
      code:
        "ARTIFACT_GROUP_REQUIRED",
    }
  );

  assert(
    Array.isArray(
      group.files
    ) &&
    group.files.length >
      0,
    `${field} must contain files.`,
    {
      code:
        "ARTIFACT_FILES_REQUIRED",
    }
  );

  const seen =
    new Set();

  for (
    const entry of
    group.files
  ) {
    const normalizedPath =
      normalizeArtifactPath(
        entry?.path
      );

    assert(
      !seen.has(
        normalizedPath
      ),
      `Duplicate artifact path: ${normalizedPath}`,
      {
        code:
          "DUPLICATE_ARTIFACT_PATH",
      }
    );

    seen.add(
      normalizedPath
    );
  }

  const aggregate =
    aggregateFileEntries(
      group.files
    );

  assert(
    aggregate ===
      String(
        group.aggregateSha256 ??
        ""
      ).toLowerCase(),
    `${field} aggregate checksum does not match.`,
    {
      code:
        "ARTIFACT_AGGREGATE_MISMATCH",
    }
  );

  return true;
}

function validateReleaseCandidateManifest(
  manifest,
  {
    expectedReleaseSha =
      null,
  } = {}
) {
  assert(
    manifest &&
    typeof manifest ===
      "object",
    "Release candidate manifest is required.",
    {
      code:
        "RELEASE_MANIFEST_REQUIRED",
    }
  );

  assert(
    manifest.reportVersion ===
      RELEASE_CANDIDATE_VERSION &&
    manifest.kind ===
      "smartstay-release-candidate",
    "Unsupported release candidate manifest.",
    {
      code:
        "UNSUPPORTED_RELEASE_MANIFEST",
    }
  );

  const releaseSha =
    normalizeSha(
      manifest.releaseSha
    );

  if (
    expectedReleaseSha
  ) {
    assert(
      releaseSha ===
        normalizeSha(
          expectedReleaseSha,
          "expected release SHA"
        ),
      "Release candidate SHA does not match the expected commit.",
      {
        code:
          "RELEASE_SHA_MISMATCH",
      }
    );
  }

  validateArtifactGroup(
    manifest.artifacts
      ?.frontend,
    "frontend"
  );

  validateArtifactGroup(
    manifest.artifacts
      ?.backend,
    "backend"
  );

  assert(
    manifest.constraints
      ?.singleBackendInstance ===
        true &&
    manifest.constraints
      ?.runtimeStateMode ===
        "in-memory-single-instance" &&
    manifest.constraints
      ?.routeStackRequired ===
        false,
    "Release runtime constraints are incomplete.",
    {
      code:
        "RELEASE_CONSTRAINTS_INVALID",
    }
  );

  for (
    const lock of
    Object.values(
      manifest.lockfiles ??
      {}
    )
  ) {
    assert(
      lock &&
      /^[0-9a-f]{64}$/.test(
        String(
          lock.sha256 ??
          ""
        )
      ) &&
      Number.isSafeInteger(
        Number(
          lock.sizeBytes
        )
      ),
      "Release lockfile evidence is invalid.",
      {
        code:
          "LOCKFILE_EVIDENCE_INVALID",
      }
    );
  }

  return Object.freeze({
    releaseSha,
  });
}

function verifyManifestFiles(
  manifest,
  rootPath
) {
  const root =
    path.resolve(
      rootPath
    );

  for (
    const groupName of
    [
      "frontend",
      "backend",
    ]
  ) {
    const group =
      manifest.artifacts[
        groupName
      ];

    for (
      const entry of
      group.files
    ) {
      const actual =
        createFileEntry(
          root,
          entry.path
        );

      assert(
        actual.sizeBytes ===
          entry.sizeBytes &&
        actual.sha256 ===
          entry.sha256,
        `Release artifact differs from its manifest: ${entry.path}`,
        {
          code:
            "RELEASE_ARTIFACT_MISMATCH",
        }
      );
    }
  }

  for (
    const [
      relativePath,
      expected,
    ] of
    Object.entries(
      manifest.lockfiles ??
      {}
    )
  ) {
    const actual =
      createFileEntry(
        root,
        relativePath
      );

    assert(
      actual.sizeBytes ===
        expected.sizeBytes &&
      actual.sha256 ===
        expected.sha256,
      `Lockfile differs from its release manifest: ${relativePath}`,
      {
        code:
          "RELEASE_LOCKFILE_MISMATCH",
      }
    );
  }

  return true;
}

function validateRemoteSmokeReport(
  report,
  releaseSha
) {
  assert(
    report?.reportVersion ===
      REMOTE_SMOKE_VERSION &&
    report?.validationResult ===
      "PASS" &&
    report?.mode ===
      "remote",
    "A passing remote staging smoke report is required.",
    {
      code:
        "REMOTE_STAGING_SMOKE_REQUIRED",
    }
  );

  assert(
    normalizeSha(
      report.releaseSha
    ) ===
      normalizeSha(
        releaseSha
      ),
    "Remote staging smoke tested a different release.",
    {
      code:
        "STAGING_SMOKE_SHA_MISMATCH",
    }
  );

  assert(
    Array.isArray(
      report.checks
    ) &&
    report.checks.length >
      0 &&
    report.checks.every(
      (check) =>
        check?.passed ===
          true
    ),
    "Every remote staging smoke check must pass.",
    {
      code:
        "REMOTE_STAGING_SMOKE_FAILED",
    }
  );

  assert(
    Number(
      report.liveProviderCalls ??
      0
    ) ===
      0,
    "The safe remote smoke must not call providers.",
    {
      code:
        "REMOTE_SMOKE_PROVIDER_CALLS_NOT_ZERO",
    }
  );

  normalizePublicHttpsUrl(
    report.frontendUrl,
    "staging frontend URL"
  );

  normalizePublicHttpsUrl(
    report.backendUrl,
    "staging backend URL"
  );

  return true;
}

function validateLiveStagingJourneyReport(
  report,
  releaseSha
) {
  assert(
    report?.reportVersion ===
      LIVE_JOURNEY_VERSION &&
    report?.validationResult ===
      "PASS",
    "A passing controlled live staging journey report is required.",
    {
      code:
        "LIVE_STAGING_JOURNEY_REQUIRED",
    }
  );

  assert(
    normalizeSha(
      report.releaseSha
    ) ===
      normalizeSha(
        releaseSha
      ),
    "The controlled live staging journey tested a different release.",
    {
      code:
        "LIVE_JOURNEY_SHA_MISMATCH",
    }
  );

  const providerCalls =
    Number(
      report.liveProviderCalls
    );

  assert(
    Number.isInteger(
      providerCalls
    ) &&
    providerCalls >=
      2 &&
    providerCalls <=
      20,
    "Controlled live staging evidence must contain a bounded number of real provider calls.",
    {
      code:
        "LIVE_PROVIDER_CALL_COUNT_INVALID",
    }
  );

  for (
    const checkName of
    REQUIRED_LIVE_JOURNEY_CHECKS
  ) {
    assert(
      report.checks?.[
        checkName
      ] ===
        "PASS",
      `Controlled live staging check did not pass: ${checkName}`,
      {
        code:
          "LIVE_JOURNEY_CHECK_FAILED",
        detail:
          checkName,
      }
    );
  }

  assert(
    report.checkoutHttps ===
      true &&
    Number(
      report.secretLeaks
    ) ===
      0 &&
    Number(
      report.providerPrivateLeaks
    ) ===
      0,
    "Live staging journey security evidence is incomplete.",
    {
      code:
        "LIVE_JOURNEY_SECURITY_FAILED",
    }
  );

  return true;
}

function validateRollbackManifests(
  currentManifest,
  rollbackManifest
) {
  const current =
    validateReleaseCandidateManifest(
      currentManifest
    );

  const rollback =
    validateReleaseCandidateManifest(
      rollbackManifest
    );

  assert(
    current.releaseSha !==
      rollback.releaseSha,
    "Rollback candidate must differ from the current release.",
    {
      code:
        "ROLLBACK_SHA_EQUALS_CURRENT",
    }
  );

  return Object.freeze({
    currentSha:
      current.releaseSha,
    rollbackSha:
      rollback.releaseSha,
  });
}

function createProductionReleasePlan({
  candidateManifest,
  stagingSmokeReport,
  liveJourneyReport,
  rollbackManifest,
  productionFrontendUrl,
  productionBackendUrl,
  evidenceHashes =
    {},
}) {
  const candidate =
    validateReleaseCandidateManifest(
      candidateManifest
    );

  validateRemoteSmokeReport(
    stagingSmokeReport,
    candidate.releaseSha
  );

  validateLiveStagingJourneyReport(
    liveJourneyReport,
    candidate.releaseSha
  );

  const rollback =
    validateRollbackManifests(
      candidateManifest,
      rollbackManifest
    );

  const frontendUrl =
    normalizePublicHttpsUrl(
      productionFrontendUrl,
      "production frontend URL"
    );

  const backendUrl =
    normalizePublicHttpsUrl(
      productionBackendUrl,
      "production backend URL"
    );

  for (
    const [
      name,
      value,
    ] of
    Object.entries(
      evidenceHashes
    )
  ) {
    assert(
      /^[0-9a-f]{64}$/.test(
        String(
          value
        )
      ),
      `Evidence checksum is invalid: ${name}`,
      {
        code:
          "INVALID_EVIDENCE_HASH",
      }
    );
  }

  return Object.freeze({
    reportVersion:
      PRODUCTION_PLAN_VERSION,
    generatedAt:
      new Date()
        .toISOString(),
    validationResult:
      "PASS",
    candidateSha:
      candidate.releaseSha,
    rollbackSha:
      rollback.rollbackSha,
    production: {
      frontendUrl,
      backendUrl,
      singleBackendInstance:
        true,
      manualApprovalRequired:
        true,
    },
    evidence: {
      hashes:
        evidenceHashes,
      remoteStagingSmoke:
        "PASS",
      controlledLiveStagingJourney:
        "PASS",
      rollbackCandidate:
        "PASS",
    },
    actions: {
      deployExecuted:
        false,
      tagCreated:
        false,
      releaseCreated:
        false,
      rollbackExecuted:
        false,
    },
  });
}

function readJsonFile(
  filePath
) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8"
    )
  );
}

function writeJsonFile(
  filePath,
  value
) {
  fs.mkdirSync(
    path.dirname(
      filePath
    ),
    {
      recursive:
        true,
    }
  );

  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    "utf8"
  );
}

export {
  LIVE_JOURNEY_VERSION,
  PRODUCTION_PLAN_VERSION,
  RELEASE_CANDIDATE_VERSION,
  REMOTE_SMOKE_VERSION,
  REQUIRED_LIVE_JOURNEY_CHECKS,
  aggregateFileEntries,
  assert,
  createFileEntry,
  createProductionReleasePlan,
  fail,
  normalizeArtifactPath,
  normalizePublicHttpsUrl,
  normalizeSha,
  readJsonFile,
  sha256Buffer,
  sha256File,
  validateArtifactGroup,
  validateLiveStagingJourneyReport,
  validateReleaseCandidateManifest,
  validateRemoteSmokeReport,
  validateRollbackManifests,
  verifyManifestFiles,
  writeJsonFile,
};
