package io.peaches.stc.stations.internal

import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.Runway
import io.peaches.stc.stations.Station
import io.peaches.stc.stations.StationFrequency
import io.peaches.stc.stations.StationKind
import io.peaches.support.openaip.OpenAipAirport

/**
 * Anti-corruption mapper translating OpenAIP wire DTOs into internal `stations` domain models.
 */
object OpenAipAirportMapper {
  fun toStation(airport: OpenAipAirport): Station {
    val stationId =
      airport.id ?: airport.icaoCode ?: airport.iataCode ?: airport.name
        ?: error("OpenAIP airport must have an id, code, or name")

    val runways =
      airport.runways.mapIndexed { index, r ->
        Runway(
          id = r.id ?: "$stationId-rwy-$index",
          designator = r.designator,
          trueHeading = r.trueHeading,
          mainRunway = r.mainRunway,
          takeOffOnly = r.takeOffOnly == true,
          landingOnly = r.landingOnly == true,
          lengthMeters = r.dimension.length.value,
          widthMeters = r.dimension.width.value,
          toraMeters = r.declaredDistance.tora?.value,
          todaMeters = r.declaredDistance.toda?.value,
          asdaMeters = r.declaredDistance.asda?.value,
          ldaMeters = r.declaredDistance.lda?.value,
          surfaceType = decodeSurface(r.surface.mainComposite),
          pcn = r.surface.pcn,
          pilotControlledLighting = r.pilotCtrlLighting == true,
        )
      }

    val frequencies =
      airport.frequencies.mapIndexed { index, f ->
        StationFrequency(
          id = f.id ?: "$stationId-freq-$index",
          value = f.value,
          type = decodeFrequencyType(f.type),
          name = f.name,
          primary = f.primary,
          publicUse = f.publicUse,
        )
      }

    val maxRunwayMeters = runways.maxOfOrNull { it.lengthMeters }
    val hasPavedRunway = runways.any { it.surfaceType in PAVED_SURFACES }
    val maxCategory = deriveAircraftCategory(maxRunwayMeters, hasPavedRunway)
    val primaryFrequency = frequencies.firstOrNull { it.primary }?.value ?: frequencies.firstOrNull()?.value
    val coords = airport.geometry?.coordinates

    return Station(
      id = stationId,
      kind = StationKind.AIRPORT,
      name = airport.name ?: stationId,
      country = airport.country,
      iata = airport.iataCode,
      icao = airport.icaoCode,
      longitude = coords?.getOrNull(0),
      latitude = coords?.getOrNull(1),
      elevationMeters = airport.elevation?.value,
      airportType = decodeAirportType(airport.type),
      trafficTypes = airport.trafficType.map(::decodeTrafficType),
      ppr = airport.ppr == true,
      isPrivate = airport.private == true,
      skydiveActivity = airport.skydiveActivity == true,
      winchOnly = airport.winchOnly == true,
      contactPhone = airport.telephoneServices.firstOrNull()?.phoneNumber,
      maxRunwayMeters = maxRunwayMeters,
      maxAircraftCategory = maxCategory,
      runwayCount = runways.size,
      primaryFrequency = primaryFrequency,
      emergencyMedicalCapable = maxCategory.rank >= AircraftCategory.NARROW_BODY.rank && airport.private != true,
      runways = runways,
      frequencies = frequencies,
    )
  }

  private fun deriveAircraftCategory(
    maxRunwayMeters: Int?,
    paved: Boolean,
  ): AircraftCategory =
    when {
      maxRunwayMeters == null || !paved -> AircraftCategory.LIGHT
      maxRunwayMeters >= 2800 -> AircraftCategory.WIDE_BODY
      maxRunwayMeters >= 1800 -> AircraftCategory.NARROW_BODY
      maxRunwayMeters >= 1100 -> AircraftCategory.REGIONAL
      else -> AircraftCategory.LIGHT
    }

  private val PAVED_SURFACES = setOf("ASPHALT", "CONCRETE")

  private fun decodeAirportType(code: Int?): String? =
    when (code) {
      0 -> "OTHER"
      1 -> "GLIDER_SITE"
      2 -> "AIRFIELD_CIVIL"
      3 -> "INTL_APT"
      4 -> "HELI_MIL"
      5 -> "AD_MIL"
      6 -> "LIGHT_AIRCRAFT"
      7 -> "HELI_CIVIL"
      8 -> "AD_CLOSED"
      9 -> "APT_RESP_AIRSPACE"
      10 -> "AIRFIELD_WATER"
      11 -> "LANDING_STRIP"
      12 -> "AGRI_STRIP"
      13 -> "ALTI_PORT"
      else -> code?.toString()
    }

  private fun decodeTrafficType(code: Int): String =
    when (code) {
      0 -> "VFR"
      1 -> "IFR"
      else -> code.toString()
    }

  private fun decodeSurface(code: Int): String =
    when (code) {
      0 -> "ASPHALT"
      1 -> "CONCRETE"
      2 -> "GRASS"
      3 -> "SAND"
      4 -> "WATER"
      5 -> "BITUMINOUS_TAR"
      6 -> "BRICK"
      7 -> "MACADAM"
      8 -> "STONE"
      9 -> "CORAL"
      10 -> "CLAY"
      11 -> "LATERITE"
      12 -> "GRAVEL"
      13 -> "EARTH"
      14 -> "ICE"
      15 -> "SNOW"
      16 -> "RUBBER"
      17 -> "METAL"
      18 -> "LANDING_MAT"
      19 -> "PIERCED_STEEL"
      20 -> "WOOD"
      21 -> "NON_BITUMINOUS"
      else -> "UNKNOWN"
    }

  private fun decodeFrequencyType(code: Int): String =
    when (code) {
      0 -> "APPROACH"
      1 -> "APRON"
      2 -> "ARRIVAL"
      3 -> "CENTER"
      4 -> "CTA"
      5 -> "DELIVERY"
      6 -> "DEPARTURE"
      7 -> "FIS"
      8 -> "GLIDING"
      9 -> "GROUND"
      10 -> "INFO"
      11 -> "MULTICOM"
      12 -> "UNICOM"
      13 -> "RADAR"
      14 -> "TOWER"
      15 -> "ATIS"
      16 -> "RADIO"
      17 -> "OTHER"
      else -> "TYPE_$code"
    }
}
