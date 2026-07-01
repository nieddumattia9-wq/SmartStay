import "./TripOptimizer.css";

function TripOptimizer() {
  return (
    <div className="trip-card">

      <input
        type="text"
        placeholder="📍 Destination"
      />

      <div className="row">

        <input type="date" />

        <input type="date" />

      </div>

      <div className="row">

        <input
          type="number"
          placeholder="Guests"
        />

        <input
          type="number"
          placeholder="Budget €"
        />

      </div>

      <div className="slider">

        <span>Comfort</span>

        <input type="range" />

        <span>Risparmio</span>

      </div>

      <button>

        Find my SmartStay

      </button>

    </div>
  );
}

export default TripOptimizer;