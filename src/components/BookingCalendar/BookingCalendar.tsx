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
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
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

  const triggerRef =
    useRef<HTMLButtonElement>(null);

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

  const closeCalendar = useCallback((
    restoreFocus = false
  ) => {

    setIsOpen(false);

    if (!restoreFocus) {

      return;

    }

    const trigger =
      triggerRef.current;

    if (
      !trigger ||
      document.activeElement === trigger
    ) {

      return;

    }

    window.requestAnimationFrame(() => {

      trigger.focus({
        preventScroll: true,
      });

    });

  }, []);

  const openCalendar = useCallback(() => {

    if (disabled) {

      return;

    }

    setIsOpen(true);

  }, [disabled]);

  const toggleCalendar = useCallback(() => {

    if (isOpen) {

      closeCalendar();

      return;

    }

    openCalendar();

  }, [
    closeCalendar,
    isOpen,
    openCalendar,
  ]);

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

        closeCalendar(true);

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

        event.preventDefault();

        closeCalendar(true);

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

  let displayValue = "";

  if (checkIn && checkOut) {

    displayValue =
      `${formatDate(checkIn)} → ${formatDate(checkOut)}`;

  } else if (checkIn) {

    displayValue =
      `${formatDate(checkIn)} →`;

  }

  const accessibleLabel =
    displayValue
      ? `Check-in and check-out dates: ${displayValue}`
      : "Check-in and check-out dates";

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

        <button
          ref={triggerRef}
          id={inputId}
          type="button"
          className={[
            "booking-calendar__input",
            !displayValue
              ? "booking-calendar__input--placeholder"
              : "",
          ].filter(Boolean).join(" ")}
          disabled={disabled}
          aria-label={accessibleLabel}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={
            isOpen
              ? popupId
              : undefined
          }
          onClick={toggleCalendar}
        >
          <span>
            {displayValue || placeholder}
          </span>
        </button>

      </div>

      {isOpen && (

        <div
          id={popupId}
          className="booking-calendar__popup"
          role="dialog"
          aria-label="Booking calendar"
        >

          <Calendar
            initialDate={
              checkIn ??
              new Date()
            }
            checkIn={checkIn}
            checkOut={checkOut}
            onSelectDay={handleSelectDay}
          />

        </div>

      )}

    </div>

  );

}

export default BookingCalendar;