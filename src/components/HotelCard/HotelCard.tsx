import {
  selectHotelOffers,
} from "../../utils/hotelOfferSelection";
import "./HotelCard.css";

import type { Hotel } from "../../types/hotel";

import type {
  SmartBadge,
  SmartRiskLevel,
} from "../../utils/smartStayEngine";

type HotelCardProps = {
  hotel: Hotel;
  smartScore?: number;
  riskLevel?: SmartRiskLevel;
  badges?: SmartBadge[];
  reasons?: string[];
  priceAdvantagePercent?: number | null;
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

function formatReviewCount(
  reviewCount: number | null
) {
  if (
    reviewCount === null ||
    reviewCount <= 0
  ) {
    return "Review count unavailable";
  }

  if (reviewCount === 1) {
    return "1 review";
  }

  return `${reviewCount.toLocaleString("en-US")} reviews`;
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
  riskLevel?: SmartRiskLevel
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
  dataConfidence: Hotel["dataConfidence"]
) {
  if (dataConfidence === "full") {
    return "Solid data";
  }

  if (dataConfidence === "partial") {
    return "Partial data";
  }

  return "Limited data";
}

function getBestDisplayPrice(
  hotel: Hotel
) {
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

function getBadgeModifier(badge: SmartBadge) {
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
  badges = [],
  reasons = [],
  priceAdvantagePercent = null,
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
    hotel.dataConfidence ?? "limited";

  const dataConfidenceLabel =
    formatDataConfidence(dataConfidence);

  const offerSelection =
    selectHotelOffers(hotel);

  const displayPrice =
    getBestDisplayPrice(hotel);

  const hasReasons =
    reasons.length > 0;

  const hasBadges =
    badges.length > 0;

  const hasPriceAdvantage =
    typeof priceAdvantagePercent === "number" &&
    Number.isFinite(priceAdvantagePercent) &&
    priceAdvantagePercent > 0;

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
                {formatReviewCount(hotel.reviewCount)}
              </span>
            </div>
          </div>

          {hasBadges && (
            <div className="hotel-card__badges">
              {badges.map((badge) => (
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

          {hasReasons && (
            <section className="hotel-card__engine">
              <div className="hotel-card__engine-heading">
                <span className="hotel-card__engine-icon">
                  ✓
                </span>

                <div>
                  <p className="hotel-card__engine-title">
                    Why SmartStay recommends this
                  </p>

                  <p className="hotel-card__engine-subtitle">
                    Based on price, location, reliability and available data.
                  </p>
                </div>
              </div>

              <ul className="hotel-card__reasons">
                {reasons.map((reason) => (
                  <li key={reason}>
                    {reason}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="hotel-card__bottom">
          <div className="hotel-card__price-block">
            {hasPriceAdvantage && (
              <div className="hotel-card__saving">
                {priceAdvantagePercent}% below search average
              </div>
            )}

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
                    "partial"
                  ? "Total known stay cost; some mandatory charges may still be uncertain"
                  : "Price from available offer data; final mandatory charges may vary"}
            </p>
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