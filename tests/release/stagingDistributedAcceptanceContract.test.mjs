import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

function readText(path) {
  return readFileSync(
    path,
    "utf8"
  ).replace(
    /\r\n/g,
    "\n"
  );
}

const contract =
  JSON.parse(
    readText(
      "contracts/STAGING-DISTRIBUTED-ACCEPTANCE-CONTRACT.json"
    )
  );

test(
  "4E source readiness cannot authorize deployment, spend or live traffic",
  () => {
    assert.equal(
      contract.phase,
      "39C25A.4E"
    );
    assert.equal(
      contract.sourceReadinessStage,
      "39C25A.4E1"
    );

    for (
      const key of
      [
        "sourceCommitMayDeploy",
        "sourceCommitMayProvisionResources",
        "sourceCommitMayGenerateCost",
        "sourceCommitMayCallLiveProviders",
        "productionDeploymentAllowed",
      ]
    ) {
      assert.equal(
        contract
          .authorizationBoundary[
            key
          ],
        false,
        key
      );
    }

    assert.equal(
      contract
        .authorizationBoundary
        .renderSyncRequiresExplicitApproval,
      true
    );
    assert.equal(
      contract
        .authorizationBoundary
        .liveProviderJourneyRequiresSeparateApproval,
      true
    );
    assert.equal(
      contract.exit
        .sourceReadinessPassCloses4E,
      false
    );
  }
);

test(
  "4E topology, persistence and capacity are fixed to the 4D-proven envelope",
  () => {
    assert.deepEqual(
      contract.topology,
      {
        frontendStaticSites:
          1,
        apiInstances:
          2,
        searchWorkerInstances:
          2,
        keyValueInstances:
          1,
        region:
          "frankfurt",
        automaticDeploy:
          false,
        autoscaling:
          false,
      }
    );
    assert.equal(
      contract.keyValue
        .externalAccessAllowed,
      false
    );
    assert.equal(
      contract.keyValue
        .internalAuthenticationRequiredBeforeTraffic,
      true
    );
    assert.equal(
      contract.keyValue
        .persistenceMode,
      "journal-snapshot"
    );
    assert.equal(
      contract.keyValue
        .maxmemoryPolicy,
      "noeviction"
    );
    assert.equal(
      contract.runtime
        .maximumActiveSessions,
      1_000
    );
    assert.equal(
      contract.runtime
        .maximumAdmittedSearchJobs,
      1_000
    );
    assert.equal(
      contract.runtime
        .globalProviderConcurrencyMaximum,
      8
    );
    assert.equal(
      contract.runtime
        .providerAccountQuotaMayBeInvented,
      false
    );
  }
);

test(
  "distributed worker validates its release contract before queue or state startup",
  () => {
    const source =
      readText(
        "server/searchWorker.js"
      );
    const validation =
      source.indexOf(
        "assertDistributedWorkerEnvironment({"
      );
    const queueConfig =
      source.indexOf(
        "getSearchQueueConfig("
      );
    const operationalState =
      source.indexOf(
        "getOperationalState();"
      );

    assert.ok(
      validation > 0
    );
    assert.ok(
      validation <
        queueConfig
    );
    assert.ok(
      validation <
        operationalState
    );
  }
);

test(
  "4E acceptance documentation preserves the three separate approvals",
  () => {
    const guide =
      readText(
        "docs/STAGING_DISTRIBUTED_ACCEPTANCE.md"
      );

    for (
      const expected of
      [
        "39C25A.4E1 — source readiness",
        "39C25A.4E2 — remote infrastructure acceptance",
        "39C25A.4E3 — bounded live journey",
        "zero Render/provider/datastore calls",
        "npm registry activity is declared",
        "zero live provider calls",
        "It is not a load test",
        "scale API to one and stop workers",
      ]
    ) {
      assert.ok(
        guide.includes(
          expected
        ),
        expected
      );
    }
  }
);
