package io.peaches.stc.schedule.internal

import io.peaches.stc.schedule.CheckinAllocation
import io.peaches.stc.schedule.CheckinDesk
import io.peaches.stc.schedule.CheckinRow
import io.peaches.stc.schedule.FlightDirection
import io.peaches.stc.schedule.ScheduledFlight
import io.peaches.support.schiphol.SchipholFlight
import io.peaches.support.schiphol.SchipholFlightDirection
import java.time.LocalDate

/**
 * Anti-corruption mapper translating Schiphol API flight DTOs into internal `schedule` domain models.
 */
object SchipholFlightMapper {
  private const val HUB_IATA = "AMS"

  fun toScheduledFlight(dto: SchipholFlight): ScheduledFlight? {
    val id = dto.id?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    val flightName =
      dto.flightName
        ?.trim()
        ?.uppercase()
        ?.takeIf { it.isNotEmpty() } ?: return null
    val direction =
      when (dto.flightDirection) {
        SchipholFlightDirection.A -> FlightDirection.A
        SchipholFlightDirection.D -> FlightDirection.D
        null -> return null
      }

    val destinations =
      dto.route
        ?.destinations
        .orEmpty()
        .mapNotNull { it.trim().uppercase().takeIf(String::isNotEmpty) }

    val originCode =
      when (direction) {
        FlightDirection.D -> HUB_IATA
        FlightDirection.A -> destinations.firstOrNull()
      }
    val destinationCode =
      when (direction) {
        FlightDirection.D -> destinations.lastOrNull()
        FlightDirection.A -> HUB_IATA
      }

    val allocations =
      dto.checkinAllocations?.checkinAllocations.orEmpty().map { alloc ->
        CheckinAllocation(
          startTime = alloc.startTime,
          endTime = alloc.endTime,
          rows =
            alloc.rows?.rows.orEmpty().map { row ->
              CheckinRow(
                position = row.position,
                desks =
                  row.desks?.desks.orEmpty().map { desk ->
                    CheckinDesk(
                      position = desk.position,
                      classCode = desk.checkinClass?.code,
                      classDescription = desk.checkinClass?.description,
                    )
                  },
              )
            },
        )
      }

    val checkinRows =
      allocations
        .flatMap { it.rows }
        .mapNotNull { it.position?.trim()?.takeIf(String::isNotEmpty) }
        .distinct()

    return ScheduledFlight(
      id = id,
      flightName = flightName,
      flightNumber = dto.flightNumber,
      mainFlight =
        dto.mainFlight
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      flightDirection = direction,
      prefixIata =
        dto.prefixIATA
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      prefixIcao =
        dto.prefixICAO
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      airlineCode = dto.airlineCode,
      isOperationalFlight = dto.isOperationalFlight != false,
      serviceType = dto.serviceType?.trim()?.takeIf { it.isNotEmpty() },
      originCode = originCode,
      destinationCode = destinationCode,
      routeDestinations = destinations,
      routeEu = dto.route?.eu,
      routeVisa = dto.route?.visa,
      aircraftRegistration =
        dto.aircraftRegistration
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      aircraftIataMain =
        dto.aircraftType
          ?.iataMain
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      aircraftIataSub =
        dto.aircraftType
          ?.iataSub
          ?.trim()
          ?.uppercase()
          ?.takeIf { it.isNotEmpty() },
      scheduleDate = dto.scheduleDate?.let(LocalDate::parse),
      scheduleTime = dto.scheduleTime,
      scheduleDateTime = dto.scheduleDateTime,
      estimatedLandingTime = dto.estimatedLandingTime,
      actualLandingTime = dto.actualLandingTime,
      publicEstimatedOffBlockTime = dto.publicEstimatedOffBlockTime,
      actualOffBlockTime = dto.actualOffBlockTime,
      expectedTimeGateOpen = dto.expectedTimeGateOpen,
      expectedTimeBoarding = dto.expectedTimeBoarding,
      expectedTimeGateClosing = dto.expectedTimeGateClosing,
      expectedTimeOnBelt = dto.expectedTimeOnBelt,
      expectedSecurityFilter = dto.expectedSecurityFilter,
      lastUpdatedAt = dto.lastUpdatedAt,
      terminal = dto.terminal,
      pier = dto.pier,
      gate = dto.gate,
      flightStates = dto.publicFlightState?.flightStates.orEmpty(),
      codeshares =
        dto.codeshares
          ?.codeshares
          .orEmpty()
          .mapNotNull { it.trim().uppercase().takeIf(String::isNotEmpty) },
      baggageBelts = dto.baggageClaim?.belts.orEmpty(),
      transferPositions = dto.transferPositions?.transferPositions.orEmpty(),
      checkinRows = checkinRows,
      checkinStartTime = allocations.mapNotNull { it.startTime }.minOrNull(),
      checkinEndTime = allocations.mapNotNull { it.endTime }.maxOrNull(),
      checkinAllocations = allocations,
    )
  }
}
