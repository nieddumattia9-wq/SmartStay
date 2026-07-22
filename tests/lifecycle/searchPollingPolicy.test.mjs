import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(import.meta.url);

const ts =
  require("typescript");

const sourceUrl =
  new URL(
    "../../src/utils/searchLifecycle.ts",
    import.meta.url
  );

function loadSearchLifecycleModule() {
  const source =
    fs.readFileSync(
      sourceUrl,
      "utf8"
    );

  const transpiled =
    ts.transpileModule(
      source,
      {
        compilerOptions: {
          target:
            ts.ScriptTarget.ES2022,
          module:
            ts.ModuleKind.CommonJS,
          strict:
            true,
        },
      }
    ).outputText;

  const module = {
    exports: {},
  };

  const execute =
    new Function(
      "exports",
      "module",
      transpiled
    );

  execute(
    module.exports,
    module
  );

  return module.exports;
}

test(
  "frontend polling honours retryAfterMs with safe lower and upper bounds",
  () => {
    const {
      getSearchPollingDelayMs,
    } = loadSearchLifecycleModule();

    assert.equal(
      getSearchPollingDelayMs({
        retryAfterMs: 8_000,
      }),
      8_000
    );

    assert.equal(
      getSearchPollingDelayMs({
        retryAfterMs: 100,
      }),
      1_800
    );

    assert.equal(
      getSearchPollingDelayMs({
        retryAfterMs: 300_000,
      }),
      60_000
    );

    assert.equal(
      getSearchPollingDelayMs({
        retryAfterMs: 2_000,
        lifecycle: {
          retryAfterMs: 12_000,
        },
      }),
      12_000
    );
  }
);
