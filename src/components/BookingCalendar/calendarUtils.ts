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
  };
  
  export function startOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }
  
  export function isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  
  export function isBetween(
    date: Date,
    start: Date,
    end: Date
  ): boolean {
    const current = startOfDay(date).getTime();
  
    return (
      current >= startOfDay(start).getTime() &&
      current <= startOfDay(end).getTime()
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
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  }
  
  export function buildCalendarDays(
    referenceDate: Date
  ): CalendarDay[] {
  
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
  
    const today = startOfDay(new Date());
  
    const firstDayOfMonth = new Date(year, month, 1);
  
    // Lunedì = primo giorno della settimana
    const startOffset =
      (firstDayOfMonth.getDay() + 6) % 7;
  
    const gridStart = new Date(
      year,
      month,
      1 - startOffset
    );
  
    const days: CalendarDay[] = [];
  
    for (let index = 0; index < 42; index++) {
  
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index
      );
  
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: isSameDay(date, today),
      });
  
    }
  
    return days;
  }