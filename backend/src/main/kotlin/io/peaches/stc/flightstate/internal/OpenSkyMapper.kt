package io.peaches.stc.flightstate.internal

import io.peaches.stc.flightstate.AirportFlight
import io.peaches.stc.flightstate.FlightTrack
import io.peaches.stc.flightstate.StateVector
import io.peaches.stc.flightstate.TrackWaypoint
import io.peaches.support.opensky.OpenSkyFlight
import io.peaches.support.opensky.OpenSkyStatesResponse
import io.peaches.support.opensky.OpenSkyTrackResponse
import tools.jackson.databind.JsonNode

/**
 * Anti-corruption mapper translating OpenSky raw tuple responses into internal `flightstate` domain models.
 */
object OpenSkyMapper {
  fun toStateVectors(response: OpenSkyStatesResponse?): List<StateVector> = response?.states.orEmpty().mapNotNull(::toStateVector)

  fun toStateVector(tuple: JsonNode): StateVector? {
    if (!tuple.isArray) return null
    val icao24 = tuple.stringAt(0)?.lowercase() ?: return null
    return StateVector(
      icao24 = icao24,
      callsign = tuple.stringAt(1)?.uppercase(),
      originCountry = tuple.stringAt(2),
      timePosition = tuple.longAt(3),
      lastContact = tuple.longAt(4),
      longitude = tuple.doubleAt(5),
      latitude = tuple.doubleAt(6),
      baroAltitude = tuple.doubleAt(7),
      onGround = tuple.booleanAt(8) ?: false,
      velocity = tuple.doubleAt(9),
      trueTrack = tuple.doubleAt(10),
      verticalRate = tuple.doubleAt(11),
      geoAltitude = tuple.doubleAt(13),
      squawk = tuple.stringAt(14),
      spi = tuple.booleanAt(15) ?: false,
      positionSource = tuple.intAt(16),
    )
  }

  fun toFlightTrack(response: OpenSkyTrackResponse?): FlightTrack? {
    val icao24 =
      response
        ?.icao24
        ?.trim()
        ?.lowercase()
        ?.takeIf { it.isNotEmpty() } ?: return null
    val waypoints =
      response.path.mapNotNull { wp ->
        if (!wp.isArray) return@mapNotNull null
        val time = wp.longAt(0) ?: return@mapNotNull null
        val lat = wp.doubleAt(1) ?: return@mapNotNull null
        val lon = wp.doubleAt(2) ?: return@mapNotNull null
        TrackWaypoint(
          time = time,
          latitude = lat,
          longitude = lon,
          baroAltitude = wp.doubleAt(3),
          trueTrack = wp.doubleAt(4),
          onGround = wp.booleanAt(5) ?: false,
        )
      }
    return FlightTrack(
      icao24 = icao24,
      callsign =
        response.callsign
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      startTime = response.startTime,
      endTime = response.endTime,
      path = waypoints,
    )
  }

  fun toAirportFlights(flights: List<OpenSkyFlight>?): List<AirportFlight> = flights.orEmpty().mapNotNull(::toAirportFlight)

  fun toAirportFlight(flight: OpenSkyFlight): AirportFlight? {
    val icao24 =
      flight.icao24
        ?.trim()
        ?.lowercase()
        ?.takeIf { it.isNotEmpty() } ?: return null
    return AirportFlight(
      icao24 = icao24,
      callsign =
        flight.callsign
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      firstSeen = flight.firstSeen,
      lastSeen = flight.lastSeen,
      estDepartureAirport =
        flight.estDepartureAirport
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      estArrivalAirport =
        flight.estArrivalAirport
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
    )
  }

  private fun JsonNode.stringAt(index: Int): String? {
    val node = get(index) ?: return null
    if (node.isNull || node.isMissingNode) return null
    return node.asString()?.trim()?.takeIf { it.isNotEmpty() }
  }

  private fun JsonNode.doubleAt(index: Int): Double? {
    val node = get(index) ?: return null
    return if (node.isNumber) node.doubleValue() else null
  }

  private fun JsonNode.longAt(index: Int): Long? {
    val node = get(index) ?: return null
    return if (node.isNumber) node.longValue() else null
  }

  private fun JsonNode.intAt(index: Int): Int? {
    val node = get(index) ?: return null
    return if (node.isNumber) node.intValue() else null
  }

  private fun JsonNode.booleanAt(index: Int): Boolean? {
    val node = get(index) ?: return null
    return if (node.isBoolean) node.booleanValue() else null
  }
}
