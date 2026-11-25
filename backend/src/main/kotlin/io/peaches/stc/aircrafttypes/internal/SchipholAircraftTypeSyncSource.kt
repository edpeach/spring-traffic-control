package io.peaches.stc.aircrafttypes.internal

import io.peaches.stc.SchipholProperties
import io.peaches.stc.aircrafttypes.AircraftType
import io.peaches.stc.aircrafttypes.AircraftTypeSyncRequest
import io.peaches.support.schiphol.SchipholApi
import org.springframework.stereotype.Component

data class AircraftTypeSyncBatch(
  val aircraftTypes: List<AircraftType>,
  val pagesFetched: Int,
)

@Component
class SchipholAircraftTypeSyncSource(
  private val schipholApi: SchipholApi,
  private val properties: SchipholProperties,
) {
  fun fetchAircraftTypes(request: AircraftTypeSyncRequest): AircraftTypeSyncBatch {
    check(properties.hasCredentials()) {
      "Schiphol credentials are not configured. Set SCHIPHOL_BEARER_TOKEN or SCHIPHOL_CLIENT_ID/SCHIPHOL_CLIENT_SECRET."
    }

    val maxPages = request.maxPages.coerceIn(1, 500)
    val iataMain =
      request.iataMain
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() }
    val iataSub =
      request.iataSub
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() }
    val collected = mutableListOf<AircraftType>()
    var page = 0
    var pagesFetched = 0

    while (pagesFetched < maxPages) {
      val response =
        schipholApi.getAircraftTypes(
          iataMain = iataMain,
          iataSub = iataSub,
          page = page,
          sort = request.sort,
        )
      val items = response?.aircraftTypes.orEmpty()
      if (items.isEmpty()) break

      collected += items.mapNotNull(SchipholAircraftTypeMapper::toAircraftType)
      pagesFetched += 1
      page += 1
    }

    return AircraftTypeSyncBatch(
      aircraftTypes = collected,
      pagesFetched = pagesFetched,
    )
  }
}
