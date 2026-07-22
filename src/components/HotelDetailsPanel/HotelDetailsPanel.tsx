import {
  useEffect,
  useRef,
} from "react";

import type {
  HotelDetails,
  HotelOffer,
} from "../../types/hotel";

import {
  formatReviewCountLabel,
} from "../../utils/reviewCountDisplay";

import "./HotelDetailsPanel.css";

type HotelDetailsPanelProps = {
  details: HotelDetails | null;
  loading: boolean;
  error: string;
  bookingUrl?: string | null;
  offer?: HotelOffer | null;
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

function formatOfferMoney(
  amount: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",
        currency:
          currency ||
          "EUR",
        maximumFractionDigits:
          2,
      }
    ).format(amount);
  } catch {
    return `${currency || "EUR"} ${amount.toFixed(2)}`;
  }
}

function getOfferDisplayAmount(
  offer: HotelOffer
) {
  return (
    typeof offer.totalKnownCost ===
      "number" &&
    Number.isFinite(
      offer.totalKnownCost
    ) &&
    offer.totalKnownCost > 0
      ? offer.totalKnownCost
      : offer.price
  );
}

function getOfferTaxLabel(
  offer: HotelOffer
) {
  if (
    offer.taxesIncluded ===
      true
  ) {
    return "Known taxes are included in the displayed total.";
  }

  if (
    offer.taxesIncluded ===
      false
  ) {
    return "Some known taxes or fees are payable in addition to the base price.";
  }

  return "Some tax or fee information is still unknown.";
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
  offer = null,
  onClose,
}: HotelDetailsPanelProps) {
  const panelRef =
    useRef<HTMLElement>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    const previousActiveElement =
      document.activeElement instanceof
        HTMLElement
        ? document.activeElement
        : null;

    document.body.style.overflow =
      "hidden";

    const focusFrameId =
      window.requestAnimationFrame(
        () => {
          (
            closeButtonRef.current ??
            panelRef.current
          )?.focus();
        }
      );

    function getFocusableElements() {
      const panel =
        panelRef.current;

      if (!panel) {
        return [];
      }

      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
          ].join(",")
        )
      ).filter(
        (element) =>
          element.getAttribute(
            "aria-hidden"
          ) !== "true"
      );
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel =
        panelRef.current;

      if (!panel) {
        return;
      }

      const focusableElements =
        getFocusableElements();

      if (
        focusableElements.length ===
        0
      ) {
        event.preventDefault();
        panel.focus();

        return;
      }

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      const activeElement =
        document.activeElement;

      if (
        event.shiftKey &&
        (
          activeElement === firstElement ||
          !panel.contains(activeElement)
        )
      ) {
        event.preventDefault();
        lastElement.focus();

        return;
      }

      if (
        !event.shiftKey &&
        activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        focusFrameId
      );

      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      if (
        previousActiveElement &&
        document.contains(
          previousActiveElement
        )
      ) {
        previousActiveElement.focus();
      }
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
      onPointerDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        ref={panelRef}
        className="hotel-details-panel"
        role="dialog"
        aria-modal="true"
        aria-busy={loading}
        aria-labelledby={
          details
            ? "hotel-details-title"
            : undefined
        }
        aria-label={
          details
            ? undefined
            : "Accommodation details"
        }
        tabIndex={-1}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="hotel-details-panel__close"
          onClick={onClose}
          aria-label="Close hotel details"
        >
          Close
        </button>

        {loading && (
          <div
            className="hotel-details-panel__state"
            role="status"
            aria-live="polite"
          >
            <strong>
              Loading accommodation details
            </strong>

            <p>
              SmartStay is retrieving the available information.
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            className="hotel-details-panel__state hotel-details-panel__state--error"
            role="alert"
          >
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
                    {formatReviewCountLabel(
                      details.reviewCount,
                      details.reviewCountRelation
                    )}
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

              {offer && (
                <section className="hotel-details-panel__offer-summary">
                  <strong>
                    Selected offer · {formatOfferMoney(
                      getOfferDisplayAmount(
                        offer
                      ),
                      offer.currency
                    )}
                  </strong>

                  <p>
                    {offer.roomName ||
                      "Room details are not available for this offer."}
                  </p>

                  <p>
                    {offer.cancellationPolicy ||
                      "Cancellation conditions are not available."}
                  </p>

                  <p>
                    {getOfferTaxLabel(
                      offer
                    )}
                  </p>
                </section>
              )}

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