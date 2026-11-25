package io.peaches.support.openaip

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * Paginated response envelope returned by OpenAIP list endpoints.
 */
data class OpenAipPage<T>(
  val page: Int,
  val limit: Int,
  val totalCount: Int,
  val totalPages: Int,
  val nextPage: Int? = null,
  val items: List<T> = emptyList(),
)

/**
 * GeoJSON Point geometry (`[longitude, latitude]`).
 */
data class OpenAipPoint(
  val type: String = "Point",
  val coordinates: List<Double>,
)

/**
 * GeoJSON Polygon geometry.
 */
data class OpenAipPolygon(
  val type: String = "Polygon",
  val coordinates: List<List<List<Double>>>,
)

/**
 * Elevation measurement (`unit = 0` meters, `referenceDatum = 1` MSL).
 */
data class OpenAipElevation(
  val value: Double,
  val unit: Int,
  val referenceDatum: Int? = null,
)

/**
 * Geoid elevation details (`hae` = height above ellipsoid).
 */
data class OpenAipElevationGeoid(
  val hae: Double,
  val geoidHeight: Double,
)

/**
 * Airspace or RC airfield vertical limit (`unit`: 0=m, 1=ft, 6=FL; `referenceDatum`: 0=GND, 1=MSL, 2=STD).
 */
data class OpenAipVerticalLimit(
  val value: Int,
  val unit: Int,
  val referenceDatum: Int,
)

/**
 * Operating hours schedule and optional remarks.
 */
data class OpenAipHoursOfOperation(
  val operatingHours: List<Map<String, Any?>> = emptyList(),
  val remarks: String? = null,
)

/**
 * Image attachment metadata associated with an OpenAIP resource.
 */
data class OpenAipImage(
  @JsonProperty("_id")
  val id: String? = null,
  val filename: String,
  val description: String? = null,
)
