package io.peaches.stc.airlines.internal

import io.peaches.stc.airlines.Airline
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class DuckDbAirlineRepositoryTest {
  private lateinit var dataSource: SingleConnectionDataSource
  private lateinit var repository: DuckDbAirlineRepository

  @BeforeTest
  fun setUp() {
    dataSource = SingleConnectionDataSource("jdbc:duckdb:", true)
    repository = DuckDbAirlineRepository(JdbcClient.create(dataSource))
    repository.initSchema()
  }

  @AfterTest
  fun tearDown() {
    dataSource.destroy()
  }

  @Test
  fun `persists and queries airlines by IATA, ICAO, NVLS, and search query`() {
    val klm = Airline(id = "KLM", iata = "KL", icao = "KLM", nvls = 100, publicName = "KLM")
    val delta = Airline(id = "DAL", iata = "DL", icao = "DAL", nvls = 5260, publicName = "Delta Air Lines")

    repository.saveAll(listOf(klm, delta))

    assertEquals(2, repository.findAll().size)
    assertEquals(listOf("KLM"), repository.findAll("kl").map { it.icao })

    val byIata = repository.findByCode("kl")
    assertNotNull(byIata)
    assertEquals("KLM", byIata.icao)

    val byIcao = repository.findByCode("DAL")
    assertNotNull(byIcao)
    assertEquals("Delta Air Lines", byIcao.publicName)

    val byNvls = repository.findByCode("5260")
    assertNotNull(byNvls)
    assertEquals("DL", byNvls.iata)
  }
}
