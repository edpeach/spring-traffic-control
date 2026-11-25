package io.peaches.stc.stations.internal

import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.LoadStationsService
import io.peaches.stc.stations.NearestStation
import io.peaches.stc.stations.Station
import io.peaches.stc.stations.StationSyncRequest
import io.peaches.stc.stations.StationSyncResult
import org.springframework.stereotype.Service
import java.time.LocalTime

@Service
class LoadStationsServiceImpl(
  private val stationRepository: DuckDbStationRepository,
  private val stationSyncSource: OpenAipStationSyncSource,
) : LoadStationsService {
  override fun saveAll(stations: List<Station>) = stationRepository.saveAll(stations)

  override fun syncFromOpenAip(request: StationSyncRequest): StationSyncResult {
    val batch = stationSyncSource.fetchStations(request)
    if (batch.stations.isNotEmpty()) {
      stationRepository.saveAll(batch.stations)
    }
    return StationSyncResult(
      syncedCount = batch.stations.size,
      pagesFetched = batch.pagesFetched,
      totalAvailable = batch.totalAvailable,
    )
  }

  override fun findAll(
    country: String?,
    query: String?,
  ): List<Station> = stationRepository.findAll(country, query)

  override fun findByCode(code: String): Station? = stationRepository.findByCode(code)

  override fun findNearestStations(
    lat: Double,
    lon: Double,
    limit: Int,
  ): List<NearestStation> = stationRepository.findNearestStations(lat, lon, limit)

  override fun findLandingCapableNearest(
    lat: Double,
    lon: Double,
    requiredCategory: AircraftCategory,
    atTimeUtc: LocalTime?,
    emergencyOnly: Boolean,
    limit: Int,
  ): List<NearestStation> = stationRepository.findLandingCapableNearest(lat, lon, requiredCategory, atTimeUtc, emergencyOnly, limit)
}
