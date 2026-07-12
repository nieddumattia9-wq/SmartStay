const {
  getAccommodationProviderById,
} = require(
  "../providerRegistry"
);

const {
  registerProviderAdapter,
  hasProviderAdapter,
  loadProviderAdapter,
} = require(
  "./providerAdapterRegistry"
);

function createMissingAdapterError(
  providerId
) {
  const error =
    new Error(
      `Provider "${providerId}" does not have a configured adapter.`
    );

  error.code =
    "PROVIDER_ADAPTER_NOT_CONFIGURED";

  error.providerId =
    providerId;

  return error;
}

function getConfiguredAdapterLoader(
  providerId
) {
  const provider =
    getAccommodationProviderById(
      providerId
    );

  const loader =
    provider?.adapterLoader;

  return typeof loader ===
    "function"
    ? loader
    : null;
}

function hasConfiguredProviderAdapter(
  providerId
) {
  return Boolean(
    getConfiguredAdapterLoader(
      providerId
    )
  );
}

function registerConfiguredProviderAdapter(
  providerId
) {
  if (
    hasProviderAdapter(
      providerId
    )
  ) {
    return providerId;
  }

  const loader =
    getConfiguredAdapterLoader(
      providerId
    );

  if (!loader) {
    throw createMissingAdapterError(
      providerId
    );
  }

  return registerProviderAdapter(
    providerId,
    loader
  );
}

async function loadConfiguredProviderAdapter(
  providerId
) {
  registerConfiguredProviderAdapter(
    providerId
  );

  return loadProviderAdapter(
    providerId
  );
}

module.exports = {
  getConfiguredAdapterLoader,
  hasConfiguredProviderAdapter,
  registerConfiguredProviderAdapter,
  loadConfiguredProviderAdapter,
};
