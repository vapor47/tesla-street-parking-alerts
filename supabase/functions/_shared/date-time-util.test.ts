// supabase/functions/_shared/weekMatching.test.ts
import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { getWeekOfMonth } from "./date-time-util.ts";

Deno.test("getWeekOfMonth: 1st of month is week 1", () => {
  const date = new Date(2026, 3, 1); // April 1, 2026
  assertEquals(getWeekOfMonth(date), 1);
});

Deno.test("getWeekOfMonth: 8th of month is week 2", () => {
  const date = new Date(2026, 3, 8); // April 8, 2026
  assertEquals(getWeekOfMonth(date), 2);
});

Deno.test("getWeekOfMonth: 7th of month is week 1", () => {
  const date = new Date(2026, 3, 7); // April 7, 2026
  assertEquals(getWeekOfMonth(date), 1);
});

Deno.test("getWeekOfMonth: 31st of month is week 5", () => {
  const date = new Date(2026, 4, 31); // May 31, 2026
  assertEquals(getWeekOfMonth(date), 5);
});
