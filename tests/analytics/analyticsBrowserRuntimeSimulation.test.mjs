import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  createRequire,
} from "node:module";
import {
  test,
} from "node:test";
import {
  fileURLToPath,
} from "node:url";

const require =
  createRequire(
    import.meta.url
  );

const typescript =
  require("typescript");

const repositoryRoot =
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url
      )
    ),
    "../.."
  );

const clientSource =
  fs.readFileSync(
    path.join(
      repositoryRoot,
      "src/analytics/analyticsClient.ts"
    ),
    "utf8"
  );

const compiledClient =
  typescript.transpileModule(
    clientSource,
    {
      compilerOptions: {
        module:
          typescript.ModuleKind
            .CommonJS,
        target:
          typescript.ScriptTarget
            .ES2022,
      },
      fileName:
        "analyticsClient.ts",
    }
  ).outputText;

function createStorage() {
  const values =
    new Map();

  return {
    getItem(key) {
      return values.has(key)
        ? values.get(key)
        : null;
    },
    setItem(key, value) {
      values.set(
        key,
        String(value)
      );
    },
    removeItem(key) {
      values.delete(key);
    },
    get size() {
      return values.size;
    },
  };
}

function createResponse({
  ok = true,
  status = 202,
  retryAfter = null,
} = {}) {
  return {
    ok,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() ===
          "retry-after"
          ? retryAfter
          : null;
      },
    },
  };
}

function loadAnalyticsClient({
  enabled = true,
  doNotTrack = "0",
  globalPrivacyControl = false,
  fetchImpl =
    async () =>
      createResponse(),
} = {}) {
  const sessionStorage =
    createStorage();

  const timers = [];

  const browserWindow = {
    location: {
      origin:
        "https://smartstay.example",
    },
    doNotTrack,
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout() {},
  };

  const module = {
    exports: {},
  };

  let uuidCounter = 0;

  const context = {
    module,
    exports:
      module.exports,
    require(specifier) {
      if (
        specifier ===
          "../config/runtimeConfig"
      ) {
        return {
          ANALYTICS_ENABLED:
            enabled,
          API_URL:
            "https://api.smartstay.example/api",
          RELEASE_SHA:
            "85b712d",
        };
      }

      if (
        specifier ===
          "./analyticsBuckets"
      ) {
        return {
          bucketAnalyticsDuration() {
            return "under-2s";
          },
        };
      }

      throw new Error(
        `Unexpected module: ${specifier}`
      );
    },
    window:
      browserWindow,
    navigator: {
      doNotTrack,
      globalPrivacyControl,
    },
    document: {
      referrer: "",
    },
    sessionStorage,
    fetch:
      fetchImpl,
    TextEncoder,
    URL,
    Date,
    Math,
    JSON,
    console,
    crypto: {
      randomUUID() {
        uuidCounter += 1;
        return `00000000-0000-4000-8000-${String(
          uuidCounter
        ).padStart(12, "0")}`;
      },
    },
  };

  vm.runInNewContext(
    compiledClient,
    context,
    {
      filename:
        "analyticsClient.cjs",
    }
  );

  return {
    client:
      module.exports,
    sessionStorage,
    timers,
  };
}

test(
  "browser runtime simulation keeps disabled, DNT and GPC modes inert",
  () => {
    for (
      const options of
      [
        {
          enabled: false,
        },
        {
          enabled: true,
          doNotTrack: "1",
        },
        {
          enabled: true,
          globalPrivacyControl:
            true,
        },
      ]
    ) {
      let requests = 0;

      const harness =
        loadAnalyticsClient({
          ...options,
          fetchImpl:
            async () => {
              requests += 1;
              return createResponse();
            },
        });

      const tracked =
        harness.client
          .trackAnalyticsEvent(
            "page_view",
            "home",
            {}
          );

      assert.equal(tracked, false);
      assert.equal(
        harness.sessionStorage.size,
        0
      );
      assert.equal(requests, 0);
    }
  }
);

test(
  "browser runtime simulation sends only the canonical first-party envelope",
  async () => {
    const payloads = [];

    const harness =
      loadAnalyticsClient({
        fetchImpl:
          async (
            _url,
            options
          ) => {
            payloads.push(
              JSON.parse(options.body)
            );
            return createResponse();
          },
      });

    harness.client
      .beginAnalyticsJourney();

    assert.equal(
      harness.client
        .trackAnalyticsEvent(
          "page_view",
          "home",
          {
            entrySource:
              "direct",
          }
        ),
      true
    );

    await harness.client
      .flushAnalyticsQueue();

    assert.equal(payloads.length, 1);
    assert.equal(
      payloads[0].events.length,
      1
    );

    const serialized =
      JSON.stringify(payloads[0]);

    for (
      const forbidden of
      [
        "searchId",
        "offerId",
        "providerId",
        "destinationName",
        "checkIn",
        "checkOut",
      ]
    ) {
      assert.equal(
        serialized.includes(forbidden),
        false
      );
    }
  }
);

test(
  "browser runtime simulation isolates transient failures and drops permanent 4xx batches",
  async () => {
    let transientAttempts = 0;

    const transientHarness =
      loadAnalyticsClient({
        fetchImpl:
          async () => {
            transientAttempts += 1;

            if (transientAttempts === 1) {
              throw new Error(
                "temporary outage"
              );
            }

            return createResponse();
          },
      });

    transientHarness.client
      .trackAnalyticsEvent(
        "page_view",
        "home",
        {}
      );

    await assert.doesNotReject(
      transientHarness.client
        .flushAnalyticsQueue()
    );

    await assert.doesNotReject(
      transientHarness.client
        .flushAnalyticsQueue()
    );

    assert.equal(
      transientAttempts,
      2
    );

    let permanentAttempts = 0;

    const permanentHarness =
      loadAnalyticsClient({
        fetchImpl:
          async () => {
            permanentAttempts += 1;
            return createResponse({
              ok: false,
              status: 400,
            });
          },
      });

    permanentHarness.client
      .trackAnalyticsEvent(
        "page_view",
        "home",
        {}
      );

    await permanentHarness.client
      .flushAnalyticsQueue();
    await permanentHarness.client
      .flushAnalyticsQueue();

    assert.equal(
      permanentAttempts,
      1
    );
  }
);
