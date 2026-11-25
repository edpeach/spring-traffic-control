package io.peaches.support.schiphol

import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.service.annotation.GetExchange
import org.springframework.web.service.annotation.HttpExchange

/**
 * Declarative Spring HTTP interface for the **Schiphol Public Flight API v4**
 * (`https://api.schiphol.nl/public/public-flights/v4`).
 *
 * Configure the underlying `RestClient` with:
 * - `Accept: application/json`
 * - `ResourceVersion: v4`
 * - `Authorization: Bearer <token>` (JWT bearer auth per OpenAPI spec)
 */
@HttpExchange
interface SchipholApi {
  // -------------------------------------------------------------------------
  // Flights
  // -------------------------------------------------------------------------

  /**
   * Retrieves inbound (`A`) and/or outbound (`D`) flights for a date or datetime window.
   *
   * Returns `null` when the API responds with `204 No Content`.
   */
  @GetExchange("/flights")
  fun getFlights(
    @RequestParam(required = false) scheduleDate: String? = null,
    @RequestParam(required = false) scheduleTime: String? = null,
    @RequestParam(required = false) flightName: String? = null,
    @RequestParam(required = false) flightDirection: SchipholFlightDirection? = null,
    @RequestParam(required = false) airline: String? = null,
    @RequestParam(required = false) airlineCode: Int? = null,
    @RequestParam(required = false) route: String? = null,
    @RequestParam(required = false) includedelays: Boolean? = null,
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) sort: String? = null,
    @RequestParam(required = false) fromDateTime: String? = null,
    @RequestParam(required = false) toDateTime: String? = null,
    @RequestParam(required = false) searchDateTimeField: String? = null,
    @RequestParam(required = false) fromScheduleDate: String? = null,
    @RequestParam(required = false) toScheduleDate: String? = null,
    @RequestParam(required = false) isOperationalFlight: Boolean? = null,
  ): SchipholFlightList?

  /**
   * Retrieves a single flight by its unique numeric flight ID.
   */
  @GetExchange("/flights/{id}")
  fun getFlightById(
    @PathVariable id: String,
  ): SchipholFlight

  /**
   * Retrieves flight IDs scheduled within a datetime range (`yyyy-MM-dd'T'HH:mm:ss`, max 3 days).
   */
  @GetExchange("/flights/ids")
  fun getFlightIds(
    @RequestParam fromDateTime: String,
    @RequestParam toDateTime: String,
  ): List<String>

  // -------------------------------------------------------------------------
  // Airlines
  // -------------------------------------------------------------------------

  /**
   * Retrieves a paginated list of airlines operating at Schiphol.
   */
  @GetExchange("/airlines")
  fun getAirlines(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) sort: String? = null,
  ): SchipholAirlineList?

  /**
   * Retrieves a single airline by IATA (2-char) or ICAO (3-char) code.
   */
  @GetExchange("/airlines/{airline}")
  fun getAirlineByCode(
    @PathVariable airline: String,
  ): SchipholAirline

  // -------------------------------------------------------------------------
  // Aircraft Types
  // -------------------------------------------------------------------------

  /**
   * Retrieves a paginated list of aircraft types with optional IATA main/sub filters.
   */
  @GetExchange("/aircrafttypes")
  fun getAircraftTypes(
    @RequestParam(required = false) iataMain: String? = null,
    @RequestParam(required = false) iataSub: String? = null,
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) sort: String? = null,
  ): SchipholAircraftTypeList?

  // -------------------------------------------------------------------------
  // Destinations
  // -------------------------------------------------------------------------

  /**
   * Retrieves a paginated list of destinations served by Schiphol.
   */
  @GetExchange("/destinations")
  fun getDestinations(
    @RequestParam(required = false) page: Int? = null,
    @RequestParam(required = false) sort: String? = null,
  ): SchipholDestinationList?

  /**
   * Retrieves a single destination by its 3-letter IATA airport code.
   */
  @GetExchange("/destinations/{iata}")
  fun getDestinationByCode(
    @PathVariable iata: String,
  ): SchipholDestination
}
