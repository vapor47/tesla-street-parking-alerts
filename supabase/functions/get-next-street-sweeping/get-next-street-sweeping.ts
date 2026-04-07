import { getWeekdayNumber, getWeekOfMonth } from "../_shared/date-time-util.ts";
import { StreetSweepingSchedule } from "../_shared/types.ts";

/**
 * Given a `now` timestamp and a single `street_sweeping_restriction`,
 * find the next upcoming street sweeping restriction and return it as a Date object.
 * If there are no upcoming restrictions, return null. (TODO: is this possible?)
 * 
 * @param now 
 * @param restriction 
 * @returns 
 */
export function getNextStreetSweeping(now: Date, sweep_schedule: StreetSweepingSchedule): Date | null {
    // Check at least one week is enforced, otherwise this restriction doesn't apply at all.
    if (!sweep_schedule.weeks.includes(true)) {
        return null;
    }
    
    const restriction_weekday = getWeekdayNumber(sweep_schedule.weekday);
    const [from_h, from_m] = sweep_schedule.from_time.split(':').map(Number);
    const [to_h, to_m] = sweep_schedule.to_time.split(':').map(Number);

    // Start checking from 'now'
    const checkDate = new Date(now.getTime());
    
    // Safety: only check the next 365 days
    for (let i = 0; i < 365; i++) {
        const weekIdx = getWeekOfMonth(checkDate) - 1;
        const isEnforcedWeek = sweep_schedule.weeks[weekIdx];
        const isCorrectDay = checkDate.getDay() === restriction_weekday;

        if (isEnforcedWeek && isCorrectDay) {
            const startTime = new Date(checkDate);
            startTime.setHours(from_h, from_m, 0, 0);

            const endTime = new Date(checkDate);
            endTime.setHours(to_h, to_m, 0, 0);

            // If we are currently looking at "today" and the sweep is already over
            if (endTime <= now) {
                checkDate.setDate(checkDate.getDate() + 1);
                continue;
            }
            
            return startTime;
        }

        // Move to next day and check again
        checkDate.setDate(checkDate.getDate() + 1);
    }

    return null;
}
