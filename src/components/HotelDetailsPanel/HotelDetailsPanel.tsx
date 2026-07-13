import {
  useEffect,
} from "react";

import type {
  HotelDetails,
} from "../../types/hotel";

import "./HotelDetailsPanel.css";

type HotelDetailsPanelProps = {
  details: HotelDetails | null;
  loading: boolean;
  error: string;
  bookingUrl?: string | null;
  onClose: () => void;
};

function formatLocation(
  details: HotelDetails
) {
  return [
    details.address,
    details.city,
    details.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="hotel-details-panel__section">
      <h3>
        {title}
      </h3>

      <ul className="hotel-details-panel__list">
        {items.map((item) => (
          <li key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function HotelDetailsPanel({
  details,
  loading,
  error,
  bookingUrl = null,
  onClose,
}: HotelDetailsPanelProps) {
  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  const location =
    details
      ? formatLocation(details)
      : "";

  return (
    <div
      className="hotel-details-panel__overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="hotel-details-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Accommodation details"
      >
        <button
          type="button"
          className="hotel-details-panel__close"
          onClick={onClose}
          aria-label="Close hotel details"
        >
          Close
        </button>

        {loading && (
          <div className="hotel-details-panel__state">
            <strong>
              Loading accommodation details
            </strong>

            <p>
              SmartStay is retrieving the available information.
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="hotel-details-panel__state hotel-details-panel__state--error">
            <strong>
              Details unavailable
            </strong>

            <p>
              {error}
            </p>
          </div>
        )}

        {!loading && !error && details && (
          <>
            {details.images[0] && (
              <img
                className="hotel-details-panel__hero"
                src={details.images[0]}
                alt={details.name}
              />
            )}

            <div className="hotel-details-panel__content">
              <p className="hotel-details-panel__eyebrow">
                Accommodation details
              </p>

              <h2 id="hotel-details-title">
                {details.name}
              </h2>

              <div className="hotel-details-panel__summary">
                {details.stars > 0 && (
                  <span>
                    {details.stars}-star accommodation
                  </span>
                )}

                {details.reviewScore !== null && (
                  <span>
                    Guest score {details.reviewScore}
                  </span>
                )}

                {details.reviewCount !== null && (
                  <span>
                    {details.reviewCount.toLocaleString("en-US")} reviews
                  </span>
                )}
              </div>

              {location && (
                <p className="hotel-details-panel__location">
                  {location}
                </p>
              )}

              {details.description && (
                <p className="hotel-details-panel__description">
                  {details.description}
                </p>
              )}

              {(details.checkIn || details.checkOut) && (
                <section className="hotel-details-panel__times">
                  {details.checkIn && (
                    <div>
                      <span>
                        Check-in
                      </span>

                      <strong>
                        {details.checkIn}
                      </strong>
                    </div>
                  )}

                  {details.checkOut && (
                    <div>
                      <span>
                        Check-out
                      </span>

                      <strong>
                        {details.checkOut}
                      </strong>
                    </div>
                  )}
                </section>
              )}

              <DetailList
                title="Amenities"
                items={details.amenities}
              />

              <DetailList
                title="Facilities"
                items={details.facilities}
              />

              {bookingUrl && (
                <a
                  className="hotel-details-panel__booking"
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continue to booking
                </a>
              )}

              <p className="hotel-details-panel__provider">
                Accommodation information supplied by {details.provider}.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default HotelDetailsPanel;
