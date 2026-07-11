import { useNavigate } from "react-router-dom";

import {
  useRef,
  useState,
} from "react";

import {
  Wallet,
  Sparkles,
} from "lucide-react";

import type {
  Destination,
} from "../../types/destination";

import BookingCalendar, {
  type BookingCalendarValue,
} from "../BookingCalendar/BookingCalendar";

import {
  toApiDateString,
} from "../BookingCalendar/calendarUtils";

import GuestsSelector, {
  type GuestsSelectorValue,
} from "../GuestsSelector/GuestsSelector";

import DestinationAutocomplete from "../DestinationAutocomplete/DestinationAutocomplete";

import SmartOptimizer, {
  type SmartOptimizerValue,
} from "../SmartOptimizer/SmartOptimizer";

import "./TripOptimizer.css";

type HotelRoomPayload = {
  adults: number;
  children: number;
  childAges: number[];
};

type HotelSearchPayload = {
  destinationId: string;
  destinationType: string;
  lat: number;
  long: number;
  checkIn: string;
  checkOut: string;
  currency: string;
  rooms: HotelRoomPayload[];
};

type PendingSearch = {
  searchPayload: HotelSearchPayload;

  searchMeta: {
    destinationLabel: string;
    smartPreference: SmartOptimizerValue;
    budget: string;
  };
};

const PENDING_SEARCH_STORAGE_KEY =
  "smartstay_pending_search";

const ACTIVE_SEARCH_ID_STORAGE_KEY =
  "smartstay_active_loading_search_id";

const SEARCH_LOCK_STORAGE_KEY =
  "smartstay_pending_search_lock";

const DEFAULT_DATES: BookingCalendarValue = {
  checkIn: null,
  checkOut: null,
};

const DEFAULT_GUESTS: GuestsSelectorValue = {
  adults: 2,
  children: 0,
  childAges: [],
  rooms: 1,
};

const DEFAULT_SMART_PREFERENCE: SmartOptimizerValue = {
  selectedIndex: 2,
};

function createRoomsPayload(
  guests: GuestsSelectorValue
): HotelRoomPayload[] {
  const rooms: HotelRoomPayload[] =
    Array.from(
      {
        length: guests.rooms,
      },
      () => ({
        adults: 1,
        children: 0,
        childAges: [],
      })
    );

  let remainingAdults =
    guests.adults - guests.rooms;

  let adultRoomIndex = 0;

  while (remainingAdults > 0) {
    rooms[
      adultRoomIndex % rooms.length
    ].adults += 1;

    remainingAdults -= 1;
    adultRoomIndex += 1;
  }

  guests.childAges.forEach((
    childAge,
    childIndex
  ) => {
    if (
      childAge === null ||
      !Number.isInteger(childAge) ||
      childAge < 0 ||
      childAge > 12
    ) {
      return;
    }

    const room =
      rooms[
        childIndex % rooms.length
      ];

    room.childAges.push(
      childAge
    );

    room.children =
      room.childAges.length;
  });

  return rooms;
}

function TripOptimizer() {
  const navigate =
    useNavigate();

  const hasSubmittedRef =
    useRef(false);

  const [destination, setDestination] =
    useState("");

  const [
    selectedDestination,
    setSelectedDestination,
  ] =
    useState<Destination | null>(
      null
    );

  const [dates, setDates] =
    useState<BookingCalendarValue>(
      DEFAULT_DATES
    );

  const [guests, setGuests] =
    useState<GuestsSelectorValue>(
      DEFAULT_GUESTS
    );

  const [
    smartPreference,
    setSmartPreference,
  ] =
    useState<SmartOptimizerValue>(
      DEFAULT_SMART_PREFERENCE
    );

  const [budget, setBudget] =
    useState("");

  function clearSelectedDestination() {
    setSelectedDestination(null);
  }

  function handleBudgetChange(
    value: string
  ) {
    setBudget(value);
  }

  function handleSearch() {
    if (hasSubmittedRef.current) {
      return;
    }

    if (!selectedDestination) {
      alert(
        "Please select a destination from the suggestions."
      );

      return;
    }

    if (
      selectedDestination.lat === null ||
      selectedDestination.lng === null
    ) {
      alert(
        "This destination is missing coordinates. Please select another destination."
      );

      return;
    }

    if (
      !dates.checkIn ||
      !dates.checkOut
    ) {
      alert(
        "Please select check-in and check-out dates."
      );

      return;
    }

    if (
      dates.checkOut <=
      dates.checkIn
    ) {
      alert(
        "Check-out must be after check-in."
      );

      return;
    }

    if (
      guests.rooms >
      guests.adults
    ) {
      alert(
        "Each room needs at least one adult. Please reduce rooms or add adults."
      );

      return;
    }

    const hasCompleteChildAges =
      guests.childAges.length ===
        guests.children &&
      guests.childAges.every(
        (childAge) =>
          childAge !== null &&
          Number.isInteger(childAge) &&
          childAge >= 0 &&
          childAge <= 12
      );

    if (!hasCompleteChildAges) {
      alert(
        "Please select the age of every child."
      );

      return;
    }

    try {
      hasSubmittedRef.current =
        true;

      const searchPayload:
        HotelSearchPayload = {
          destinationId:
            selectedDestination.id,

          destinationType:
            selectedDestination.type,

          lat:
            selectedDestination.lat,

          long:
            selectedDestination.lng,

          checkIn:
            toApiDateString(
              dates.checkIn
            ),

          checkOut:
            toApiDateString(
              dates.checkOut
            ),

          currency:
            "EUR",

          rooms:
            createRoomsPayload(
              guests
            ),
        };

      const pendingSearch:
        PendingSearch = {
          searchPayload,

          searchMeta: {
            destinationLabel:
              destination,

            smartPreference,

            budget,
          },
        };

      sessionStorage.removeItem(
        ACTIVE_SEARCH_ID_STORAGE_KEY
      );

      sessionStorage.removeItem(
        SEARCH_LOCK_STORAGE_KEY
      );

      sessionStorage.setItem(
        PENDING_SEARCH_STORAGE_KEY,
        JSON.stringify(
          pendingSearch
        )
      );

      navigate("/loading");
    } catch (error) {
      hasSubmittedRef.current =
        false;

      console.error(error);

      alert(
        "Unable to start search."
      );
    }
  }

  return (
    <div className="trip-card">
      <DestinationAutocomplete
        value={destination}
        onChange={setDestination}
        onSelect={
          setSelectedDestination
        }
        onClearSelection={
          clearSelectedDestination
        }
        placeholder="Search destination..."
      />

      <div className="row">
        <BookingCalendar
          value={dates}
          onChange={setDates}
        />
      </div>

      <div className="row">
        <GuestsSelector
          value={guests}
          onChange={setGuests}
        />

        <div className="budget-input">
          <Wallet
            size={18}
            strokeWidth={2}
            className="budget-input__icon"
          />

          <input
            type="number"
            min="0"
            placeholder="Budget €"
            className="budget-input__field"
            value={budget}
            onChange={(event) =>
              handleBudgetChange(
                event.target.value
              )
            }
          />
        </div>
      </div>

      <SmartOptimizer
        value={smartPreference}
        onChange={
          setSmartPreference
        }
      />

      <button
        type="button"
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