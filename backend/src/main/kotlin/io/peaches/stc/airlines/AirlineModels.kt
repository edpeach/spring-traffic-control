package io.peaches.stc.airlines

data class Airline(
  val id: String,
  val iata: String? = null,
  val icao: String? = null,
  val nvls: Long? = null,
  val publicName: String,
)

data class AirlineSyncRequest(
  val maxPages: Int = 20,
  val sort: String = "+iata",
)

data class AirlineSyncResult(
  val syncedCount: Int,
  val pagesFetched: Int,
)
