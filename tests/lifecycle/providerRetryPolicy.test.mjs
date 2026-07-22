import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(import.meta.url);

const {
  extractRetryAfterMs,
  parseRetryAfterHeaderMs,
  resolveProviderRetryPolicy,
} = require(
  "../../server/providers/common/providerRetryPolicy.js"
);

const {
  PROVIDER_SEARCH_OUTCOMES,
  createProviderFailureDetails,
} = require(
  "../../server/providers/common/providerSearchOutcomeService.js"
);

const {
  beginProviderAttempt,
  recordProviderFailure,
  resetProviderHealth,
} = require(
  "../../server/providers/common/providerHealthService.js"
);

test(
  "Retry-After headers are converted from seconds to bounded milliseconds",
  () => {
    assert.equal(
      parseRetryAfterHeaderMs(
        "7",
        {
          maximumMs: 60_000,
        }
      ),
      7_000
    );

    assert.equal(
      extractRetryAfterMs({
        response: {
          headers: {
            "retry-after": "4",
          },
        },
      }),
      4_000
    );
  }
);

test(
  "HTTP 429 is a distinct retryable provider outcome",
  () => {
    const failure =
      createProviderFailureDetails({
        message:
          "raw provider rate limit",

        response: {
          status: 429,

          headers: {
            "retry-after": "3",
          },
        },
      });

    assert.equal(
      failure.errorType,
      PROVIDER_SEARCH_OUTCOMES
        .RATE_LIMITED
    );

    assert.equal(
      failure.retryable,
      true
    );

    assert.equal(
      failure.retryAfterMs,
      3_000
    );
  }
);

test(
  "provider health blocks attempts until the retry window expires",
  () => {
    const providerId =
      "provider-rate-limited";

    resetProviderHealth(
      providerId
    );

    recordProviderFailure(
      providerId,
      {
        errorType:
          "rate_limited",

        message:
          "rate limited",

        retryAfterMs:
          5_000,

        retryAfterWasExplicit:
          true,
      },
      {
        nowMs:
          10_000,
      }
    );

    const blocked =
      beginProviderAttempt(
        providerId,
        {
          nowMs:
            14_999,
        }
      );

    assert.equal(
      blocked.allowed,
      false
    );

    assert.equal(
      blocked.health.retryAfterMs,
      1
    );

    const probe =
      beginProviderAttempt(
        providerId,
        {
          nowMs:
            15_000,
        }
      );

    assert.equal(
      probe.allowed,
      true
    );

    assert.equal(
      probe.reason,
      "half_open_probe"
    );

    resetProviderHealth(
      providerId
    );
  }
);

test(
  "transient failures receive a bounded default retry delay",
  () => {
    const policy =
      resolveProviderRetryPolicy({
        outcome:
          "timeout",

        nowMs:
          1_000,
      });

    assert.equal(
      policy.retryable,
      true
    );

    assert.equal(
      policy.retryAfterMs,
      2_500
    );

    assert.equal(
      policy.nextAttemptAt,
      3_500
    );
  }
);


test(
  "HTTP 504 is classified as a retryable timeout and long Retry-After values are preserved",
  () => {
    const timeoutFailure =
      createProviderFailureDetails({
        message:
          "gateway timeout",
        response: {
          status: 504,
        },
      });

    assert.equal(
      timeoutFailure.errorType,
      PROVIDER_SEARCH_OUTCOMES
        .TIMEOUT
    );

    assert.equal(
      timeoutFailure.retryable,
      true
    );

    assert.equal(
      parseRetryAfterHeaderMs(
        423
      ),
      423_000
    );
  }
);
