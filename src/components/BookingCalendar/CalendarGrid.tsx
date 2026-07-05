import { WEEKDAY_LABELS, type CalendarDay } from "./calendarUtils";

type CalendarGridProps = {
  days: CalendarDay[];
  onSelectDay?: (date: Date) => void;
};

function CalendarGrid({
  days,
  onSelectDay,
}: CalendarGridProps) {
  return (
    <div className="calendar-grid">

      <div
        className="calendar-grid__weekdays"
        aria-hidden="true"
      >
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="calendar-grid__weekday"
          >
            {label}
          </span>
        ))}
      </div>

      <div
        className="calendar-grid__days"
        role="grid"
      >
        {days.map((day) => {

          const className = [
            "calendar-grid__day",
            !day.isCurrentMonth
              ? "calendar-grid__day--outside"
              : "",
            day.isToday
              ? "calendar-grid__day--today"
              : "",
            day.isPast
              ? "calendar-grid__day--disabled"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={day.date.toISOString()}
              type="button"
              className={className}
              role="gridcell"
              disabled={day.isPast}
              onClick={() => onSelectDay?.(day.date)}
            >
              {day.dayOfMonth}
            </button>
          );
        })}
      </div>

    </div>
  );
}

export default CalendarGrid;