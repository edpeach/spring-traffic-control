package io.peaches.stc.airlines.internal

import io.peaches.stc.airlines.Airline
import io.peaches.stc.airlines.AirlineService
import io.peaches.stc.airlines.AirlineSyncRequest
import io.peaches.stc.airlines.AirlineSyncResult
import org.springframework.stereotype.Service

@Service
class AirlineServiceImpl(
  private val airlineRepository: DuckDbAirlineRepository,
  private val airlineSyncSource: SchipholAirlineSyncSource,
) : AirlineService {
  override fun saveAll(airlines: List<Airline>) = airlineRepository.saveAll(airlines)

  override fun syncFromSchiphol(request: AirlineSyncRequest): AirlineSyncResult {
    val batch = airlineSyncSource.fetchAirlines(request)
    if (batch.airlines.isNotEmpty()) {
      airlineRepository.saveAll(batch.airlines)
    }
    return AirlineSyncResult(
      syncedCount = batch.airlines.size,
      pagesFetched = batch.pagesFetched,
    )
  }

  override fun findAll(query: String?): List<Airline> = airlineRepository.findAll(query)

  override fun findByCode(code: String): Airline? = airlineRepository.findByCode(code)
}
