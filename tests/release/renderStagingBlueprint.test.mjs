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
      "    startCommand: RELEASE_SHA=$RENDER_GIT_COMMIT npm start\n",
      "backend release SHA start mapping"
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
      '"true"'
    );

    assertLiteralEnv(
      backend,
      "VITE_ANALYTICS_ENABLED",
      '"true"'
    );

    assertPromptedEnv(
      backend,
      "ANALYTICS_ADMIN_TOKEN"
    );

    assertLiteralEnv(
      backend,
      "ANALYTICS_STORAGE_MODE",
      "in-memory-single-instance"
    );

    assertLiteralEnv(
      backend,
      "ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED",
      '"true"'
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

    assert.ok(
      !backend.includes(
        "      - key: RELEASE_SHA\n"
      ),
      "RELEASE_SHA must not be created through Blueprint envVars."
    );

    assert.ok(
      !backend.includes(
        "envVarKey: RENDER_GIT_COMMIT"
      ),
      "Render default variables cannot be referenced with fromService.envVarKey."
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
      "    buildCommand: npm ci && RELEASE_SHA=$RENDER_GIT_COMMIT npm run build\n",
      "frontend release SHA build mapping"
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
      '"true"'
    );

    assertPromptedEnv(
      frontend,
      "VITE_API_URL"
    );

    assert.ok(
      !frontend.includes(
        "      - key: RELEASE_SHA\n"
      ),
      "Frontend RELEASE_SHA must be injected at build time."
    );

    assert.ok(
      !frontend.includes(
        "envVarKey: RENDER_GIT_COMMIT"
      ),
      "Frontend must not reference Render default variables through fromService."
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

    assert.match(
      backend,
      /      - key: ANALYTICS_ADMIN_TOKEN\n        sync: false(?:\n|$)/,
      "The beta analytics admin token must be prompted and never committed."
    );

    assert.ok(
      !/ANALYTICS_ADMIN_TOKEN\n\s+value:/.test(
        backend
      ),
      "The analytics admin token value must never be committed."
    );
  }
);

test(
  "Render release SHA uses default variables directly and never fromService",
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
      2,
      "Exactly backend start and frontend build should use RENDER_GIT_COMMIT."
    );

    assert.equal(
      (
        yaml.match(
          /fromService:/g
        ) ?? []
      ).length,
      0,
      "The Blueprint must not use fromService for Render default variables."
    );

    assert.equal(
      (
        yaml.match(
          /- key: RELEASE_SHA/g
        ) ?? []
      ).length,
      0,
      "The Blueprint must not declare RELEASE_SHA as an envVar."
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
        "Controlled-beta analytics are enabled",
        "`ANALYTICS_ADMIN_TOKEN` must be added manually",
        "The current analytics store is volatile",
        "Run exactly one bounded journey",
        "production remains blocked",
        "Do not add `RELEASE_SHA` with `fromService.envVarKey`",
        "use Manual sync on the existing Blueprint",
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
