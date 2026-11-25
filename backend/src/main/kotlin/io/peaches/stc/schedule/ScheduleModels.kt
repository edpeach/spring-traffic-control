package io.peaches.stc.schedule

import java.time.LocalDate
import java.time.OffsetDateTime

enum class FlightDirection {
  A,
  D,
}

data class CheckinDesk(
  val position: Long? = null,
  val classCode: String? = null,
  val classDescription: String? = null,
)

data class CheckinRow(
  val position: String? = null,
  val desks: List<CheckinDesk> = emptyList(),
)

data class CheckinAllocation(
  val startTime: OffsetDateTime? = null,
  val endTime: OffsetDateTime? = null,
  val rows: List<CheckinRow> = emptyList(),
)

data class ScheduledFlight(
  val id: String,
  val flightName: String,
  val flightNumber: Long? = null,
  val mainFlight: String? = null,
  val flightDirection: FlightDirection,
  val prefixIata: String? = null,
  val prefixIcao: String? = null,
  val airlineCode: Long? = null,
  val isOperationalFlight: Boolean = true,
  val serviceType: String? = null,
  val originCode: String? = null,
  val destinationCode: String? = null,
  val routeDestinations: List<String> = emptyList(),
  val routeEu: String? = null,
  val routeVisa: Boolean? = null,
  val aircraftRegistration: String? = null,
  val aircraftIataMain: String? = null,
  val aircraftIataSub: String? = null,
  val scheduleDate: LocalDate? = null,
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
  val terminal: Long? = null,
  val pier: String? = null,
  val gate: String? = null,
  val flightStates: List<String> = emptyList(),
  val codeshares: List<String> = emptyList(),
  val baggageBelts: List<String> = emptyList(),
  val transferPositions: List<Long> = emptyList(),
  val checkinRows: List<String> = emptyList(),
  val checkinStartTime: OffsetDateTime? = null,
  val checkinEndTime: OffsetDateTime? = null,
  val checkinAllocations: List<CheckinAllocation> = emptyList(),
)

data class ScheduleSyncRequest(
  val scheduleDate: LocalDate? = null,
  val direction: FlightDirection? = null,
  val includeDelays: Boolean = false,
  val maxPages: Int = 500,
)

data class ScheduleSyncResult(
  val scheduleDate: LocalDate,
  val syncedCount: Int,
  val pagesFetched: Int,
)
