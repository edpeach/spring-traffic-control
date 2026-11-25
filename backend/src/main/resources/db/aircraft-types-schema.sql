CREATE TABLE IF NOT EXISTS aircraft_types
(
    id                VARCHAR PRIMARY KEY,
    iata_main         VARCHAR,
    iata_sub          VARCHAR,
    short_description VARCHAR,
    long_description  VARCHAR
);
