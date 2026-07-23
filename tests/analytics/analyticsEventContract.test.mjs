import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  test,
} from "node:test";
import {
  fileURLToPath,
} from "node:url";

import {
  assertValidAnalyticsContract,
  loadAnalyticsContract,
  validateAnalyticsContract,
} from "../../scripts/analyticsContractCore.mjs";

const testDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositoryRoot =
  path.resolve(
    testDirectory,
    "..",
    ".."
  );

const contractPath =
  path.join(
    repositoryRoot,
    "contracts",
    "analytics-event-contract.v1.json"
  );

function loadRawContract() {
  return JSON.parse(
    fs.readFileSync(
      contractPath,
      "utf8"
    )
  );
}

test(
  "analytics contract is provider-neutral, first-party-only and disabled by default",
  () => {
    const contract =
      loadAnalyticsContract(
        contractPath
      );

    assert.equal(
      contract.transport.mode,
      "first-party-only"
    );

    assert.equal(
      contract.transport.defaultEnabled,
      false
    );

    assert.equal(
      contract.transport.externalSdkAllowed,
      false
    );

    assert.equal(
      contract.transport.cookiesAllowed,
      false
    );

    assert.equal(
      contract.session.storage,
      "sessionStorage"
    );

    assert.equal(
      contract.session.crossSessionTracking,
      false
    );

    assert.equal(
      contract.session.persistentUserId,
      false
    );

    assert.equal(
      contract.session.fingerprinting,
      false
    );

    assert.equal(
      contract.privacySignals
        .respectDoNotTrack,
      true
    );

    assert.equal(
      contract.privacySignals
        .respectGlobalPrivacyControl,
      true
    );

    assert.equal(
      Object.keys(
        contract.events
      ).length,
      16
    );
  }
);

test(
  "analytics contract forbids raw travel, booking, provider and personal identifiers",
  () => {
    const contract =
      loadRawContract();

    const forbidden =
      new Set(
        contract.forbiddenFields
      );

    for (
      const field of
      [
        "destination",
        "destinationId",
        "checkIn",
        "checkOut",
        "budget",
        "childAges",
        "hotelId",
        "offerId",
        "verificationId",
        "handoffId",
        "searchId",
        "requestId",
        "providerId",
        "providerContext",
        "email",
        "phone",
        "ip",
        "userAgent",
        "referrer",
        "url",
        "cookie",
        "token",
        "apiKey",
      ]
    ) {
      assert.equal(
        forbidden.has(
          field
        ),
        true,
        `${field} must remain forbidden`
      );
    }

    const serialized =
      JSON.stringify(
        contract.events
      );

    for (
      const field of
      forbidden
    ) {
      assert.equal(
        serialized.includes(
          `"${field}"`
        ),
        false,
        `${field} must not be referenced by an event`
      );
    }
  }
);

test(
  "analytics contract rejects destination data and persistent tracking regressions",
  () => {
    const contract =
      loadRawContract();

    contract.propertyDefinitions
      .destination =
      {
        type:
          "string",
        maximumLength:
          64,
        pattern:
          "^.+$",
      };

    contract.events
      .search_started
      .optionalProperties
      .push(
        "destination"
      );

    contract.transport
      .cookiesAllowed =
      true;

    contract.session
      .crossSessionTracking =
      true;

    const issues =
      validateAnalyticsContract(
        contract
      );

    assert.equal(
      issues.some(
        (issue) =>
          issue.path ===
            "transport.cookiesAllowed"
      ),
      true
    );

    assert.equal(
      issues.some(
        (issue) =>
          issue.path ===
            "session.crossSessionTracking"
      ),
      true
    );

    assert.equal(
      issues.some(
        (issue) =>
          issue.path ===
            "propertyDefinitions.destination"
      ),
      true
    );

    assert.throws(
      () =>
        assertValidAnalyticsContract(
          contract
        ),
      {
        name:
          "SmartStayAnalyticsContractError",
      }
    );
  }
);

test(
  "analytics contract contains only coarse decision-support properties",
  () => {
    const contract =
      loadAnalyticsContract(
        contractPath
      );

    assert.deepEqual(
      contract.propertyDefinitions
        .nightsBucket.values,
      [
        "1-2",
        "3-7",
        "8-14",
        "15-30",
        "31-90",
      ]
    );

    assert.deepEqual(
      contract.propertyDefinitions
        .partySizeBucket.values,
      [
        "1",
        "2",
        "3-4",
        "5-8",
        "9-32",
      ]
    );

    assert.equal(
      contract.propertyDefinitions
        .budgetProvided.type,
      "boolean"
    );

    assert.equal(
      Object.hasOwn(
        contract.propertyDefinitions,
        "budget"
      ),
      false
    );

    assert.equal(
      Object.hasOwn(
        contract.propertyDefinitions,
        "destination"
      ),
      false
    );
  }
);

test(
  "analytics contract does not add analytics SDK dependencies",
  () => {
    const packageJson =
      JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            "package.json"
          ),
          "utf8"
        )
      );

    const serverPackageJson =
      JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            "server",
            "package.json"
          ),
          "utf8"
        )
      );

    const dependencyNames =
      [
        ...Object.keys(
          packageJson.dependencies ??
            {}
        ),
        ...Object.keys(
          packageJson.devDependencies ??
            {}
        ),
        ...Object.keys(
          serverPackageJson.dependencies ??
            {}
        ),
        ...Object.keys(
          serverPackageJson.devDependencies ??
            {}
        ),
      ]
        .join(
          "\n"
        )
        .toLowerCase();

    for (
      const sdkName of
      [
        "amplitude",
        "clarity",
        "hotjar",
        "matomo",
        "mixpanel",
        "plausible",
        "posthog",
        "segment",
        "umami",
      ]
    ) {
      assert.equal(
        dependencyNames.includes(
          sdkName
        ),
        false,
        `${sdkName} must not be added`
      );
    }
  }
);

test(
  "analytics contract CLI validates a copied contract without mutating it",
  () => {
    const temporaryDirectory =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "smartstay-analytics-contract-"
        )
      );

    try {
      const copiedContract =
        path.join(
          temporaryDirectory,
          "contract.json"
        );

      fs.copyFileSync(
        contractPath,
        copiedContract
      );

      const before =
        fs.readFileSync(
          copiedContract
        );

      const loaded =
        loadAnalyticsContract(
          copiedContract
        );

      const after =
        fs.readFileSync(
          copiedContract
        );

      assert.equal(
        loaded.contractVersion,
        "1.0.0"
      );

      assert.deepEqual(
        after,
        before
      );
    }
    finally {
      fs.rmSync(
        temporaryDirectory,
        {
          recursive:
            true,
          force:
            true,
        }
      );
    }
  }
);
