import assert from "node:assert/strict";
import {
  EventEmitter,
} from "node:events";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import {
  createRequire,
} from "node:module";
import fs from "node:fs";

import {
  createNpmAuditInvocation,
  evaluateAuditReport,
  runNpmAudit,
} from "../../scripts/run-security-dependency-audit.mjs";

const root =
  process.cwd();

const serverRequire =
  createRequire(
    path.join(
      root,
      "server",
      "server.js"
    )
  );

const express =
  serverRequire(
    "express"
  );

const {
  createApp,
} =
  serverRequire(
    path.join(
      root,
      "server",
      "app.js"
    )
  );

const {
  createRuntimeSecurityConfig,
} =
  serverRequire(
    path.join(
      root,
      "server",
      "config",
      "runtimeSecurityConfig.js"
    )
  );

const {
  createSecurityLogger,
  sanitizeForLogs,
} =
  serverRequire(
    path.join(
      root,
      "server",
      "observability",
      "securityLogger.js"
    )
  );

const {
  operationalLogger,
} =
  serverRequire(
    path.join(
      root,
      "server",
      "observability",
      "operationalLogger.js"
    )
  );

const {
  installProcessSafetyHandlers,
} =
  serverRequire(
    path.join(
      root,
      "server",
      "observability",
      "processSafety.js"
    )
  );

async function startObservabilityServer() {
  const records =
    [];

  const logger =
    createSecurityLogger({
      environment: {
        TEST_API_KEY:
          "private-api-key-value",
      },
      write:
        (line) =>
          records.push(
            JSON.parse(
              line
            )
          ),
      now:
        () =>
          new Date(
            "2026-07-23T00:00:00.000Z"
          ),
    });

  const router =
    express.Router();

  router.get(
    "/observe",
    async (
      req,
      res
    ) => {
      await Promise.resolve();

      operationalLogger.info(
        "provider.operation.test",
        {
          providerId:
            "controlled-provider",

          operation:
            "test",

          verificationId:
            "verify-private-value",

          handoffId:
            "handoff-private-value",
        }
      );

      res.json({
        success:
          true,
      });
    }
  );

  const config =
    createRuntimeSecurityConfig({
      environment:
        {},
      overrides: {
        nodeEnv:
          "test",
        allowedOrigins: [
          "http://allowed.example",
        ],
        rateLimitMaxRequests:
          100,
      },
    });

  const {
    app,
  } =
    createApp({
      config,
      logger,
      searchRoutes:
        router,
    });

  const server =
    http.createServer(
      app
    );

  await new Promise(
    (resolve) =>
      server.listen(
        0,
        "127.0.0.1",
        resolve
      )
  );

  const address =
    server.address();

  return {
    records,
    origin:
      `http://127.0.0.1:${address.port}`,

    async close() {
      await new Promise(
        (resolve) =>
          server.close(
            resolve
          )
      );
    },
  };
}

test(
  "request context propagates requestId into asynchronous provider logs and redacts booking identities",
  async () => {
    const harness =
      await startObservabilityServer();

    try {
      const response =
        await fetch(
          `${harness.origin}/api/observe`,
          {
            headers: {
              "X-Request-ID":
                "request-observability-1234",
            },
          }
        );

      assert.equal(
        response.status,
        200
      );

      const providerRecord =
        harness.records.find(
          (record) =>
            record.event ===
            "provider.operation.test"
        );

      assert.ok(
        providerRecord
      );

      assert.equal(
        providerRecord.requestId,
        "request-observability-1234"
      );

      assert.equal(
        providerRecord.verificationId,
        "[REDACTED]"
      );

      assert.equal(
        providerRecord.handoffId,
        "[REDACTED]"
      );
    }
    finally {
      await harness.close();
    }
  }
);

test(
  "security logger redacts authentication material and sensitive query identifiers",
  () => {
    const sanitized =
      sanitizeForLogs({
        nonce:
          "private-nonce",
        hmac:
          "private-hmac",
        verificationId:
          "verify-private",
        handoffId:
          "handoff-private",
        url:
          "https://example.test/open?handoffId=handoff-private&token=private-token",
      });

    const serialized =
      JSON.stringify(
        sanitized
      );

    assert.equal(
      serialized.includes(
        "private-nonce"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "private-hmac"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "handoff-private"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "private-token"
      ),
      false
    );
  }
);

