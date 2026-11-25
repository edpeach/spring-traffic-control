package io.peaches.stc.aircrafttypes.internal

import io.peaches.stc.aircrafttypes.AircraftType
import jakarta.annotation.PostConstruct
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.ResultSet

@Repository
class DuckDbAircraftTypeRepository(
  private val jdbcClient: JdbcClient,
) {
  @PostConstruct
  fun initSchema() {
    val ddl =
      ClassPathResource("db/aircraft-types-schema.sql")
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
  fun saveAll(aircraftTypes: List<AircraftType>) {
    aircraftTypes.forEach { type ->
      jdbcClient
        .sql(
          """
          INSERT OR REPLACE INTO aircraft_types (
              id, iata_main, iata_sub, short_description, long_description
          ) VALUES (?, ?, ?, ?, ?)
          """.trimIndent(),
        ).params(
          listOf(
            type.id,
            type.iataMain,
            type.iataSub,
            type.shortDescription,
            type.longDescription,
          ),
        ).update()
    }
  }

  fun findAll(query: String? = null): List<AircraftType> {
    val pattern = query?.takeIf { it.isNotBlank() }?.let { "%${it.trim().uppercase()}%" }
    return jdbcClient
      .sql(
        """
        SELECT * FROM aircraft_types
        WHERE (? IS NULL
            OR UPPER(iata_main) LIKE ?
            OR UPPER(iata_sub) LIKE ?
            OR UPPER(short_description) LIKE ?
            OR UPPER(long_description) LIKE ?)
        ORDER BY iata_main, iata_sub
        """.trimIndent(),
      ).params(listOf(pattern, pattern, pattern, pattern, pattern))
      .query { rs, _ -> mapAircraftType(rs) }
      .list()
  }

  fun findByCode(code: String): AircraftType? {
    val normalized = code.trim().uppercase()
    return jdbcClient
      .sql(
        """
        SELECT * FROM aircraft_types
        WHERE UPPER(id) = ? OR UPPER(iata_sub) = ? OR UPPER(iata_main) = ?
        LIMIT 1
        """.trimIndent(),
      ).params(normalized, normalized, normalized)
      .query { rs, _ -> mapAircraftType(rs) }
      .optional()
      .orElse(null)
  }

  private fun mapAircraftType(rs: ResultSet): AircraftType =
    AircraftType(
      id = rs.getString("id"),
      iataMain = rs.getString("iata_main"),
      iataSub = rs.getString("iata_sub"),
      shortDescription = rs.getString("short_description"),
      longDescription = rs.getString("long_description"),
    )
}
