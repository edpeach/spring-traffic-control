package io.peaches.stc.schedule.internal

import io.peaches.stc.JacksonConfig
import io.peaches.stc.schedule.FlightDirection
import io.peaches.support.schiphol.SchipholFlight
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.readValue
import java.time.LocalDate
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class DuckDbScheduledFlightRepositoryTest {
  private lateinit var dataSource: SingleConnectionDataSource
  private lateinit var mapper: JsonMapper
  private lateinit var repository: DuckDbScheduledFlightRepository

  @BeforeTest
  fun setUp() {
    val builder = JsonMapper.builder()
    JacksonConfig().openAipFriendlyJsonMapperCustomizer().customize(builder)
    mapper = builder.build()

    dataSource = SingleConnectionDataSource("jdbc:duckdb:", true)
    repository = DuckDbScheduledFlightRepository(JdbcClient.create(dataSource), mapper)
    repository.initSchema()
  }

  @AfterTest
  fun tearDown() {
    dataSource.destroy()
  }

  @Test
  fun `persists VS6946 with hybrid arrays and checkin JSON and queries by flightName or codeshare`() {
    val dto =
      ClassPathResource("fixtures/schiphol/flight-VS6946.json").inputStream.use {
        mapper.readValue<SchipholFlight>(it)
      }
    val flight = SchipholFlightMapper.toScheduledFlight(dto)
    assertNotNull(flight)

    repository.saveAll(listOf(flight))

    val dayFlights =
      repository.findAll(
        scheduleDate = LocalDate.of(2026, 11, 21),
        direction = FlightDirection.D,
      )
    assertEquals(1, dayFlights.size)

    val stored = dayFlights.single()
    assertEquals("VS6946", stored.flightName)
    assertEquals("KL1051", stored.mainFlight)
    assertEquals("AMS", stored.originCode)
    assertEquals("BHX", stored.destinationCode)
    assertEquals("EMJ", stored.aircraftIataMain)
    assertEquals("295", stored.aircraftIataSub)
    assertEquals(listOf("GTD"), stored.flightStates)
    assertEquals(listOf("9", "10", "11", "12", "13", "14", "15", "16"), stored.checkinRows)
    assertEquals(1, stored.checkinAllocations.size)
    assertEquals(
      8,
      stored.checkinAllocations
        .single()
        .rows.size,
    )
    assertEquals(
      8,
      stored.checkinAllocations
        .single()
        .rows[3]
        .desks.size,
    )

    // Lookup by flightName, mainFlight, and codeshare
    assertEquals(1, repository.findByFlightName("VS6946").size)
    assertEquals(1, repository.findByFlightName("KL1051").size)
    assertEquals(1, repository.findByFlightName("KQ1435").size)
    assertEquals(1, repository.findAll(query = "KQ1435").size)
  }
}
