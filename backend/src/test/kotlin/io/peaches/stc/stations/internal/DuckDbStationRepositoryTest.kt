package io.peaches.stc.stations.internal

import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.Station
import io.peaches.stc.stations.StationKind
import io.peaches.support.openaip.OpenAipAirport
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import tools.jackson.module.kotlin.jsonMapper
import tools.jackson.module.kotlin.kotlinModule
import tools.jackson.module.kotlin.readValue
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class DuckDbStationRepositoryTest {
  private lateinit var dataSource: SingleConnectionDataSource
  private lateinit var repository: DuckDbStationRepository

  @BeforeTest
  fun setUp() {
    dataSource = SingleConnectionDataSource("jdbc:duckdb:", true)
    repository = DuckDbStationRepository(JdbcClient.create(dataSource))
    repository.initSchema()
  }

  @AfterTest
  fun tearDown() {
    dataSource.destroy()
  }

  @Test
  fun `persists and queries normalized EHAM airport from OpenAIP JSON`() {
    val mapper = jsonMapper { addModule(kotlinModule()) }
    val openAipAirport =
      ClassPathResource("fixtures/openaip/airport-EHAM.json").inputStream.use {
        mapper.readValue<OpenAipAirport>(it)
      }
    val eham = OpenAipAirportMapper.toStation(openAipAirport)

    val grassStrip =
      Station(
        id = "grass-strip-1",
        kind = StationKind.AIRPORT,
        name = "Hilversum Airfield",
        country = "NL",
        icao = "EHHV",
        latitude = 52.1919,
        longitude = 5.1469,
        airportType = "AIRFIELD_CIVIL",
        maxRunwayMeters = 700,
        maxAircraftCategory = AircraftCategory.LIGHT,
        runwayCount = 3,
        emergencyMedicalCapable = false,
      )

    repository.saveAll(listOf(eham, grassStrip))

    // Summary query hits `stations` only
    val nlAirports = repository.findAll(country = "NL", query = "schiphol")
    assertEquals(1, nlAirports.size)
    val summary = nlAirports.single()
    assertEquals("EHAM", summary.icao)
    assertEquals("AMS", summary.iata)
    assertEquals("INTL_APT", summary.airportType)
    assertEquals(listOf("VFR", "IFR"), summary.trafficTypes)
    assertEquals(3800, summary.maxRunwayMeters)
    assertEquals(AircraftCategory.WIDE_BODY, summary.maxAircraftCategory)
    assertEquals(12, summary.runwayCount)
    assertEquals("119.230", summary.primaryFrequency)
    assertTrue(summary.emergencyMedicalCapable)

    // Detail query loads normalized child rows
    val detail = repository.findByCode("AMS")
    assertNotNull(detail)
    assertEquals(12, detail.runways.size)
    assertEquals(11, detail.frequencies.size)
    assertEquals("ASPHALT", detail.runways.first().surfaceType)
    assertEquals(3800, detail.runways.first().lengthMeters)
    assertEquals("119.230", detail.frequencies.first().value)
    assertEquals("TOWER", detail.frequencies.first().type)

    // Diversion query near Hilversum: LIGHT returns Hilversum first, WIDE_BODY filters it out and returns EHAM
    val nearestLight =
      repository.findLandingCapableNearest(
        lat = 52.20,
        lon = 5.14,
        requiredCategory = AircraftCategory.LIGHT,
        limit = 5,
      )
    assertEquals(listOf("EHHV", "EHAM"), nearestLight.map { it.station.icao })

    val nearestWideBody =
      repository.findLandingCapableNearest(
        lat = 52.20,
        lon = 5.14,
        requiredCategory = AircraftCategory.WIDE_BODY,
        emergencyOnly = true,
        limit = 5,
      )
    assertEquals(listOf("EHAM"), nearestWideBody.map { it.station.icao })
    assertTrue(nearestWideBody.single().distanceKm in 25.0..35.0)
  }
}
