const {
  normalizeProviderId,
  validateProviderAdapter,
} = require(
  "./providerAdapterContract"
);

const adapterLoaders =
  new Map();

const adapterLoadPromises =
  new Map();

function createAdapterRegistryError(
  providerId,
  message,
  code
) {
  const error =
    new Error(message);

  error.code =
    code;

  error.providerId =
    providerId;

  return error;
}

function registerProviderAdapter(
  providerId,
  loader,
  options = {}
) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  if (
    typeof loader !== "function"
  ) {
    throw new Error(
      `Adapter loader for "${normalizedProviderId}" must be a function.`
    );
  }

  const replaceExisting =
    options.replaceExisting ??
    false;

  if (
    adapterLoaders.has(
      normalizedProviderId
    ) &&
    !replaceExisting
  ) {
    throw createAdapterRegistryError(
      normalizedProviderId,
      `Provider adapter "${normalizedProviderId}" is already registered.`,
      "PROVIDER_ADAPTER_ALREADY_REGISTERED"
    );
  }

  adapterLoaders.set(
    normalizedProviderId,
    loader
  );

  adapterLoadPromises.delete(
    normalizedProviderId
  );

  return normalizedProviderId;
}

function unregisterProviderAdapter(
  providerId
) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  adapterLoadPromises.delete(
    normalizedProviderId
  );

  return adapterLoaders.delete(
    normalizedProviderId
  );
}

function hasProviderAdapter(
  providerId
) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  return adapterLoaders.has(
    normalizedProviderId
  );
}

function getRegisteredProviderAdapterIds() {
  return Array.from(
    adapterLoaders.keys()
  );
}

async function loadProviderAdapter(
  providerId
) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const loader =
    adapterLoaders.get(
      normalizedProviderId
    );

  if (!loader) {
    throw createAdapterRegistryError(
      normalizedProviderId,
      `No adapter is registered for provider "${normalizedProviderId}".`,
      "PROVIDER_ADAPTER_NOT_REGISTERED"
    );
  }

  if (
    adapterLoadPromises.has(
      normalizedProviderId
    )
  ) {
    return adapterLoadPromises.get(
      normalizedProviderId
    );
  }

  const loadPromise =
    Promise.resolve()
      .then(() => loader())
      .then(
        (adapter) =>
          validateProviderAdapter(
            normalizedProviderId,
            adapter
          )
      );

  adapterLoadPromises.set(
    normalizedProviderId,
    loadPromise
  );

  try {
    return await loadPromise;
  } catch (error) {
    adapterLoadPromises.delete(
      normalizedProviderId
    );

    throw error;
  }
}

function clearProviderAdapterCache(
  providerId
) {
  if (
    providerId === undefined ||
    providerId === null
  ) {
    adapterLoadPromises.clear();
    return;
  }

  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  adapterLoadPromises.delete(
    normalizedProviderId
  );
}

function resetProviderAdapterRegistry() {
  adapterLoadPromises.clear();
  adapterLoaders.clear();
}

module.exports = {
  registerProviderAdapter,
  unregisterProviderAdapter,
  hasProviderAdapter,
  getRegisteredProviderAdapterIds,
  loadProviderAdapter,
  clearProviderAdapterCache,
  resetProviderAdapterRegistry,
};
