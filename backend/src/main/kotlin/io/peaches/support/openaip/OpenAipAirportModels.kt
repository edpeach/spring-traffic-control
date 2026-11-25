package io.peaches.support.openaip

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.OffsetDateTime

/**
 * OpenAIP airport resource returned by `/airports` and `/airports/{id}`.
 */
data class OpenAipAirport(
  @JsonProperty("_id")
  val id: String? = null,
  val name: String? = null,
  val icaoCode: String? = null,
  val iataCode: String? = null,
  val altIdentifier: String? = null,
  val type: Int? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val elevationGeoid: OpenAipElevationGeoid? = null,
  val trafficType: List<Int> = emptyList(),
  val magneticDeclination: Double? = null,
  val ppr: Boolean? = null,
  val private: Boolean? = null,
  val skydiveActivity: Boolean? = null,
  val winchOnly: Boolean? = null,
  val services: OpenAipAirportServices? = null,
  val frequencies: List<OpenAipAirportFrequency> = emptyList(),
  val runways: List<OpenAipRunway> = emptyList(),
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val contact: String? = null,
  val remarks: String? = null,
  val telephoneServices: List<OpenAipTelephoneService> = emptyList(),
  val images: List<OpenAipImage> = emptyList(),
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
)

data class OpenAipAirportServices(
  val fuelTypes: List<Int> = emptyList(),
  val chargingStations: List<Int> = emptyList(),
  val gliderTowing: List<Int> = emptyList(),
  val handlingFacilities: List<Int> = emptyList(),
  val passengerFacilities: List<Int> = emptyList(),
)

data class OpenAipAirportFrequency(
  @JsonProperty("_id")
  val id: String? = null,
  val value: String,
  val unit: Int,
  val type: Int,
  val name: String? = null,
  val primary: Boolean,
  val publicUse: Boolean,
  val remarks: String? = null,
)

data class OpenAipRunway(
  @JsonProperty("_id")
  val id: String? = null,
  val designator: String,
  val trueHeading: Int,
  val alignedTrueNorth: Boolean,
  val operations: Int,
  val mainRunway: Boolean,
  val turnDirection: Int? = null,
  val landingOnly: Boolean? = null,
  val takeOffOnly: Boolean? = null,
  val surface: OpenAipRunwaySurface,
  val dimension: OpenAipRunwayDimension,
  val declaredDistance: OpenAipRunwayDeclaredDistance,
  val thresholdLocation: OpenAipThresholdLocation? = null,
  val exclusiveAircraftType: List<Int> = emptyList(),
  val pilotCtrlLighting: Boolean? = null,
  val lightingSystem: List<Int> = emptyList(),
  val visualApproachAids: List<Int> = emptyList(),
  val instrumentApproachAids: List<OpenAipInstrumentApproachAid> = emptyList(),
  val remarks: String? = null,
)

data class OpenAipRunwaySurface(
  val composition: List<Int> = emptyList(),
  val mainComposite: Int,
  val condition: Int,
  val mtow: Map<String, Any?> = emptyMap(),
  val pcn: String? = null,
  val remarks: String? = null,
)

data class OpenAipRunwayDimension(
  val length: OpenAipDimensionValue,
  val width: OpenAipDimensionValue,
)

data class OpenAipRunwayDeclaredDistance(
  val tora: OpenAipDimensionValue? = null,
  val toda: OpenAipDimensionValue? = null,
  val asda: OpenAipDimensionValue? = null,
  val lda: OpenAipDimensionValue? = null,
)

data class OpenAipDimensionValue(
  val value: Int,
  val unit: Int,
)

data class OpenAipThresholdLocation(
  val geometry: OpenAipPoint,
  val elevation: OpenAipElevation,
)

data class OpenAipInstrumentApproachAid(
  @JsonProperty("_id")
  val id: String? = null,
  val identifier: String? = null,
  val frequency: OpenAipApproachFrequency,
  val channel: String? = null,
  val alignedTrueNorth: Boolean = false,
  val type: Int,
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val remarks: String? = null,
)

data class OpenAipApproachFrequency(
  val value: String,
  val unit: Int,
)

data class OpenAipTelephoneService(
  val name: String,
  val phoneNumber: String,
  val remarks: String? = null,
)

/**
 * Request payload for creating or editing an airport via RFC (`POST /airports/rfc` or `POST /airports/{id}/rfc`).
 */
data class OpenAipAirportRfcRequest(
  val name: String? = null,
  val icaoCode: String? = null,
  val iataCode: String? = null,
  val altIdentifier: String? = null,
  val type: Int? = null,
  val country: String? = null,
  val trafficType: List<Int> = emptyList(),
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val ppr: Boolean? = null,
  val private: Boolean? = null,
  val skydiveActivity: Boolean? = null,
  val winchOnly: Boolean? = null,
  val services: OpenAipAirportServices? = null,
  val frequencies: List<OpenAipAirportFrequency> = emptyList(),
  val runways: List<OpenAipRunway> = emptyList(),
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val images: List<OpenAipImage> = emptyList(),
  val contact: String? = null,
  val remarks: String? = null,
  val telephoneServices: List<OpenAipTelephoneService> = emptyList(),
  val rfcComment: String? = null,
)
