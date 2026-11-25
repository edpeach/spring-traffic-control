package io.peaches.stc.stations.internal

import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.LoadStationsService
import io.peaches.stc.stations.NearestStation
import io.peaches.stc.stations.Station
import io.peaches.stc.stations.StationSyncRequest
import io.peaches.stc.stations.StationSyncResult
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.LocalTime
import java.time.ZoneOffset

@RestController
@RequestMapping("/api/stations")
class StationController(
  private val stationsService: LoadStationsService,
) {
  @GetMapping("/airports")
  fun listAirports(
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) query: String? = null,
  ): List<Station> = stationsService.findAll(country, query)

  @PostMapping("/airports/sync")
  fun syncAirports(
    @RequestBody(required = false) request: StationSyncRequest? = null,
  ): StationSyncResult =
    try {
      stationsService.syncFromOpenAip(request ?: StationSyncRequest())
    } catch (ex: IllegalStateException) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, ex.message, ex)
    }

  @GetMapping("/airports/{code}")
  fun getAirport(
    @PathVariable code: String,
  ): Station =
    stationsService.findByCode(code)
      ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Station not found: $code")

  @GetMapping("/airports/nearest")
  fun findNearestAirports(
    @RequestParam lat: Double,
    @RequestParam lon: Double,
    @RequestParam(defaultValue = "LIGHT") category: AircraftCategory = AircraftCategory.LIGHT,
    @RequestParam(defaultValue = "false") emergencyOnly: Boolean = false,
    @RequestParam(defaultValue = "5") limit: Int = 5,
  ): List<NearestStation> =
    stationsService.findLandingCapableNearest(
      lat = lat,
      lon = lon,
      requiredCategory = category,
      atTimeUtc = LocalTime.now(ZoneOffset.UTC),
      emergencyOnly = emergencyOnly,
      limit = limit,
    )
}
