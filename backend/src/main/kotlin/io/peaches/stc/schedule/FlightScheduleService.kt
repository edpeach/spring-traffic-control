package io.peaches.stc.schedule

import java.time.LocalDate

interface FlightScheduleService {
  fun saveAll(flights: List<ScheduledFlight>)

  fun syncDay(request: ScheduleSyncRequest = ScheduleSyncRequest()): ScheduleSyncResult

  fun findAll(
    scheduleDate: LocalDate? = null,
    direction: FlightDirection? = null,
    query: String? = null,
  ): List<ScheduledFlight>

  fun findByFlightName(
    flightName: String,
    scheduleDate: LocalDate? = null,
  ): List<ScheduledFlight>

  fun findById(id: String): ScheduledFlight?
}
