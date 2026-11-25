-- Normalized stations schema for DuckDB (relational child tables + precomputed UI summary columns).
-- Logical foreign keys (station_id) are used instead of strict FK constraints to support clean batch upserts.

CREATE TABLE IF NOT EXISTS stations
(
    id                         VARCHAR PRIMARY KEY,
    kind                       VARCHAR NOT NULL,
    name                       VARCHAR NOT NULL,
    city                       VARCHAR,
    country                    VARCHAR,
    iata                       VARCHAR,
    icao                       VARCHAR,
    latitude                   DOUBLE,
    longitude                  DOUBLE,
    elevation_m                DOUBLE,
    airport_type               VARCHAR,
    traffic_types              VARCHAR[],
    ppr                        BOOLEAN NOT NULL DEFAULT FALSE,
    is_private                 BOOLEAN NOT NULL DEFAULT FALSE,
    skydive_activity           BOOLEAN NOT NULL DEFAULT FALSE,
    winch_only                 BOOLEAN NOT NULL DEFAULT FALSE,
    timezone                   VARCHAR,
    contact_phone              VARCHAR,
    contact_email              VARCHAR,
    always_open                BOOLEAN NOT NULL DEFAULT TRUE,
    open_utc                   TIME,
    close_utc                  TIME,
    max_runway_meters          INTEGER,
    max_aircraft_category      VARCHAR NOT NULL DEFAULT 'LIGHT',
    max_aircraft_category_rank INTEGER NOT NULL DEFAULT 1,
    runway_count               INTEGER NOT NULL DEFAULT 0,
    primary_frequency          VARCHAR,
    emergency_medical_capable  BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE stations
    ADD COLUMN IF NOT EXISTS skydive_activity BOOLEAN DEFAULT FALSE;
ALTER TABLE stations
    ADD COLUMN IF NOT EXISTS winch_only BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS station_runways
(
    id                  VARCHAR PRIMARY KEY,
    station_id          VARCHAR NOT NULL,
    designator          VARCHAR NOT NULL,
    true_heading        INTEGER NOT NULL,
    main_runway         BOOLEAN NOT NULL DEFAULT FALSE,
    take_off_only       BOOLEAN NOT NULL DEFAULT FALSE,
    landing_only        BOOLEAN NOT NULL DEFAULT FALSE,
    length_m            INTEGER NOT NULL,
    width_m             INTEGER NOT NULL,
    tora_m              INTEGER,
    toda_m              INTEGER,
    asda_m              INTEGER,
    lda_m               INTEGER,
    surface_type        VARCHAR NOT NULL,
    pcn                 VARCHAR,
    pilot_ctrl_lighting BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS station_frequencies
(
    id         VARCHAR PRIMARY KEY,
    station_id VARCHAR NOT NULL,
    value      VARCHAR NOT NULL,
    freq_type  VARCHAR NOT NULL,
    name       VARCHAR,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    public_use BOOLEAN NOT NULL DEFAULT TRUE
);

-- Great-circle distance in kilometers using the Haversine formula (pure SQL, zero external extensions).
CREATE
OR
REPLACE
MACRO haversine_km(lat1, lon1, lat2, lon2) AS (
    6371.0 * 2.0 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - lat1) / 2.0), 2) +
        COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lon2 - lon1) / 2.0), 2)
    ))
);
