package io.peaches.stc.stations.internal

import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.NearestStation
import io.peaches.stc.stations.OpeningHours
import io.peaches.stc.stations.Runway
import io.peaches.stc.stations.Station
import io.peaches.stc.stations.StationFrequency
import io.peaches.stc.stations.StationKind
import jakarta.annotation.PostConstruct
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.ResultSet
import java.sql.Time
import java.time.LocalTime

@Repository
class DuckDbStationRepository(
  private val jdbcClient: JdbcClient,
) {
  @PostConstruct
  fun initSchema() {
    val ddl =
      ClassPathResource("db/stations-schema.sql")
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
  fun saveAll(stations: List<Station>) {
    stations.forEach { station ->
      val trafficCsv = station.trafficTypes.joinToString(",")

      jdbcClient
        .sql(
          """
          INSERT OR REPLACE INTO stations (
              id, kind, name, city, country, iata, icao,
              latitude, longitude, elevation_m, airport_type, traffic_types,
              ppr, is_private, skydive_activity, winch_only, timezone, contact_phone, contact_email,
              always_open, open_utc, close_utc,
              max_runway_meters, max_aircraft_category, max_aircraft_category_rank,
              runway_count, primary_frequency, emergency_medical_capable
          ) VALUES (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, CASE WHEN ? = '' THEN []::VARCHAR[] ELSE string_split(?, ',') END,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?
          )
          """.trimIndent(),
        ).params(
          listOf(
            station.id,
            station.kind.name,
            station.name,
            station.city,
            station.country,
            station.iata,
            station.icao,
            station.latitude,
            station.longitude,
            station.elevationMeters,
            station.airportType,
            trafficCsv,
            trafficCsv,
            station.ppr,
            station.isPrivate,
            station.skydiveActivity,
            station.winchOnly,
            station.timezone,
            station.contactPhone,
            station.contactEmail,
            station.openingHours.alwaysOpen,
            station.openingHours.openUtc?.let(Time::valueOf),
            station.openingHours.closeUtc?.let(Time::valueOf),
            station.maxRunwayMeters,
            station.maxAircraftCategory.name,
            station.maxAircraftCategory.rank,
            station.runwayCount,
            station.primaryFrequency,
            station.emergencyMedicalCapable,
          ),
        ).update()

      jdbcClient
        .sql("DELETE FROM station_runways WHERE station_id = ?")
        .param(station.id)
        .update()

      station.runways.forEach { r ->
        jdbcClient
          .sql(
            """
            INSERT INTO station_runways (
                id, station_id, designator, true_heading, main_runway,
                take_off_only, landing_only, length_m, width_m,
                tora_m, toda_m, asda_m, lda_m,
                surface_type, pcn, pilot_ctrl_lighting
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
          ).params(
            listOf(
              r.id,
              station.id,
              r.designator,
              r.trueHeading,
              r.mainRunway,
              r.takeOffOnly,
              r.landingOnly,
              r.lengthMeters,
              r.widthMeters,
              r.toraMeters,
              r.todaMeters,
              r.asdaMeters,
              r.ldaMeters,
              r.surfaceType,
              r.pcn,
              r.pilotControlledLighting,
            ),
          ).update()
      }

      jdbcClient
        .sql("DELETE FROM station_frequencies WHERE station_id = ?")
        .param(station.id)
        .update()

      station.frequencies.forEach { f ->
        jdbcClient
          .sql(
            """
            INSERT INTO station_frequencies (
                id, station_id, value, freq_type, name, is_primary, public_use
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
          ).params(
            listOf(
              f.id,
              station.id,
              f.value,
              f.type,
              f.name,
              f.primary,
              f.publicUse,
            ),
          ).update()
      }
    }
  }

  fun findAll(
    country: String? = null,
    query: String? = null,
  ): List<Station> {
    val pattern = query?.takeIf { it.isNotBlank() }?.let { "%${it.uppercase()}%" }
    return jdbcClient
      .sql(
        """
        SELECT * FROM stations
        WHERE (? IS NULL OR UPPER(country) = UPPER(?))
          AND (? IS NULL OR UPPER(name) LIKE ? OR UPPER(icao) LIKE ? OR UPPER(iata) LIKE ?)
        ORDER BY name
        """.trimIndent(),
      ).params(listOf(country, country, pattern, pattern, pattern, pattern))
      .query { rs, _ -> mapStation(rs) }
      .list()
  }

  fun findByCode(code: String): Station? {
    val normalized = code.trim().uppercase()
    val station =
      jdbcClient
        .sql(
          """
          SELECT * FROM stations
          WHERE UPPER(icao) = ? OR UPPER(iata) = ? OR id = ?
          LIMIT 1
          """.trimIndent(),
        ).params(normalized, normalized, code.trim())
        .query { rs, _ -> mapStation(rs) }
        .optional()
        .orElse(null)
        ?: return null

    val runways =
      jdbcClient
        .sql(
          "SELECT * FROM station_runways WHERE station_id = ? ORDER BY main_runway DESC, length_m DESC, designator",
        ).param(station.id)
        .query { rs, _ -> mapRunway(rs) }
        .list()

    val frequencies =
      jdbcClient
        .sql(
          "SELECT * FROM station_frequencies WHERE station_id = ? ORDER BY is_primary DESC, freq_type, value",
        ).param(station.id)
        .query { rs, _ -> mapFrequency(rs) }
        .list()

    return station.copy(runways = runways, frequencies = frequencies)
  }

  fun findNearestStations(
    lat: Double,
    lon: Double,
    limit: Int = 5,
  ): List<NearestStation> =
    jdbcClient
      .sql(
        """
        SELECT *, haversine_km(?, ?, latitude, longitude) AS distance_km
        FROM stations
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT ?
        """.trimIndent(),
      ).params(lat, lon, limit)
      .query { rs, _ -> NearestStation(mapStation(rs), rs.getDouble("distance_km")) }
      .list()

  fun findLandingCapableNearest(
    lat: Double,
    lon: Double,
    requiredCategory: AircraftCategory = AircraftCategory.LIGHT,
    atTimeUtc: LocalTime? = null,
    emergencyOnly: Boolean = false,
    limit: Int = 5,
  ): List<NearestStation> {
    val checkTime = atTimeUtc?.let(Time::valueOf)
    return jdbcClient
      .sql(
        """
        SELECT *, haversine_km(?, ?, latitude, longitude) AS distance_km
        FROM stations
        WHERE kind = 'AIRPORT'
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND max_aircraft_category_rank >= ?
          AND (? = FALSE OR emergency_medical_capable = TRUE)
          AND (always_open = TRUE OR ? IS NULL OR (? BETWEEN open_utc AND close_utc))
        ORDER BY distance_km ASC
        LIMIT ?
        """.trimIndent(),
      ).params(listOf(lat, lon, requiredCategory.rank, emergencyOnly, checkTime, checkTime, limit))
      .query { rs, _ -> NearestStation(mapStation(rs), rs.getDouble("distance_km")) }
      .list()
  }

  private fun mapStation(rs: ResultSet): Station {
    val trafficArray =
      (rs.getArray("traffic_types")?.array as? Array<*>)
        ?.mapNotNull { it?.toString() }
        ?: emptyList()

    return Station(
      id = rs.getString("id"),
      kind = StationKind.valueOf(rs.getString("kind")),
      name = rs.getString("name"),
      city = rs.getString("city"),
      country = rs.getString("country"),
      iata = rs.getString("iata"),
      icao = rs.getString("icao"),
      latitude = rs.getObject("latitude") as? Double,
      longitude = rs.getObject("longitude") as? Double,
      elevationMeters = rs.getObject("elevation_m") as? Double,
      airportType = rs.getString("airport_type"),
      trafficTypes = trafficArray,
      ppr = rs.getBoolean("ppr"),
      isPrivate = rs.getBoolean("is_private"),
      skydiveActivity = rs.getBoolean("skydive_activity"),
      winchOnly = rs.getBoolean("winch_only"),
      timezone = rs.getString("timezone"),
      contactPhone = rs.getString("contact_phone"),
      contactEmail = rs.getString("contact_email"),
      openingHours =
        OpeningHours(
          alwaysOpen = rs.getBoolean("always_open"),
          openUtc = rs.getTime("open_utc")?.toLocalTime(),
          closeUtc = rs.getTime("close_utc")?.toLocalTime(),
        ),
      maxRunwayMeters = (rs.getObject("max_runway_meters") as? Number)?.toInt(),
      maxAircraftCategory = AircraftCategory.valueOf(rs.getString("max_aircraft_category")),
      runwayCount = rs.getInt("runway_count"),
      primaryFrequency = rs.getString("primary_frequency"),
      emergencyMedicalCapable = rs.getBoolean("emergency_medical_capable"),
    )
  }

  private fun mapRunway(rs: ResultSet): Runway =
    Runway(
      id = rs.getString("id"),
      designator = rs.getString("designator"),
      trueHeading = rs.getInt("true_heading"),
      mainRunway = rs.getBoolean("main_runway"),
      takeOffOnly = rs.getBoolean("take_off_only"),
      landingOnly = rs.getBoolean("landing_only"),
      lengthMeters = rs.getInt("length_m"),
      widthMeters = rs.getInt("width_m"),
      toraMeters = (rs.getObject("tora_m") as? Number)?.toInt(),
      todaMeters = (rs.getObject("toda_m") as? Number)?.toInt(),
      asdaMeters = (rs.getObject("asda_m") as? Number)?.toInt(),
      ldaMeters = (rs.getObject("lda_m") as? Number)?.toInt(),
      surfaceType = rs.getString("surface_type"),
      pcn = rs.getString("pcn"),
      pilotControlledLighting = rs.getBoolean("pilot_ctrl_lighting"),
    )

  private fun mapFrequency(rs: ResultSet): StationFrequency =
    StationFrequency(
      id = rs.getString("id"),
      value = rs.getString("value"),
      type = rs.getString("freq_type"),
      name = rs.getString("name"),
      primary = rs.getBoolean("is_primary"),
      publicUse = rs.getBoolean("public_use"),
    )
}
