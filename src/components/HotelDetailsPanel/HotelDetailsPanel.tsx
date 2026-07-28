import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  BookingOfferRecheckResponse,
  HotelDetails,
  HotelOffer,
} from "../../types/hotel";

import {
  ApiRequestError,
  prepareBookingHandoff,
  recheckBookingOffer,
  resolveBookingHandoffOpenUrl,
} from "../../services/api";

import {
  formatReviewCountLabel,
} from "../../utils/reviewCountDisplay";

import {
  buildHotelAmenityPresentation,
  presentHotelDescription,
} from "../../utils/hotelDetailsPresentation";

import LocationMapPreview from "../LocationMapPreview/LocationMapPreview";

import type {
  HotelAmenityGroup,
} from "../../utils/hotelDetailsPresentation";

import "./HotelDetailsPanel.css";

import {
  completeAnalyticsJourney,
  flushAnalyticsQueue,
  setAnalyticsJourneyStage,
  trackAnalyticsEvent,
  trackAnalyticsPageView,
} from "../../analytics/analyticsClient";

import type {
  AnalyticsPositionBucket,
  AnalyticsRole,
} from "../../analytics/analyticsTypes";

type HotelDetailsPanelProps = {
  details: HotelDetails | null;
  loading: boolean;
  error: string;
  offer?: HotelOffer | null;
  searchId: string | null;
  hotelId: string | null;
  offerId: string | null;
  analyticsRole: AnalyticsRole;
  analyticsPositionBucket:
    AnalyticsPositionBucket;
  distanceFromSelectedPointKm?:
    number | null;
  onOfferRechecked?: (
    hotelId: string,
    offer: HotelOffer
  ) => void;
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

const PAYMENT_CHECKOUT_DISCLOSURE =
  "Payment timing and accepted methods are shown by the booking partner in secure checkout.";

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
    return "Known taxes included in total.";
  }

  if (
    offer.taxesIncluded ===
      false
  ) {
    return "Known taxes included in total; some are payable at the property.";
  }

  return "Some mandatory taxes or fees may still be added.";
}

