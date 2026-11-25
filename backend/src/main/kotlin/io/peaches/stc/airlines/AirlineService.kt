package io.peaches.stc.airlines

interface AirlineService {
  fun saveAll(airlines: List<Airline>)

  fun syncFromSchiphol(request: AirlineSyncRequest = AirlineSyncRequest()): AirlineSyncResult

  fun findAll(query: String? = null): List<Airline>

  fun findByCode(code: String): Airline?
}
