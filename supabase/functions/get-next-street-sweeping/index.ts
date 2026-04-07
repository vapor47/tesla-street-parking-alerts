// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { getNextStreetSweeping } from "./get-next-street-sweeping.ts";

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { now, restrictions } = await req.json()

  /*
  From the provided `now` timestamp, find the next upcoming street sweeping restriction from the `street_sweeping_restrictions` array and return it in the response.
  
  now:
    curr_weekday,
    curr_time,
    curr_week_of_month

  check next week of month starting from current week


  get first week of month where week_of_month >= curr_week_of_month and 

  if we can numerate restriction days, then we could just compare numerically.
  say our 1st day is a thursday, and our restriction is on the 2nd and 4th wednesdays - then we can know that our first wednesday is +6 days == 7.
  Therefore 2nd and 4th wednesdays are +13 and +27 days respectively (14, 28). (Consider overflow into next month).
  */



  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-next-street-sweeping' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
