import { CalendarDays } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import Calendar from "./Calendar";

import "./BookingCalendar.css";

export type BookingCalendarValue = {

  checkIn: Date | null;

  checkOut: Date | null;

};

export type BookingCalendarProps = {

  placeholder?: string;

  disabled?: boolean;

  className?: string;

  id?: string;

  value?: BookingCalendarValue;

  onChange?: (value: BookingCalendarValue) => void;

};

function startOfDay(date: Date) {

  const normalizedDate = new Date(date);

  normalizedDate.setHours(0, 0, 0, 0);

  return normalizedDate;

}

function isPastDate(date: Date) {

  const today = startOfDay(new Date());

  return startOfDay(date) < today;

}

function formatDate(date: Date) {

  return date.toLocaleDateString("en-GB");

}

function BookingCalendar({
  placeholder = "Check-in • Check-out",
  disabled = false,
  className = "",
  id,
  value,
  onChange,
}: BookingCalendarProps) {

  const generatedId = useId();

  const inputId =
    id ?? generatedId;

  const popupId =
    `${inputId}-calendar`;

  const rootRef =
    useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] =
    useState(false);

  const [internalCheckIn, setInternalCheckIn] =
    useState<Date | null>(null);

  const [internalCheckOut, setInternalCheckOut] =
    useState<Date | null>(null);

  const checkIn =
    value?.checkIn ?? internalCheckIn;

  const checkOut =
    value?.checkOut ?? internalCheckOut;

  const updateValue = useCallback((
    nextValue: BookingCalendarValue
  ) => {

    if (!value) {

      setInternalCheckIn(nextValue.checkIn);

      setInternalCheckOut(nextValue.checkOut);

    }

    onChange?.(nextValue);

  }, [onChange, value]);

  const closeCalendar = useCallback(() => {

    setIsOpen(false);

  }, []);

  const openCalendar = useCallback(() => {

    if (disabled) {

      return;

    }

    setIsOpen(true);

  }, [disabled]);

  function handleSelectDay(date: Date) {

    const selectedDate =
      startOfDay(date);

    if (isPastDate(selectedDate)) {

      return;

    }

    if (!checkIn) {

      updateValue({
        checkIn: selectedDate,
        checkOut: null,
      });

      return;

    }

    if (!checkOut) {

      if (selectedDate > checkIn) {

        updateValue({
          checkIn,
          checkOut: selectedDate,
        });

        closeCalendar();

        return;

      }

      updateValue({
        checkIn: selectedDate,
        checkOut: null,
      });

      return;

    }

    updateValue({
      checkIn: selectedDate,
      checkOut: null,
    });

  }

  useEffect(() => {

    if (!isOpen) {

      return;

    }

    function handlePointerDown(
      event: MouseEvent | TouchEvent
    ) {

      const target =
        event.target as Node;

      if (!rootRef.current?.contains(target)) {

        closeCalendar();

      }

    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {

      if (event.key === "Escape") {

        closeCalendar();

      }

    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "touchstart",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "touchstart",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

    };

  }, [closeCalendar, isOpen]);

  let inputValue = "";

  if (checkIn && checkOut) {

    inputValue =
      `${formatDate(checkIn)} → ${formatDate(checkOut)}`;

  } else if (checkIn) {

    inputValue =
      `${formatDate(checkIn)} →`;

  }

  return (

    <div
      ref={rootRef}
      className={`booking-calendar ${className}`.trim()}
    >

      <div className="booking-calendar__input-wrapper">

        <CalendarDays
          size={18}
          strokeWidth={2}
          className="booking-calendar__icon"
        />

        <input
          id={inputId}
          type="text"
          className="booking-calendar__input"
          value={inputValue}
          readOnly
          placeholder={placeholder}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={
            isOpen ? popupId : undefined
          }
          onClick={openCalendar}
          onFocus={openCalendar}
        />

      </div>

      {isOpen && (

        <div
          id={popupId}
          className="booking-calendar__popup"
          role="dialog"
          aria-label="Booking calendar"
        >

          <Calendar
            onSelectDay={handleSelectDay}
          />

        </div>

      )}

    </div>

  );

}

export default BookingCalendar;