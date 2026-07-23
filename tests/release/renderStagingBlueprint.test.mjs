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
  serviceName
) {
  const marker =
    `  - type: web\n    name: ${serviceName}\n`;

  const start =
    yaml.indexOf(
      marker
    );

  assert.notEqual(
    start,
    -1,
    `Missing Render service ${serviceName}.`
  );

  const next =
    yaml.indexOf(
      "\n  - type: web\n",
      start + marker.length
    );

  return yaml.slice(
    start,
    next === -1
      ? yaml.length
      : next
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

test(
  "Render staging Blueprint preserves SmartStay runtime boundaries",
  () => {
    const yaml =
      readText(
        "render.yaml"
      );

    const backend =
      serviceBlock(
        yaml,
        "smartstay-staging-api"
      );

    const frontend =
      serviceBlock(
        yaml,
        "smartstay-staging-web"
      );

    assertContains(
      backend,
      "    runtime: node\n",
      "backend runtime"
    );

    assertContains(
      backend,
      "    branch: main\n",
      "backend branch"
    );

    assertContains(
      backend,
      "    region: frankfurt\n",
      "backend region"
    );

    assertContains(
      backend,
      "    plan: starter\n",
      "backend plan"
    );

    assertContains(
      backend,
      "    numInstances: 1\n",
      "backend instance count"
    );

    assertContains(
      backend,
      "    autoDeployTrigger: off\n",
      "backend deploy control"
    );

    assertContains(
      backend,
      "    rootDir: server\n",
      "backend root"
    );

    assertContains(
      backend,
      "    buildCommand: npm ci --omit=dev\n",
      "backend build"
    );

    assertContains(
      backend,
      "    startCommand: npm start\n",
      "backend start"
    );

    assertContains(
      backend,
      "    healthCheckPath: /health/ready\n",
      "backend health"
    );

    assert.ok(
      !backend.includes(
        "    scaling:"
      ),
      "Backend autoscaling must stay disabled."
    );

    assert.ok(
      !backend.includes(
        "    disk:"
      ),
      "The current in-memory backend must not pretend to use persistence."
    );

    assertLiteralEnv(
      backend,
      "NODE_VERSION",
      "24.18.0"
    );

    assertLiteralEnv(
      backend,
      "NODE_ENV",
      "production"
    );

    assertLiteralEnv(
      backend,
      "DEPLOYMENT_ENV",
      "staging"
    );

    assertLiteralEnv(
      backend,
      "RUNTIME_STATE_MODE",
      "in-memory-single-instance"
    );

    assertLiteralEnv(
      backend,
      "TRUST_PROXY",
      '"1"'
    );

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

    assertLiteralEnv(
      backend,
      "ANALYTICS_STORAGE_MODE",
      "in-memory-single-instance"
    );

    assertLiteralEnv(
      backend,
      "ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED",
      '"false"'
    );

    for (
      const key
      of [
        "CLIENT_ORIGINS",
        "VITE_API_URL",
        "GEOAPIFY_API_KEY",
        "LITEAPI_API_KEY",
        "LITEAPI_WHITELABEL_BASE_URL",
      ]
    ) {
      assertPromptedEnv(
        backend,
        key
      );
    }

    assertContains(
      backend,
      "      - key: RELEASE_SHA\n" +
        "        fromService:\n" +
        "          name: smartstay-staging-api\n" +
        "          type: web\n" +
        "          envVarKey: RENDER_GIT_COMMIT\n",
      "backend release SHA"
    );

    assert.ok(
      !/ROUTESTACK/i.test(
        backend
      ),
      "Frozen RouteStack credentials must not be requested."
    );

    assertContains(
      frontend,
      "    runtime: static\n",
      "frontend runtime"
    );

    assertContains(
      frontend,
      "    branch: main\n",
      "frontend branch"
    );

    assertContains(
      frontend,
      "    autoDeployTrigger: off\n",
      "frontend deploy control"
    );

    assertContains(
      frontend,
      "    buildCommand: npm ci && npm run build\n",
      "frontend build"
    );

    assertContains(
      frontend,
      "    staticPublishPath: ./dist\n",
      "frontend publish path"
    );

    assertLiteralEnv(
      frontend,
      "NODE_VERSION",
      "24.18.0"
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

    assertContains(
      frontend,
      "      - key: RELEASE_SHA\n" +
        "        fromService:\n" +
        "          name: smartstay-staging-web\n" +
        "          type: web\n" +
        "          envVarKey: RENDER_GIT_COMMIT\n",
      "frontend release SHA"
    );

    assertContains(
      frontend,
      "    routes:\n" +
        "      - type: rewrite\n" +
        "        source: /*\n" +
        "        destination: /index.html\n",
      "SPA rewrite"
    );

    assert.ok(
      !yaml.includes(
        "plan: free"
      ),
      "The stateful staging backend must not use a sleeping Free instance."
    );

    assert.ok(
      !yaml.includes(
        "ANALYTICS_ADMIN_TOKEN"
      ),
      "No analytics admin token is needed while analytics are disabled."
    );
  }
);

test(
  "Render staging guide blocks beta and invented operational values",
  () => {
    const guide =
      readText(
        "docs/RENDER_STAGING_DEPLOYMENT.md"
      );

    for (
      const requiredText
      of [
        "does not authorize production deployment or a public beta",
        "exactly one backend instance",
        "Do not enable horizontal scaling",
        "Do not invent a domain",
        "Do not add RouteStack credentials",
        "Analytics remain disabled",
        "Run exactly one bounded journey",
        "production remains blocked",
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
