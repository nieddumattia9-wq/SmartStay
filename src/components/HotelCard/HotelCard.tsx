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

  const safeStars =
    Math.min(
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

  return null;

}

function HotelCard({
  hotel,
  smartScore,
  riskLevel,
  badges = [],
  reasons = [],
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

      </div>

      <div className="hotel-card__content">

        <div className="hotel-card__top">

          <div className="hotel-card__info">

            <div className="hotel-card__title-row">

              <h2 className="hotel-card__name">

                {hotel.name}

              </h2>

              {smartScore !== undefined && (

                <div className="hotel-card__smart-score">

                  <span className="hotel-card__smart-score-label">

                    SmartScore

                  </span>

                  <span className="hotel-card__smart-score-value">

                    {smartScore}

                  </span>

                </div>

              )}

            </div>

            {hotel.stars > 0 && (

              <div className="hotel-card__stars">

                {formatStars(hotel.stars)}

              </div>

            )}

            <p className="hotel-card__location">

              📍 {location}

            </p>

            {hotel.distance !== null && (

              <p className="hotel-card__distance">

                {hotel.distance.toFixed(1)} km from center

              </p>

            )}

            {badges.length > 0 && (

              <div className="hotel-card__badges">

                {badges.map((badge) => (

                  <span
                    key={badge}
                    className="hotel-card__badge"
                  >

                    {badge}

                  </span>

                ))}

              </div>

            )}

          </div>

          <div className="hotel-card__score">

            <span className="hotel-card__score-value">

              {hotel.reviewScore ?? "-"}

            </span>

            <span className="hotel-card__score-text">

              {hotel.reviewText || "No reviews"}

            </span>

            <span className="hotel-card__review-count">

              {formatReviewCount(hotel.reviewCount)}

            </span>

          </div>

        </div>

        {reasons.length > 0 && (

          <div className="hotel-card__engine">

            <p className="hotel-card__engine-title">

              Why SmartStay recommends this

            </p>

            <ul className="hotel-card__reasons">

              {reasons.map((reason) => (

                <li key={reason}>

                  {reason}

                </li>

              ))}

            </ul>

          </div>

        )}

        <div className="hotel-card__bottom">

          <div>

            {hotel.saving > 0 && (

              <div className="hotel-card__saving">

                Save {hotel.saving}%

              </div>

            )}

            {riskLabel && (

              <div
                className={`hotel-card__risk hotel-card__risk--${riskLevel}`}
              >

                {riskLabel}

              </div>

            )}

            <p className="hotel-card__price">

              {formatPrice(
                hotel.price,
                hotel.currency
              )}

            </p>

            <p className="hotel-card__price-night">

              Total price

            </p>

          </div>

          <button
            type="button"
            className="hotel-card__button"
          >

            View Details

          </button>

        </div>

      </div>

    </article>

  );

}

export default HotelCard;