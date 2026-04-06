CREATE OR REPLACE FUNCTION get_closest_location(
  lat FLOAT, 
  long FLOAT, 
  radius_meters INT
)
RETURNS SETOF street_sweeping 
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM street_sweeping
  WHERE ST_DWithin(
    line,
    ST_SetSRID(ST_Point(long, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY line <-> ST_SetSRID(ST_Point(long, lat), 4326)::geography
  LIMIT 1;
$$;

-- 2. Add the index (Crucial for performance!)
CREATE INDEX IF NOT EXISTS idx_street_sweeping_line 
ON street_sweeping 
USING GIST (line);