test(
  "backend runtime has no direct console usage outside the structured logger sink",
  () => {
    const serverRoot =
      path.join(
        root,
        "server"
      );

    const findings =
      [];

    const excludedDirectories =
      new Set([
        ".git",
        "coverage",
        "dist",
        "node_modules",
      ]);

    function visit(
      directory
    ) {
      for (
        const entry of
        fs.readdirSync(
          directory,
          {
            withFileTypes:
              true,
          }
        )
      ) {
        if (
          entry.isDirectory() &&
          excludedDirectories.has(
            entry.name
          )
        ) {
          continue;
        }

        const target =
          path.join(
            directory,
            entry.name
          );

        if (
          entry.isDirectory()
        ) {
          visit(
            target
          );

          continue;
        }

        if (
          !/\.(?:cjs|mjs|js)$/.test(
            entry.name
          )
        ) {
          continue;
        }

        const relative =
          path.relative(
            root,
            target
          )
            .replaceAll(
              "\\",
              "/"
            );

        const source =
          fs.readFileSync(
            target,
            "utf8"
          );

        const matches =
          source.match(
            /console\.(?:debug|dir|error|info|log|warn)\s*\(/g
          ) ??
          [];

        if (
          relative ===
            "server/observability/securityLogger.js"
        ) {
          assert.equal(
            matches.length,
            1
          );

          continue;
        }

        if (
          matches.length >
          0
        ) {
          findings.push({
            relative,
            matches:
              matches.length,
          });
        }
      }
    }

    visit(
      serverRoot
    );

    assert.deepEqual(
      findings,
      []
    );
  }
);

test(
  "process safety converts unhandled failures into a controlled non-zero shutdown",
  () => {
    const processObject =
      new EventEmitter();

    processObject.exitCode =
      0;

    const logged =
      [];

    const stopCalls =
      [];

    const remove =
      installProcessSafetyHandlers({
        processObject,
        logger: {
          error(
            event,
            data
          ) {
            logged.push({
              event,
              data,
            });
          },
        },
        stop(
          signal,
          options
        ) {
          stopCalls.push({
            signal,
            options,
          });
        },
      });

    processObject.emit(
      "unhandledRejection",
      new Error(
        "controlled failure"
      )
    );

    assert.equal(
      logged[0].event,
      "process.unhandled-rejection"
    );

    assert.deepEqual(
      stopCalls[0],
      {
        signal:
          "unhandledRejection",
        options: {
          exitCode:
            1,
        },
      }
    );

    remove();
  }
);

test(
  "dependency audit evaluation blocks high or critical vulnerabilities only",
  () => {
    const clean =
      evaluateAuditReport({
        metadata: {
          vulnerabilities: {
            info:
              0,
            low:
              1,
            moderate:
              1,
            high:
              0,
            critical:
              0,
            total:
              2,
          },
        },
      });

    assert.equal(
      clean.blocking,
      false
    );

    const unsafe =
      evaluateAuditReport({
        metadata: {
          vulnerabilities: {
            high:
              1,
            critical:
              0,
            total:
              1,
          },
        },
      });

    assert.equal(
      unsafe.blocking,
      true
    );
  }
);

test(
  "dependency audit runner never invokes audit fix and accepts a clean report",
  () => {
    const calls =
      [];

    const result =
      runNpmAudit({
        name:
          "controlled",
        cwd:
          root,
        spawn(
          executable,
          args,
          options
        ) {
          calls.push({
            executable,
            args,
            options,
          });

          return {
            status:
              0,
            stdout:
              JSON.stringify({
                metadata: {
                  vulnerabilities: {
                    info:
                      0,
                    low:
                      0,
                    moderate:
                      0,
                    high:
                      0,
                    critical:
                      0,
                    total:
                      0,
                  },
                },
              }),
            stderr:
              "",
            error:
              null,
          };
        },
        environment: {
          npm_execpath:
            "C:\\controlled\\npm-cli.js",
        },
        platform:
          "win32",
        nodeExecutable:
          "C:\\controlled\\node.exe",
      });

    assert.equal(
      result.blocking,
      false
    );

    assert.equal(
      calls[0].executable,
      "C:\\controlled\\node.exe"
    );

    assert.deepEqual(
      calls[0].args,
      [
        "C:\\controlled\\npm-cli.js",
        "audit",
        "--json",
        "--audit-level=high",
      ]
    );

    assert.equal(
      calls[0].args.includes(
        "fix"
      ),
      false
    );
  }
);

test(
  "dependency audit uses cmd.exe as a Windows fallback without spawning npm.cmd directly",
  () => {
    const invocation =
      createNpmAuditInvocation(
        [
          "audit",
          "--json",
          "--audit-level=high",
          "--omit=dev",
        ],
        {
          environment: {
            ComSpec:
              "C:\\Windows\\System32\\cmd.exe",
          },
          platform:
            "win32",
          nodeExecutable:
            "C:\\controlled\\node.exe",
        }
      );

    assert.equal(
      invocation.executable,
      "C:\\Windows\\System32\\cmd.exe"
    );

    assert.deepEqual(
      invocation.args,
      [
        "/d",
        "/s",
        "/c",
        "npm.cmd audit --json --audit-level=high --omit=dev",
      ]
    );
  }
);
