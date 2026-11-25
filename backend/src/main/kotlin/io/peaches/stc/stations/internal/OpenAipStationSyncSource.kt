package io.peaches.stc.stations.internal

import io.peaches.stc.stations.Station
import io.peaches.stc.stations.StationSyncRequest
import io.peaches.support.openaip.OpenAipApi
import org.springframework.stereotype.Component

data class StationSyncBatch(
  val stations: List<Station>,
  val pagesFetched: Int,
  val totalAvailable: Int,
)

@Component
class OpenAipStationSyncSource(
  private val openAipApi: OpenAipApi,
  private val properties: OpenAipProperties,
) {
  fun fetchStations(request: StationSyncRequest): StationSyncBatch {
    check(properties.apiKey.isNotBlank()) {
      "OPENAIP_API_KEY is not configured. Set OPENAIP_API_KEY to sync stations from OpenAIP."
    }

    val pageLimit = request.limit.coerceIn(1, 1000)
    val maxPages = request.maxPages.coerceIn(1, 50)
    val country =
      request.country
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() }
    val search = request.search?.trim()?.takeIf { it.isNotEmpty() }

    val collected = mutableListOf<Station>()
    var currentPage: Int? = 1
    var pagesFetched = 0
    var totalAvailable = 0

    while (currentPage != null && pagesFetched < maxPages) {
      val page =
        openAipApi.listAirports(
          page = currentPage,
          limit = pageLimit,
          country = country,
          search = search,
          type = request.type.takeIf { it.isNotEmpty() },
          trafficType = request.trafficType.takeIf { it.isNotEmpty() },
          ppr = request.ppr,
          private = request.isPrivate,
          skydiveActivity = request.skydiveActivity,
          winchOnly = request.winchOnly,
        )

      collected += page.items.map(OpenAipAirportMapper::toStation)
      pagesFetched += 1
      totalAvailable = page.totalCount
      currentPage = page.nextPage
    }

    return StationSyncBatch(
      stations = collected,
      pagesFetched = pagesFetched,
      totalAvailable = totalAvailable,
    )
  }
}
