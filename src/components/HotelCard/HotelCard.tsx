import {
  useId,
  useState,
} from "react";

import {
  selectHotelOffers,
} from "../../utils/hotelOfferSelection";
import "./HotelCard.css";

import type {
  Hotel,
  HotelOffer,
} from "../../types/hotel";

import {
  formatReviewCountLabel,
} from "../../utils/reviewCountDisplay";

import type {
  SmartStayFrontendBadgeV2,
} from "../../engine-v2/frontend/smartStayFrontendAdapterV2";

import type {
  SmartStaySelectedOfferV2,
} from "../../engine-v2/offers/intentAwareOfferSelectionV2";

import type {
  SmartStayDataConfidenceLevelV2,
  SmartStayRiskLevelV2,
} from "../../engine-v2/model/smartStayEvaluationV2";

import {
  buildDisplayedTradeOffsV2,
} from "../../engine-v2/frontend/tradeOffPresentationV2";

type HotelCardProps = {
  hotel: Hotel;
  smartScore?: number;
  riskLevel?: SmartStayRiskLevelV2;
  dataConfidenceLevel?: SmartStayDataConfidenceLevelV2;
  badges?: SmartStayFrontendBadgeV2[];
  strengths?: string[];
  tradeOffs?: string[];
  selectedOffer?: SmartStaySelectedOfferV2 | null;
  displayOfferOverride?: HotelOffer | null;
  detailsLoading?: boolean;
  showRecommendationLabel?: boolean;
  onViewDetails: (
    hotel: Hotel,
    selectedOffer:
      SmartStaySelectedOfferV2 |
      null
  ) => void;
  onExplanationToggle?: (
    expanded: boolean
  ) => void;
};

type DisplayPrice = {
  price: number;
  currency: string;
  completeness:
    | "reported-complete"
    | "reported-tax-status-unknown"
    | "partial"
    | "unknown";
  verified: boolean;
};

function formatPrice(
  price: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",
        currency,
        minimumFractionDigits:
          2,
        maximumFractionDigits:
          2,
      }
    ).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

