import { useState } from "react";

import "./TripOptimizer.css";

import SmartOptimizer from "../SmartOptimizer/SmartOptimizer";
import DestinationAutocomplete from "../DestinationAutocomplete/DestinationAutocomplete";
import BookingCalendar from "../BookingCalendar/BookingCalendar";

function TripOptimizer() {
  const [destination, setDestination] = useState("");

  return (
    <div className="trip-card">

      <DestinationAutocomplete
        value={destination}
        onChange={setDestination}
        placeholder="Search destination..."
      />

      <div className="row">
        <BookingCalendar
          placeholder="Check-in"
        />

        <BookingCalendar
          placeholder="Check-out"
        />
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

      <SmartOptimizer />

      <button>
        Find my SmartStay
      </button>

    </div>
  );
}

export default TripOptimizer;