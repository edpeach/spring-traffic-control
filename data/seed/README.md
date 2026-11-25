# Spring Traffic Control — Demo Seed Dataset

Snapshot imported from live upstream APIs on **2026-11-25T17:26:51Z** so the application can run standalone via `mise dev` (`DEMO_MODE=true`) with zero external API keys.

On startup, `DemoSeedConfig` automatically loads any empty DuckDB tables from `data/seed/duckdb/*.parquet` (updating `scheduled_flights.schedule_date` to today's date), and `CachedOpenSkySource` serves live states, arrivals, departures, and recorded flight tracks from `data/seed/opensky/` when OpenSky credentials are not configured.

## Included Datasets

### DuckDB Tables (`data/seed/duckdb/*.parquet`)

| Table | Rows | Upstream Source |
| --- | ---: | --- |
| `stations` | 763 | OpenAIP (all `INTL_APT` international airports worldwide) |
| `station_runways` | 2,542 | OpenAIP |
| `station_frequencies` | 4,423 | OpenAIP |
| `airlines` | 408 | Schiphol Public Flights API |
| `aircraft_types` | 239 | Schiphol Public Flights API |
| `scheduled_flights` | 4,671 | Schiphol Public Flights API (`2026-11-25`) |

### OpenSky Snapshots (`data/seed/opensky/`)

| File | Entries | Description |
| --- | ---: | --- |
| `states.json` | 174 | Live EHAM-matched aircraft state vectors |
| `arrivals.json` | 397 | Amsterdam Schiphol (`EHAM`) arrivals |
| `departures.json` | 420 | Amsterdam Schiphol (`EHAM`) departures |
| `track-<icao24>.json` | 112 | Recorded flight tracks (61 KLM, 15 KLM Cityhopper, 10 Transavia/HV, 26 other carriers) |

## Try It Out

Once the app is running (`mise dev`), you can click any of the 112 flights below on the `/map` view to inspect its full recorded track, or try prompts in the AI Assistant such as:

- *"Show me KL702 on the map with the 5 closest airports"*
- *"Where is EK149 right now and what are the nearest emergency-capable airports?"*
- *"Open the station details for Amsterdam Schiphol"*
- *"Summarize the runway types at EHAM"*

## Documented Flight Tracks (112)

Every flight below is present in `states.json` and backed by a recorded track file in `data/seed/opensky/`.

| # | Flight | Callsign | ICAO24 | Dir | Route | Altitude (m) | Waypoints | Track File |
| ---: | --- | --- | --- | :---: | --- | ---: | ---: | --- |
| 1 | `LY339` | `ELY0339` | `738061` | A | TLV → AMS | 10,973 | 70 | [`track-738061.json`](./opensky/track-738061.json) |
| 2 | `AA203` | `AAL203` | `ab271f` | D | EHAM → PHL | 12,192 | 338 | [`track-ab271f.json`](./opensky/track-ab271f.json) |
| 3 | `EK149` | `UAE149` | `89617e` | A | DXB → AMS | 10,973 | 135 | [`track-89617e.json`](./opensky/track-89617e.json) |
| 4 | `UA021` | `UAL21` | `a86ab5` | D | EHAM → IAH | 11,582 | 82 | [`track-a86ab5.json`](./opensky/track-a86ab5.json) |
| 5 | `DL0057` | `DAL57` | `a4eacb` | D | EHAM → SLC | 11,582 | 83 | [`track-a4eacb.json`](./opensky/track-a4eacb.json) |
| 6 | `KL0695` | `KLM695` | `484f72` | D | EHAM → YYZ | 11,582 | 70 | [`track-484f72.json`](./opensky/track-484f72.json) |
| 7 | `EK9642` | `UAE9642` | `8963a2` | D | EHAM → ENGM | 10,058 | 117 | [`track-8963a2.json`](./opensky/track-8963a2.json) |
| 8 | `KL0843` | `KLM843` | `485ecc` | D | EHAM → BKK | 9,449 | 67 | [`track-485ecc.json`](./opensky/track-485ecc.json) |
| 9 | `KL1857` | `KLM1857` | `484c50` | D | EHAM → MUC | 10,668 | 51 | [`track-484c50.json`](./opensky/track-484c50.json) |
| 10 | `KL1316` | `KLM1316` | `484c53` | D | EHAM → EPWA | 5,646 | 71 | [`track-484c53.json`](./opensky/track-484c53.json) |
| 11 | `KL0643` | `KLM643` | `485f84` | D | EHAM → JFK | 10,363 | 154 | [`track-485f84.json`](./opensky/track-485f84.json) |
| 12 | `BT860` | `BTI860` | `502daa` | D | EHAM → TLL | 10,668 | 61 | [`track-502daa.json`](./opensky/track-502daa.json) |
| 13 | `CI5032` | `CAL5032` | `899014` | D | EHAM → TPE | 10,058 | 84 | [`track-899014.json`](./opensky/track-899014.json) |
| 14 | `AF1440` | `AFR1440` | `39bdae` | A | CDG → AMS | 3,200 | 16 | [`track-39bdae.json`](./opensky/track-39bdae.json) |
| 15 | `RJ152` | `RJA152` | `744822` | D | EHAM → AMM | 11,278 | 117 | [`track-744822.json`](./opensky/track-744822.json) |
| 16 | `KL0601` | `KLM601` | `485000` | D | EHAM → LAX | 10,973 | 85 | [`track-485000.json`](./opensky/track-485000.json) |
| 17 | `VY1059` | `VLG1059` | `342591` | D | EHAM → BCN | 6,949 | 113 | [`track-342591.json`](./opensky/track-342591.json) |
| 18 | `DL0073` | `DAL73` | `a519b8` | D | EHAM → ATL | 10,973 | 98 | [`track-a519b8.json`](./opensky/track-a519b8.json) |
| 19 | `RB272` | `SYR272` | `503d4d` | A | DAM → AMS | 11,582 | 117 | [`track-503d4d.json`](./opensky/track-503d4d.json) |
| 20 | `FI504` | `ICE504` | `4cc594` | A | KEF → AMS | 785 | 143 | [`track-4cc594.json`](./opensky/track-4cc594.json) |
| 21 | `TG937` | `THA937` | `885106` | D | EHAM → BKK | 12,497 | 165 | [`track-885106.json`](./opensky/track-885106.json) |
| 22 | `DL0049` | `DAL49` | `a4bf95` | D | EHAM → JFK | 11,582 | 93 | [`track-a4bf95.json`](./opensky/track-a4bf95.json) |
| 23 | `UA947` | `UAL947` | `a880ff` | D | EHAM → IAD | 10,973 | 87 | [`track-a880ff.json`](./opensky/track-a880ff.json) |
| 24 | `KL0896` | `KLM896` | `4843f2` | A | PVG → AMS | 9,495 | 118 | [`track-4843f2.json`](./opensky/track-4843f2.json) |
| 25 | `HV5336` | `TRA5336` | `4869bf` | D | EHAM → HE35 | 11,598 | 64 | [`track-4869bf.json`](./opensky/track-4869bf.json) |
| 26 | `DL0237` | `DAL237` | `a544ee` | D | EHAM → TPA | 11,582 | 111 | [`track-a544ee.json`](./opensky/track-a544ee.json) |
| 27 | `KL1960` | `KLM1960` | `4841a6` | D | EHAM → LTFM | 11,582 | 76 | [`track-4841a6.json`](./opensky/track-4841a6.json) |
| 28 | `KL1225` | `KLM1225` | `4867c0` | D | EHAM → ARN | 11,262 | 82 | [`track-4867c0.json`](./opensky/track-4867c0.json) |
| 29 | `KL1506` | `KLM1506` | `486897` | D | EHAM → LEMD | 10,973 | 68 | [`track-486897.json`](./opensky/track-486897.json) |
| 30 | `KL0617` | `KLM617` | `48436b` | D | EHAM → BOS | 10,973 | 64 | [`track-48436b.json`](./opensky/track-48436b.json) |
| 31 | `KL0661` | `KLM661` | `48436a` | D | EHAM → IAH | 12,192 | 80 | [`track-48436a.json`](./opensky/track-48436a.json) |
| 32 | `KL0655` | `KLM655` | `48436f` | D | EHAM → MSP | 10,363 | 64 | [`track-48436f.json`](./opensky/track-48436f.json) |
| 33 | `KL0702` | `KLM702` | `484368` | A | SCL → AMS | 7,468 | 36 | [`track-484368.json`](./opensky/track-484368.json) |
| 34 | `KL0862` | `KLM862` | `484371` | A | NRT → AMS | 11,278 | 102 | [`track-484371.json`](./opensky/track-484371.json) |
| 35 | `KL0897` | `KLM897` | `484370` | D | EHAM → PEK | 10,668 | 76 | [`track-484370.json`](./opensky/track-484370.json) |
| 36 | `KL0810` | `KLM810` | `485344` | A | CGK → AMS | 2,987 | 13 | [`track-485344.json`](./opensky/track-485344.json) |
| 37 | `KL0932` | `KLM932` | `486651` | D | EHAM → EGPH | 10,798 | 49 | [`track-486651.json`](./opensky/track-486651.json) |
| 38 | `DL0133` | `DAL133` | `a5237f` | D | EHAM → DTW | 9,144 | 106 | [`track-a5237f.json`](./opensky/track-a5237f.json) |
| 39 | `KL0844` | `KLM844` | `4851b3` | A | BKK → AMS | 0 | 278 | [`track-4851b3.json`](./opensky/track-4851b3.json) |
| 40 | `KL0461` | `KLM461` | `48418b` | D | EHAM → TLV | 11,887 | 59 | [`track-48418b.json`](./opensky/track-48418b.json) |
| 41 | `MU0230` | `CES230` | `780f39` | D | EHAM → PVG | 10,058 | 46 | [`track-780f39.json`](./opensky/track-780f39.json) |
| 42 | `KL1936` | `KLM1936` | `484b8f` | D | EHAM → LSGG | 10,973 | 50 | [`track-484b8f.json`](./opensky/track-484b8f.json) |
| 43 | `MS758` | `MSR758` | `010246` | D | EHAM → CAI | 10,660 | 136 | [`track-010246.json`](./opensky/track-010246.json) |
| 44 | `KL0623` | `KLM623` | `485b43` | D | EHAM → ATL | 9,754 | 683 | [`track-485b43.json`](./opensky/track-485b43.json) |
| 45 | `BZ0611` | `BBG611` | `4d2475` | D | EHAM → TLV | 10,058 | 74 | [`track-4d2475.json`](./opensky/track-4d2475.json) |
| 46 | `AZ109` | `ITY109` | `4cae1e` | D | EHAM → FCO | 8,687 | 42 | [`track-4cae1e.json`](./opensky/track-4cae1e.json) |
| 47 | `AZ112` | `ITY112` | `4cad5f` | A | LIN → AMS | 9,243 | 72 | [`track-4cad5f.json`](./opensky/track-4cad5f.json) |
| 48 | `5Y5561` | `GTI5561` | `abc201` | D | EHAM → HKG | 11,887 | 74 | [`track-abc201.json`](./opensky/track-abc201.json) |
| 49 | `KL0860` | `KLM860` | `485f83` | A | KIX → AMS | On ground | 583 | [`track-485f83.json`](./opensky/track-485f83.json) |
| 50 | `CZ0307` | `CSN307` | `7817b7` | A | CAN → AMS | On ground | 89 | [`track-7817b7.json`](./opensky/track-7817b7.json) |
| 51 | `—` | `KLM89Y` | `3c4d4a` | D | EHAM → — | 7,353 | 95 | [`track-3c4d4a.json`](./opensky/track-3c4d4a.json) |
| 52 | `—` | `KLM48L` | `484fde` | D | EHAM → — | 11,582 | 29 | [`track-484fde.json`](./opensky/track-484fde.json) |
| 53 | `—` | `KLC98G` | `3c6d43` | D | EHAM → EGLC | 2,126 | 26 | [`track-3c6d43.json`](./opensky/track-3c6d43.json) |
| 54 | `—` | `KLC1246` | `484f80` | D | EHAM → ESSL | 11,582 | 51 | [`track-484f80.json`](./opensky/track-484f80.json) |
| 55 | `—` | `KLM80Y` | `484f06` | D | EHAM → LIML | On ground | 130 | [`track-484f06.json`](./opensky/track-484f06.json) |
| 56 | `—` | `KLC34B` | `484bd1` | D | EHAM → LEVC | 11,529 | 76 | [`track-484bd1.json`](./opensky/track-484bd1.json) |
| 57 | `—` | `KLM133` | `485ecd` | D | EHAM → — | 9,144 | 72 | [`track-485ecd.json`](./opensky/track-485ecd.json) |
| 58 | `—` | `TRA27X` | `484c5a` | D | EHAM → — | 7,620 | 74 | [`track-484c5a.json`](./opensky/track-484c5a.json) |
| 59 | `—` | `KLC1342` | `484c54` | D | EHAM → EPPO | 9,441 | 41 | [`track-484c54.json`](./opensky/track-484c54.json) |
| 60 | `—` | `KLC62W` | `484c52` | D | EHAM → ENSD | 2,850 | 82 | [`track-484c52.json`](./opensky/track-484c52.json) |
| 61 | `—` | `KLC1766` | `484c1b` | D | EHAM → EDDW | 709 | 22 | [`track-484c1b.json`](./opensky/track-484c1b.json) |
| 62 | `—` | `KLC991` | `484cc3` | D | EHAM → — | On ground | 99 | [`track-484cc3.json`](./opensky/track-484cc3.json) |
| 63 | `—` | `KLM24F` | `484cb7` | D | EHAM → LFBO | 10,973 | 59 | [`track-484cb7.json`](./opensky/track-484cb7.json) |
| 64 | `—` | `KLM40J` | `486495` | D | EHAM → EGLL | 556 | 21 | [`track-486495.json`](./opensky/track-486495.json) |
| 65 | `—` | `KLM75R` | `486484` | D | EHAM → — | 2,103 | 29 | [`track-486484.json`](./opensky/track-486484.json) |
| 66 | `—` | `KLC52L` | `486482` | D | EHAM → LFMT | 389 | 131 | [`track-486482.json`](./opensky/track-486482.json) |
| 67 | `—` | `KLC92Z` | `485207` | D | EHAM → EGNM | On ground | 8 | [`track-485207.json`](./opensky/track-485207.json) |
| 68 | `—` | `KLM95T` | `4863dc` | D | EHAM → — | 11,285 | 67 | [`track-4863dc.json`](./opensky/track-4863dc.json) |
| 69 | `—` | `KLC32E` | `4863db` | D | EHAM → LDZL | 2,926 | 95 | [`track-4863db.json`](./opensky/track-4863db.json) |
| 70 | `—` | `KLM40E` | `486257` | D | EHAM → EPKK | 4,412 | 31 | [`track-486257.json`](./opensky/track-486257.json) |
| 71 | `—` | `TRA36J` | `485009` | D | EHAM → — | 11,887 | 131 | [`track-485009.json`](./opensky/track-485009.json) |
| 72 | `—` | `KLM33K` | `4869c3` | D | EHAM → — | 11,285 | 62 | [`track-4869c3.json`](./opensky/track-4869c3.json) |
| 73 | `—` | `KLM91X` | `484442` | D | EHAM → — | 907 | 110 | [`track-484442.json`](./opensky/track-484442.json) |
| 74 | `—` | `KLM58M` | `484559` | D | EHAM → — | 11,582 | 36 | [`track-484559.json`](./opensky/track-484559.json) |
| 75 | `—` | `KLM30E` | `484555` | D | EHAM → ENZV | 2,393 | 114 | [`track-484555.json`](./opensky/track-484555.json) |
| 76 | `—` | `KLC993` | `485871` | D | EHAM → — | 15 | 18 | [`track-485871.json`](./opensky/track-485871.json) |
| 77 | `—` | `TRA33A` | `4867ec` | D | EHAM → — | 3,109 | 136 | [`track-4867ec.json`](./opensky/track-4867ec.json) |
| 78 | `—` | `KLM80Z` | `4841a9` | D | EHAM → LPPT | 11,582 | 55 | [`track-4841a9.json`](./opensky/track-4841a9.json) |
| 79 | `—` | `KLM14M` | `4867c1` | D | EHAM → LGAV | 10,363 | 77 | [`track-4867c1.json`](./opensky/track-4867c1.json) |
| 80 | `—` | `KLM82J` | `4867c2` | D | EHAM → EFHK | 10,973 | 65 | [`track-4867c2.json`](./opensky/track-4867c2.json) |
| 81 | `—` | `KLM54G` | `4867c3` | D | EHAM → LIRF | 10,980 | 65 | [`track-4867c3.json`](./opensky/track-4867c3.json) |
| 82 | `—` | `TRA6C` | `4867b0` | D | EHAM → LPPR | 11,270 | 75 | [`track-4867b0.json`](./opensky/track-4867b0.json) |
| 83 | `—` | `KLM26Y` | `486898` | D | EHAM → LOWW | 10,973 | 79 | [`track-486898.json`](./opensky/track-486898.json) |
| 84 | `—` | `KLC1154` | `486804` | D | EHAM → ENVA | 12,192 | 52 | [`track-486804.json`](./opensky/track-486804.json) |
| 85 | `—` | `KLM74N` | `486802` | D | EHAM → LIPE | 9,144 | 65 | [`track-486802.json`](./opensky/track-486802.json) |
| 86 | `—` | `KLC68V` | `4855d0` | D | EHAM → EDDV | 1,105 | 23 | [`track-4855d0.json`](./opensky/track-4855d0.json) |
| 87 | `—` | `KLM41L` | `4868f8` | D | EHAM → — | 11,224 | 56 | [`track-4868f8.json`](./opensky/track-4868f8.json) |
| 88 | `—` | `KLM94R` | `4868f7` | D | EHAM → ESSA | 3,741 | 35 | [`track-4868f7.json`](./opensky/track-4868f7.json) |
| 89 | `—` | `KLM62R` | `4868bc` | D | EHAM → LROP | 9,746 | 71 | [`track-4868bc.json`](./opensky/track-4868bc.json) |
| 90 | `—` | `TRA71U` | `4868ba` | D | EHAM → — | 11,262 | 126 | [`track-4868ba.json`](./opensky/track-4868ba.json) |
| 91 | `—` | `TRA17T` | `4868b9` | D | EHAM → — | 11,270 | 94 | [`track-4868b9.json`](./opensky/track-4868b9.json) |
| 92 | `—` | `KLM44T` | `4868a6` | D | EHAM → LFRS | 8,694 | 62 | [`track-4868a6.json`](./opensky/track-4868a6.json) |
| 93 | `—` | `KLM76F` | `486954` | D | EHAM → EDDM | 10,973 | 49 | [`track-486954.json`](./opensky/track-486954.json) |
| 94 | `—` | `KLM50N` | `486953` | D | EHAM → LIPZ | 11,582 | 66 | [`track-486953.json`](./opensky/track-486953.json) |
| 95 | `—` | `KLC42U` | `4864eb` | D | EHAM → LIRQ | 11,994 | 108 | [`track-4864eb.json`](./opensky/track-4864eb.json) |
| 96 | `—` | `TRA95V` | `4866ed` | D | EHAM → — | 11,293 | 91 | [`track-4866ed.json`](./opensky/track-4866ed.json) |
| 97 | `—` | `TRA8U` | `4853d2` | D | EHAM → BIKF | 10,455 | 73 | [`track-4853d2.json`](./opensky/track-4853d2.json) |
| 98 | `—` | `TRA5J` | `4866de` | D | EHAM → — | 10,660 | 67 | [`track-4866de.json`](./opensky/track-4866de.json) |
| 99 | `—` | `KLM28W` | `48418a` | D | EHAM → LEMG | 11,582 | 74 | [`track-48418a.json`](./opensky/track-48418a.json) |
| 100 | `—` | `KLM72C` | `484166` | D | EHAM → LFML | 12,192 | 68 | [`track-484166.json`](./opensky/track-484166.json) |
| 101 | `—` | `KLM72K` | `48415e` | D | EHAM → ESGG | 1,417 | 140 | [`track-48415e.json`](./opensky/track-48415e.json) |
| 102 | `—` | `KLM36X` | `484161` | D | EHAM → EKCH | 7,125 | 73 | [`track-484161.json`](./opensky/track-484161.json) |
| 103 | `—` | `KLM78E` | `486741` | D | EHAM → ENBR | 11,468 | 53 | [`track-486741.json`](./opensky/track-486741.json) |
| 104 | `—` | `KLM16K` | `486742` | D | EHAM → LEBL | 10,965 | 61 | [`track-486742.json`](./opensky/track-486742.json) |
| 105 | `—` | `KLM96C` | `486740` | D | EHAM → LHBP | 11,582 | 70 | [`track-486740.json`](./opensky/track-486740.json) |
| 106 | `KL0918` | `KLM918` | `484b90` | D | EHAM → EGPD | On ground | 8 | [`track-484b90.json`](./opensky/track-484b90.json) |
| 107 | `—` | `KLM69C` | `485a32` | D | EHAM → — | 11,887 | 80 | [`track-485a32.json`](./opensky/track-485a32.json) |
| 108 | `—` | `KLM10X` | `485a35` | D | EHAM → LFMN | 7,315 | 98 | [`track-485a35.json`](./opensky/track-485a35.json) |
| 109 | `—` | `KLM58K` | `485a33` | D | EHAM → ENGM | 1,699 | 102 | [`track-485a33.json`](./opensky/track-485a33.json) |
| 110 | `—` | `KLM60H` | `485a34` | D | EHAM → LPPR | 11,582 | 52 | [`track-485a34.json`](./opensky/track-485a34.json) |
| 111 | `—` | `KLM38T` | `484966` | D | EHAM → LSZH | 8,016 | 74 | [`track-484966.json`](./opensky/track-484966.json) |
| 112 | `—` | `KLC84X` | `398564` | D | EHAM → LFBD | 9,434 | 49 | [`track-398564.json`](./opensky/track-398564.json) |
