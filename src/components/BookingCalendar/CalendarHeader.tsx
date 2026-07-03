import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthYear } from "./calendarUtils";

type CalendarHeaderProps = {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  return (
    <div className="calendar-header">
      <button
        type="button"
        className="calendar-header__button"
        onClick={onPreviousMonth}
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>

      <h3 className="calendar-header__title">
        {formatMonthYear(currentDate)}
      </h3>

      <button
        type="button"
        className="calendar-header__button"
        onClick={onNextMonth}
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default CalendarHeader;