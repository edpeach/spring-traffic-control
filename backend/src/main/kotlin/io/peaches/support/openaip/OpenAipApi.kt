package io.peaches.support.openaip

import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.service.annotation.GetExchange
import org.springframework.web.service.annotation.HttpExchange
import org.springframework.web.service.annotation.PostExchange

/**
 * Declarative Spring HTTP interface for the **OpenAIP Core API** (`https://api.core.openaip.net/api`).
 *
 * Authentication requires an API key passed via the `x-openaip-api-key` header (recommended)
 * or `apiKey` query parameter when configuring the underlying `RestClient` / `WebClient`.
 */
@HttpExchange
interface OpenAipApi {
  // -------------------------------------------------------------------------
  // System & Schemas
  // -------------------------------------------------------------------------

  /**
   * Checks OpenAIP API health status.
   */
  @GetExchange("/system/health")
  fun checkHealth()

  /**
   * Returns the requested OpenAIP JSON schema definition.
   *
   * @param schemaUri Relative schema URI path.
   */
  @GetExchange("/schemas/{schemaUri}")
  fun getSchema(
    @PathVariable schemaUri: String,
  ): Map<String, Any?>

  /**
   * Downloads a single image attachment by filename.
   *
   * @param filename Image filename from an OpenAIP resource's `images` list.
   */
  @GetExchange("/files/images/{filename}")
  fun getImage(
    @PathVariable filename: String,
  ): ByteArray

  // -------------------------------------------------------------------------
  // Airports
  // -------------------------------------------------------------------------

