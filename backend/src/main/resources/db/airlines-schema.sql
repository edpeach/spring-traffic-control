CREATE TABLE IF NOT EXISTS airlines
(
    id          VARCHAR PRIMARY KEY,
    iata        VARCHAR,
    icao        VARCHAR,
    nvls        BIGINT,
    public_name VARCHAR NOT NULL
);
