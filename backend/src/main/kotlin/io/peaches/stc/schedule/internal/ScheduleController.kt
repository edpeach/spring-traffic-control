package io.peaches.stc.schedule.internal

import io.peaches.stc.schedule.FlightDirection
import io.peaches.stc.schedule.FlightScheduleService
import io.peaches.stc.schedule.ScheduleSyncRequest
import io.peaches.stc.schedule.ScheduleSyncResult
import io.peaches.stc.schedule.ScheduledFlight
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDate

@RestController
@RequestMapping("/api/schedule")
class ScheduleController(
  private val scheduleService: FlightScheduleService,
) {
  @GetMapping
  fun listScheduledFlights(
    @RequestParam(required = false) scheduleDate: LocalDate? = null,
    @RequestParam(required = false) direction: FlightDirection? = null,
    @RequestParam(required = false) query: String? = null,
  ): List<ScheduledFlight> = scheduleService.findAll(scheduleDate, direction, query)

  @GetMapping("/{flightName}")
  fun getByFlightName(
    @PathVariable flightName: String,
    @RequestParam(required = false) scheduleDate: LocalDate? = null,
  ): List<ScheduledFlight> {
    val matches = scheduleService.findByFlightName(flightName, scheduleDate)
    if (matches.isEmpty()) {
      throw ResponseStatusException(HttpStatus.NOT_FOUND, "Flight not found: $flightName")
    }
    return matches
  }

  @PostMapping("/sync")
  fun syncDaySchedule(
    @RequestBody(required = false) request: ScheduleSyncRequest? = null,
  ): ScheduleSyncResult =
    try {
      scheduleService.syncDay(request ?: ScheduleSyncRequest())
    } catch (ex: IllegalStateException) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, ex.message, ex)
    }
}
