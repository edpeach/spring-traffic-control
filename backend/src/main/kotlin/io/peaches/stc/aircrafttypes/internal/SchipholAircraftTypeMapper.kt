package io.peaches.stc.aircrafttypes.internal

import io.peaches.stc.aircrafttypes.AircraftType
import io.peaches.support.schiphol.SchipholAircraftType

/**
 * Anti-corruption mapper translating Schiphol API wire DTOs into internal `aircrafttypes` domain models.
 */
object SchipholAircraftTypeMapper {
  fun toAircraftType(dto: SchipholAircraftType): AircraftType? {
    val iataMain =
      dto.iataMain
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() }
    val iataSub =
      dto.iataSub
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() }
    val id =
      listOfNotNull(iataMain, iataSub).joinToString("-").takeIf { it.isNotEmpty() }
        ?: return null

    return AircraftType(
      id = id,
      iataMain = iataMain,
      iataSub = iataSub,
      shortDescription = dto.shortDescription?.trim()?.takeIf { it.isNotEmpty() },
      longDescription = dto.longDescription?.trim()?.takeIf { it.isNotEmpty() },
    )
  }
}
