package io.peaches.stc.schedule.internal

import io.peaches.stc.schedule.CheckinAllocation
import io.peaches.stc.schedule.FlightDirection
import io.peaches.stc.schedule.ScheduledFlight
import jakarta.annotation.PostConstruct
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.readValue
import java.sql.Date
import java.sql.ResultSet
import java.sql.Timestamp
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Repository
class DuckDbScheduledFlightRepository(
  private val jdbcClient: JdbcClient,
  private val jsonMapper: JsonMapper,
) {
  @PostConstruct
  fun initSchema() {
    val ddl =
      ClassPathResource("db/schedule-schema.sql")
        .inputStream
        .bufferedReader()
        .use { it.readText() }

    ddl
      .split(";")
      .map { it.trim() }
      .filter { it.isNotEmpty() && !it.lines().all { line -> line.isBlank() || line.trimStart().startsWith("--") } }
      .forEach { statement -> jdbcClient.sql(statement).update() }
  }

  @Transactional
  fun saveAll(flights: List<ScheduledFlight>) {
    flights.forEach { flight ->
      val routeDestCsv = flight.routeDestinations.joinToString(",")
      val statesCsv = flight.flightStates.joinToString(",")
      val codesharesCsv = flight.codeshares.joinToString(",")
      val beltsCsv = flight.baggageBelts.joinToString(",")
      val transferCsv = flight.transferPositions.joinToString(",")
      val checkinRowsCsv = flight.checkinRows.joinToString(",")
      val checkinJson = jsonMapper.writeValueAsString(flight.checkinAllocations)

      jdbcClient
        .sql(
          """
          INSERT OR REPLACE INTO scheduled_flights (
              id, flight_name, flight_number, main_flight, flight_direction,
              prefix_iata, prefix_icao, airline_code, is_operational_flight, service_type,
              origin_code, destination_code, route_destinations, route_eu, route_visa,
              aircraft_registration, aircraft_iata_main, aircraft_iata_sub,
              schedule_date, schedule_time, schedule_date_time,
              estimated_landing_time, actual_landing_time,
              public_estimated_off_block_time, actual_off_block_time,
              expected_time_gate_open, expected_time_boarding, expected_time_gate_closing,
              expected_time_on_belt, expected_security_filter, last_updated_at,
              terminal, pier, gate,
              flight_states, codeshares, baggage_belts, transfer_positions,
              checkin_rows, checkin_start_time, checkin_end_time, checkin_allocations
          ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, CASE WHEN ? = '' THEN []::VARCHAR[] ELSE string_split(?, ',') END, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?,
              ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              CASE WHEN ? = '' THEN []::VARCHAR[] ELSE string_split(?, ',') END,
              CASE WHEN ? = '' THEN []::VARCHAR[] ELSE string_split(?, ',') END,
              CASE WHEN ? = '' THEN []::VARCHAR[] ELSE string_split(?, ',') END,
              CASE WHEN ? = '' THEN []::BIGINT[] ELSE CAST(string_split(?, ',') AS BIGINT[]) END,
              CASE WHEN ? = '' THEN []::VARCHAR[] ELSE string_split(?, ',') END,
              ?, ?, CAST(? AS JSON)
          )
          """.trimIndent(),
        ).params(
          listOf(
            flight.id,
            flight.flightName,
            flight.flightNumber,
            flight.mainFlight,
            flight.flightDirection.name,
            flight.prefixIata,
            flight.prefixIcao,
            flight.airlineCode,
            flight.isOperationalFlight,
            flight.serviceType,
            flight.originCode,
            flight.destinationCode,
            routeDestCsv,
            routeDestCsv,
            flight.routeEu,
            flight.routeVisa,
            flight.aircraftRegistration,
            flight.aircraftIataMain,
            flight.aircraftIataSub,
            flight.scheduleDate?.let(Date::valueOf),
            flight.scheduleTime,
            flight.scheduleDateTime?.toTimestamp(),
            flight.estimatedLandingTime?.toTimestamp(),
            flight.actualLandingTime?.toTimestamp(),
            flight.publicEstimatedOffBlockTime?.toTimestamp(),
            flight.actualOffBlockTime?.toTimestamp(),
            flight.expectedTimeGateOpen?.toTimestamp(),
            flight.expectedTimeBoarding?.toTimestamp(),
            flight.expectedTimeGateClosing?.toTimestamp(),
            flight.expectedTimeOnBelt?.toTimestamp(),
            flight.expectedSecurityFilter,
            flight.lastUpdatedAt?.toTimestamp(),
            flight.terminal,
            flight.pier,
            flight.gate,
            statesCsv,
            statesCsv,
            codesharesCsv,
            codesharesCsv,
            beltsCsv,
            beltsCsv,
            transferCsv,
            transferCsv,
            checkinRowsCsv,
            checkinRowsCsv,
            flight.checkinStartTime?.toTimestamp(),
            flight.checkinEndTime?.toTimestamp(),
            checkinJson,
          ),
        ).update()
    }
  }

  fun findAll(
    scheduleDate: LocalDate? = null,
    direction: FlightDirection? = null,
    query: String? = null,
  ): List<ScheduledFlight> {
    val normalizedQuery = query?.trim()?.uppercase()?.takeIf { it.isNotEmpty() }
    val pattern = normalizedQuery?.let { "%$it%" }
    return jdbcClient
      .sql(
        """
        SELECT * FROM scheduled_flights
        WHERE (? IS NULL OR schedule_date = ?)
          AND (? IS NULL OR flight_direction = ?)
          AND (? IS NULL
            OR UPPER(flight_name) LIKE ?
            OR UPPER(main_flight) LIKE ?
            OR list_contains(codeshares, ?)
            OR UPPER(origin_code) LIKE ?
            OR UPPER(destination_code) LIKE ?
            OR UPPER(aircraft_registration) LIKE ?)
        ORDER BY schedule_date_time ASC, flight_name ASC
        """.trimIndent(),
      ).params(
        listOf(
          scheduleDate?.let(Date::valueOf),
          scheduleDate?.let(Date::valueOf),
          direction?.name,
          direction?.name,
          pattern,
          pattern,
          pattern,
          normalizedQuery,
          pattern,
          pattern,
          pattern,
        ),
      ).query { rs, _ -> mapFlight(rs) }
      .list()
  }

  fun findByFlightName(
    flightName: String,
    scheduleDate: LocalDate? = null,
  ): List<ScheduledFlight> {
    val normalized = flightName.trim().uppercase()
    return jdbcClient
      .sql(
        """
        SELECT * FROM scheduled_flights
        WHERE (UPPER(flight_name) = ? OR UPPER(main_flight) = ? OR list_contains(codeshares, ?))
          AND (? IS NULL OR schedule_date = ?)
        ORDER BY schedule_date_time ASC, flight_name ASC
        """.trimIndent(),
      ).params(
        listOf(
          normalized,
          normalized,
          normalized,
          scheduleDate?.let(Date::valueOf),
          scheduleDate?.let(Date::valueOf),
        ),
      ).query { rs, _ -> mapFlight(rs) }
      .list()
  }

  fun findById(id: String): ScheduledFlight? =
    jdbcClient
      .sql("SELECT * FROM scheduled_flights WHERE id = ? LIMIT 1")
      .param(id.trim())
      .query { rs, _ -> mapFlight(rs) }
      .optional()
      .orElse(null)

  private fun mapFlight(rs: ResultSet): ScheduledFlight {
    val checkinJson = rs.getString("checkin_allocations")
    val allocations: List<CheckinAllocation> =
      if (checkinJson.isNullOrBlank()) {
        emptyList()
      } else {
        jsonMapper.readValue(checkinJson)
      }

    return ScheduledFlight(
      id = rs.getString("id"),
      flightName = rs.getString("flight_name"),
      flightNumber = (rs.getObject("flight_number") as? Number)?.toLong(),
      mainFlight = rs.getString("main_flight"),
      flightDirection = FlightDirection.valueOf(rs.getString("flight_direction")),
      prefixIata = rs.getString("prefix_iata"),
      prefixIcao = rs.getString("prefix_icao"),
      airlineCode = (rs.getObject("airline_code") as? Number)?.toLong(),
      isOperationalFlight = rs.getBoolean("is_operational_flight"),
      serviceType = rs.getString("service_type"),
      originCode = rs.getString("origin_code"),
      destinationCode = rs.getString("destination_code"),
      routeDestinations = rs.getStringList("route_destinations"),
      routeEu = rs.getString("route_eu"),
      routeVisa = rs.getObject("route_visa") as? Boolean,
      aircraftRegistration = rs.getString("aircraft_registration"),
      aircraftIataMain = rs.getString("aircraft_iata_main"),
      aircraftIataSub = rs.getString("aircraft_iata_sub"),
      scheduleDate = rs.getDate("schedule_date")?.toLocalDate(),
      scheduleTime = rs.getString("schedule_time"),
      scheduleDateTime = rs.getOffsetDateTime("schedule_date_time"),
      estimatedLandingTime = rs.getOffsetDateTime("estimated_landing_time"),
      actualLandingTime = rs.getOffsetDateTime("actual_landing_time"),
      publicEstimatedOffBlockTime = rs.getOffsetDateTime("public_estimated_off_block_time"),
      actualOffBlockTime = rs.getOffsetDateTime("actual_off_block_time"),
      expectedTimeGateOpen = rs.getOffsetDateTime("expected_time_gate_open"),
      expectedTimeBoarding = rs.getOffsetDateTime("expected_time_boarding"),
      expectedTimeGateClosing = rs.getOffsetDateTime("expected_time_gate_closing"),
      expectedTimeOnBelt = rs.getOffsetDateTime("expected_time_on_belt"),
      expectedSecurityFilter = rs.getString("expected_security_filter"),
      lastUpdatedAt = rs.getOffsetDateTime("last_updated_at"),
      terminal = (rs.getObject("terminal") as? Number)?.toLong(),
      pier = rs.getString("pier"),
      gate = rs.getString("gate"),
      flightStates = rs.getStringList("flight_states"),
      codeshares = rs.getStringList("codeshares"),
      baggageBelts = rs.getStringList("baggage_belts"),
      transferPositions = rs.getLongList("transfer_positions"),
      checkinRows = rs.getStringList("checkin_rows"),
      checkinStartTime = rs.getOffsetDateTime("checkin_start_time"),
      checkinEndTime = rs.getOffsetDateTime("checkin_end_time"),
      checkinAllocations = allocations,
    )
  }

  private fun OffsetDateTime.toTimestamp(): Timestamp = Timestamp.from(toInstant())

  private fun ResultSet.getOffsetDateTime(column: String): OffsetDateTime? = getTimestamp(column)?.toInstant()?.atOffset(ZoneOffset.UTC)

  private fun ResultSet.getStringList(column: String): List<String> = (getArray(column)?.array as? Array<*>)?.mapNotNull { it?.toString() } ?: emptyList()

  private fun ResultSet.getLongList(column: String): List<Long> =
    (getArray(column)?.array as? Array<*>)?.mapNotNull { (it as? Number)?.toLong() } ?: emptyList()
}
