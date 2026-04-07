// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { getNextStreetSweeping } from "./get-next-street-sweeping.ts";

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { now, sweeping_schedule } = await req.json()
  const nextSweeping = getNextStreetSweeping(new Date(now), sweeping_schedule)

  return new Response(
    JSON.stringify( nextSweeping ),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-next-street-sweeping' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"now":"2026-04-06T07:00:00","sweeping_schedule":{"weekday":"Tue","from_time":"09:00","to_time":"11:00","weeks":[true,false,false,false,false],"holidays":false}}'

*/
