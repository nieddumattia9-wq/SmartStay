import {
  useMemo,
} from "react";

import {
  GOOGLE_MAPS_EMBED_KEY,
} from "../../config/runtimeConfig";

import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  getValidLocationCoordinates,
} from "../../utils/locationMapPresentation";

import "./LocationMapPreview.css";

type LocationMapPreviewProps = {
  latitude:
    number | null;

  longitude:
    number | null;

  accommodationName:
    string;

  address:
    string;

  distanceFromSelectedPointKm?:
    number | null;
};

function formatDistanceContext(
  distanceFromSelectedPointKm:
    number | null
) {
  if (
    distanceFromSelectedPointKm ===
      null ||
    !Number.isFinite(
      distanceFromSelectedPointKm
    )
  ) {
    return null;
  }

  const distanceLabel =
    distanceFromSelectedPointKm <
      1
      ? (
          Math.round(
            distanceFromSelectedPointKm *
            1000
          ) +
          " m"
        )
      : (
          distanceFromSelectedPointKm.toFixed(
            1
          ) +
          " km"
        );

  return (
    distanceLabel +
    " from your selected location"
  );
}

function LocationMapPreview({
  latitude,
  longitude,
  accommodationName,
  address,
  distanceFromSelectedPointKm =
    null,
}: LocationMapPreviewProps) {
  const coordinates =
    useMemo(
      () =>
        getValidLocationCoordinates(
          latitude,
          longitude
        ),
      [
        latitude,
        longitude,
      ]
    );

  const externalMapUrl =
    useMemo(() => {
      if (!coordinates) {
        return null;
      }

      return buildGoogleMapsSearchUrl(
        coordinates
      );
    }, [
      coordinates,
    ]);

  const embedUrl =
    useMemo(() => {
      if (!coordinates) {
        return null;
      }

      return buildGoogleMapsEmbedUrl({
        apiKey:
          GOOGLE_MAPS_EMBED_KEY,
        accommodationName,
        address,
        ...coordinates,
      });
    }, [
      accommodationName,
      address,
      coordinates,
    ]);

  const distanceContext =
    formatDistanceContext(
      distanceFromSelectedPointKm
    );

  if (
    !coordinates ||
    !externalMapUrl
  ) {
    return null;
  }

  return (
    <section
      className="hotel-location-map"
      aria-labelledby="hotel-location-map-title"
    >
      <div className="hotel-location-map__heading">
        <div>
          <p className="hotel-location-map__eyebrow">
            Location
          </p>

          <h3 id="hotel-location-map-title">
            See where this stay is
          </h3>

          {distanceContext && (
            <p className="hotel-location-map__distance">
              {distanceContext}
            </p>
          )}
        </div>

        {embedUrl && (
          <a
            className="hotel-location-map__link"
            href={externalMapUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
        )}
      </div>

      {embedUrl ? (
        <div className="hotel-location-map__frame-wrap">
          <iframe
            className="hotel-location-map__frame"
            title={`Map showing ${accommodationName}`}
            src={embedUrl}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <a
          className="hotel-location-map__fallback"
          href={externalMapUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span
            className="hotel-location-map__pin"
            aria-hidden="true"
          >
            ●
          </span>

          <span>
            <strong>
              Open this stay in Google Maps
            </strong>

            <small>
              See the exact location in a new tab.
            </small>
          </span>
        </a>
      )}
    </section>
  );
}

export default LocationMapPreview;
