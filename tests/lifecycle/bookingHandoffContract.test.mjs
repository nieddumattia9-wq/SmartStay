import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createBookingHandoffService,
} = require(
  "../../server/services/bookingHandoffService.js"
);

function createVerification({
  requiresUserConfirmation =
    false,
} = {}) {
  return {
    verificationId:
      "verify-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    sourceProvider:
      "provider-a",
    providerBookingReference:
      "private-prebook-reference",
    requiresUserConfirmation,
    changedFields:
      requiresUserConfirmation
        ? [
            "totalKnownCost",
          ]
        : [],
  };
}

test(
  "changed offers require explicit acceptance before a handoff is prepared",
  async () => {
    let providerArguments =
      null;

    const service =
      createBookingHandoffService({
        requireVerification:
          () =>
            createVerification({
              requiresUserConfirmation:
                true,
            }),
        getProvider:
          () => ({
            enabled:
              true,
            capabilities: {
              bookingHandoff:
                true,
            },
          }),
        executeProviderHandoff:
          async (
            argumentsValue
          ) => {
            providerArguments =
              argumentsValue;

            return {
              type:
                "external_redirect",
              providerId:
                "provider-a",
              redirectUrl:
                "https://checkout.example/booking?private=1",
            };
          },
        saveHandoff:
          ({
            verificationId,
            sourceProvider,
            redirectUrl,
          }) => ({
            handoffId:
              "handoff-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            verificationId,
            sourceProvider,
            redirectUrl,
            expiresAt:
              123456789,
          }),
      });

    await assert.rejects(
      () =>
        service.prepareBookingHandoff({
          verificationId:
            "verify-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          acceptChanges:
            false,
        }),
      (error) => {
        assert.equal(
          error.code,
          "BOOKING_CHANGES_CONFIRMATION_REQUIRED"
        );

        assert.equal(
          error.status,
          409
        );

        return true;
      }
    );

    const result =
      await service.prepareBookingHandoff({
        verificationId:
          "verify-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        acceptChanges:
          true,
      });

    assert.equal(
      result.state,
      "ready"
    );

    assert.equal(
      result.handoff.id,
      "handoff-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );

    assert.equal(
      providerArguments
        .providerBookingReference,
      "private-prebook-reference"
    );

    assert.equal(
      JSON.stringify(
        result
      ).includes(
        "private-prebook-reference"
      ),
      false
    );

    assert.equal(
      JSON.stringify(
        result
      ).includes(
        "checkout.example"
      ),
      false
    );
  }
);

test(
  "confirmed offers can prepare a handoff without a change acceptance flag",
  async () => {
    const service =
      createBookingHandoffService({
        requireVerification:
          () =>
            createVerification(),
        getProvider:
          () => ({
            enabled:
              true,
            capabilities: {
              bookingHandoff:
                true,
            },
          }),
        executeProviderHandoff:
          async () => ({
            type:
              "external_redirect",
            providerId:
              "provider-a",
            redirectUrl:
              "https://checkout.example/booking",
          }),
        saveHandoff:
          () => ({
            handoffId:
              "handoff-cccccccccccccccccccccccccccccccccccc",
            expiresAt:
              999,
          }),
      });

    const result =
      await service.prepareBookingHandoff({
        verificationId:
          "verify-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });

    assert.equal(
      result.code,
      "BOOKING_HANDOFF_READY"
    );
  }
);

test(
  "providers without a booking-handoff capability fail safely",
  async () => {
    const service =
      createBookingHandoffService({
        requireVerification:
          () =>
            createVerification(),
        getProvider:
          () => ({
            enabled:
              true,
            capabilities: {
              bookingHandoff:
                false,
            },
          }),
      });

    await assert.rejects(
      () =>
        service.prepareBookingHandoff({
          verificationId:
            "verify-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      (error) => {
        assert.equal(
          error.code,
          "BOOKING_HANDOFF_UNAVAILABLE"
        );

        return true;
      }
    );
  }
);
