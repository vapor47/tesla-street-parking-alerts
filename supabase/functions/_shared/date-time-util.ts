export function getCurrentDayTime(): { weekday: string; time: string } {
  const now = new Date();
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  const time = now.toTimeString().slice(0, 5); // Get HH:MM format
  return { weekday, time };
}

export function getWeekOfMonth(date: Date): number {
    const dayNumber = date.getDate();
    return Math.floor((dayNumber - 1) / 7) + 1;
}

export function getWeekdayNumber(weekday: string): number {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return weekdays.indexOf(weekday);
}

// We need the current time (00:00 - 23:59), as well as which occurrence of the weekday it is in the month (1st Monday, 2nd Tuesday, etc.) to determine if a restriction applies on a given day.
// For example, if today is the 3rd Wednesday of the month, then a restriction that applies on the 2nd and 4th Wednesdays would not apply today, but would apply tomorrow if tomorrow is the 4th Wednesday.