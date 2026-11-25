package io.peaches.stc.aircrafttypes

interface AircraftTypeService {
  fun saveAll(aircraftTypes: List<AircraftType>)

  fun syncFromSchiphol(request: AircraftTypeSyncRequest = AircraftTypeSyncRequest()): AircraftTypeSyncResult

  fun findAll(query: String? = null): List<AircraftType>

  fun findByCode(code: String): AircraftType?
}
