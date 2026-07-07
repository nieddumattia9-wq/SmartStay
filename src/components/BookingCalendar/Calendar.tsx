import { useMemo, useState } from "react";

import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";

import {
  addMonths,
  buildCalendarDays,
  startOfDay,
} from "./calendarUtils";

type CalendarProps = {

  initialDate?: Date;

  checkIn?: Date | null;

  checkOut?: Date | null;

  onSelectDay?: (date: Date) => void;

};

function isCurrentOrPastMonth(date: Date) {

  const today =
    startOfDay(new Date());

  return (
    date.getFullYear() < today.getFullYear() ||
    (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() <= today.getMonth()
    )
  );

}

function Calendar({
  initialDate = new Date(),
  checkIn = null,
  checkOut = null,
  onSelectDay,
}: CalendarProps) {

  const [currentDate, setCurrentDate] =
    useState(initialDate);

  const days = useMemo(
    () => buildCalendarDays(currentDate),
    [currentDate]
  );

  const isPreviousMonthDisabled =
    isCurrentOrPastMonth(currentDate);

  function handlePreviousMonth() {

    if (isPreviousMonthDisabled) {

      return;

    }

    setCurrentDate((date) =>
      addMonths(date, -1)
    );

  }

  function handleNextMonth() {

    setCurrentDate((date) =>
      addMonths(date, 1)
    );

  }

  return (

    <div className="calendar">

      <CalendarHeader
        currentDate={currentDate}
        isPreviousMonthDisabled={isPreviousMonthDisabled}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
      />

      <CalendarGrid
        days={days}
        checkIn={checkIn}
        checkOut={checkOut}
        onSelectDay={onSelectDay}
      />

    </div>

  );

}

export default Calendar;