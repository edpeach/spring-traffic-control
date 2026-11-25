package io.peaches.stc.airlines.internal

import io.peaches.stc.airlines.Airline
import io.peaches.support.schiphol.SchipholAirline

/**
 * Anti-corruption mapper translating Schiphol API wire DTOs into internal `airlines` domain models.
 */
object SchipholAirlineMapper {
  fun toAirline(dto: SchipholAirline): Airline? {
    val iata =
      dto.iata
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() }
    val icao =
      dto.icao
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() }
    val publicName =
      dto.publicName?.trim()?.takeIf { it.isNotEmpty() }
        ?: icao
        ?: iata
        ?: dto.nvls?.toString()
        ?: return null

    val id = icao ?: iata ?: dto.nvls?.toString() ?: publicName

    return Airline(
      id = id,
      iata = iata,
      icao = icao,
      nvls = dto.nvls,
      publicName = publicName,
    )
  }
}
