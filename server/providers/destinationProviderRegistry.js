const {
  normalizeProviderId,
} = require(
  "./common/providerAdapterContract"
);

const DESTINATION_PROVIDER_IDS =
  Object.freeze({
    GEOAPIFY:
      "geoapify",
  });

const DESTINATION_PROVIDER_CAPABILITIES =
  Object.freeze({
    SEARCH_DESTINATIONS:
      "searchDestinations",
  });

const destinationProviders =
  Object.freeze([
    Object.freeze({
      id:
        DESTINATION_PROVIDER_IDS
          .GEOAPIFY,

      enabled:
        true,

      priority:
        1,

      capabilities:
        Object.freeze({
          searchDestinations:
            true,
        }),

      adapterLoader:
        async function loadAdapter() {
          const {
            loadGeoapifyDestinationAdapter,
          } = require(
            "./geocoding/geoapifyDestinationAdapter"
          );

          return loadGeoapifyDestinationAdapter();
        },
    }),
  ]);

function cloneDestinationProvider(
  provider
) {
  if (!provider) {
    return null;
  }

  return {
    ...provider,

    capabilities: {
      ...provider.capabilities,
    },
  };
}

function getDestinationProviders() {
  return destinationProviders
    .map(
      cloneDestinationProvider
    )
    .sort(
      (first, second) =>
        first.priority -
        second.priority
    );
}

function getEnabledDestinationProviders() {
  return getDestinationProviders()
    .filter(
      (provider) =>
        provider.enabled ===
        true
    );
}

function getDestinationProviderById(
  providerId
) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const provider =
    destinationProviders.find(
      (candidate) =>
        candidate.id ===
        normalizedProviderId
    );

  return cloneDestinationProvider(
    provider
  );
}

function isDestinationProviderEnabled(
  providerId
) {
  const provider =
    getDestinationProviderById(
      providerId
    );

  return (
    provider?.enabled ===
    true
  );
}

function destinationProviderSupportsCapability(
  providerOrId,
  capability
) {
  const provider =
    typeof providerOrId ===
    "string"
      ? getDestinationProviderById(
          providerOrId
        )
      : providerOrId;

  if (
    !provider ||
    typeof capability !==
      "string"
  ) {
    return false;
  }

  return (
    provider.capabilities?.[
      capability
    ] === true
  );
}

function getDestinationProvidersByCapability(
  capability,
  {
    enabledOnly = true,
  } = {}
) {
  const providers =
    enabledOnly
      ? getEnabledDestinationProviders()
      : getDestinationProviders();

  return providers.filter(
    (provider) =>
      destinationProviderSupportsCapability(
        provider,
        capability
      )
  );
}

module.exports = {
  DESTINATION_PROVIDER_IDS,
  DESTINATION_PROVIDER_CAPABILITIES,
  getDestinationProviders,
  getEnabledDestinationProviders,
  getDestinationProviderById,
  isDestinationProviderEnabled,
  destinationProviderSupportsCapability,
  getDestinationProvidersByCapability,
};
