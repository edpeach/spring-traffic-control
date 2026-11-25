package io.peaches.stc.aircrafttypes.internal

import io.peaches.stc.aircrafttypes.AircraftType
import io.peaches.stc.aircrafttypes.AircraftTypeService
import io.peaches.stc.aircrafttypes.AircraftTypeSyncRequest
import io.peaches.stc.aircrafttypes.AircraftTypeSyncResult
import org.springframework.stereotype.Service

@Service
class AircraftTypeServiceImpl(
  private val aircraftTypeRepository: DuckDbAircraftTypeRepository,
  private val aircraftTypeSyncSource: SchipholAircraftTypeSyncSource,
) : AircraftTypeService {
  override fun saveAll(aircraftTypes: List<AircraftType>) = aircraftTypeRepository.saveAll(aircraftTypes)

  override fun syncFromSchiphol(request: AircraftTypeSyncRequest): AircraftTypeSyncResult {
    val batch = aircraftTypeSyncSource.fetchAircraftTypes(request)
    if (batch.aircraftTypes.isNotEmpty()) {
      aircraftTypeRepository.saveAll(batch.aircraftTypes)
    }
    return AircraftTypeSyncResult(
      syncedCount = batch.aircraftTypes.size,
      pagesFetched = batch.pagesFetched,
    )
  }

  override fun findAll(query: String?): List<AircraftType> = aircraftTypeRepository.findAll(query)

  override fun findByCode(code: String): AircraftType? = aircraftTypeRepository.findByCode(code)
}
