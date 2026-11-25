package io.peaches.stc.schedule.internal

import io.peaches.stc.schedule.FlightDirection
import io.peaches.stc.schedule.FlightScheduleService
import io.peaches.stc.schedule.ScheduleSyncRequest
import io.peaches.stc.schedule.ScheduleSyncResult
import io.peaches.stc.schedule.ScheduledFlight
import org.springframework.stereotype.Service
import java.time.LocalDate

@Service
class FlightScheduleServiceImpl(
  private val repository: DuckDbScheduledFlightRepository,
  private val syncSource: SchipholScheduleSyncSource,
) : FlightScheduleService {
  override fun saveAll(flights: List<ScheduledFlight>) = repository.saveAll(flights)

  override fun syncDay(request: ScheduleSyncRequest): ScheduleSyncResult {
    val batch = syncSource.fetchDaySchedule(request)
    if (batch.flights.isNotEmpty()) {
      repository.saveAll(batch.flights)
    }
    return ScheduleSyncResult(
      scheduleDate = batch.scheduleDate,
      syncedCount = batch.flights.size,
      pagesFetched = batch.pagesFetched,
    )
  }

  override fun findAll(
    scheduleDate: LocalDate?,
    direction: FlightDirection?,
    query: String?,
  ): List<ScheduledFlight> = repository.findAll(scheduleDate, direction, query)

  override fun findByFlightName(
    flightName: String,
    scheduleDate: LocalDate?,
  ): List<ScheduledFlight> = repository.findByFlightName(flightName, scheduleDate)

  override fun findById(id: String): ScheduledFlight? = repository.findById(id)
}