function normalizeCancellationCopy(
  value:
    string | null
) {
  return String(
    value ??
    ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

function shouldShowCancellationPolicy(
  offer:
    HotelOffer
) {
  const normalizedPolicy =
    normalizeCancellationCopy(
      offer
        .cancellationPolicy
    );

  if (!normalizedPolicy) {
    return false;
  }

  if (
    offer.refundable ===
      false &&
    new Set([
      "non refundable",
      "this rate is non refundable",
      "the selected offer is non refundable",
      "this offer is non refundable",
    ]).has(
      normalizedPolicy
    )
  ) {
    return false;
  }

  if (
    offer.refundable ===
      true &&
    new Set([
      "refundable",
      "fully refundable",
      "this rate is refundable",
      "this offer is refundable",
    ]).has(
      normalizedPolicy
    )
  ) {
    return false;
  }

  return true;
}

const CANCELLATION_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatCancellationDeadline(
  value:
    string |
    null |
    undefined,
  timezone:
    string |
    null |
    undefined
) {
  if (!value) {
    return null;
  }

  const normalizedTimezone =
    timezone
      ?.trim()
      .toUpperCase() ||
    "";

  const rawMatch =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})[ t](\d{2}):(\d{2})(?::\d{2})?$/i
    );

  if (
    rawMatch &&
    [
      "GMT",
      "UTC",
      "ETC/UTC",
      "ETC/GMT",
    ].includes(
      normalizedTimezone
    )
  ) {
    const monthIndex =
      Number(rawMatch[2]) -
      1;

    if (
      monthIndex < 0 ||
      monthIndex >=
        CANCELLATION_MONTHS
          .length
    ) {
      return null;
    }

    return (
      Number(rawMatch[3]) +
      " " +
      CANCELLATION_MONTHS[
        monthIndex
      ] +
      " " +
      rawMatch[1] +
      " at " +
      rawMatch[4] +
      ":" +
      rawMatch[5] +
      " GMT"
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const day =
    date.getUTCDate();

  const month =
    CANCELLATION_MONTHS[
      date.getUTCMonth()
    ];

  const year =
    date.getUTCFullYear();

  const hours =
    String(
      date.getUTCHours()
    ).padStart(
      2,
      "0"
    );

  const minutes =
    String(
      date.getUTCMinutes()
    ).padStart(
      2,
      "0"
    );

  return (
    day +
    " " +
    month +
    " " +
    year +
    " at " +
    hours +
    ":" +
    minutes +
    " GMT"
  );
}

function getCancellationPolicyDisplay(
  offer:
    HotelOffer
) {
  const freeCancellationDeadline =
    formatCancellationDeadline(
      offer
        .freeCancellationUntil,
      offer
        .cancellationTimezone
    );

  if (
    offer.refundable ===
      true &&
    freeCancellationDeadline
  ) {
    return (
      "Free cancellation until " +
      freeCancellationDeadline +
      "."
    );
  }

  if (
    !shouldShowCancellationPolicy(
      offer
    )
  ) {
    return null;
  }

  return (
    offer.cancellationPolicy
      ?.trim() ||
    null
  );
}

function getChangedFieldLabel(
  field: string
) {
  const labels: Record<
    string,
    string
  > = {
    price:
      "base price",
    totalKnownCost:
      "total stay cost",
    currency:
      "currency",
    taxesIncluded:
      "tax inclusion",
    includedTaxes:
      "included taxes",
    excludedTaxes:
      "taxes payable separately",
    unknownTaxes:
      "unconfirmed taxes",
    roomName:
      "room",
    mealPlan:
      "meal plan",
    refundable:
      "refundability",
    freeCancellationUntil:
      "free-cancellation deadline",
    cancellationPolicy:
      "cancellation conditions",
    bookable:
      "availability",
  };

  return (
    labels[field] ??
    field
  );
}

function getBookingFailureMessage(
  error: unknown
) {
  if (
    !(error instanceof
      ApiRequestError)
  ) {
    return "SmartStay could not prepare secure checkout.";
  }

  if (
    error.code ===
      "BOOKING_VERIFICATION_EXPIRED" ||
    error.code ===
      "BOOKING_HANDOFF_EXPIRED"
  ) {
    return "The price verification expired. Check the final total again.";
  }

  if (
    error.code ===
      "BOOKING_HANDOFF_NOT_CONFIGURED"
  ) {
    return "Secure checkout is not configured yet for this provider.";
  }

  if (
    error.code ===
      "BOOKING_CHANGES_CONFIRMATION_REQUIRED"
  ) {
    return "Accept the updated total and conditions before continuing.";
  }

  return (
    error.message ||
    "SmartStay could not prepare secure checkout."
  );
}

function AmenityGroupSection({
  group,
  open = false,
}: {
  group: HotelAmenityGroup;
  open?: boolean;
}) {
  return (
    <details
      className="hotel-details-panel__amenity-group"
      open={open}
    >
      <summary>
        <span>
          {group.title}
        </span>

        <small>
          {group.items.length}
        </small>
      </summary>

      <ul>
        {group.items.map(
          (item) => (
            <li key={item}>
              {item}
            </li>
          )
        )}
      </ul>
    </details>
  );
}

function getMaterialChangedFields(
  originalOffer:
    HotelOffer |
    null,
  confirmedOffer:
    HotelOffer |
    null
) {
  if (
    !originalOffer ||
    !confirmedOffer
  ) {
    return [] as string[];
  }

  const changedFields =
    new Set<string>();

  const originalAmount =
    getOfferDisplayAmount(
      originalOffer
    );

  const confirmedAmount =
    getOfferDisplayAmount(
      confirmedOffer
    );

  if (
    originalOffer.currency !==
      confirmedOffer.currency ||
    Math.abs(
      originalAmount -
      confirmedAmount
    ) >
      0.009
  ) {
    changedFields.add(
      "totalKnownCost"
    );
  }

  for (
    const [
      field,
      originalValue,
      confirmedValue,
    ]
    of [
      [
        "includedTaxes",
        originalOffer.includedTaxes,
        confirmedOffer.includedTaxes,
      ],
      [
        "excludedTaxes",
        originalOffer.excludedTaxes,
        confirmedOffer.excludedTaxes,
      ],
      [
        "unknownTaxes",
        originalOffer.unknownTaxes,
        confirmedOffer.unknownTaxes,
      ],
    ] as const
  ) {
    const normalizedOriginal =
      typeof originalValue ===
        "number" &&
      Number.isFinite(
        originalValue
      )
        ? originalValue
        : 0;

    const normalizedConfirmed =
      typeof confirmedValue ===
        "number" &&
      Number.isFinite(
        confirmedValue
      )
        ? confirmedValue
        : 0;

    if (
      Math.abs(
        normalizedOriginal -
        normalizedConfirmed
      ) >
        0.009
    ) {
      changedFields.add(
        field
      );
    }
  }

  if (
    originalOffer.refundable !==
    confirmedOffer.refundable
  ) {
    changedFields.add(
      "refundable"
    );
  }

  if (
    originalOffer.cancellationPolicy !==
    confirmedOffer.cancellationPolicy
  ) {
    changedFields.add(
      "cancellationPolicy"
    );
  }

  if (
    originalOffer.freeCancellationUntil !==
    confirmedOffer.freeCancellationUntil
  ) {
    changedFields.add(
      "freeCancellationUntil"
    );
  }

  if (
    originalOffer.roomName !==
    confirmedOffer.roomName
  ) {
    changedFields.add(
      "roomName"
    );
  }

  if (
    originalOffer.mealPlan !==
    confirmedOffer.mealPlan
  ) {
    changedFields.add(
      "mealPlan"
    );
  }

  if (
    originalOffer.taxesIncluded !==
    confirmedOffer.taxesIncluded
  ) {
    changedFields.add(
      "taxesIncluded"
    );
  }

  if (
    originalOffer.bookable !==
    confirmedOffer.bookable
  ) {
    changedFields.add(
      "bookable"
    );
  }

  return [
    ...changedFields,
  ];
}

function HotelDetailsPanel({
  details,
  loading,
  error,
  offer = null,
  searchId,
  hotelId,
  offerId,
  analyticsRole,
  analyticsPositionBucket,
  distanceFromSelectedPointKm =
    null,
  onOfferRechecked,
  onClose,
}: HotelDetailsPanelProps) {
  const panelRef =
    useRef<HTMLElement>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const descriptionId =
    useId();

  const amenitiesId =
    useId();

  const [
    bookingRecheck,
    setBookingRecheck,
  ] =
    useState<
      BookingOfferRecheckResponse |
      null
    >(null);

  const [
    bookingBusy,
    setBookingBusy,
  ] =
    useState(false);

  const [
    bookingError,
    setBookingError,
  ] =
    useState("");

  const [
    showAllAmenities,
    setShowAllAmenities,
  ] =
    useState(false);

  const [
    showFullDescription,
    setShowFullDescription,
  ] =
    useState(false);

  useEffect(() => {
    setBookingRecheck(
      null
    );

    setBookingBusy(
      false
    );

    setBookingError(
      ""
    );

    setShowAllAmenities(
      false
    );

    setShowFullDescription(
      false
    );
  }, [
    searchId,
    hotelId,
    offerId,
  ]);

  async function handleCheckFinalTotal() {
    if (
      !searchId ||
      !hotelId ||
      !offerId
    ) {
      setBookingError(
        "The selected offer is no longer available in this search."
      );

      return;
    }

    setAnalyticsJourneyStage(
      "recheck"
    );

    trackAnalyticsPageView(
      "recheck"
    );

    trackAnalyticsEvent(
      "recommendation_selected",
      "details",
      {
        role:
          analyticsRole,
        selectionAction:
          "recheck",
        positionBucket:
          analyticsPositionBucket,
      }
    );

    trackAnalyticsEvent(
      "booking_recheck_started",
      "recheck",
      {
        role:
          analyticsRole,
      }
    );

    setBookingBusy(
      true
    );

    setBookingError(
      ""
    );

    try {
      const response =
        await recheckBookingOffer(
          searchId,
          hotelId,
          offerId
        );

      setBookingRecheck(
        response
      );

      if (
        response.offer &&
        hotelId
      ) {
        onOfferRechecked?.(
          hotelId,
          response.offer
        );
      }

      trackAnalyticsEvent(
        "booking_recheck_completed",
        "recheck",
        {
          role:
            analyticsRole,
          recheckState:
            response.state,
          retryable:
            response.retryable,
        }
      );
    } catch (recheckError) {
      trackAnalyticsEvent(
        "booking_recheck_completed",
        "recheck",
        {
          role:
            analyticsRole,
          recheckState:
            "recheck-required",
          retryable:
            recheckError instanceof
              ApiRequestError
              ? recheckError.status ===
                  null ||
                recheckError.status >=
                  500 ||
                recheckError.status ===
                  408 ||
                recheckError.status ===
                  429
              : true,
        }
      );
      setBookingError(
        getBookingFailureMessage(
          recheckError
        )
      );
    } finally {
      setBookingBusy(
        false
      );
    }
  }

  async function handleContinueToCheckout(
    acceptChanges: boolean
  ) {
    const verificationId =
      bookingRecheck
        ?.verification
        ?.id ??
      null;

    if (!verificationId) {
      setBookingError(
        "Check the final total before continuing."
      );

      return;
    }

    setAnalyticsJourneyStage(
      "handoff"
    );

    trackAnalyticsPageView(
      "handoff"
    );

    trackAnalyticsEvent(
      "recommendation_selected",
      "details",
      {
        role:
          analyticsRole,
        selectionAction:
          "handoff",
        positionBucket:
          analyticsPositionBucket,
      }
    );

    setBookingBusy(
      true
    );

    setBookingError(
      ""
    );

    try {
      const response =
        await prepareBookingHandoff(
          verificationId,
          acceptChanges
        );

      trackAnalyticsEvent(
        "booking_handoff_prepared",
        "handoff",
        {
          role:
            analyticsRole,
          acceptedChanges:
            acceptChanges,
        }
      );

      const openUrl =
        resolveBookingHandoffOpenUrl(
          response
            .handoff
            .openUrl
        );

      if (!openUrl) {
        throw new Error(
          "The secure checkout link is invalid."
        );
      }

      trackAnalyticsEvent(
        "booking_handoff_opened",
        "handoff",
        {
          role:
            analyticsRole,
        }
      );

      completeAnalyticsJourney();

      void flushAnalyticsQueue({
        keepalive: true,
      });

      window.location.assign(
        openUrl
      );
    } catch (handoffError) {
      setAnalyticsJourneyStage(
        "recheck"
      );

      setBookingError(
        getBookingFailureMessage(
          handoffError
        )
      );

      setBookingBusy(
        false
      );
    }
  }

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

  const descriptionPresentation =
    useMemo(
      () =>
        presentHotelDescription(
          details?.description
        ),
      [
        details
          ?.description,
      ]
    );

  const cancellationPolicyDisplay =
    useMemo(
      () =>
        offer
          ? getCancellationPolicyDisplay(
              offer
            )
          : null,
      [
        offer,
      ]
    );

  const descriptionIsLong =
    (
      descriptionPresentation
        .overview
        ?.length ??
      0
    ) >
    320;

  const amenityPresentation =
    useMemo(
      () =>
        buildHotelAmenityPresentation(
          details?.amenities ??
            [],
          details?.facilities ??
            []
        ),
      [
        details
          ?.amenities,
        details
          ?.facilities,
      ]
    );

  const localChangedFields =
    useMemo(
      () =>
        getMaterialChangedFields(
          offer,
          bookingRecheck
            ?.offer ??
            null
        ),
      [
        offer,
        bookingRecheck,
      ]
    );

  const effectiveRecheckState =
    bookingRecheck
      ?.state ===
        "confirmed" &&
    localChangedFields.length >
      0
      ? "changed"
      : bookingRecheck
        ?.state ??
        null;

  const changedFields =
    [
      ...new Set([
        ...(
          bookingRecheck
            ?.changedFields ??
          []
        ),
        ...localChangedFields,
      ]),
    ];

  const requiresChangeAcceptance =
    bookingRecheck
      ?.requiresUserConfirmation ===
      true ||
    localChangedFields.length >
      0;

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
              <div className="hotel-details-panel__hero-wrap">
                <img
                  className="hotel-details-panel__hero"
                  src={details.images[0]}
                  alt={details.name}
                />
              </div>
            )}

            <div className="hotel-details-panel__content">
              <header className="hotel-details-panel__header">
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
                      Guest rating {details.reviewScore}/10
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
              </header>

              {offer && (
                <section className="hotel-details-panel__selected-offer">
                  <div className="hotel-details-panel__section-heading">
                    <div>
                      <p className="hotel-details-panel__section-eyebrow">
                        Your selected offer
                      </p>

                      <h3>
                        {offer.roomName ||
                          "Room details unavailable"}
                      </h3>
                    </div>

                    <strong className="hotel-details-panel__offer-price">
                      {formatOfferMoney(
                        getOfferDisplayAmount(
                          offer
                        ),
                        offer.currency
                      )}
                    </strong>
                  </div>

                  <div className="hotel-details-panel__offer-facts">
                    <span
                      className={
                        offer.refundable === false
                          ? "hotel-details-panel__fact hotel-details-panel__fact--warning"
                          : "hotel-details-panel__fact"
                      }
                    >
                      {offer.refundable === true
                        ? "Refundable"
                        : offer.refundable === false
                          ? "Non-refundable"
                          : "Cancellation terms not confirmed"}
                    </span>

                    {offer.mealPlan && (
                      <span className="hotel-details-panel__fact">
                        {offer.mealPlan}
                      </span>
                    )}

                    <span className="hotel-details-panel__fact">
                      {getOfferTaxLabel(
                        offer
                      )}
                    </span>
                  </div>

                  {cancellationPolicyDisplay && (
                    <p className="hotel-details-panel__offer-policy">
                      {cancellationPolicyDisplay}
                    </p>
                  )}
                </section>
              )}

              {details.latitude !==
                null &&
                details.longitude !==
                  null && (
                  <LocationMapPreview
                    latitude={
                      details.latitude
                    }
                    longitude={
                      details.longitude
                    }
                    accommodationName={
                      details.name
                    }
                    address={location}
                    distanceFromSelectedPointKm={
                      distanceFromSelectedPointKm
                    }
                  />
                )}

              {offer && (
                <section
                  className="hotel-details-panel__verification"
                  aria-live="polite"
                >
                  {!bookingRecheck && (
                    <>
                      <div>
                        <p className="hotel-details-panel__section-eyebrow">
                          Before checkout
                        </p>

                        <h3>
                          Confirm the final stay total
                        </h3>

                        <p>
                          SmartStay will check availability, the complete known total, taxes and cancellation conditions before opening secure checkout.
                        </p>

                        <p>
                          {PAYMENT_CHECKOUT_DISCLOSURE}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="hotel-details-panel__booking"
                        onClick={
                          handleCheckFinalTotal
                        }
                        disabled={
                          bookingBusy ||
                          offer.bookable ===
                            false
                        }
                      >
                        {bookingBusy
                          ? "Checking final total..."
                          : "Check final total"}
                      </button>
                    </>
                  )}

                  {effectiveRecheckState ===
                    "confirmed" &&
                    bookingRecheck?.offer && (
                    <>
                      <div className="hotel-details-panel__verification-result hotel-details-panel__verification-result--confirmed">
                        <p className="hotel-details-panel__section-eyebrow">
                          Price checked
                        </p>

                        <h3>
                          Checkout total verified
                        </h3>

                        <strong>
                          {formatOfferMoney(
                            getOfferDisplayAmount(
                              bookingRecheck.offer
                            ),
                            bookingRecheck.offer.currency
                          )}
                        </strong>

                        <p>
                          {getOfferTaxLabel(
                            bookingRecheck.offer
                          )}
                        </p>

                        <p>
                          {PAYMENT_CHECKOUT_DISCLOSURE}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="hotel-details-panel__booking"
                        onClick={() =>
                          void handleContinueToCheckout(
                            false
                          )
                        }
                        disabled={
                          bookingBusy
                        }
                      >
                        {bookingBusy
                          ? "Preparing secure checkout..."
                          : "Continue to secure checkout"}
                      </button>
                    </>
                  )}

                  {effectiveRecheckState ===
                    "changed" &&
                    bookingRecheck?.offer && (
                    <>
                      <div className="hotel-details-panel__verification-result hotel-details-panel__verification-result--changed">
                        <p className="hotel-details-panel__section-eyebrow">
                          Offer updated
                        </p>

                        <h3>
                          Review the verified total
                        </h3>

                        <strong>
                          {formatOfferMoney(
                            getOfferDisplayAmount(
                              bookingRecheck.offer
                            ),
                            bookingRecheck.offer.currency
                          )}
                        </strong>

                        {offer && (
                          <p>
                            Previously shown:{" "}
                            {formatOfferMoney(
                              getOfferDisplayAmount(
                                offer
                              ),
                              offer.currency
                            )}
                          </p>
                        )}

                        {changedFields.length > 0 && (
                          <p>
                            Changed:{" "}
                            {changedFields
                              .map(
                                getChangedFieldLabel
                              )
                              .join(", ")}
                            .
                          </p>
                        )}

                        <p>
                          {getOfferTaxLabel(
                            bookingRecheck.offer
                          )}
                        </p>

                        <p>
                          {PAYMENT_CHECKOUT_DISCLOSURE}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="hotel-details-panel__booking"
                        onClick={() =>
                          void handleContinueToCheckout(
                            requiresChangeAcceptance
                          )
                        }
                        disabled={
                          bookingBusy
                        }
                      >
                        {bookingBusy
                          ? "Preparing secure checkout..."
                          : "Accept verified offer and continue"}
                      </button>
                    </>
                  )}

                  {effectiveRecheckState ===
                    "sold-out" && (
                    <div className="hotel-details-panel__verification-result hotel-details-panel__verification-result--error">
                      <h3>
                        This offer is no longer available
                      </h3>

                      <p>
                        Choose another stay or run a new search for current availability.
                      </p>
                    </div>
                  )}

                  {effectiveRecheckState ===
                    "recheck-required" && (
                    <>
                      <div className="hotel-details-panel__verification-result hotel-details-panel__verification-result--warning">
                        <h3>
                          Final confirmation is still required
                        </h3>

                        <p>
                          {bookingRecheck?.message}
                        </p>
                      </div>

                      {bookingRecheck?.retryable && (
                        <button
                          type="button"
                          className="hotel-details-panel__booking"
                          onClick={
                            handleCheckFinalTotal
                          }
                          disabled={
                            bookingBusy
                          }
                        >
                          Try verification again
                        </button>
                      )}
                    </>
                  )}

                  {bookingError && (
                    <p
                      className="hotel-details-panel__booking-error"
                      role="alert"
                    >
                      {bookingError}
                    </p>
                  )}
                </section>
              )}

              {(descriptionPresentation.overview ||
                descriptionPresentation.highlights.length > 0) && (
                <section className="hotel-details-panel__section">
                  <div className="hotel-details-panel__section-heading">
                    <div>
                      <p className="hotel-details-panel__section-eyebrow">
                        About this stay
                      </p>

                      <h3>
                        Accommodation overview
                      </h3>
                    </div>
                  </div>

                  {descriptionPresentation.overview && (
                    <>
                      <p
                        id={descriptionId}
                        className={
                          "hotel-details-panel__description" +
                          (
                            descriptionIsLong &&
                            !showFullDescription
                              ? " hotel-details-panel__description--collapsed"
                              : ""
                          )
                        }
                      >
                        {descriptionPresentation.overview}
                      </p>

                      {descriptionIsLong && (
                        <button
                          type="button"
                          className="hotel-details-panel__description-toggle"
                          aria-expanded={
                            showFullDescription
                          }
                          aria-controls={
                            descriptionId
                          }
                          onClick={() =>
                            setShowFullDescription(
                              (current) =>
                                !current
                            )
                          }
                        >
                          {showFullDescription
                            ? "Show less"
                            : "Read full description"}
                        </button>
                      )}
                    </>
                  )}

                  {descriptionPresentation.highlights.length > 0 && (
                    <ul className="hotel-details-panel__description-highlights">
                      {descriptionPresentation.highlights.map(
                        (highlight) => (
                          <li key={highlight}>
                            {highlight}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </section>
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

              {amenityPresentation.totalCount > 0 && (
                <section className="hotel-details-panel__section">
                  <div className="hotel-details-panel__section-heading">
                    <div>
                      <p className="hotel-details-panel__section-eyebrow">
                        Amenities and services
                      </p>

                      <h3>
                        What is available
                      </h3>
                    </div>

                    <small>
                      {amenityPresentation.totalCount} items
                    </small>
                  </div>

                  <ul className="hotel-details-panel__amenity-highlights">
                    {amenityPresentation.highlights.map(
                      (item) => (
                        <li key={item}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>

                  {amenityPresentation.groups.length > 1 && (
                    <button
                      type="button"
                      className="hotel-details-panel__amenity-toggle"
                      onClick={() =>
                        setShowAllAmenities(
                          (currentValue) =>
                            !currentValue
                        )
                      }
                      aria-expanded={
                        showAllAmenities
                      }
                      aria-controls={
                        amenitiesId
                      }
                    >
                      {showAllAmenities
                        ? "Hide amenities"
                        : `View all ${amenityPresentation.totalCount} amenities`}
                    </button>
                  )}

                  {showAllAmenities && (
                    <div
                      id={amenitiesId}
                      className="hotel-details-panel__amenity-groups"
                    >
                      {amenityPresentation.groups.map(
                        (group, index) => (
                          <AmenityGroupSection
                            key={group.id}
                            group={group}
                            open={index === 0}
                          />
                        )
                      )}
                    </div>
                  )}
                </section>
              )}

              <p className="hotel-details-panel__provider">
                Accommodation information supplied by a booking partner.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default HotelDetailsPanel;