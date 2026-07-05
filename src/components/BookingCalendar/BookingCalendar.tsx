import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import Calendar from "./Calendar";

import "./BookingCalendar.css";

export type BookingCalendarProps = {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

function BookingCalendar({
  placeholder = "Check-in • Check-out",
  disabled = false,
  className = "",
  id,
}: BookingCalendarProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const popupId = `${inputId}-calendar`;

  const rootRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const closeCalendar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openCalendar = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  function formatDate(date: Date) {
    return date.toLocaleDateString("en-GB");
  }

  function handleSelectDay(date: Date) {
    // Primo click
    if (!checkIn) {
      setCheckIn(date);
      return;
    }

    // Secondo click
    if (!checkOut) {
      if (date > checkIn) {
        setCheckOut(date);
        closeCalendar();
        return;
      }

      // Se clicco una data precedente,
      // diventa il nuovo check-in
      setCheckIn(date);
      return;
    }

    // Se entrambi sono già selezionati,
    // ricomincio una nuova selezione
    setCheckIn(date);
    setCheckOut(null);
  }

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (
      event: MouseEvent | TouchEvent
    ) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target)) {
        closeCalendar();
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "touchstart",
      handlePointerDown
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
    };
  }, [closeCalendar, isOpen]);

  let inputValue = "";

  if (checkIn && checkOut) {
    inputValue = `${formatDate(checkIn)} → ${formatDate(checkOut)}`;
  } else if (checkIn) {
    inputValue = `${formatDate(checkIn)} →`;
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