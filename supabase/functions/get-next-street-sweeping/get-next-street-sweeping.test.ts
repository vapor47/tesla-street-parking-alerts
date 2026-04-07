// supabase/functions/get-next-street-sweeping/index.test.ts

import { assertEquals, assertExists } from "https://deno.land/std/assert/mod.ts";
import { getNextStreetSweeping } from "./get-next-street-sweeping.ts";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseSweeping = {
  corridor: "Market St",
  from_time: "09:00",
  to_time: "11:00",
  weeks: [false, false, false, false, false],
  holidays: false,
};

const firstMonday = { ...baseSweeping, weekday: "Mon", weeks: [true, false, false, false, false] };
const firstTuesday = { ...baseSweeping, weekday: "Tue", weeks: [true, false, false, false, false] };
const fifthMonday = { ...baseSweeping, weekday: "Mon", weeks: [false, false, false, false, true] };

// ── Tests ────────────────────────────────────────────────────────────────────

Deno.test("parking restriction the following day", () => {
  // April 6 2026 is a Monday — the 1st Monday of April
  const now = new Date("2026-04-06T07:00:00");

  const result = getNextStreetSweeping(now, firstTuesday);

  assertExists(result);
  assertEquals(result?.getFullYear(), 2026);
  assertEquals(result?.getMonth(), 3); // April (0-indexed)
  assertEquals(result?.getDate(), 7);  // 1st Tuesday of April (1-indexed)
});

Deno.test("same day restriction before sweep: returns today's restriction", () => {
  // Today is the 1st Monday of April, current time is 8am, restriction is at 9am
  const now = new Date("2026-04-06T08:00:00"); // 1st Monday of April, 8am

  const result = getNextStreetSweeping(
    now,
    { ...firstMonday, from_time: "09:00", to_time: "10:00" }
  );

  assertEquals(result?.getFullYear(), 2026);
  assertEquals(result?.getMonth(), 3);
  assertEquals(result?.getDate(), 6);
});

Deno.test("same day restriction after sweep: skips to next occurrence", () => {
  // Today is the 1st Monday of April, current time is 10am, restriction was 9-10am
  const now = new Date("2026-04-06T11:00:00"); // 1st Monday of April, 11am

  const result = getNextStreetSweeping(
    now,
    { ...firstMonday, from_time: "09:00", to_time: "10:00" }
  );

  // Should return the NEXT 1st Monday, which is May 4 2026
  assertEquals(result?.getFullYear(), 2026);
  assertEquals(result?.getMonth(), 4);  // May
  assertEquals(result?.getDate(), 4);   // 1st Monday of May
});

Deno.test("5th weekday of month: returns correct 5th weekday", () => {
  // April 2026 has 5 Mondays: 6, 13, 20, 27 — wait, only 4
  // May 2026: Mondays are 4, 11, 18, 25 — only 4
  // March 2026: Mondays are 2, 9, 16, 23, 30 — 5th Monday is March 30
  const now = new Date("2026-03-01T07:00:00");

  const result = getNextStreetSweeping(now, fifthMonday);

  assertEquals(result?.getFullYear(), 2026);
  assertEquals(result?.getMonth(), 2); // March (0-indexed)
  assertEquals(result?.getDate(), 30); // 5th Monday of March
});

Deno.test("5th weekday: skips to next month with a 5th weekday if current month has none", () => {
  // April 2026 only has 4 Mondays — should skip to May or find next month with 5 Mondays
  const now = new Date("2026-04-01T07:00:00");

  const result = getNextStreetSweeping(now, fifthMonday);

  // Next month with a 5th Monday after April 2026 is June 2026 (1,8,15,22,29)
  assertEquals(result?.getFullYear(), 2026);
  assertEquals(result?.getMonth(), 5); // June (0-indexed)
  assertEquals(result?.getDate(), 29); // 5th Monday of June
});

Deno.test("next month overflow: restriction is in next month but close", () => {
  // Today is March 31 (Monday), restriction is 1st Tuesday of month
  // April 1st is a Tuesday — only 1 day away
  const now = new Date("2026-03-31T07:00:00");

  const result = getNextStreetSweeping(now, firstTuesday);

  assertEquals(result?.getFullYear(), 2026);
  assertEquals(result?.getMonth(), 3); // April
  assertEquals(result?.getDate(), 7);  // 1st Tuesday of April 2026
});
