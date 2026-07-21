import {
  selectHotelOffers,
} from "../../utils/hotelOfferSelection";
import "./HotelCard.css";

import type {
  Hotel,
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

type HotelCardProps = {
  hotel: Hotel;
  smartScore?: number;
  riskLevel?: SmartStayRiskLevelV2;
  dataConfidenceLevel?: SmartStayDataConfidenceLevelV2;
  badges?: SmartStayFrontendBadgeV2[];
  strengths?: string[];
  tradeOffs?: string[];
  selectedOffer?: SmartStaySelectedOfferV2 | null;
  detailsLoading?: boolean;
  bookingUrl?: string | null;
  showRecommendationLabel?: boolean;
  onViewDetails: (hotel: Hotel) => void;
};

function formatPrice(
  price: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
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

function formatStars(stars: number) {
  const safeStars = Math.min(
    Math.max(
      Math.round(stars || 0),
      0
    ),
    5
  );

  return "★".repeat(safeStars);
}

function formatReviewScore(
  reviewScore: number | null
) {
  if (reviewScore === null) {
    return "-";
  }

  return String(reviewScore);
}

function formatRiskLabel(
  riskLevel?: SmartStayRiskLevelV2
) {
  if (riskLevel === "low") {
    return "Low risk";
  }

  if (riskLevel === "medium") {
    return "Medium risk";
  }

  if (riskLevel === "high") {
    return "Higher risk";
  }

  return "Risk unavailable";
}

function formatDataConfidence(
  dataConfidence:
    SmartStayDataConfidenceLevelV2
) {
  if (dataConfidence === "high") {
    return "High data confidence";
  }

  if (dataConfidence === "medium") {
    return "Medium data confidence";
  }

  if (dataConfidence === "low") {
    return "Limited data confidence";
  }

  return "Insufficient data";
}

function getDataConfidenceModifier(
  dataConfidence:
    SmartStayDataConfidenceLevelV2
) {
  if (dataConfidence === "high") {
    return "full";
  }

  if (dataConfidence === "medium") {
    return "partial";
  }

  return "limited";
}

function getBestDisplayPrice(
  hotel: Hotel,
  selectedOffer:
    SmartStaySelectedOfferV2 | null
) {
  if (selectedOffer) {
    return {
      price:
        selectedOffer.amount,

      currency:
        selectedOffer.currency,

      completeness:
        selectedOffer.completeness,
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
    };
  }

  return {
    price:
      hotel.totalKnownCost ??
      hotel.price,

    currency:
      hotel.currency,

    completeness:
      "unknown" as const,
  };
}

function formatSelectedOfferSummary(
  selectedOffer:
    SmartStaySelectedOfferV2 | null
) {
  if (!selectedOffer) {
    return null;
  }

  if (
    selectedOffer.refundable ===
      true
  ) {
    if (
      selectedOffer
        .freeCancellationUntil
    ) {
      const parsedDate =
        new Date(
          selectedOffer
            .freeCancellationUntil
        );

      if (
        Number.isFinite(
          parsedDate.getTime()
        )
      ) {
        return (
          "Refundable offer selected · Free cancellation until " +
          new Intl.DateTimeFormat(
            "en-GB",
            {
              day:
                "numeric",

              month:
                "short",

              year:
                "numeric",
            }
          ).format(
            parsedDate
          )
        );
      }
    }

    return "Refundable offer selected for this search";
  }

  if (
    selectedOffer.refundable ===
      false
  ) {
    return "Non-refundable offer selected for this search";
  }

  return "Offer selected by SmartStay for this search";
}

function getBadgeModifier(badge: SmartStayFrontendBadgeV2) {
  if (
    badge === "Limited Data" ||
    badge === "Balanced Choice"
  ) {
    return "neutral";
  }

  if (
    badge === "Reliable Reviews" ||
    badge === "Solid Data" ||
    badge === "Low Risk" ||
    badge === "Smart Pick"
  ) {
    return "strong";
  }

  return "positive";
}

function HotelCard({
  hotel,
  smartScore,
  riskLevel,
  dataConfidenceLevel = "none",
  badges = [],
  strengths = [],
  tradeOffs = [],
  selectedOffer = null,
  detailsLoading = false,
  bookingUrl = null,
  showRecommendationLabel = false,
  onViewDetails,
}: HotelCardProps) {
  const hasImage =
    Boolean(hotel.image);

  const location =
    formatLocation(
      hotel.city,
      hotel.country
    );

  const riskLabel =
    formatRiskLabel(riskLevel);

  const dataConfidence =
    getDataConfidenceModifier(
      dataConfidenceLevel
    );

  const dataConfidenceLabel =
    formatDataConfidence(
      dataConfidenceLevel
    );

  const offerSelection =
    selectHotelOffers(hotel);

  const displayPrice =
    getBestDisplayPrice(
      hotel,
      selectedOffer
    );

  const selectedOfferSummary =
    showRecommendationLabel ||
    selectedOffer
      ?.selectionMode ===
      "intent-aware-flexibility"
      ? formatSelectedOfferSummary(
          selectedOffer
        )
      : null;

  const visibleBadges =
    badges.filter(
      (badge) =>
        badge !==
        "Low Risk"
    );

  const hasExplanation =
    strengths.length > 0 ||
    tradeOffs.length > 0;

  const hasBadges =
    visibleBadges.length > 0;

  return (
    <article className="hotel-card">
      <div className="hotel-card__image">
        {hasImage ? (
          <img
            src={hotel.image}
            alt={hotel.name}
          />
        ) : (
          <div className="hotel-card__image-placeholder">
            SmartStay
          </div>
        )}

        {smartScore !== undefined && (
          <div className="hotel-card__image-score">
            <span>
              Your SmartScore
            </span>

            <strong>
              {smartScore}
            </strong>

            <small>
              For this search
            </small>
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

              {hotel.stars > 0 && (
                <div className="hotel-card__stars">
                  {formatStars(hotel.stars)}
                </div>
              )}

              <div className="hotel-card__meta">
                <span>
                  📍 {location}
                </span>

                {hotel.distance !== null && (
                  <span>
                    {hotel.distance.toFixed(1)} km from center
                  </span>
                )}
              </div>
            </div>

            <div className="hotel-card__review-panel">
              <span className="hotel-card__review-score">
                {formatReviewScore(hotel.reviewScore)}
              </span>

              <span className="hotel-card__review-text">
                {hotel.reviewText || "No review score"}
              </span>

              <span className="hotel-card__review-count">
                {formatReviewCountLabel(
                  hotel.reviewCount,
                  hotel.reviewCountRelation
                )}
              </span>
            </div>
          </div>

          {hasBadges && (
            <div className="hotel-card__badges">
              {visibleBadges.map((badge) => (
                <span
                  key={badge}
                  className={`hotel-card__badge hotel-card__badge--${getBadgeModifier(badge)}`}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          <div className="hotel-card__trust-row">
            <span className={`hotel-card__risk hotel-card__risk--${riskLevel ?? "medium"}`}>
              {riskLabel}
            </span>

            <span className={`hotel-card__data-confidence hotel-card__data-confidence--${dataConfidence}`}>
              {dataConfidenceLabel}
            </span>
          </div>

          {hasExplanation && (
            <section className="hotel-card__engine">
              <div className="hotel-card__engine-heading">
                <span className="hotel-card__engine-icon">
                  ✓
                </span>

                <div>
                  <p className="hotel-card__engine-title">
                    {showRecommendationLabel
                      ? "Why SmartStay recommends this"
                      : "How this stay compares"}
                  </p>

                  <p className="hotel-card__engine-subtitle">
                    Evidence-backed strengths and trade-offs for this search.
                  </p>
                </div>
              </div>

              <div className="hotel-card__explanation-groups">
                {strengths.length > 0 && (
                  <div className="hotel-card__explanation-group">
                    <p className="hotel-card__explanation-label">
                      What stands out
                    </p>

                    <ul className="hotel-card__reasons">
                      {strengths.map((strength) => (
                        <li key={strength}>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tradeOffs.length > 0 && (
                  <div className="hotel-card__explanation-group">
                    <p className="hotel-card__explanation-label">
                      What to consider
                    </p>

                    <ul className="hotel-card__reasons">
                      {tradeOffs.map((tradeOff) => (
                        <li key={tradeOff}>
                          {tradeOff}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="hotel-card__bottom">
          <div className="hotel-card__price-block">
            <p className="hotel-card__price">
              {formatPrice(
                displayPrice.price,
                displayPrice.currency
              )}
            </p>

            <p className="hotel-card__price-note">
              {displayPrice.completeness ===
              "reported-complete"
                ? "Total stay cost based on mandatory charges reported by the provider"
                : displayPrice.completeness ===
                    "reported-tax-status-unknown"
                  ? "Provider-reported stay amount; tax inclusion was not confirmed, so the final total may be higher"
                  : displayPrice.completeness ===
                      "partial"
                    ? "Total known stay cost; some mandatory charges may still be uncertain"
                    : "Price from available offer data; final mandatory charges may vary"}
            </p>

            {selectedOfferSummary && (
              <p className="hotel-card__price-note">
                {selectedOfferSummary}
              </p>
            )}
          </div>

          {offerSelection.offers.length > 1 && (
            <p className="hotel-card__offer-count">
              {offerSelection.offers.length} available offers
            </p>
          )}

          <div className="hotel-card__actions">
            <button
              type="button"
              className="hotel-card__button"
              onClick={() => {
                onViewDetails(
                  hotel
                );
              }}
              disabled={detailsLoading}
              aria-busy={detailsLoading}
            >
              {detailsLoading
                ? "Loading details..."
                : "View Details"}
            </button>

            {bookingUrl && (
              <a
                className="hotel-card__booking-link"
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View booking offer
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default HotelCard;
