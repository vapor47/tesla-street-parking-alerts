"""
SF Parking Data Loader
======================
Loads Street Sweeping and Parking Regulations CSVs into Supabase (PostGIS).

Two separate tables:
  - street_sweeping      (from Street_Sweeping_Schedule CSV)
  - parking_regulations  (from Parking_regulations CSV)

MULTILINESTRING geometries are exploded into individual LINESTRING rows,
duplicating the regulation data for each segment.

Usage:
    pip install pandas psycopg2-binary
    python load_parking_data.py

Set up your Supabase connection by setting up your .env file following the template in env.example.
"""

import os
import re
import pandas as pd
import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST")
DATABASE_URL = f"postgresql://postgres:{db_password}@{db_host}:5432/postgres"

# ── Geometry helpers ─────────────────────────────────────────────────────────

def extract_linestrings(wkt_str):
    """
    Given any WKT geometry string, return a list of LINESTRING WKT strings.
    - LINESTRING: returns a single-element list
    - MULTILINESTRING: explodes into one LINESTRING per segment
    - anything else / null: returns empty list
    """
    if pd.isna(wkt_str) or not isinstance(wkt_str, str):
        return []

    wkt_str = wkt_str.strip()

    if wkt_str.upper().startswith("LINESTRING"):
        return [wkt_str]

    if wkt_str.upper().startswith("MULTILINESTRING"):
        # Extract each parenthesised coordinate group
        # MULTILINESTRING ((x y, x y), (x y, x y)) -> ['x y, x y', 'x y, x y']
        segments = re.findall(r'\(([^()]+)\)', wkt_str)
        return [f"LINESTRING ({seg})" for seg in segments if seg.strip()]

    return []


# ── Normalization helpers ────────────────────────────────────────────────────

def normalize_regulation(val):
    """Normalize messy regulation type strings to consistent snake_case."""
    if pd.isna(val):
        return None
    val = val.strip().lower()
    mapping = {
        "time limited":           "time_limit",
        "time limit":             "time_limit",
        "no oversized vehicles":  "no_oversized",
        "no parking any time":    "no_parking",
        "no parking anytime":     "no_parking",
        "no stopping":            "no_parking",
        "limited no parking":     "limited_no_parking",
        "pay or permit":          "pay_or_permit",
        "paid + permit":          "pay_or_permit",
        "government permit":      "government_permit",
        "no overnight parking":   "no_overnight",
    }
    return mapping.get(val, val)


def normalize_days(val):
    """Normalize messy days strings to consistent form."""
    if pd.isna(val):
        return None
    val = val.strip().upper()
    mapping = {
        "M-S":  "M-Sa",
        "M-SU": "M-Su",
        "M-F":  "M-F",
        "M-SA": "M-Sa",
    }
    return mapping.get(val, val)


def parse_time_str(val):
    """
    Convert mixed time formats to HH:MM 24h string.
    Handles: '8am', '6pm', '800', '1800', '2400'
    """
    if pd.isna(val):
        return None
    val = str(val).strip().lower()

    # Already HH:MM format
    if re.match(r'^\d{1,2}:\d{2}$', val):
        return val

    # '8am', '12pm', '10pm' etc
    m = re.match(r'^(\d{1,2})(am|pm)$', val)
    if m:
        hour = int(m.group(1))
        period = m.group(2)
        if period == 'pm' and hour != 12:
            hour += 12
        elif period == 'am' and hour == 12:
            hour = 0
        return f"{hour:02d}:00"

    # '800', '1800', '2400'
    m = re.match(r'^(\d{3,4})$', val)
    if m:
        n = int(m.group(1))
        if n == 2400:
            return "00:00"
        hour = n // 100
        minute = n % 100
        return f"{hour:02d}:{minute:02d}"

    return None


def int_to_bool(val):
    if pd.isna(val):
        return False
    return bool(int(val))


# ── DDL ─────────────────────────────────────────────────────────────────────

DDL = """
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS street_sweeping;
DROP TABLE IF EXISTS parking_regulations;

CREATE TABLE street_sweeping (
    id           SERIAL PRIMARY KEY,
    corridor     TEXT,
    cnn          BIGINT,       -- SF street segment ID
    block_side   TEXT,         -- N / S / E / W / NorthEast etc
    limits       TEXT,         -- cross streets e.g. "Larkin St - Polk St"
    cnn_side     TEXT,         -- L or R relative to street direction
    weekday      TEXT,         -- Mon / Tues / Wed etc
    from_time    TEXT,         -- HH:MM 24h
    to_time      TEXT,         -- HH:MM 24h
    week1        BOOLEAN DEFAULT FALSE,
    week2        BOOLEAN DEFAULT FALSE,
    week3        BOOLEAN DEFAULT FALSE,
    week4        BOOLEAN DEFAULT FALSE,
    week5        BOOLEAN DEFAULT FALSE,
    holidays     BOOLEAN DEFAULT FALSE,
    line         GEOMETRY(LINESTRING, 4326)
);

CREATE INDEX street_sweeping_line_idx     ON street_sweeping USING GIST (line);
CREATE INDEX street_sweeping_corridor_idx ON street_sweeping (corridor);
CREATE INDEX street_sweeping_cnn_idx      ON street_sweeping (cnn);

CREATE TABLE parking_regulations (
    id               SERIAL PRIMARY KEY,
    regulation_type  TEXT,     -- time_limit / no_parking / no_oversized etc
    days             TEXT,     -- M-F / M-Sa / M-Su etc
    from_time        TEXT,     -- HH:MM 24h
    to_time          TEXT,     -- HH:MM 24h
    hour_limit       NUMERIC,
    rpp_area         TEXT,     -- e.g. 'L' or 'L,N' if multiple
    exceptions       TEXT,
    line             GEOMETRY(LINESTRING, 4326)
);

CREATE INDEX parking_regulations_line_idx ON parking_regulations USING GIST (line);
"""


