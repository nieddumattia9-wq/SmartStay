const PROVIDER_ADAPTER_METHODS =
  Object.freeze([
    "searchHotels",
    "searchDestinations",
    "continueHotelSearch",
    "getHotelDetails",
  ]);

function normalizeProviderId(
  providerId
) {
  if (
    typeof providerId !== "string" ||
    providerId.trim().length === 0
  ) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return providerId
    .trim()
    .toLowerCase();
}

function getImplementedAdapterMethods(
  adapter
) {
  if (
    !adapter ||
    typeof adapter !== "object"
  ) {
    return [];
  }

  return PROVIDER_ADAPTER_METHODS
    .filter(
      (methodName) =>
        typeof adapter[methodName] ===
        "function"
    );
}

function validateProviderAdapter(
  providerId,
  adapter
) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  if (
    !adapter ||
    typeof adapter !== "object" ||
    Array.isArray(adapter)
  ) {
    throw new Error(
      `Provider adapter "${normalizedProviderId}" must be an object.`
    );
  }

  const adapterProviderId =
    normalizeProviderId(
      adapter.providerId ??
      adapter.id
    );

  if (
    adapterProviderId !==
    normalizedProviderId
  ) {
    throw new Error(
      `Provider adapter id mismatch: expected "${normalizedProviderId}", received "${adapterProviderId}".`
    );
  }

  const implementedMethods =
    getImplementedAdapterMethods(
      adapter
    );

  if (
    implementedMethods.length === 0
  ) {
    throw new Error(
      `Provider adapter "${normalizedProviderId}" does not implement any supported operation.`
    );
  }

  return adapter;
}

function supportsProviderAdapterMethod(
  adapter,
  methodName
) {
  if (
    !PROVIDER_ADAPTER_METHODS.includes(
      methodName
    )
  ) {
    return false;
  }

  return (
    typeof adapter?.[methodName] ===
    "function"
  );
}

function requireProviderAdapterMethod(
  adapter,
  methodName
) {
  if (
    !supportsProviderAdapterMethod(
      adapter,
      methodName
    )
  ) {
    const providerId =
      adapter?.providerId ??
      adapter?.id ??
      "unknown";

    const error =
      new Error(
        `Provider "${providerId}" does not support "${methodName}".`
      );

    error.code =
      "PROVIDER_CAPABILITY_NOT_IMPLEMENTED";

    throw error;
  }

  return adapter[methodName]
    .bind(adapter);
}

module.exports = {
  PROVIDER_ADAPTER_METHODS,
  normalizeProviderId,
  getImplementedAdapterMethods,
  validateProviderAdapter,
  supportsProviderAdapterMethod,
  requireProviderAdapterMethod,
};
