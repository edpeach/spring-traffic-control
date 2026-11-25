package io.peaches.stc.airlines.internal

import io.peaches.stc.airlines.Airline
import io.peaches.stc.airlines.AirlineService
import io.peaches.stc.airlines.AirlineSyncRequest
import io.peaches.stc.airlines.AirlineSyncResult
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/airlines")
class AirlineController(
  private val airlineService: AirlineService,
) {
  @GetMapping
  fun listAirlines(
    @RequestParam(required = false) query: String? = null,
  ): List<Airline> = airlineService.findAll(query)

  @GetMapping("/{code}")
  fun getAirline(
    @PathVariable code: String,
  ): Airline =
    airlineService.findByCode(code)
      ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Airline not found: $code")

  @PostMapping("/sync")
  fun syncAirlines(
    @RequestBody(required = false) request: AirlineSyncRequest? = null,
  ): AirlineSyncResult =
    try {
      airlineService.syncFromSchiphol(request ?: AirlineSyncRequest())
    } catch (ex: IllegalStateException) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, ex.message, ex)
    }
}
