import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(
    import.meta.url
  );

const ts =
  require(
    "typescript"
  );

const sourceUrl =
  new URL(
    "../../src/utils/searchRecovery.ts",
    import.meta.url
  );

function loadRecoveryModule() {
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
    exports:
      {},
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
  "browser recovery distinguishes terminal sessions from retryable transport failures",
  () => {
    const {
      getSearchRecoveryDecision,
    } = loadRecoveryModule();

    for (
      const error of
      [
        {
          code:
            "SEARCH_SESSION_EXPIRED",
        },
        {
          status:
            410,
        },
        {
          code:
            "SEARCH_SESSION_NOT_FOUND",
        },
        {
          status:
            404,
        },
        {
          code:
            "SEARCH_ID_REQUIRED",
        },
      ]
    ) {
      const decision =
        getSearchRecoveryDecision(
          error
        );

      assert.equal(
        decision.retryable,
        false
      );

      assert.equal(
        decision
          .clearStoredSearchState,
        true
      );
    }

    for (
      const error of
      [
        {
          code:
            "NETWORK_OFFLINE",
        },
        {
          code:
            "NETWORK_ERROR",
        },
        {
          code:
            "REQUEST_TIMEOUT",
        },
        {
          status:
            408,
        },
        {
          status:
            503,
        },
      ]
    ) {
      const decision =
        getSearchRecoveryDecision(
          error
        );

      assert.equal(
        decision.retryable,
        true
      );

      assert.equal(
        decision
          .clearStoredSearchState,
        false
      );
    }
  }
);

test(
  "Loading and Results wire retry without discarding the saved search",
  () => {
    const loadingSource =
      fs.readFileSync(
        new URL(
          "../../src/components/LoadingScreen/LoadingScreen.tsx",
          import.meta.url
        ),
        "utf8"
      );

    const resultsSource =
      fs.readFileSync(
        new URL(
          "../../src/pages/Results/Results.tsx",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      loadingSource,
      /getSearchRecoveryDecision/
    );

    assert.match(
      loadingSource,
      /Try again/
    );

    assert.match(
      loadingSource,
      /flowAttempt/
    );

    assert.match(
      resultsSource,
      /getSearchRecoveryDecision/
    );

    assert.match(
      resultsSource,
      /Try again/
    );

    assert.match(
      resultsSource,
      /resultsRetryAttempt/
    );
  }
);
