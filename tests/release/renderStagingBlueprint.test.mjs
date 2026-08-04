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

function serviceBlock(
  yaml,
  serviceType,
  serviceName
) {
  const marker =
    `  - type: ${serviceType}\n    name: ${serviceName}\n`;
  const start =
    yaml.indexOf(
      marker
    );

  assert.notEqual(
    start,
    -1,
    `Missing Render service ${serviceName}.`
  );

  const nextService =
    yaml.indexOf(
      "\n  - type: ",
      start + marker.length
    );
  const nextRootSection =
    yaml.indexOf(
      "\nenvVarGroups:\n",
      start + marker.length
    );
  const candidates =
    [
      nextService,
      nextRootSection,
    ].filter(
      (value) =>
        value !== -1
    );
  const end =
    candidates.length > 0
      ? Math.min(
          ...candidates
        )
      : yaml.length;

  return yaml.slice(
    start,
    end
  );
}

function environmentGroupBlock(
  yaml,
  groupName
) {
  const marker =
    `  - name: ${groupName}\n`;
  const root =
    yaml.indexOf(
      "\nenvVarGroups:\n"
    );
  const start =
    yaml.indexOf(
      marker,
      root
    );

  assert.notEqual(
    start,
    -1,
    `Missing Render environment group ${groupName}.`
  );

  return yaml.slice(
    start
  );
}

function assertContains(
  text,
  expected,
  label
) {
  assert.ok(
    text.includes(
      expected
    ),
    `${label}: missing ${JSON.stringify(expected)}.`
  );
}

function assertPromptedEnv(
  block,
  key
) {
  assert.match(
    block,
    new RegExp(
      String.raw`      - key: ${key}\n        sync: false(?:\n|$)`
    ),
    `${key} must be prompted in Render and never committed.`
  );
}

function assertLiteralEnv(
  block,
  key,
  value
) {
  assertContains(
    block,
    `      - key: ${key}\n        value: ${value}\n`,
    key
  );
}

function assertKeyValueReference(
  block,
  key
) {
  assertContains(
    block,
    `      - key: ${key}\n` +
      "        fromService:\n" +
      "          type: keyvalue\n" +
      "          name: smartstay-staging-valkey\n" +
      "          property: connectionString\n",
    key
  );
}

