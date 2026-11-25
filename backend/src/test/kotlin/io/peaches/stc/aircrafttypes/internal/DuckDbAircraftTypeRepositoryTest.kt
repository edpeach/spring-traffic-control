package io.peaches.stc.aircrafttypes.internal

import io.peaches.stc.aircrafttypes.AircraftType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class DuckDbAircraftTypeRepositoryTest {
  private lateinit var dataSource: SingleConnectionDataSource
  private lateinit var repository: DuckDbAircraftTypeRepository

  @BeforeTest
  fun setUp() {
    dataSource = SingleConnectionDataSource("jdbc:duckdb:", true)
    repository = DuckDbAircraftTypeRepository(JdbcClient.create(dataSource))
    repository.initSchema()
  }

  @AfterTest
  fun tearDown() {
    dataSource.destroy()
  }

  @Test
  fun `persists and queries aircraft types by IATA main, sub, and search query`() {
    val embraer =
      AircraftType(
        id = "EMJ-295",
        iataMain = "EMJ",
        iataSub = "295",
        shortDescription = "Embraer 195-E2",
        longDescription = "Embraer 195-E2",
      )
    val boeing =
      AircraftType(
        id = "787-789",
        iataMain = "787",
        iataSub = "789",
        shortDescription = "Boeing 787-9",
        longDescription = "Boeing 787-9 Dreamliner",
      )

    repository.saveAll(listOf(embraer, boeing))

    assertEquals(2, repository.findAll().size)
    assertEquals(listOf("787-789"), repository.findAll("dreamliner").map { it.id })

    val bySub = repository.findByCode("295")
    assertNotNull(bySub)
    assertEquals("EMJ", bySub.iataMain)

    val byId = repository.findByCode("787-789")
    assertNotNull(byId)
    assertEquals("Boeing 787-9", byId.shortDescription)
  }
}
