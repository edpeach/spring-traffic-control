package io.peaches.support.schiphol

import java.time.OffsetDateTime

/**
 * Flight direction at Amsterdam Airport Schiphol (`A` = arrival / inbound, `D` = departure / outbound).
 */
enum class SchipholFlightDirection {
  A,
  D,
}

/**
 * Wrapper returned by `GET /flights`.
 */
data class SchipholFlightList(
  val flights: List<SchipholFlight> = emptyList(),
)

/**
 * Public flight information returned by the Schiphol Public Flight API v4.
 */
data class SchipholFlight(
  val id: String? = null,
  val flightName: String? = null,
  val flightNumber: Long? = null,
  val flightDirection: SchipholFlightDirection? = null,
  val mainFlight: String? = null,
  val prefixIATA: String? = null,
  val prefixICAO: String? = null,
  val airlineCode: Long? = null,
  val isOperationalFlight: Boolean? = null,
  val serviceType: String? = null,
  val aircraftRegistration: String? = null,
  val aircraftType: SchipholAircraftTypeRef? = null,
  val scheduleDate: String? = null,
  val scheduleTime: String? = null,
  val scheduleDateTime: OffsetDateTime? = null,
  val estimatedLandingTime: OffsetDateTime? = null,
  val actualLandingTime: OffsetDateTime? = null,
  val publicEstimatedOffBlockTime: OffsetDateTime? = null,
  val actualOffBlockTime: OffsetDateTime? = null,
  val expectedTimeGateOpen: OffsetDateTime? = null,
  val expectedTimeBoarding: OffsetDateTime? = null,
  val expectedTimeGateClosing: OffsetDateTime? = null,
  val expectedTimeOnBelt: OffsetDateTime? = null,
  val expectedSecurityFilter: String? = null,
  val lastUpdatedAt: OffsetDateTime? = null,
  val gate: String? = null,
  val pier: String? = null,
  val terminal: Long? = null,
  val route: SchipholRoute? = null,
  val publicFlightState: SchipholPublicFlightState? = null,
  val baggageClaim: SchipholBaggageClaim? = null,
  val checkinAllocations: SchipholCheckinAllocations? = null,
  val codeshares: SchipholCodeshares? = null,
  val transferPositions: SchipholTransferPositions? = null,
  val schemaVersion: String? = null,
)

/**
 * Aircraft type reference embedded on a [SchipholFlight].
 */
data class SchipholAircraftTypeRef(
  val iataMain: String? = null,
  val iataSub: String? = null,
)

/**
 * Route information for an inbound or outbound Schiphol flight.
 */
data class SchipholRoute(
  val destinations: List<String> = emptyList(),
  val eu: String? = null,
  val visa: Boolean? = null,
)

/**
 * Public status codes of a flight (e.g. `BRD`, `DEP`, `ARR`, `CNX`).
 */
data class SchipholPublicFlightState(
  val flightStates: List<String> = emptyList(),
)

/**
 * Baggage reclaim belt assignments for an arriving flight.
 */
data class SchipholBaggageClaim(
  val belts: List<String> = emptyList(),
)

/**
 * Codeshare flight names related to the main flight.
 */
data class SchipholCodeshares(
  val codeshares: List<String> = emptyList(),
)

/**
 * Transfer desk positions allocated to the flight.
 */
data class SchipholTransferPositions(
  val transferPositions: List<Long> = emptyList(),
)

/**
 * Check-in desk allocations for a departing flight.
 */
data class SchipholCheckinAllocations(
  val checkinAllocations: List<SchipholCheckinAllocation> = emptyList(),
  val remarks: SchipholRemarks? = null,
)

/**
 * Time window and rows for a single check-in allocation.
 */
data class SchipholCheckinAllocation(
  val startTime: OffsetDateTime? = null,
  val endTime: OffsetDateTime? = null,
  val rows: SchipholRows? = null,
)

/**
 * Check-in rows container.
 */
data class SchipholRows(
  val rows: List<SchipholRow> = emptyList(),
)

/**
 * Check-in row allocated to a flight.
 */
data class SchipholRow(
  val position: String? = null,
  val desks: SchipholDesks? = null,
)

/**
 * Check-in desks container within a row.
 */
data class SchipholDesks(
  val desks: List<SchipholDesk> = emptyList(),
)

/**
 * Individual check-in desk allocated to a flight.
 */
data class SchipholDesk(
  val position: Long? = null,
  val checkinClass: SchipholCheckinClass? = null,
)

/**
 * Passenger class assigned to a check-in desk (e.g. `E` / `Economy`).
 */
data class SchipholCheckinClass(
  val code: String? = null,
  val description: String? = null,
)

/**
 * Remarks associated with check-in allocations.
 */
data class SchipholRemarks(
  val remarks: List<String> = emptyList(),
)