test(
  "Render staging Blueprint defines the bounded 4E distributed topology",
  () => {
    const yaml =
      readText(
        "render.yaml"
      );
    const keyValue =
      serviceBlock(
        yaml,
        "keyvalue",
        "smartstay-staging-valkey"
      );
    const backend =
      serviceBlock(
        yaml,
        "web",
        "smartstay-staging-api"
      );
    const worker =
      serviceBlock(
        yaml,
        "worker",
        "smartstay-staging-search-worker"
      );
    const frontend =
      serviceBlock(
        yaml,
        "web",
        "smartstay-staging-web"
      );
    const sharedRuntime =
      environmentGroupBlock(
        yaml,
        "smartstay-staging-distributed-runtime"
      );

    for (
      const expected of
      [
        "    region: frankfurt\n",
        "    plan: starter\n",
        "    ipAllowList: []\n",
        "    maxmemoryPolicy: noeviction\n",
        "    persistenceMode: journal-snapshot\n",
      ]
    ) {
      assertContains(
        keyValue,
        expected,
        "private persistent Valkey"
      );
    }

    for (
      const [
        block,
        label,
      ] of
      [
        [
          backend,
          "API",
        ],
        [
          worker,
          "worker",
        ],
      ]
    ) {
      for (
        const expected of
        [
          "    runtime: node\n",
          "    branch: main\n",
          "    region: frankfurt\n",
          "    plan: starter\n",
          "    numInstances: 2\n",
          "    autoDeployTrigger: off\n",
          "    rootDir: server\n",
          "    buildCommand: npm ci --omit=dev\n",
          "    maxShutdownDelaySeconds: 45\n",
          "      - fromGroup: smartstay-staging-distributed-runtime\n",
        ]
      ) {
        assertContains(
          block,
          expected,
          label
        );
      }

      assertKeyValueReference(
        block,
        "SMARTSTAY_STATE_REDIS_URL"
      );
      assertKeyValueReference(
        block,
        "SMARTSTAY_QUEUE_REDIS_URL"
      );
      assertPromptedEnv(
        block,
        "LITEAPI_API_KEY"
      );
      assertPromptedEnv(
        block,
        "PROVIDER_ACCOUNT_RATE_LIMITS_JSON"
      );
      assert.ok(
        !block.includes(
          "    scaling:"
        ),
        `${label} autoscaling must stay disabled.`
      );
      assert.ok(
        !block.includes(
          "    disk:"
        ),
        `${label} must not use process-local persistence.`
      );
    }

    assertContains(
      backend,
      "    startCommand: RELEASE_SHA=$RENDER_GIT_COMMIT npm start\n",
      "API start"
    );
    assertContains(
      backend,
      "    healthCheckPath: /health/ready\n",
      "API readiness"
    );
    assertContains(
      worker,
      "    startCommand: RELEASE_SHA=$RENDER_GIT_COMMIT npm run worker:search\n",
      "worker start"
    );

    for (
      const key of
      [
        "CLIENT_ORIGINS",
        "VITE_API_URL",
        "GEOAPIFY_API_KEY",
        "LITEAPI_WHITELABEL_BASE_URL",
      ]
    ) {
      assertPromptedEnv(
        backend,
        key
      );
    }

    assertLiteralEnv(
      backend,
      "ANALYTICS_ENABLED",
      '"false"'
    );
    assertLiteralEnv(
      backend,
      "VITE_ANALYTICS_ENABLED",
      '"false"'
    );
    assert.ok(
      !backend.includes(
        "ANALYTICS_ADMIN_TOKEN"
      ),
      "Process-local analytics admin access must not be enabled for 4E."
    );

    for (
      const [
        key,
        value,
      ] of
      [
        [
          "RUNTIME_STATE_MODE",
          "valkey-distributed",
        ],
        [
          "SMARTSTAY_OPERATIONAL_STATE_MODE",
          "valkey-distributed",
        ],
        [
          "SMARTSTAY_STATE_ENVIRONMENT",
          "staging",
        ],
        [
          "SMARTSTAY_STATE_MAX_SESSIONS",
          '"1000"',
        ],
        [
          "SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES",
          '"134217728"',
        ],
        [
          "SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED",
          '"true"',
        ],
        [
          "SMARTSTAY_QUEUE_ENVIRONMENT",
          "staging",
        ],
        [
          "SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED",
          '"1000"',
        ],
        [
          "SMARTSTAY_SEARCH_WORKER_CONCURRENCY",
          '"4"',
        ],
        [
          "PROVIDER_MAX_CONCURRENT_OPERATIONS",
          '"8"',
        ],
      ]
    ) {
      assertLiteralEnv(
        sharedRuntime,
        key,
        value
      );
    }

    for (
      const key of
      [
        "SMARTSTAY_STATE_KEY_SECRET",
        "SMARTSTAY_QUEUE_KEY_SECRET",
      ]
    ) {
      assertContains(
        sharedRuntime,
        `      - key: ${key}\n        generateValue: true\n`,
        key
      );
    }

    assertContains(
      frontend,
      "    runtime: static\n",
      "frontend runtime"
    );
    assertContains(
      frontend,
      "    autoDeployTrigger: off\n",
      "frontend deploy control"
    );
    assertContains(
      frontend,
      "    buildCommand: npm ci && RELEASE_SHA=$RENDER_GIT_COMMIT npm run build\n",
      "frontend build"
    );
    assertLiteralEnv(
      frontend,
      "VITE_ANALYTICS_ENABLED",
      '"false"'
    );
    assertPromptedEnv(
      frontend,
      "VITE_API_URL"
    );
    assertPromptedEnv(
      frontend,
      "VITE_GOOGLE_MAPS_EMBED_KEY"
    );

    assert.ok(
      !/ROUTESTACK/i.test(
        yaml
      ),
      "Frozen RouteStack credentials must not be requested."
    );
    assert.ok(
      !yaml.includes(
        "plan: free"
      ),
      "Stateful staging resources must not use sleeping Free instances."
    );
  }
);

test(
  "Render release identity and shared datastore references cannot drift",
  () => {
    const yaml =
      readText(
        "render.yaml"
      );

    assert.equal(
      (
        yaml.match(
          /RENDER_GIT_COMMIT/g
        ) ?? []
      ).length,
      3,
      "API, worker and frontend must use the Render commit identity."
    );
    assert.equal(
      (
        yaml.match(
          /property: connectionString/g
        ) ?? []
      ).length,
      4,
      "API and worker must each share state and queue connection strings."
    );
    assert.equal(
      (
        yaml.match(
          /- key: RELEASE_SHA/g
        ) ?? []
      ).length,
      0,
      "RELEASE_SHA must be mapped directly from RENDER_GIT_COMMIT."
    );
    assert.equal(
      (
        yaml.match(
          /- fromGroup: smartstay-staging-distributed-runtime/g
        ) ?? []
      ).length,
      2,
      "API and worker must use one reviewed distributed runtime group."
    );
  }
);

test(
  "4E staging guide keeps deployment, cost and live traffic behind explicit approval",
  () => {
    const guide =
      readText(
        "docs/RENDER_STAGING_DEPLOYMENT.md"
      );

    for (
      const requiredText of
      [
        "does not authorize production deployment or a public beta",
        "two API instances",
        "two search-worker instances",
        "one private persistent Key Value instance",
        "Do not invent a provider quota",
        "explicit cost approval",
        "external access remains disabled",
        "Analytics stay disabled",
        "Do not add RouteStack credentials",
        "zero live provider calls",
        "production remains blocked",
        "Use Manual sync on the existing Blueprint",
      ]
    ) {
      assert.ok(
        guide.includes(
          requiredText
        ),
        `Deployment guide is missing: ${requiredText}`
      );
    }
  }
);
