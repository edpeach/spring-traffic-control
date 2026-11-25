package io.peaches.stc.flightstate.internal

import io.peaches.stc.flightstate.AirportFlight
import io.peaches.stc.flightstate.ConsolidatedFlight
import io.peaches.stc.flightstate.EnrichedFlightTrack
import io.peaches.stc.flightstate.InFlightService
import io.peaches.stc.flightstate.StateVector
import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.NearestStation
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDate
import java.time.ZoneOffset

@RestController
@RequestMapping("/api")
class InFlightController(
  private val inFlightService: InFlightService,
) {
  @GetMapping("/flights/arrival")
  fun getArrivals(
    @RequestParam(defaultValue = InFlightService.DEFAULT_AIRPORT_ICAO) airport: String = InFlightService.DEFAULT_AIRPORT_ICAO,
    @RequestParam(required = false) date: LocalDate? = null,
  ): List<AirportFlight> = inFlightService.getArrivals(airport, date ?: LocalDate.now(ZoneOffset.UTC))

  @GetMapping("/flights/departure")
  fun getDepartures(
    @RequestParam(defaultValue = InFlightService.DEFAULT_AIRPORT_ICAO) airport: String = InFlightService.DEFAULT_AIRPORT_ICAO,
    @RequestParam(required = false) date: LocalDate? = null,
  ): List<AirportFlight> = inFlightService.getDepartures(airport, date ?: LocalDate.now(ZoneOffset.UTC))

  @GetMapping("/states/all")
  fun getAllStates(
    @RequestParam(required = false) lamin: Double? = null,
    @RequestParam(required = false) lomin: Double? = null,
    @RequestParam(required = false) lamax: Double? = null,
    @RequestParam(required = false) lomax: Double? = null,
  ): List<StateVector> = inFlightService.getAllStates(lamin, lomin, lamax, lomax)

  @GetMapping("/tracks")
  fun getTrack(
    @RequestParam icao24: String,
  ): EnrichedFlightTrack =
    inFlightService.getEnrichedTrack(icao24)
      ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Track not found for icao24: $icao24")

  @GetMapping("/flights/current")
  fun getCurrentFlights(
    @RequestParam(required = false) query: String? = null,
    @RequestParam(defaultValue = InFlightService.DEFAULT_AIRPORT_ICAO) airport: String = InFlightService.DEFAULT_AIRPORT_ICAO,
    @RequestParam(defaultValue = "true") airportFlightsOnly: Boolean = true,
    @RequestParam(required = false) lamin: Double? = null,
    @RequestParam(required = false) lomin: Double? = null,
    @RequestParam(required = false) lamax: Double? = null,
    @RequestParam(required = false) lomax: Double? = null,
  ): List<ConsolidatedFlight> = inFlightService.getCurrentFlights(query, airport, airportFlightsOnly, lamin, lomin, lamax, lomax)

  @GetMapping("/flights/opensky/{icao24}/nearest-airports")
  fun getNearestAirports(
    @PathVariable icao24: String,
    @RequestParam(defaultValue = "false") emergency: Boolean = false,
    @RequestParam(defaultValue = "LIGHT") category: AircraftCategory = AircraftCategory.LIGHT,
    @RequestParam(defaultValue = "5") limit: Int = 5,
  ): List<NearestStation> = inFlightService.findNearestAirports(icao24, emergency, category, limit)
}
