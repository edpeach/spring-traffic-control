package io.peaches.stc.flightstate

import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.NearestStation
import java.time.LocalDate
import java.time.ZoneOffset

interface InFlightService {
  fun getAllStates(
    lamin: Double? = null,
    lomin: Double? = null,
    lamax: Double? = null,
    lomax: Double? = null,
  ): List<StateVector>

  fun getArrivals(
    airport: String = DEFAULT_AIRPORT_ICAO,
    date: LocalDate = LocalDate.now(ZoneOffset.UTC),
  ): List<AirportFlight>

  fun getDepartures(
    airport: String = DEFAULT_AIRPORT_ICAO,
    date: LocalDate = LocalDate.now(ZoneOffset.UTC),
  ): List<AirportFlight>

  fun getCurrentFlights(
    query: String? = null,
    airport: String = DEFAULT_AIRPORT_ICAO,
    airportFlightsOnly: Boolean = true,
    lamin: Double? = null,
    lomin: Double? = null,
    lamax: Double? = null,
    lomax: Double? = null,
  ): List<ConsolidatedFlight>

  fun getEnrichedTrack(icao24: String): EnrichedFlightTrack?

  fun findNearestAirports(
    icao24: String,
    emergencyOnly: Boolean = false,
    category: AircraftCategory = AircraftCategory.LIGHT,
    limit: Int = 5,
  ): List<NearestStation>

  companion object {
    const val DEFAULT_AIRPORT_ICAO = "EHAM"
  }
}
