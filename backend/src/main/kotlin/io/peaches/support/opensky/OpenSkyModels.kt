package io.peaches.support.opensky

import tools.jackson.databind.JsonNode

/**
 * Response from `GET /states/all`.
 *
 * Each element in [states] is a 17-element JSON array tuple:
 * `[icao24, callsign, origin_country, time_position, last_contact, longitude, latitude,
 *   baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude,
 *   squawk, spi, position_source]`.
 */
data class OpenSkyStatesResponse(
  val time: Long = 0,
  val states: List<JsonNode> = emptyList(),
)

/**
 * Response from `GET /tracks/all`.
 *
 * Each element in [path] is a 6-element JSON array tuple:
 * `[time, latitude, longitude, baro_altitude, true_track, on_ground]`.
 */
data class OpenSkyTrackResponse(
  val icao24: String? = null,
  val startTime: Long? = null,
  val endTime: Long? = null,
  val callsign: String? = null,
  val path: List<JsonNode> = emptyList(),
)

/**
 * Flight entry returned by `GET /flights/arrival` and `GET /flights/departure`.
 */
data class OpenSkyFlight(
  val icao24: String? = null,
  val firstSeen: Long? = null,
  val estDepartureAirport: String? = null,
  val lastSeen: Long? = null,
  val estArrivalAirport: String? = null,
  val callsign: String? = null,
  val estDepartureAirportHorizDistance: Int? = null,
  val estDepartureAirportVertDistance: Int? = null,
  val estArrivalAirportHorizDistance: Int? = null,
  val estArrivalAirportVertDistance: Int? = null,
  val departureAirportCandidatesCount: Int? = null,
  val arrivalAirportCandidatesCount: Int? = null,
)
