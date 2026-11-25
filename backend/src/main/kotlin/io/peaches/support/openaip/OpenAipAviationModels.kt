package io.peaches.support.openaip

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.OffsetDateTime

/**
 * OpenAIP navigation aid (Navaid) resource.
 */
data class OpenAipNavaid(
  @JsonProperty("_id")
  val id: String? = null,
  val name: String? = null,
  val type: Int? = null,
  val identifier: String? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val elevationGeoid: OpenAipElevationGeoid? = null,
  val magneticDeclination: Double? = null,
  val alignedTrueNorth: Boolean? = null,
  val channel: String? = null,
  val frequency: OpenAipNavaidFrequency? = null,
  val range: OpenAipNavaidRange? = null,
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val images: List<OpenAipImage> = emptyList(),
  val remarks: String? = null,
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
)

data class OpenAipNavaidFrequency(
  val value: String,
  val unit: Int,
)

data class OpenAipNavaidRange(
  val value: Int,
  val unit: Int,
)

data class OpenAipNavaidRfcRequest(
  val name: String? = null,
  val type: Int? = null,
  val identifier: String? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val alignedTrueNorth: Boolean? = null,
  val channel: String? = null,
  val frequency: OpenAipNavaidFrequency? = null,
  val range: OpenAipNavaidRange? = null,
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val images: List<OpenAipImage> = emptyList(),
  val remarks: String? = null,
  val rfcComment: String? = null,
)

/**
 * OpenAIP obstacle resource.
 */
data class OpenAipObstacle(
  @JsonProperty("_id")
  val id: String? = null,
  val osmId: String? = null,
  val osmTags: Map<String, Any?> = emptyMap(),
  val name: String? = null,
  val type: Int? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val elevationGeoid: OpenAipElevationGeoid? = null,
  val height: OpenAipElevation? = null,
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
  val osmImportJobId: String? = null,
  val osmUpdatedAt: OffsetDateTime? = null,
)

/**
 * OpenAIP airport reporting point resource.
 */
data class OpenAipReportingPoint(
  @JsonProperty("_id")
  val id: String? = null,
  val name: String? = null,
  val compulsory: Boolean? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val elevationGeoid: OpenAipElevationGeoid? = null,
  val airports: List<String> = emptyList(),
  val remarks: String? = null,
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
)

data class OpenAipReportingPointRfcRequest(
  val name: String? = null,
  val compulsory: Boolean? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val airports: List<String> = emptyList(),
  val remarks: String? = null,
  val rfcComment: String? = null,
)

/**
 * OpenAIP hang gliding / paragliding site resource.
 */
data class OpenAipHangGlidingSite(
  @JsonProperty("_id")
  val id: String? = null,
  val name: String? = null,
  val type: Int? = null,
  val category: List<Int> = emptyList(),
  val access: List<Int> = emptyList(),
  val certified: Boolean? = null,
  val suitableWindDirection: List<Int> = emptyList(),
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val elevationGeoid: OpenAipElevationGeoid? = null,
  val images: List<OpenAipImage> = emptyList(),
  val remarks: String? = null,
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
)

data class OpenAipHangGlidingSiteRfcRequest(
  val name: String? = null,
  val type: Int? = null,
  val category: List<Int> = emptyList(),
  val access: List<Int> = emptyList(),
  val certified: Boolean? = null,
  val suitableWindDirection: List<Int> = emptyList(),
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val images: List<OpenAipImage> = emptyList(),
  val remarks: String? = null,
  val rfcComment: String? = null,
)

/**
 * OpenAIP thermal/soaring hotspot resource.
 */
data class OpenAipHotspot(
  @JsonProperty("_id")
  val id: String? = null,
  val name: String? = null,
  val type: Int? = null,
  val reliability: Int? = null,
  val occurrence: Int? = null,
  val category: List<Int> = emptyList(),
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val elevationGeoid: OpenAipElevationGeoid? = null,
  val timeOfDay: List<Int> = emptyList(),
  val favTimeOfDay: List<Int> = emptyList(),
  val favWindDirection: List<Int> = emptyList(),
  val reqWindDirection: List<Int> = emptyList(),
  val remarks: String? = null,
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
)

data class OpenAipHotspotRfcRequest(
  val name: String? = null,
  val type: Int? = null,
  val reliability: Int? = null,
  val occurrence: Int? = null,
  val category: List<Int> = emptyList(),
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val timeOfDay: List<Int> = emptyList(),
  val favTimeOfDay: List<Int> = emptyList(),
  val favWindDirection: List<Int> = emptyList(),
  val reqWindDirection: List<Int> = emptyList(),
  val remarks: String? = null,
  val rfcComment: String? = null,
)

/**
 * OpenAIP RC airfield resource.
 */
data class OpenAipRcAirfield(
  @JsonProperty("_id")
  val id: String? = null,
  val osmId: String? = null,
  val osmTags: Map<String, Any?> = emptyMap(),
  val name: String? = null,
  val operator: String? = null,
  val electric: Boolean? = null,
  val combustion: Boolean? = null,
  val turbine: Boolean? = null,
  val permittedAltitude: OpenAipVerticalLimit? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val elevationGeoid: OpenAipElevationGeoid? = null,
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val remarks: String? = null,
  val osmUpdatedAt: OffsetDateTime? = null,
  val osmImportJobId: String? = null,
  val images: List<OpenAipImage> = emptyList(),
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
)

data class OpenAipRcAirfieldRfcRequest(
  val osmId: String? = null,
  val osmTags: Map<String, Any?> = emptyMap(),
  val name: String? = null,
  val operator: String? = null,
  val electric: Boolean? = null,
  val combustion: Boolean? = null,
  val turbine: Boolean? = null,
  val permittedAltitude: OpenAipVerticalLimit? = null,
  val country: String? = null,
  val geometry: OpenAipPoint? = null,
  val elevation: OpenAipElevation? = null,
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val images: List<OpenAipImage> = emptyList(),
  val remarks: String? = null,
  val rfcComment: String? = null,
)

/**
 * OpenAIP Request For Change (RFC) resource.
 */
data class OpenAipRfc(
  @JsonProperty("_id")
  val id: String,
  val sourceId: String,
  val contentType: String,
  val context: Int,
  val after: String,
  val before: String? = null,
  val applied: String,
  val proposedChanges: List<OpenAipProposedChange> = emptyList(),
  val reviewComment: String? = null,
  val reviewedBy: String? = null,
  val reviewedAt: OffsetDateTime? = null,
  val createdBy: String,
  val createdAt: OffsetDateTime,
)

data class OpenAipProposedChange(
  val change: String,
  val comment: String,
  val createdAt: OffsetDateTime,
  val createdBy: String,
)

/**
 * OpenAIP special rules area resource (external schema reference returned 404, so fields are preserved dynamically).
 */
typealias OpenAipSpecialRulesArea = Map<String, Any?>
