package io.peaches.stc.stations

import java.time.LocalTime

enum class StationKind {
  AIRPORT,
  RAIL,
}

enum class AircraftCategory(
  val rank: Int,
) {
  LIGHT(1),
  REGIONAL(2),
  NARROW_BODY(3),
  WIDE_BODY(4),
}

data class OpeningHours(
  val alwaysOpen: Boolean = true,
  val openUtc: LocalTime? = null,
  val closeUtc: LocalTime? = null,
)

data class Runway(
  val id: String,
  val designator: String,
  val trueHeading: Int,
  val mainRunway: Boolean = false,
  val takeOffOnly: Boolean = false,
  val landingOnly: Boolean = false,
  val lengthMeters: Int,
  val widthMeters: Int,
  val toraMeters: Int? = null,
  val todaMeters: Int? = null,
  val asdaMeters: Int? = null,
  val ldaMeters: Int? = null,
  val surfaceType: String,
  val pcn: String? = null,
  val pilotControlledLighting: Boolean = false,
)

data class StationFrequency(
  val id: String,
  val value: String,
  val type: String,
  val name: String? = null,
  val primary: Boolean = false,
  val publicUse: Boolean = true,
)

data class Station(
  val id: String,
  val kind: StationKind = StationKind.AIRPORT,
  val name: String,
  val city: String? = null,
  val country: String? = null,
  val iata: String? = null,
  val icao: String? = null,
  val latitude: Double? = null,
  val longitude: Double? = null,
  val elevationMeters: Double? = null,
  val airportType: String? = null,
  val trafficTypes: List<String> = emptyList(),
  val ppr: Boolean = false,
  val isPrivate: Boolean = false,
  val skydiveActivity: Boolean = false,
  val winchOnly: Boolean = false,
  val timezone: String? = null,
  val contactPhone: String? = null,
  val contactEmail: String? = null,
  val openingHours: OpeningHours = OpeningHours(),
  val maxRunwayMeters: Int? = null,
  val maxAircraftCategory: AircraftCategory = AircraftCategory.LIGHT,
  val runwayCount: Int = 0,
  val primaryFrequency: String? = null,
  val emergencyMedicalCapable: Boolean = false,
  val runways: List<Runway> = emptyList(),
  val frequencies: List<StationFrequency> = emptyList(),
)

data class NearestStation(
  val station: Station,
  val distanceKm: Double,
)

data class StationSyncRequest(
  val country: String? = null,
  val search: String? = null,
  val type: List<Int> = emptyList(),
  val trafficType: List<Int> = emptyList(),
  val ppr: Boolean? = null,
  val isPrivate: Boolean? = null,
  val skydiveActivity: Boolean? = null,
  val winchOnly: Boolean? = null,
  val limit: Int = 100,
  val maxPages: Int = 5,
)

data class StationSyncResult(
  val syncedCount: Int,
  val pagesFetched: Int,
  val totalAvailable: Int,
)
