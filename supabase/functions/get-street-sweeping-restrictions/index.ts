// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'


console.log("Hello from Functions!")
const SEARCH_RADIUS_METERS = 20; // Define at the top level

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? 'sb_publishable_w-aOffaHXSTEFR3iZDUGZQ_uXoeGpXa',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )


    const { latitude, longitude } = await req.json()

    // Read from street_sweeping table and return closest restriction within Xm of the provided lat/lng.
    // Turn lat/lng into a PostGIS point and use ST_DWithin to find nearby restrictions, then return the closest one.

    const { data, error } = await supabase.rpc('get_closest_location', {
      lat: latitude,
      long: longitude,
      radius_meters: SEARCH_RADIUS_METERS
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }

    const location = data?.[0]

    if (!location) {
      return new Response(JSON.stringify({ message: "No sweeping found nearby" }), { status: 404 })
    }

    const {
      weekday, from_time, to_time,
      week1, week2, week3, week4, week5,
      holidays
    } = location || {}

   const responseData = {
    weekday, from_time, to_time,
    weeks: [week1, week2, week3, week4, week5],
    holidays
   }

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error("Global Error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: errorMessage }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-street-sweeping-restrictions' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"latitude":37.7749,"longitude":-122.4194}'

*/
