package io.peaches.stc

import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.jdbc.core.simple.JdbcClient
import java.nio.file.Files
import java.time.LocalDate

/**
 * Seeds empty DuckDB tables from Parquet files under `data/seed/duckdb` on startup when demo mode
 * is enabled, allowing a fresh checkout to run standalone via `mise dev` without external API keys.
 */
@Configuration
@ConditionalOnProperty(
  prefix = "spring-traffic-control.demo",
  name = ["enabled"],
  havingValue = "true",
  matchIfMissing = true,
)
class DemoSeedConfig {
  private val log = LoggerFactory.getLogger(javaClass)

  @Bean
  fun demoDuckDbSeeder(
    demoProperties: DemoProperties,
    jdbcClient: JdbcClient,
  ): ApplicationRunner =
    ApplicationRunner {
      val seedRoot = demoProperties.resolveSeedPath()
      if (seedRoot == null) {
        log.debug("No data/seed directory found; skipping DuckDB demo seeding")
        return@ApplicationRunner
      }

      val duckdbDir = seedRoot.resolve("duckdb")
      if (!Files.isDirectory(duckdbDir)) {
        return@ApplicationRunner
      }

      val tables =
        listOf(
          "stations",
          "station_runways",
          "station_frequencies",
          "airlines",
          "aircraft_types",
          "scheduled_flights",
        )

      for (table in tables) {
        val parquet = duckdbDir.resolve("$table.parquet")
        if (!Files.isRegularFile(parquet)) continue

        val existing =
          try {
            jdbcClient.sql("SELECT COUNT(*) FROM $table").query(Long::class.java).single()
          } catch (ex: Exception) {
            log.debug("Skipping demo seed for table {}: {}", table, ex.message)
            continue
          }

        if (existing > 0L) continue

        val escapedPath =
          parquet
            .toAbsolutePath()
            .normalize()
            .toString()
            .replace("'", "''")
        jdbcClient.sql("INSERT INTO $table SELECT * FROM read_parquet('$escapedPath')").update()

        if (table == "scheduled_flights") {
          jdbcClient
            .sql("UPDATE scheduled_flights SET schedule_date = ?")
            .param(LocalDate.now())
            .update()
        }

        val inserted = jdbcClient.sql("SELECT COUNT(*) FROM $table").query(Long::class.java).single()
        log.info("Demo seeder loaded {} rows into '{}' from {}", inserted, table, parquet.fileName)
      }
    }
}
