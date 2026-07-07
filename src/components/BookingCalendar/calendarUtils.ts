export const WEEKDAY_LABELS = [
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
  "Su",
] as const;

export type CalendarDay = {

  date: Date;

  dayOfMonth: number;

  isCurrentMonth: boolean;

  isToday: boolean;

  isPast: boolean;

};

export function startOfDay(date: Date): Date {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

}

export function isSameDay(
  firstDate: Date,
  secondDate: Date
): boolean {

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );

}

export function isPastDate(date: Date): boolean {

  const today =
    startOfDay(new Date());

  return (
    startOfDay(date).getTime() <
    today.getTime()
  );

}

export function isBetween(
  date: Date,
  start: Date,
  end: Date
): boolean {

  const currentTime =
    startOfDay(date).getTime();

  const startTime =
    startOfDay(start).getTime();

  const endTime =
    startOfDay(end).getTime();

  return (
    currentTime >= startTime &&
    currentTime <= endTime
  );

}

export function isStrictlyBetween(
  date: Date,
  start: Date,
  end: Date
): boolean {

  const currentTime =
    startOfDay(date).getTime();

  const startTime =
    startOfDay(start).getTime();

  const endTime =
    startOfDay(end).getTime();

  return (
    currentTime > startTime &&
    currentTime < endTime
  );

}

export function addMonths(
  date: Date,
  amount: number
): Date {

  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1
  );

}

export function formatMonthYear(date: Date): string {

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  ).format(date);

}

export function formatDisplayDate(date: Date): string {

  return date.toLocaleDateString("en-GB");

}

export function toApiDateString(date: Date): string {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

}

export function buildCalendarDays(
  referenceDate: Date
): CalendarDay[] {

  const year =
    referenceDate.getFullYear();

  const month =
    referenceDate.getMonth();

  const today =
    startOfDay(new Date());

  const firstDayOfMonth =
    new Date(year, month, 1);

  const startOffset =
    (firstDayOfMonth.getDay() + 6) % 7;

  const gridStart =
    new Date(
      year,
      month,
      1 - startOffset
    );

  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index++) {

    const date =
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index
      );

    days.push({

      date,

      dayOfMonth:
        date.getDate(),

      isCurrentMonth:
        date.getMonth() === month,

      isToday:
        isSameDay(date, today),

      isPast:
        startOfDay(date).getTime() <
        today.getTime(),

    });

  }

  return days;

}