package io.peaches.stc.aircrafttypes.internal

import io.peaches.stc.aircrafttypes.AircraftType
import io.peaches.stc.aircrafttypes.AircraftTypeService
import io.peaches.stc.aircrafttypes.AircraftTypeSyncRequest
import io.peaches.stc.aircrafttypes.AircraftTypeSyncResult
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
@RequestMapping("/api/aircraft-types")
class AircraftTypeController(
  private val aircraftTypeService: AircraftTypeService,
) {
  @GetMapping
  fun listAircraftTypes(
    @RequestParam(required = false) query: String? = null,
  ): List<AircraftType> = aircraftTypeService.findAll(query)

  @GetMapping("/{code}")
  fun getAircraftType(
    @PathVariable code: String,
  ): AircraftType =
    aircraftTypeService.findByCode(code)
      ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Aircraft type not found: $code")

  @PostMapping("/sync")
  fun syncAircraftTypes(
    @RequestBody(required = false) request: AircraftTypeSyncRequest? = null,
  ): AircraftTypeSyncResult =
    try {
      aircraftTypeService.syncFromSchiphol(request ?: AircraftTypeSyncRequest())
    } catch (ex: IllegalStateException) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, ex.message, ex)
    }
}
