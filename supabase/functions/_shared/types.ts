// supabase/functions/_shared/types.ts

export interface StreetSweepingSchedule {
  weekday: string;  // ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  from_time: string;  // e.g. "00:00"
  to_time: string;  // e.g. "06:00"
  weeks: boolean[];  // [week1, week2, week3, week4, week5] - e.g. [true, false, true, false, false] means the restriction applies on the 1st and 3rd weekday occurrences of the month
  holidays: boolean;  // whether the restriction is enforced on holidays
}