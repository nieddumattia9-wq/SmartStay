import { useMemo, useState } from "react";

import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";

import {
  addMonths,
  buildCalendarDays,
} from "./calendarUtils";

type CalendarProps = {
  initialDate?: Date;
  onSelectDay?: (date: Date) => void;
};

function Calendar({
  initialDate = new Date(),
  onSelectDay,
}: CalendarProps) {

  const [currentDate, setCurrentDate] =
    useState(initialDate);

  const days = useMemo(
    () => buildCalendarDays(currentDate),
    [currentDate]
  );

  function handlePreviousMonth() {
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
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
      />

      <CalendarGrid
        days={days}
        onSelectDay={onSelectDay}
      />

    </div>
  );
}

export default Calendar;