package io.peaches.stc.schedule.internal

import io.peaches.stc.SchipholProperties
import io.peaches.stc.schedule.FlightDirection
import io.peaches.stc.schedule.ScheduleSyncRequest
import io.peaches.stc.schedule.ScheduledFlight
import io.peaches.support.schiphol.SchipholApi
import io.peaches.support.schiphol.SchipholFlightDirection
import org.springframework.stereotype.Component
import java.time.LocalDate

data class ScheduleSyncBatch(
  val scheduleDate: LocalDate,
  val flights: List<ScheduledFlight>,
  val pagesFetched: Int,
)

@Component
class SchipholScheduleSyncSource(
  private val schipholApi: SchipholApi,
  private val properties: SchipholProperties,
) {
  fun fetchDaySchedule(request: ScheduleSyncRequest): ScheduleSyncBatch {
    check(properties.hasCredentials()) {
      "Schiphol credentials are not configured. Set SCHIPHOL_BEARER_TOKEN or SCHIPHOL_CLIENT_ID/SCHIPHOL_CLIENT_SECRET."
    }

    val targetDate = request.scheduleDate ?: LocalDate.now()
    val maxPages = request.maxPages.coerceIn(1, 500)
    val schipholDirection =
      when (request.direction) {
        FlightDirection.A -> SchipholFlightDirection.A
        FlightDirection.D -> SchipholFlightDirection.D
        null -> null
      }

    val collected = mutableListOf<ScheduledFlight>()
    var page = 0
    var pagesFetched = 0

    while (pagesFetched < maxPages) {
      val response =
        schipholApi.getFlights(
          scheduleDate = targetDate.toString(),
          flightDirection = schipholDirection,
          includedelays = request.includeDelays,
          page = page,
          sort = "+scheduleTime",
        )
      val items = response?.flights.orEmpty()
      if (items.isEmpty()) break

      collected += items.mapNotNull(SchipholFlightMapper::toScheduledFlight)
      pagesFetched += 1
      page += 1
    }

    return ScheduleSyncBatch(
      scheduleDate = targetDate,
      flights = collected,
      pagesFetched = pagesFetched,
    )
  }
}
