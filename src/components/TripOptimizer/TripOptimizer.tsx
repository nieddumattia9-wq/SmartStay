import {
  calculateStayNights,
  createStoredSearchMeta,
  type StoredSearchMeta,
} from "../../utils/searchMeta";

import {
  calculateAutomaticPreferenceBalance,
} from "../../utils/preferenceBalance";

import {
  createSmartStaySearchProfile,
  SMARTSTAY_HOME_BALANCE_VERSION,
} from "../../utils/smartStaySearchProfile";
import { useNavigate } from "react-router-dom";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
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

import BudgetSelector from "../BudgetSelector/BudgetSelector";

import DestinationAutocomplete from "../DestinationAutocomplete/DestinationAutocomplete";

import DistanceSelector from "../DistanceSelector/DistanceSelector";

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
  destinationName: string;
  cityName: string;
  countryCode: string;
  lat: number;
  long: number;
  checkIn: string;
  checkOut: string;
  currency: string;
  rooms: HotelRoomPayload[];
};

type PendingSearch = {
  searchPayload: HotelSearchPayload;

  searchMeta: StoredSearchMeta;
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
    manualSmartPreference,
    setManualSmartPreference,
  ] =
    useState<SmartOptimizerValue | null>(
      null
    );

  const [budget, setBudget] =
    useState("");

  const [
    maxDistanceKm,
    setMaxDistanceKm,
  ] =
    useState<number | null>(
      null
    );

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

          destinationName:
            selectedDestination.name,

          cityName:
            selectedDestination.city ||
            selectedDestination.name,

          countryCode:
            selectedDestination.country,

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

          searchMeta:
            createStoredSearchMeta({
              destinationLabel:
                destination,

              destinationLatitude:
                selectedDestination.lat,

              destinationLongitude:
                selectedDestination.lng,

              smartPreference:
                effectiveSmartPreference,

              smartStayProfile:
                smartStaySearchProfile,

              budgetInput:
                budget,

              currency:
                searchPayload.currency,

              checkIn:
                searchPayload.checkIn,

              checkOut:
                searchPayload.checkOut,

              maxDistanceKm,
            }),
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

  const currentNightCount =
    dates.checkIn &&
    dates.checkOut
      ? calculateStayNights(
          toApiDateString(
            dates.checkIn
          ),
          toApiDateString(
            dates.checkOut
          )
        )
      : null;

  const automaticPreferenceBalance =
    calculateAutomaticPreferenceBalance({
      hasDestination:
        selectedDestination !== null,

      totalBudget:
        budget,

      nightCount:
        currentNightCount,

      roomCount:
        guests.rooms,

      maxDistanceKm,
    });

  const effectiveSmartPreference:
    SmartOptimizerValue =
      automaticPreferenceBalance.isReady &&
      manualSmartPreference !== null
        ? manualSmartPreference
        : {
            selectedIndex:
              automaticPreferenceBalance
                .selectedIndex,
          };

  useEffect(() => {
    setManualSmartPreference(null);
  }, [
    selectedDestination,
    dates.checkIn,
    dates.checkOut,
    budget,
    guests.rooms,
    maxDistanceKm,
  ]);

  function handleSmartPreferenceChange(
    value: SmartOptimizerValue
  ) {
    if (
      !automaticPreferenceBalance.isReady
    ) {
      return;
    }

    setManualSmartPreference(value);
  }

  const numericBudget =
    Number(
      budget
        .trim()
        .replace(",", ".")
    );

  const formattedBalanceBudget =
    Number.isFinite(numericBudget) &&
    numericBudget > 0
      ? new Intl.NumberFormat(
          "en-IE",
          {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }
        ).format(numericBudget)
      : null;

  const distanceLimitDescription =
    maxDistanceKm === null
      ? "flexible distance setting"
      : `${maxDistanceKm} km distance limit`;

  const manualBalanceExplanation =
    formattedBalanceBudget
      ? `You adjusted the ranking priority. Your ${formattedBalanceBudget} budget and ${distanceLimitDescription} remain unchanged.`
      : "You adjusted the ranking priority. Your budget and distance limits remain unchanged.";

  const smartStaySearchProfile =
    automaticPreferenceBalance.isReady
      ? createSmartStaySearchProfile({
          automaticPreference: {
            selectedIndex:
              automaticPreferenceBalance
                .selectedIndex,
          },

          manualPreference:
            manualSmartPreference,

          explanation:
            manualSmartPreference
              ? manualBalanceExplanation
              : automaticPreferenceBalance
                  .explanation,

          calculationVersion:
            SMARTSTAY_HOME_BALANCE_VERSION,
        })
      : null;

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

      <div className="trip-card__preferences-grid">
        <div className="trip-card__preference-column">
          <GuestsSelector
            value={guests}
            onChange={setGuests}
          />

          <DistanceSelector
            value={
              maxDistanceKm
            }
            onChange={
              setMaxDistanceKm
            }
          />
        </div>

        <BudgetSelector
          value={budget}
          onChange={
            handleBudgetChange
          }
          nightCount={
            currentNightCount
          }
          currency="EUR"
        />
      </div>

      <div
        className={`trip-card__balance-status ${
          !automaticPreferenceBalance.isReady
            ? "trip-card__balance-status--locked"
            : manualSmartPreference
              ? "trip-card__balance-status--manual"
              : "trip-card__balance-status--automatic"
        }`}
        aria-live="polite"
      >
        <div className="trip-card__balance-status-header">
          <strong>
            Your SmartStay balance
          </strong>

          <div className="trip-card__balance-status-actions">
            <span
              className={`trip-card__balance-badge ${
                !automaticPreferenceBalance.isReady
                  ? "trip-card__balance-badge--waiting"
                  : manualSmartPreference
                    ? "trip-card__balance-badge--manual"
                    : "trip-card__balance-badge--automatic"
              }`}
            >
              {
                !automaticPreferenceBalance.isReady
                  ? "Waiting"
                  : manualSmartPreference
                    ? "Manual"
                    : "Automatic"
              }
            </span>

            {
              automaticPreferenceBalance.isReady &&
              manualSmartPreference && (
                <button
                  type="button"
                  className="trip-card__balance-reset"
                  onClick={() =>
                    setManualSmartPreference(null)
                  }
                >
                  Use automatic suggestion
                </button>
              )
            }
          </div>
        </div>

        <p>
          {
            manualSmartPreference
              ? manualBalanceExplanation
              : automaticPreferenceBalance
                  .explanation
          }
        </p>
      </div>

      <SmartOptimizer
        value={
          effectiveSmartPreference
        }
        onChange={
          handleSmartPreferenceChange
        }
        disabled={
          !automaticPreferenceBalance
            .isReady
        }
        className="smart-optimizer--guided"
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