import {
  WEEKDAY_LABELS,
  type CalendarDay,
} from "./calendarUtils";

type CalendarGridProps = {

  days: CalendarDay[];

  checkIn?: Date | null;

  checkOut?: Date | null;

  onSelectDay?: (date: Date) => void;

};

function startOfDay(date: Date) {

  const normalizedDate =
    new Date(date);

  normalizedDate.setHours(
    0,
    0,
    0,
    0
  );

  return normalizedDate;

}

function isSameDay(
  firstDate: Date,
  secondDate: Date
) {

  return (
    startOfDay(firstDate).getTime() ===
    startOfDay(secondDate).getTime()
  );

}

function isDateBetween(
  date: Date,
  startDate: Date,
  endDate: Date
) {

  const current =
    startOfDay(date).getTime();

  const start =
    startOfDay(startDate).getTime();

  const end =
    startOfDay(endDate).getTime();

  return (
    current > start &&
    current < end
  );

}

function CalendarGrid({
  days,
  checkIn = null,
  checkOut = null,
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

          const isCheckIn =
            checkIn
              ? isSameDay(day.date, checkIn)
              : false;

          const isCheckOut =
            checkOut
              ? isSameDay(day.date, checkOut)
              : false;

          const isInRange =
            checkIn && checkOut
              ? isDateBetween(
                  day.date,
                  checkIn,
                  checkOut
                )
              : false;

          const isSelected =
            isCheckIn || isCheckOut;

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

            isCheckIn
              ? "calendar-grid__day--check-in"
              : "",

            isCheckOut
              ? "calendar-grid__day--check-out"
              : "",

            isInRange
              ? "calendar-grid__day--in-range"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (

            <button
              key={day.date.getTime()}
              type="button"
              className={className}
              role="gridcell"
              disabled={day.isPast}
              aria-selected={isSelected}
              aria-label={day.date.toLocaleDateString(
                "en-GB",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
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