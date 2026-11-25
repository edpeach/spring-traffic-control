package io.peaches.stc.flightstate

import io.peaches.stc.schedule.ScheduledFlight
import io.peaches.stc.stations.Station

data class StateVector(
  val icao24: String,
  val callsign: String? = null,
  val originCountry: String? = null,
  val timePosition: Long? = null,
  val lastContact: Long? = null,
  val longitude: Double? = null,
  val latitude: Double? = null,
  val baroAltitude: Double? = null,
  val onGround: Boolean = false,
  val velocity: Double? = null,
  val trueTrack: Double? = null,
  val verticalRate: Double? = null,
  val geoAltitude: Double? = null,
  val squawk: String? = null,
  val spi: Boolean = false,
  val positionSource: Int? = null,
)

data class TrackWaypoint(
  val time: Long,
  val latitude: Double,
  val longitude: Double,
  val baroAltitude: Double? = null,
  val trueTrack: Double? = null,
  val onGround: Boolean = false,
)

data class FlightTrack(
  val icao24: String,
  val callsign: String? = null,
  val startTime: Long? = null,
  val endTime: Long? = null,
  val path: List<TrackWaypoint> = emptyList(),
)

data class AirportFlight(
  val icao24: String,
  val callsign: String? = null,
  val firstSeen: Long? = null,
  val lastSeen: Long? = null,
  val estDepartureAirport: String? = null,
  val estArrivalAirport: String? = null,
)

data class ConsolidatedFlight(
  val state: StateVector,
  val schedule: ScheduledFlight? = null,
  val arrival: AirportFlight? = null,
  val departure: AirportFlight? = null,
  val direction: String? = null,
  val originCode: String? = null,
  val destinationCode: String? = null,
)

data class EnrichedFlightTrack(
  val icao24: String,
  val callsign: String? = null,
  val path: List<TrackWaypoint> = emptyList(),
  val fromStation: Station? = null,
  val toStation: Station? = null,
  val remainingPath: List<List<Double>> = emptyList(),
)
