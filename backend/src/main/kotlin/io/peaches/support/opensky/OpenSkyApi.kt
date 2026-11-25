package io.peaches.support.opensky

import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.service.annotation.GetExchange
import org.springframework.web.service.annotation.HttpExchange

/**
 * Declarative Spring HTTP interface for the **OpenSky Network REST API**
 * (`https://opensky-network.org/api`).
 *
 * Authenticated via Spring Security OAuth2 `client_credentials` when `OPENSKY_CLIENT_ID`
 * and `OPENSKY_CLIENT_SECRET` are configured.
 */
@HttpExchange
interface OpenSkyApi {
  /**
   * Retrieves live aircraft state vectors, optionally bounded by a lat/lon box or `icao24`.
   */
  @GetExchange("/states/all")
  fun getAllStates(
    @RequestParam(required = false) lamin: Double? = null,
    @RequestParam(required = false) lomin: Double? = null,
    @RequestParam(required = false) lamax: Double? = null,
    @RequestParam(required = false) lomax: Double? = null,
    @RequestParam(required = false) icao24: String? = null,
  ): OpenSkyStatesResponse?

  /**
   * Retrieves the flight trajectory waypoints for a specific aircraft transponder (`icao24`).
   */
  @GetExchange("/tracks/all")
  fun getTrack(
    @RequestParam icao24: String,
    @RequestParam(defaultValue = "0") time: Long = 0,
  ): OpenSkyTrackResponse?

  /**
   * Retrieves flights arriving at a given airport ICAO code within `[begin, end]` (Unix seconds).
   */
  @GetExchange("/flights/arrival")
  fun getArrivals(
    @RequestParam airport: String,
    @RequestParam begin: Long,
    @RequestParam end: Long,
  ): List<OpenSkyFlight>

  /**
   * Retrieves flights departing from a given airport ICAO code within `[begin, end]` (Unix seconds).
   */
  @GetExchange("/flights/departure")
  fun getDepartures(
    @RequestParam airport: String,
    @RequestParam begin: Long,
    @RequestParam end: Long,
  ): List<OpenSkyFlight>
}
