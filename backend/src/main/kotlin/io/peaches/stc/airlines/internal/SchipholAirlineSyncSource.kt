package io.peaches.stc.airlines.internal

import io.peaches.stc.SchipholProperties
import io.peaches.stc.airlines.Airline
import io.peaches.stc.airlines.AirlineSyncRequest
import io.peaches.support.schiphol.SchipholApi
import org.springframework.stereotype.Component

data class AirlineSyncBatch(
  val airlines: List<Airline>,
  val pagesFetched: Int,
)

@Component
class SchipholAirlineSyncSource(
  private val schipholApi: SchipholApi,
  private val properties: SchipholProperties,
) {
  fun fetchAirlines(request: AirlineSyncRequest): AirlineSyncBatch {
    check(properties.hasCredentials()) {
      "Schiphol credentials are not configured. Set SCHIPHOL_BEARER_TOKEN or SCHIPHOL_CLIENT_ID/SCHIPHOL_CLIENT_SECRET."
    }

    val maxPages = request.maxPages.coerceIn(1, 500)
    val collected = mutableListOf<Airline>()
    var page = 0
    var pagesFetched = 0

    while (pagesFetched < maxPages) {
      val response = schipholApi.getAirlines(page = page, sort = request.sort)
      val items = response?.airlines.orEmpty()
      if (items.isEmpty()) break

      collected += items.mapNotNull(SchipholAirlineMapper::toAirline)
      pagesFetched += 1
      page += 1
    }

    return AirlineSyncBatch(
      airlines = collected,
      pagesFetched = pagesFetched,
    )
  }
}
