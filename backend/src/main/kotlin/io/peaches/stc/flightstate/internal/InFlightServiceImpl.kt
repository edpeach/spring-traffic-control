package io.peaches.stc.flightstate.internal

import io.peaches.stc.flightstate.AirportFlight
import io.peaches.stc.flightstate.ConsolidatedFlight
import io.peaches.stc.flightstate.EnrichedFlightTrack
import io.peaches.stc.flightstate.InFlightService
import io.peaches.stc.flightstate.InFlightService.Companion.DEFAULT_AIRPORT_ICAO
import io.peaches.stc.flightstate.StateVector
import io.peaches.stc.schedule.FlightScheduleService
import io.peaches.stc.schedule.ScheduledFlight
import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.LoadStationsService
import io.peaches.stc.stations.NearestStation
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneOffset

@Service
class InFlightServiceImpl(
  private val openSkySource: CachedOpenSkySource,
  private val scheduleService: FlightScheduleService,
  private val stationsService: LoadStationsService,
) : InFlightService {
  override fun getAllStates(
    lamin: Double?,
    lomin: Double?,
    lamax: Double?,
    lomax: Double?,
  ): List<StateVector> = openSkySource.fetchAllStates(lamin, lomin, lamax, lomax)

  override fun getArrivals(
    airport: String,
    date: LocalDate,
  ): List<AirportFlight> = openSkySource.fetchArrivals(airport, date)

  override fun getDepartures(
    airport: String,
    date: LocalDate,
  ): List<AirportFlight> = openSkySource.fetchDepartures(airport, date)

  override fun getCurrentFlights(
    query: String?,
    airport: String,
    airportFlightsOnly: Boolean,
    lamin: Double?,
    lomin: Double?,
    lamax: Double?,
    lomax: Double?,
  ): List<ConsolidatedFlight> {
    val arrivals = openSkySource.fetchArrivals(airport)
    val departures = openSkySource.fetchDepartures(airport)
    val states = openSkySource.fetchAllStates(lamin, lomin, lamax, lomax)
    val scheduleLookup = buildScheduleCallsignLookup(scheduleService.findAll())

    val arrivalByIcao24 = latestByIcao24(arrivals)
    val departureByIcao24 = latestByIcao24(departures)
    val normalizedAirport = airport.trim().uppercase()

    val normalizedQuery = query?.trim()?.uppercase()?.takeIf { it.isNotEmpty() }

    return states
      .map { state ->
        val callsign = state.callsign?.uppercase()
        val arrival = arrivalByIcao24[state.icao24]
        val departure = departureByIcao24[state.icao24]
        val activeOpenSky = selectActiveAirportFlight(arrival, departure)

        val lookupCallsign = callsign ?: activeOpenSky?.callsign
        val matched = lookupCallsign?.let { scheduleLookup.findByCallsign(it) }

        val originCode = activeOpenSky?.estDepartureAirport ?: matched?.originCode
        val destinationCode = activeOpenSky?.estArrivalAirport ?: matched?.destinationCode
        val direction =
          when {
            destinationCode?.equals(normalizedAirport, ignoreCase = true) == true -> "A"
            originCode?.equals(normalizedAirport, ignoreCase = true) == true -> "D"
            activeOpenSky != null && activeOpenSky === arrival -> "A"
            activeOpenSky != null && activeOpenSky === departure -> "D"
            else -> matched?.flightDirection?.name
          }

        ConsolidatedFlight(
          state = state,
          schedule = matched,
          arrival = arrival,
          departure = departure,
          direction = direction,
          originCode = originCode,
          destinationCode = destinationCode,
        )
      }.filter { flight ->
        !airportFlightsOnly ||
          flight.arrival != null ||
          flight.departure != null ||
          flight.schedule != null
      }.filter { flight ->
        normalizedQuery == null ||
          flight.state.icao24
            .uppercase()
            .contains(normalizedQuery) ||
          (flight.state.callsign?.contains(normalizedQuery) == true) ||
          (flight.schedule?.flightName?.contains(normalizedQuery) == true) ||
          (flight.originCode?.contains(normalizedQuery) == true) ||
          (flight.destinationCode?.contains(normalizedQuery) == true)
      }
  }

  override fun getEnrichedTrack(icao24: String): EnrichedFlightTrack? {
    val normalized = icao24.trim().lowercase()
    val track = openSkySource.fetchTrack(normalized) ?: return null
    val scheduleLookup = buildScheduleCallsignLookup(scheduleService.findAll())
    val schedule = track.callsign?.let { scheduleLookup.findByCallsign(it) }

    val arrival = latestByIcao24(openSkySource.fetchArrivals(DEFAULT_AIRPORT_ICAO))[normalized]
    val departure = latestByIcao24(openSkySource.fetchDepartures(DEFAULT_AIRPORT_ICAO))[normalized]
    val activeOpenSky = selectActiveAirportFlight(arrival, departure)

    val originCode = activeOpenSky?.estDepartureAirport ?: schedule?.originCode
    val destinationCode = activeOpenSky?.estArrivalAirport ?: schedule?.destinationCode

    val fromStation = originCode?.let(stationsService::findByCode)
    val toStation = destinationCode?.let(stationsService::findByCode)

    val lastPoint = track.path.lastOrNull()
    val remainingPath =
      if (
        lastPoint != null &&
        toStation?.longitude != null &&
        toStation.latitude != null
      ) {
        listOf(
          listOf(lastPoint.longitude, lastPoint.latitude),
          listOf(toStation.longitude, toStation.latitude),
        )
      } else {
        emptyList()
      }

    return EnrichedFlightTrack(
      icao24 = track.icao24,
      callsign = track.callsign,
      path = track.path,
      fromStation = fromStation,
      toStation = toStation,
      remainingPath = remainingPath,
    )
  }

  override fun findNearestAirports(
    icao24: String,
    emergencyOnly: Boolean,
    category: AircraftCategory,
    limit: Int,
  ): List<NearestStation> {
    val normalized = icao24.trim().lowercase()
    val state =
      openSkySource.fetchAllStates().firstOrNull { it.icao24 == normalized }
        ?: return emptyList()
    val lat = state.latitude ?: return emptyList()
    val lon = state.longitude ?: return emptyList()

    return stationsService.findLandingCapableNearest(
      lat = lat,
      lon = lon,
      requiredCategory = category,
      atTimeUtc = LocalTime.now(ZoneOffset.UTC),
      emergencyOnly = emergencyOnly,
      limit = limit,
    )
  }

  /**
   * Links an OpenSky callsign with Schiphol schedule data:
   * 1. Direct match against `flightName` (or `codeshares`)
   * 2. Fallback to `prefixIcao` + `flightNumber` (e.g., `KLM` + `1051` -> `KLM1051`)
   */
  private class ScheduleCallsignLookup(
    private val byFlightName: Map<String, ScheduledFlight>,
    private val byIcaoNumber: Map<String, ScheduledFlight>,
  ) {
    fun findByCallsign(rawCallsign: String): ScheduledFlight? {
      val normalized = rawCallsign.trim().uppercase()
      if (normalized.isEmpty()) return null
      return byFlightName[normalized] ?: byIcaoNumber[normalized]
    }
  }

  private fun buildScheduleCallsignLookup(flights: List<ScheduledFlight>): ScheduleCallsignLookup {
    val byFlightName = mutableMapOf<String, ScheduledFlight>()
    val byIcaoNumber = mutableMapOf<String, ScheduledFlight>()

    for (flight in flights) {
      val isMain = flight.mainFlight == null || flight.flightName == flight.mainFlight

      val flightName = flight.flightName.trim().uppercase()
      if (flightName.isNotEmpty() && (isMain || !byFlightName.containsKey(flightName))) {
        byFlightName[flightName] = flight
      }
      for (codeshare in flight.codeshares) {
        val cs = codeshare.trim().uppercase()
        if (cs.isNotEmpty() && !byFlightName.containsKey(cs)) {
          byFlightName[cs] = flight
        }
      }

      if (flight.prefixIcao != null && flight.flightNumber != null) {
        val icaoCallsign = "${flight.prefixIcao.trim()}${flight.flightNumber}".uppercase()
        if (isMain || !byIcaoNumber.containsKey(icaoCallsign)) {
          byIcaoNumber[icaoCallsign] = flight
        }
      }
    }
    return ScheduleCallsignLookup(byFlightName, byIcaoNumber)
  }

  private fun latestByIcao24(flights: List<AirportFlight>): Map<String, AirportFlight> {
    val map = mutableMapOf<String, AirportFlight>()
    for (flight in flights) {
      val existing = map[flight.icao24]
      if (existing == null || flightRecency(flight) >= flightRecency(existing)) {
        map[flight.icao24] = flight
      }
    }
    return map
  }

  private fun selectActiveAirportFlight(
    arrival: AirportFlight?,
    departure: AirportFlight?,
  ): AirportFlight? =
    when {
      arrival == null -> departure
      departure == null -> arrival
      flightRecency(departure) >= flightRecency(arrival) -> departure
      else -> arrival
    }

  private fun flightRecency(flight: AirportFlight): Long = maxOf(flight.lastSeen ?: 0L, flight.firstSeen ?: 0L)
}
