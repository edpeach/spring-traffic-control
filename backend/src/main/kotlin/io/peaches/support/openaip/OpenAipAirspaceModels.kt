package io.peaches.support.openaip

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.OffsetDateTime

/**
 * OpenAIP airspace resource returned by `/airspaces`, `/airspaces/{id}`, and `/rc-airfields/airspaces`.
 */
data class OpenAipAirspace(
  @JsonProperty("_id")
  val id: String? = null,
  val name: String? = null,
  val dataIngestion: Boolean? = null,
  val type: Int? = null,
  val icaoClass: Int? = null,
  val activity: Int? = null,
  val onDemand: Boolean? = null,
  val onRequest: Boolean? = null,
  val byNotam: Boolean? = null,
  val specialAgreement: Boolean? = null,
  val requestCompliance: Boolean? = null,
  val geometry: OpenAipPolygon? = null,
  val country: String? = null,
  val upperLimit: OpenAipVerticalLimit? = null,
  val lowerLimit: OpenAipVerticalLimit? = null,
  val upperLimitMax: OpenAipVerticalLimit? = null,
  val lowerLimitMin: OpenAipVerticalLimit? = null,
  val frequencies: List<OpenAipAirspaceFrequency> = emptyList(),
  val transponderSettings: List<OpenAipTransponderSetting> = emptyList(),
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val activeFrom: OffsetDateTime? = null,
  val activeUntil: OffsetDateTime? = null,
  val remarks: String? = null,
  val createdBy: String? = null,
  val updatedBy: String? = null,
  val createdAt: OffsetDateTime? = null,
  val updatedAt: OffsetDateTime? = null,
)

data class OpenAipAirspaceFrequency(
  @JsonProperty("_id")
  val id: String? = null,
  val value: String,
  val unit: Int,
  val name: String? = null,
  val primary: Boolean? = null,
  val remarks: String? = null,
)

data class OpenAipTransponderSetting(
  val code: String,
  val primary: Boolean,
  val remarks: String? = null,
)

/**
 * Request payload for creating or editing an airspace via RFC (`POST /airspaces/rfc` or `POST /airspaces/{id}/rfc`).
 */
data class OpenAipAirspaceRfcRequest(
  val name: String? = null,
  val type: Int? = null,
  val icaoClass: Int? = null,
  val activity: Int? = null,
  val geometry: OpenAipPolygon? = null,
  val upperLimit: OpenAipVerticalLimit? = null,
  val lowerLimit: OpenAipVerticalLimit? = null,
  val upperLimitMax: OpenAipVerticalLimit? = null,
  val lowerLimitMin: OpenAipVerticalLimit? = null,
  val onDemand: Boolean? = null,
  val onRequest: Boolean? = null,
  val byNotam: Boolean? = null,
  val specialAgreement: Boolean? = null,
  val requestCompliance: Boolean? = null,
  val country: String? = null,
  val frequencies: List<OpenAipAirspaceFrequency> = emptyList(),
  val transponderSettings: List<OpenAipTransponderSetting> = emptyList(),
  val hoursOfOperation: OpenAipHoursOfOperation? = null,
  val activeFrom: OffsetDateTime? = null,
  val activeUntil: OffsetDateTime? = null,
  val remarks: String? = null,
  val rfcComment: String? = null,
)
