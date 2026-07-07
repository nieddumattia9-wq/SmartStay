import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { formatMonthYear } from "./calendarUtils";

type CalendarHeaderProps = {

  currentDate: Date;

  isPreviousMonthDisabled?: boolean;

  onPreviousMonth: () => void;

  onNextMonth: () => void;

};

function CalendarHeader({
  currentDate,
  isPreviousMonthDisabled = false,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) {

  return (

    <div className="calendar-header">

      <button
        type="button"
        className="calendar-header__button"
        onClick={onPreviousMonth}
        disabled={isPreviousMonthDisabled}
        aria-label="Previous month"
      >

        <ChevronLeft
          size={18}
          strokeWidth={2}
        />

      </button>

      <h3
        className="calendar-header__title"
        aria-live="polite"
      >

        {formatMonthYear(currentDate)}

      </h3>

      <button
        type="button"
        className="calendar-header__button"
        onClick={onNextMonth}
        aria-label="Next month"
      >

        <ChevronRight
          size={18}
          strokeWidth={2}
        />

      </button>

    </div>

  );

}

export default CalendarHeader;