package io.peaches.stc.airlines.internal

import io.peaches.stc.airlines.Airline
import jakarta.annotation.PostConstruct
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.ResultSet

@Repository
class DuckDbAirlineRepository(
  private val jdbcClient: JdbcClient,
) {
  @PostConstruct
  fun initSchema() {
    val ddl =
      ClassPathResource("db/airlines-schema.sql")
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
  fun saveAll(airlines: List<Airline>) {
    airlines.forEach { airline ->
      jdbcClient
        .sql(
          """
          INSERT OR REPLACE INTO airlines (
              id, iata, icao, nvls, public_name
          ) VALUES (?, ?, ?, ?, ?)
          """.trimIndent(),
        ).params(
          listOf(
            airline.id,
            airline.iata,
            airline.icao,
            airline.nvls,
            airline.publicName,
          ),
        ).update()
    }
  }

  fun findAll(query: String? = null): List<Airline> {
    val pattern = query?.takeIf { it.isNotBlank() }?.let { "%${it.trim().uppercase()}%" }
    return jdbcClient
      .sql(
        """
        SELECT * FROM airlines
        WHERE (? IS NULL
            OR UPPER(public_name) LIKE ?
            OR UPPER(iata) LIKE ?
            OR UPPER(icao) LIKE ?
            OR CAST(nvls AS VARCHAR) LIKE ?)
        ORDER BY public_name
        """.trimIndent(),
      ).params(listOf(pattern, pattern, pattern, pattern, pattern))
      .query { rs, _ -> mapAirline(rs) }
      .list()
  }

  fun findByCode(code: String): Airline? {
    val normalized = code.trim().uppercase()
    return jdbcClient
      .sql(
        """
        SELECT * FROM airlines
        WHERE UPPER(icao) = ? OR UPPER(iata) = ? OR CAST(nvls AS VARCHAR) = ? OR id = ?
        LIMIT 1
        """.trimIndent(),
      ).params(normalized, normalized, normalized, code.trim())
      .query { rs, _ -> mapAirline(rs) }
      .optional()
      .orElse(null)
  }

  private fun mapAirline(rs: ResultSet): Airline =
    Airline(
      id = rs.getString("id"),
      iata = rs.getString("iata"),
      icao = rs.getString("icao"),
      nvls = (rs.getObject("nvls") as? Number)?.toLong(),
      publicName = rs.getString("public_name"),
    )
}