function formatLocation(
  city: string,
  country: string
) {
  const parts = [
    city,
    country,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "Location unavailable";
}

function formatStars(
  stars: number
) {
  const safeStars =
    Math.min(
      Math.max(
        Math.round(
          stars ||
          0
        ),
        0
      ),
      5
    );

  return "★".repeat(
    safeStars
  );
}

function formatReviewScore(
  reviewScore:
    number |
    null
) {
  if (
    reviewScore ===
    null
  ) {
    return "-";
  }

  return `${reviewScore}/10`;
}

function getOfferAmount(
  offer:
    HotelOffer
) {
  if (
    typeof offer
      .totalKnownCost ===
      "number" &&
    Number.isFinite(
      offer.totalKnownCost
    ) &&
    offer.totalKnownCost >
      0
  ) {
    return offer.totalKnownCost;
  }

  return offer.price;
}

function getOverrideCompleteness(
  offer:
    HotelOffer
): DisplayPrice["completeness"] {
  if (
    offer.taxesIncluded ===
      true ||
    offer.taxesIncluded ===
      false
  ) {
    return "reported-complete";
  }

  if (
    typeof offer.unknownTaxes ===
      "number" &&
    offer.unknownTaxes >
      0
  ) {
    return "reported-tax-status-unknown";
  }

  return "partial";
}

function getBestDisplayPrice(
  hotel:
    Hotel,
  selectedOffer:
    SmartStaySelectedOfferV2 |
    null,
  displayOfferOverride:
    HotelOffer |
    null
): DisplayPrice {
  if (displayOfferOverride) {
    return {
      price:
        getOfferAmount(
          displayOfferOverride
        ),
      currency:
        displayOfferOverride
          .currency,
      completeness:
        getOverrideCompleteness(
          displayOfferOverride
        ),
      verified:
        true,
    };
  }

  if (selectedOffer) {
    return {
      price:
        selectedOffer.amount,
      currency:
        selectedOffer.currency,
      completeness:
        selectedOffer.completeness,
      verified:
        false,
    };
  }

  const primaryOffer =
    selectHotelOffers(
      hotel
    ).primary;

  if (primaryOffer) {
    return {
      price:
        primaryOffer.amount,
      currency:
        primaryOffer.currency,
      completeness:
        primaryOffer.completeness,
      verified:
        false,
    };
  }

  return {
    price:
      hotel.totalKnownCost ??
      hotel.price,
    currency:
      hotel.currency,
    completeness:
      "unknown",
    verified:
      false,
  };
}

function getPriceNote(
  displayPrice:
    DisplayPrice
) {
  if (displayPrice.verified) {
    return "Latest total verified before checkout.";
  }

  if (
    displayPrice.completeness ===
    "reported-complete"
  ) {
    return "Total stay cost based on mandatory charges reported by the provider.";
  }

  if (
    displayPrice.completeness ===
    "reported-tax-status-unknown"
  ) {
    return "Provider-reported stay amount; tax inclusion was not confirmed.";
  }

  if (
    displayPrice.completeness ===
    "partial"
  ) {
    return "Total known stay cost; some mandatory charges may still be uncertain.";
  }

  return "Price from available offer data; final mandatory charges may vary.";
}

function uniqueMessages(
  values:
    Array<
      string |
      null |
      undefined
    >
) {
  const seen =
    new Set<string>();

  return values
    .map(
      (value) =>
        typeof value ===
          "string"
          ? value.trim()
          : ""
    )
    .filter(
      (value) => {
        if (!value) {
          return false;
        }

        const normalized =
          value
            .toLowerCase()
            .replace(/\s+/g, " ");

        if (
          seen.has(
            normalized
          )
        ) {
          return false;
        }

        seen.add(
          normalized
        );

        return true;
      }
    );
}

function getVisibleBadges(
  badges:
    SmartStayFrontendBadgeV2[]
) {
  const hidden =
    new Set<
      SmartStayFrontendBadgeV2
    >([
      "Low Risk",
      "Solid Data",
      "Limited Data",
      "Balanced Choice",
      "Smart Pick",
    ]);

  return uniqueMessages(
    badges.filter(
      (badge) =>
        !hidden.has(
          badge
        )
    )
  ).slice(
    0,
    2
  );
}

function getOfferCondition(
  selectedOffer:
    SmartStaySelectedOfferV2 |
    null,
  displayOfferOverride:
    HotelOffer |
    null
) {
  const refundable =
    displayOfferOverride
      ?.refundable !==
      undefined
      ? displayOfferOverride
          .refundable ??
        null
      : selectedOffer
          ?.refundable ??
        null;

  if (
    refundable ===
    true
  ) {
    return {
      label:
        "Refundable",
      modifier:
        "positive",
    } as const;
  }

  return null;
}

function HotelCard({
  hotel,
  smartScore,
  riskLevel,
  dataConfidenceLevel =
    "none",
  badges = [],
  strengths = [],
  tradeOffs = [],
  selectedOffer = null,
  displayOfferOverride = null,
  detailsLoading = false,
  showRecommendationLabel = false,
  onViewDetails,
  onExplanationToggle,
}: HotelCardProps) {
  const explanationId =
    useId();

  const [
    explanationExpanded,
    setExplanationExpanded,
  ] = useState(
    false
  );

  const displayPrice =
    getBestDisplayPrice(
      hotel,
      selectedOffer,
      displayOfferOverride
    );

  const visibleBadges =
    getVisibleBadges(
      badges
    );

  const strengthPreview =
    uniqueMessages(
      strengths
    ).slice(
      0,
      2
    );

  const fullTradeOffs =
    buildDisplayedTradeOffsV2({
      tradeOffs,
      selectedOffer,
      displayOfferOverride,
      riskLevel,
      dataConfidenceLevel,
    });

  const tradeOffPreview =
    fullTradeOffs.slice(
      0,
      2
    );

  const offerCondition =
    getOfferCondition(
      selectedOffer,
      displayOfferOverride
    );

  const displayRoomName =
    displayOfferOverride
      ?.roomName ??
    selectedOffer
      ?.roomName ??
    null;

  const hasExplanation =
    strengths.length >
      0 ||
    fullTradeOffs.length >
      0;

  return (
    <article className="hotel-card">
      <div className="hotel-card__image">
        {hotel.image ? (
          <img
            src={hotel.image}
            alt={hotel.name}
          />
        ) : (
          <div className="hotel-card__image-placeholder">
            SmartStay
          </div>
        )}

        {smartScore !==
          undefined && (
          <div className="hotel-card__image-score">
            <span>
              SmartStay fit
            </span>

            <strong>
              {smartScore}
              <small>
                /100
              </small>
            </strong>

            <em>
              For this search
            </em>
          </div>
        )}
      </div>

      <div className="hotel-card__content">
        <div className="hotel-card__main">
          <div className="hotel-card__header">
            <div className="hotel-card__header-left">
              {showRecommendationLabel && (
                <p className="hotel-card__eyebrow">
                  SmartStay recommendation
                </p>
              )}

              <h2 className="hotel-card__name">
                {hotel.name}
              </h2>

              {hotel.stars >
                0 && (
                <div className="hotel-card__stars">
                  {formatStars(
                    hotel.stars
                  )}
                </div>
              )}

              <div className="hotel-card__meta">
                <span>
                  📍 {formatLocation(
                    hotel.city,
                    hotel.country
                  )}
                </span>

                {hotel.distance !==
                  null && (
                  <span>
                    {hotel.distance.toFixed(
                      1
                    )}{" "}
                    km from centre
                  </span>
                )}

                {displayRoomName && (
                  <span className="hotel-card__room">
                    {displayRoomName}
                  </span>
                )}
              </div>
            </div>

            <div className="hotel-card__review-panel">
              <span className="hotel-card__review-label">
                Guest rating
              </span>

              <span className="hotel-card__review-score">
                {formatReviewScore(
                  hotel.reviewScore
                )}
              </span>

              <span className="hotel-card__review-text">
                {hotel.reviewText ||
                  "No guest rating"}
              </span>

              <span className="hotel-card__review-count">
                {formatReviewCountLabel(
                  hotel.reviewCount,
                  hotel.reviewCountRelation
                )}
              </span>
            </div>
          </div>

          {(visibleBadges.length >
            0 ||
            offerCondition) && (
            <div className="hotel-card__badges">
              {visibleBadges.map(
                (badge) => (
                  <span
                    key={badge}
                    className="hotel-card__badge hotel-card__badge--positive"
                  >
                    {badge}
                  </span>
                )
              )}

              {offerCondition && (
                <span
                  className={`hotel-card__offer-condition hotel-card__offer-condition--${offerCondition.modifier}`}
                >
                  {offerCondition.label}
                </span>
              )}
            </div>
          )}

          {(strengthPreview.length >
            0 ||
            tradeOffPreview.length >
              0) && (
            <div className="hotel-card__decision-grid">
              {strengthPreview.length >
                0 && (
                <section className="hotel-card__decision-panel hotel-card__decision-panel--positive">
                  <p>
                    Why it stands out
                  </p>

                  <ul>
                    {strengthPreview.map(
                      (strength) => (
                        <li key={strength}>
                          {strength}
                        </li>
                      )
                    )}
                  </ul>
                </section>
              )}

              {tradeOffPreview.length >
                0 && (
                <section className="hotel-card__decision-panel hotel-card__decision-panel--warning">
                  <p>
                    What to know
                  </p>

                  <ul>
                    {tradeOffPreview.map(
                      (tradeOff) => (
                        <li key={tradeOff}>
                          {tradeOff}
                        </li>
                      )
                    )}
                  </ul>
                </section>
              )}
            </div>
          )}

          {hasExplanation && (
            <section className="hotel-card__engine">
              <button
                type="button"
                className="hotel-card__engine-toggle"
                aria-expanded={
                  explanationExpanded
                }
                aria-controls={
                  explanationId
                }
                onClick={() => {
                  const nextExpanded =
                    !explanationExpanded;

                  setExplanationExpanded(
                    nextExpanded
                  );

                  onExplanationToggle?.(
                    nextExpanded
                  );
                }}
              >
                <span className="hotel-card__engine-heading">
                  <span className="hotel-card__engine-icon">
                    ✓
                  </span>

                  <span>
                    <span className="hotel-card__engine-title">
                      Full SmartStay comparison
                    </span>

                    <span className="hotel-card__engine-subtitle">
                      See the complete evidence-backed strengths and trade-offs.
                    </span>
                  </span>
                </span>

                <span
                  className="hotel-card__engine-toggle-label"
                  aria-hidden="true"
                >
                  {explanationExpanded
                    ? "Hide"
                    : "Show"}
                </span>
              </button>

              {explanationExpanded && (
                <div
                  id={explanationId}
                  className="hotel-card__explanation-groups"
                >
                  {strengths.length >
                    0 && (
                    <div className="hotel-card__explanation-group">
                      <p className="hotel-card__explanation-label">
                        Why it stands out
                      </p>

                      <ul className="hotel-card__reasons">
                        {uniqueMessages(
                          strengths
                        ).map(
                          (strength) => (
                            <li key={strength}>
                              {strength}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {fullTradeOffs.length >
                    0 && (
                    <div className="hotel-card__explanation-group">
                      <p className="hotel-card__explanation-label">
                        What to know
                      </p>

                      <ul className="hotel-card__reasons">
                        {fullTradeOffs.map(
                          (tradeOff) => (
                            <li key={tradeOff}>
                              {tradeOff}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="hotel-card__bottom">
          <div className="hotel-card__price-block">
            <p className="hotel-card__price-label">
              Total stay
            </p>

            <p className="hotel-card__price">
              {formatPrice(
                displayPrice.price,
                displayPrice.currency
              )}
            </p>

            <p className="hotel-card__price-note">
              {getPriceNote(
                displayPrice
              )}
            </p>

            {displayPrice.verified && (
              <p className="hotel-card__verified-total">
                Price checked
              </p>
            )}
          </div>

          <div className="hotel-card__actions">
            <button
              type="button"
              className="hotel-card__button"
              onClick={() => {
                onViewDetails(
                  hotel,
                  selectedOffer
                );
              }}
              disabled={
                detailsLoading
              }
              aria-busy={
                detailsLoading
              }
            >
              {detailsLoading
                ? "Loading details..."
                : "View details and offer"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default HotelCard;
