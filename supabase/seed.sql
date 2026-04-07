INSERT INTO public.street_sweeping 
  (corridor, cnn, block_side, weekday, from_time, to_time, line)
VALUES 
  (
    'GEARY BLVD', 
    12345678, 
    'North', 
    'Mon', 
    '09:00', 
    '11:00', 
    public.ST_GeomFromText('LINESTRING(-122.408 37.783, -122.409 37.784)', 4326)
  ),
  (
    'MARKET ST', 
    87654321, 
    'South', 
    'Tue', 
    '13:00', 
    '15:00', 
    public.ST_GeomFromText('LINESTRING(-122.410 37.785, -122.411 37.786)', 4326)
  );