  /**
   * Lists airports with optional pagination, sorting, and aviation capability filters.
   */
  @GetExchange("/airports")
  fun listAirports(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) type: List<Int>? = null,
    @RequestParam(required = false) trafficType: List<Int>? = null,
    @RequestParam(required = false) ppr: Boolean? = null,
    @RequestParam(required = false) private: Boolean? = null,
    @RequestParam(required = false) skydiveActivity: Boolean? = null,
    @RequestParam(required = false) winchOnly: Boolean? = null,
    @RequestParam(required = false) servicesFuelType: List<Int>? = null,
    @RequestParam(required = false) servicesGliderTowing: List<Int>? = null,
    @RequestParam(required = false) servicesHandlingFacility: List<Int>? = null,
    @RequestParam(required = false) servicesPassengerFacility: List<Int>? = null,
  ): OpenAipPage<OpenAipAirport>

  /**
   * Returns a single airport by its OpenAIP document ID.
   *
   * @param id OpenAIP airport document ID.
   * @param fields Comma-separated list of fields to include or exclude.
   */
  @GetExchange("/airports/{id}")
  fun getAirport(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipAirport

  /**
   * Creates a Request For Change (RFC) proposing a new airport.
   */
  @PostExchange("/airports/rfc")
  fun createAirportRfc(
    @RequestBody request: OpenAipAirportRfcRequest,
  ): OpenAipRfc

  /**
   * Creates a Request For Change (RFC) proposing edits to an existing airport.
   *
   * @param id OpenAIP airport document ID.
   */
  @PostExchange("/airports/{id}/rfc")
  fun updateAirportRfc(
    @PathVariable id: String,
    @RequestBody request: OpenAipAirportRfcRequest,
  ): OpenAipRfc

  // -------------------------------------------------------------------------
  // Airspaces
  // -------------------------------------------------------------------------

  /**
   * Lists airspaces with optional pagination, sorting, class, and activation filters.
   */
  @GetExchange("/airspaces")
  fun listAirspaces(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) type: List<Int>? = null,
    @RequestParam(required = false) icaoClass: List<Int>? = null,
    @RequestParam(required = false) activity: List<Int>? = null,
    @RequestParam(required = false) onDemand: Boolean? = null,
    @RequestParam(required = false) onRequest: Boolean? = null,
    @RequestParam(required = false) byNotam: Boolean? = null,
    @RequestParam(required = false) specialAgreement: Boolean? = null,
    @RequestParam(required = false) requestCompliance: Boolean? = null,
  ): OpenAipPage<OpenAipAirspace>

  /**
   * Returns a single airspace by its OpenAIP document ID.
   */
  @GetExchange("/airspaces/{id}")
  fun getAirspace(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipAirspace

  /**
   * Creates a Request For Change (RFC) proposing a new airspace.
   */
  @PostExchange("/airspaces/rfc")
  fun createAirspaceRfc(
    @RequestBody request: OpenAipAirspaceRfcRequest,
  ): OpenAipRfc

  /**
   * Creates a Request For Change (RFC) proposing edits to an existing airspace.
   */
  @PostExchange("/airspaces/{id}/rfc")
  fun updateAirspaceRfc(
    @PathVariable id: String,
    @RequestBody request: OpenAipAirspaceRfcRequest,
  ): OpenAipRfc

  // -------------------------------------------------------------------------
  // Navaids
  // -------------------------------------------------------------------------

  /**
   * Lists navigation aids (VOR, NDB, DME, TACAN, etc.) with optional filters.
   */
  @GetExchange("/navaids")
  fun listNavaids(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) type: List<Int>? = null,
    @RequestParam(required = false) alignedTrueNorth: Boolean? = null,
  ): OpenAipPage<OpenAipNavaid>

  /**
   * Returns a single navaid by its OpenAIP document ID.
   */
  @GetExchange("/navaids/{id}")
  fun getNavaid(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipNavaid

  /**
   * Creates a Request For Change (RFC) proposing a new navaid.
   */
  @PostExchange("/navaids/rfc")
  fun createNavaidRfc(
    @RequestBody request: OpenAipNavaidRfcRequest,
  ): OpenAipRfc

  /**
   * Creates a Request For Change (RFC) proposing edits to an existing navaid.
   */
  @PostExchange("/navaids/{id}/rfc")
  fun updateNavaidRfc(
    @PathVariable id: String,
    @RequestBody request: OpenAipNavaidRfcRequest,
  ): OpenAipRfc

  // -------------------------------------------------------------------------
  // Obstacles
  // -------------------------------------------------------------------------

  /**
   * Lists aviation obstacles with optional pagination and type filters.
   */
  @GetExchange("/obstacles")
  fun listObstacles(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) type: List<Int>? = null,
  ): OpenAipPage<OpenAipObstacle>

  /**
   * Returns a single obstacle by its OpenAIP document ID.
   */
  @GetExchange("/obstacles/{id}")
  fun getObstacle(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipObstacle

  // -------------------------------------------------------------------------
  // Airport Reporting Points
  // -------------------------------------------------------------------------

  /**
   * Lists airport reporting points with optional airport and search filters.
   */
  @GetExchange("/reporting-points")
  fun listReportingPoints(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) airport: String? = null,
  ): OpenAipPage<OpenAipReportingPoint>

  /**
   * Returns a single airport reporting point by its OpenAIP document ID.
   */
  @GetExchange("/reporting-points/{id}")
  fun getReportingPoint(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipReportingPoint

  /**
   * Creates a Request For Change (RFC) proposing a new reporting point.
   */
  @PostExchange("/reporting-points/rfc")
  fun createReportingPointRfc(
    @RequestBody request: OpenAipReportingPointRfcRequest,
  ): OpenAipRfc

  /**
   * Creates a Request For Change (RFC) proposing edits to an existing reporting point.
   */
  @PostExchange("/reporting-points/{id}/rfc")
  fun updateReportingPointRfc(
    @PathVariable id: String,
    @RequestBody request: OpenAipReportingPointRfcRequest,
  ): OpenAipRfc

  // -------------------------------------------------------------------------
  // Hang Gliding Sites
  // -------------------------------------------------------------------------

  /**
   * Lists hang gliding and paragliding sites with optional filters.
   */
  @GetExchange("/hang-glidings")
  fun listHangGlidingSites(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) type: List<Int>? = null,
    @RequestParam(required = false) category: List<Int>? = null,
    @RequestParam(required = false) access: List<Int>? = null,
    @RequestParam(required = false) certified: Boolean? = null,
    @RequestParam(required = false) suitableWindDirection: List<Int>? = null,
  ): OpenAipPage<OpenAipHangGlidingSite>

  /**
   * Returns a single hang gliding site by its OpenAIP document ID.
   */
  @GetExchange("/hang-glidings/{id}")
  fun getHangGlidingSite(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipHangGlidingSite

  /**
   * Creates a Request For Change (RFC) proposing a new hang gliding site.
   */
  @PostExchange("/hang-glidings/rfc")
  fun createHangGlidingSiteRfc(
    @RequestBody request: OpenAipHangGlidingSiteRfcRequest,
  ): OpenAipRfc

  /**
   * Creates a Request For Change (RFC) proposing edits to an existing hang gliding site.
   */
  @PostExchange("/hang-glidings/{id}/rfc")
  fun updateHangGlidingSiteRfc(
    @PathVariable id: String,
    @RequestBody request: OpenAipHangGlidingSiteRfcRequest,
  ): OpenAipRfc

  // -------------------------------------------------------------------------
  // Hotspots
  // -------------------------------------------------------------------------

  /**
   * Lists thermal/soaring hotspots with optional weather and wind filters.
   */
  @GetExchange("/hotspots")
  fun listHotspots(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) type: List<Int>? = null,
    @RequestParam(required = false) reliability: List<Int>? = null,
    @RequestParam(required = false) occurrence: List<Int>? = null,
    @RequestParam(required = false) category: List<Int>? = null,
    @RequestParam(required = false) timeOfDay: List<Int>? = null,
    @RequestParam(required = false) favTimeOfDay: List<Int>? = null,
    @RequestParam(required = false) favWindDirection: List<Int>? = null,
    @RequestParam(required = false) reqWindDirection: List<Int>? = null,
  ): OpenAipPage<OpenAipHotspot>

  /**
   * Returns a single hotspot by its OpenAIP document ID.
   */
  @GetExchange("/hotspots/{id}")
  fun getHotspot(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipHotspot

  /**
   * Creates a Request For Change (RFC) proposing a new hotspot.
   */
  @PostExchange("/hotspots/rfc")
  fun createHotspotRfc(
    @RequestBody request: OpenAipHotspotRfcRequest,
  ): OpenAipRfc

  /**
   * Creates a Request For Change (RFC) proposing edits to an existing hotspot.
   */
  @PostExchange("/hotspots/{id}/rfc")
  fun updateHotspotRfc(
    @PathVariable id: String,
    @RequestBody request: OpenAipHotspotRfcRequest,
  ): OpenAipRfc

  // -------------------------------------------------------------------------
  // RC Airfields
  // -------------------------------------------------------------------------

  /**
   * Lists RC airfields with optional propulsion and location filters.
   */
  @GetExchange("/rc-airfields")
  fun listRcAirfields(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) combustion: Boolean? = null,
    @RequestParam(required = false) electric: Boolean? = null,
    @RequestParam(required = false) turbine: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
  ): OpenAipPage<OpenAipRcAirfield>

  /**
   * Returns a single RC airfield by its OpenAIP document ID.
   */
  @GetExchange("/rc-airfields/{id}")
  fun getRcAirfield(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipRcAirfield

  /**
   * Lists airspaces generated around RC airfield locations.
   */
  @GetExchange("/rc-airfields/airspaces")
  fun listRcAirfieldAirspaces(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
  ): OpenAipPage<OpenAipAirspace>

  /**
   * Creates a Request For Change (RFC) proposing a new RC airfield.
   */
  @PostExchange("/rc-airfields/rfc")
  fun createRcAirfieldRfc(
    @RequestBody request: OpenAipRcAirfieldRfcRequest,
  ): OpenAipRfc

  /**
   * Creates a Request For Change (RFC) proposing edits to an existing RC airfield.
   */
  @PostExchange("/rc-airfields/{id}/rfc")
  fun updateRcAirfieldRfc(
    @PathVariable id: String,
    @RequestBody request: OpenAipRcAirfieldRfcRequest,
  ): OpenAipRfc

  // -------------------------------------------------------------------------
  // Special Rules Areas
  // -------------------------------------------------------------------------

  /**
   * Lists special rules areas with optional pagination and type filters.
   */
  @GetExchange("/special-rules-areas")
  fun listSpecialRulesAreas(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) country: String? = null,
    @RequestParam(required = false) updatedAfter: String? = null,
    @RequestParam(required = false) searchOptLwc: Boolean? = null,
    @RequestParam(required = false) id: String? = null,
    @RequestParam(required = false) search: String? = null,
    @RequestParam(required = false) type: List<Int>? = null,
  ): OpenAipPage<OpenAipSpecialRulesArea>

  /**
   * Returns a single special rules area by its OpenAIP document ID.
   */
  @GetExchange("/special-rules-areas/{id}")
  fun getSpecialRulesArea(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipSpecialRulesArea

  // -------------------------------------------------------------------------
  // Requests For Change (RFC)
  // -------------------------------------------------------------------------

  /**
   * Lists Requests For Change (RFCs) filtered by source document ID or content type.
   */
  @GetExchange("/rfc")
  fun listRfcs(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) limit: Int? = null,
    @RequestParam(required = false) fields: String? = null,
    @RequestParam(required = false) sortBy: String? = null,
    @RequestParam(required = false) sortDesc: Boolean? = null,
    @RequestParam(required = false) sourceId: String? = null,
    @RequestParam(required = false) contentType: List<String>? = null,
  ): OpenAipPage<OpenAipRfc>

  /**
   * Returns a single Request For Change (RFC) by its OpenAIP document ID.
   */
  @GetExchange("/rfc/{id}")
  fun getRfc(
    @PathVariable id: String,
    @RequestParam(required = false) fields: String? = null,
  ): OpenAipRfc
}
