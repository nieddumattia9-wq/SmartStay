import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Wallet, Sparkles } from "lucide-react";

import GuestsSelector from "../GuestsSelector/GuestsSelector";
import "./TripOptimizer.css";

import SmartOptimizer from "../SmartOptimizer/SmartOptimizer";
import DestinationAutocomplete from "../DestinationAutocomplete/DestinationAutocomplete";
import BookingCalendar from "../BookingCalendar/BookingCalendar";

function TripOptimizer() {
  const [destination, setDestination] = useState("");
  const navigate = useNavigate();
  function handleSearch() {
    navigate("/loading");
  }

  return (
    <div className="trip-card">

      <DestinationAutocomplete
        value={destination}
        onChange={setDestination}
        placeholder="Search destination..."
      />

      <div className="row">
        <BookingCalendar />
      </div>

      <div className="row">

        <GuestsSelector />

        <div className="budget-input">

          <Wallet
            size={18}
            strokeWidth={2}
            className="budget-input__icon"
          />

          <input
            type="number"
            placeholder="Budget €"
            className="budget-input__field"
          />

        </div>

      </div>

      <SmartOptimizer />

      <button
  className="trip-card__submit"
  onClick={handleSearch}
>

        <Sparkles
          size={18}
          strokeWidth={2}
          className="trip-card__submit-icon"
        />

        <span>
          Find my SmartStay
        </span>

      </button>

    </div>
  );
}

export default TripOptimizer;