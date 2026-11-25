package io.peaches.stc.stations

import java.time.LocalTime

interface LoadStationsService {
  fun saveAll(stations: List<Station>)

  fun syncFromOpenAip(request: StationSyncRequest): StationSyncResult

  fun findAll(
    country: String? = null,
    query: String? = null,
  ): List<Station>

  fun findByCode(code: String): Station?

  fun findNearestStations(
    lat: Double,
    lon: Double,
    limit: Int = 5,
  ): List<NearestStation>

  fun findLandingCapableNearest(
    lat: Double,
    lon: Double,
    requiredCategory: AircraftCategory = AircraftCategory.LIGHT,
    atTimeUtc: LocalTime? = null,
    emergencyOnly: Boolean = false,
    limit: Int = 5,
  ): List<NearestStation>
}
