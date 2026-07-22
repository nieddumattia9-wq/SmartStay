import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createLiteApiWhitelabelCheckoutUrl,
} = require(
  "../../server/providers/liteApi/liteApiBookingHandoff.js"
);

test(
  "LiteAPI white-label checkout uses the private prebook reference only in the provider URL",
  () => {
    const url =
      createLiteApiWhitelabelCheckoutUrl({
        providerBookingReference:
          "private prebook/id",
        baseUrl:
          "https://smartstay.example/",
      });

    const parsed =
      new URL(url);

    assert.equal(
      parsed.origin,
      "https://smartstay.example"
    );

    assert.equal(
      parsed.pathname,
      "/booking"
    );

    assert.equal(
      parsed.searchParams.get(
        "prebookId"
      ),
      "private prebook/id"
    );
  }
);

test(
  "LiteAPI white-label checkout rejects missing or insecure configuration",
  () => {
    assert.throws(
      () =>
        createLiteApiWhitelabelCheckoutUrl({
          providerBookingReference:
            "prebook-1",
          baseUrl:
            "",
        }),
      (error) =>
        error.code ===
        "PROVIDER_BOOKING_HANDOFF_NOT_CONFIGURED"
    );

    assert.throws(
      () =>
        createLiteApiWhitelabelCheckoutUrl({
          providerBookingReference:
            "prebook-1",
          baseUrl:
            "http://checkout.example",
        }),
      (error) =>
        error.code ===
        "PROVIDER_BOOKING_HANDOFF_CONFIGURATION_INVALID"
    );
  }
);
