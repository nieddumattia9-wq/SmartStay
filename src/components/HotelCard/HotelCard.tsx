import "./HotelCard.css";

import type { Hotel } from "../../types/hotel";

type HotelCardProps = {
  hotel: Hotel;
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

function HotelCard({
  hotel,
}: HotelCardProps) {

  const hasImage =
    Boolean(hotel.image);

  const location =
    formatLocation(
      hotel.city,
      hotel.country
    );

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

            <h2 className="hotel-card__name">

              {hotel.name}

            </h2>

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

          </div>

          <div className="hotel-card__score">

            <span className="hotel-card__score-value">

              {hotel.reviewScore ?? "-"}

            </span>

            <span className="hotel-card__score-text">

              {hotel.reviewText || "No reviews"}

            </span>

          </div>

        </div>

        <div className="hotel-card__bottom">

          <div>

            {hotel.saving > 0 && (

              <div className="hotel-card__saving">

                Save {hotel.saving}%

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

          <button className="hotel-card__button">

            View Details

          </button>

        </div>

      </div>

    </article>

  );

}

export default HotelCard;