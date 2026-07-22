function loadDefaultDependencies() {
  const {
    requireBookingVerification,
  } = require(
    "../storage/bookingVerificationStore"
  );

  const {
    saveBookingHandoff,
    requireBookingHandoff,
  } = require(
    "../storage/bookingHandoffStore"
  );

  const {
    getAccommodationProviderById,
  } = require(
    "../providers/providerRegistry"
  );

  const {
    createBookingHandoffWithProvider,
  } = require(
    "../providers/accommodationProviderOrchestrator"
  );

  return {
    requireBookingVerification,
    saveBookingHandoff,
    requireBookingHandoff,
    getAccommodationProviderById,
    createBookingHandoffWithProvider,
  };
}

function createBookingHandoffError({
  code,
  message,
  status,
  retryable = false,
} = {}) {
  const error =
    new Error(message);

  error.code =
    code;

  error.status =
    status;

  error.retryable =
    retryable;

  return error;
}

function createBookingHandoffService(
  dependencies
) {
  const resolved =
    dependencies ??
    loadDefaultDependencies();

  const {
    requireVerification =
      resolved
        .requireBookingVerification,
    getProvider =
      resolved
        .getAccommodationProviderById,
    executeProviderHandoff =
      resolved
        .createBookingHandoffWithProvider,
    saveHandoff =
      resolved
        .saveBookingHandoff,
    requireHandoff =
      resolved
        .requireBookingHandoff,
  } = resolved;

  async function prepareBookingHandoff({
    verificationId,
    acceptChanges = false,
  } = {}) {
    const verification =
      requireVerification(
        verificationId
      );

    if (
      verification
        .requiresUserConfirmation &&
      acceptChanges !==
        true
    ) {
      throw createBookingHandoffError({
        code:
          "BOOKING_CHANGES_CONFIRMATION_REQUIRED",
        message:
          "Accept the updated total and booking conditions before continuing.",
        status:
          409,
      });
    }

    const provider =
      getProvider(
        verification
          .sourceProvider
      );

    if (
      !provider?.enabled ||
      !provider.capabilities
        ?.bookingHandoff
    ) {
      throw createBookingHandoffError({
        code:
          "BOOKING_HANDOFF_UNAVAILABLE",
        message:
          "Secure checkout is not available for this offer yet.",
        status:
          409,
      });
    }

    if (
      typeof verification
        .providerBookingReference !==
        "string" ||
      !verification
        .providerBookingReference
        .trim()
    ) {
      throw createBookingHandoffError({
        code:
          "BOOKING_HANDOFF_REFERENCE_MISSING",
        message:
          "The verified checkout reference is unavailable. Check the offer again.",
        status:
          409,
      });
    }

    let providerHandoff;

    try {
      providerHandoff =
        await executeProviderHandoff({
          sourceProvider:
            verification
              .sourceProvider,
          providerBookingReference:
            verification
              .providerBookingReference,
          verificationId:
            verification
              .verificationId,
        });
    } catch (error) {
      if (
        error?.code ===
          "PROVIDER_BOOKING_HANDOFF_NOT_CONFIGURED" ||
        error?.code ===
          "PROVIDER_BOOKING_HANDOFF_CONFIGURATION_INVALID"
      ) {
        throw createBookingHandoffError({
          code:
            "BOOKING_HANDOFF_NOT_CONFIGURED",
          message:
            "Secure checkout is not configured yet.",
          status:
            503,
        });
      }

      throw error;
    }

    const handoff =
      saveHandoff({
        verificationId:
          verification
            .verificationId,
        sourceProvider:
          verification
            .sourceProvider,
        redirectUrl:
          providerHandoff
            .redirectUrl,
      });

    return {
      state:
        "ready",
      code:
        "BOOKING_HANDOFF_READY",
      message:
        "Secure checkout is ready.",
      handoff: {
        id:
          handoff.handoffId,
        expiresAt:
          handoff.expiresAt,
      },
    };
  }

  function resolveBookingHandoff({
    handoffId,
  } = {}) {
    const handoff =
      requireHandoff(
        handoffId
      );

    return {
      redirectUrl:
        handoff.redirectUrl,
    };
  }

  return {
    prepareBookingHandoff,
    resolveBookingHandoff,
  };
}

async function prepareBookingHandoff(
  options
) {
  return createBookingHandoffService()
    .prepareBookingHandoff(
      options
    );
}

function resolveBookingHandoff(
  options
) {
  return createBookingHandoffService()
    .resolveBookingHandoff(
      options
    );
}

module.exports = {
  createBookingHandoffService,
  prepareBookingHandoff,
  resolveBookingHandoff,
};