# ── Loaders ──────────────────────────────────────────────────────────────────

def load_street_sweeping(cur, df):
    print(f"Loading {len(df)} street sweeping rows...")

    rows = []
    skipped = 0

    for _, row in df.iterrows():
        segments = extract_linestrings(row.get('Line'))
        if not segments:
            skipped += 1
            continue

        for seg_wkt in segments:
            rows.append((
                row['Corridor']     if pd.notna(row['Corridor'])     else None,
                int(row['CNN'])     if pd.notna(row['CNN'])           else None,
                row['BlockSide']    if pd.notna(row['BlockSide'])     else None,
                row['Limits']       if pd.notna(row['Limits'])        else None,
                row['CNNRightLeft'] if pd.notna(row['CNNRightLeft'])  else None,
                row['WeekDay']      if pd.notna(row['WeekDay'])       else None,
                f"{int(row['FromHour']):02d}:00" if pd.notna(row['FromHour']) else None,
                f"{int(row['ToHour']):02d}:00"   if pd.notna(row['ToHour'])   else None,
                int_to_bool(row['Week1']),
                int_to_bool(row['Week2']),
                int_to_bool(row['Week3']),
                int_to_bool(row['Week4']),
                int_to_bool(row['Week5']),
                int_to_bool(row['Holidays']),
                seg_wkt,
            ))

    execute_values(
        cur,
        """
        INSERT INTO street_sweeping
            (corridor, cnn, block_side, limits, cnn_side,
             weekday, from_time, to_time,
             week1, week2, week3, week4, week5, holidays,
             line)
        VALUES %s
        """,
        rows,
        template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromText(%s, 4326))"
    )

    print(f"  ✓ Inserted {len(rows)} rows  (skipped {skipped} with no geometry)")


def load_parking_regulations(cur, df):
    print(f"Loading {len(df)} parking regulation rows...")

    rows = []
    skipped = 0
    exploded = 0

    for _, row in df.iterrows():
        segments = extract_linestrings(row.get('shape'))
        if not segments:
            skipped += 1
            continue

        if len(segments) > 1:
            exploded += 1

        # Build RPP area string
        rpp = row['RPPAREA1'] if pd.notna(row.get('RPPAREA1')) else None
        if pd.notna(row.get('RPPAREA2')):
            rpp = f"{rpp},{row['RPPAREA2']}"
        if pd.notna(row.get('RPPAREA3')):
            rpp = f"{rpp},{row['RPPAREA3']}"

        for seg_wkt in segments:
            rows.append((
                normalize_regulation(row.get('REGULATION')),
                normalize_days(row.get('DAYS')),
                parse_time_str(row.get('FROM_TIME')),
                parse_time_str(row.get('TO_TIME')),
                float(row['HRLIMIT']) if pd.notna(row.get('HRLIMIT')) else None,
                rpp,
                row['EXCEPTIONS'] if pd.notna(row.get('EXCEPTIONS')) else None,
                seg_wkt,
            ))

    execute_values(
        cur,
        """
        INSERT INTO parking_regulations
            (regulation_type, days, from_time, to_time,
             hour_limit, rpp_area, exceptions, line)
        VALUES %s
        """,
        rows,
        template="(%s, %s, %s, %s, %s, %s, %s, ST_GeomFromText(%s, 4326))"
    )

    print(f"  ✓ Inserted {len(rows)} rows  (skipped {skipped} with no geometry, exploded {exploded} multilinestrings)")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")

    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("Running DDL...")
        cur.execute(DDL)

        print("\nReading CSVs...")
        df_sweep = pd.read_csv("Street_Sweeping_Schedule_20260406.csv")
        df_park  = pd.read_csv("Parking_regulations_(except_non-metered_color_curb)_20260406.csv")

        print()
        load_street_sweeping(cur, df_sweep)

        print()
        load_parking_regulations(cur, df_park)

        conn.commit()
        print("\n✅ All done — data loaded successfully.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error — rolled back: {e}")
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()