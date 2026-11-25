package io.peaches.stc.aircrafttypes

data class AircraftType(
  val id: String,
  val iataMain: String? = null,
  val iataSub: String? = null,
  val shortDescription: String? = null,
  val longDescription: String? = null,
)

data class AircraftTypeSyncRequest(
  val iataMain: String? = null,
  val iataSub: String? = null,
  val maxPages: Int = 50,
  val sort: String = "+iataMain",
)

data class AircraftTypeSyncResult(
  val syncedCount: Int,
  val pagesFetched: Int,
)
