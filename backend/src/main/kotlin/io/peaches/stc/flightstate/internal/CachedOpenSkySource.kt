package io.peaches.stc.flightstate.internal

import io.peaches.stc.DemoProperties
import io.peaches.stc.flightstate.AirportFlight
import io.peaches.stc.flightstate.FlightTrack
import io.peaches.stc.flightstate.StateVector
import io.peaches.stc.flightstate.TrackWaypoint
import io.peaches.support.opensky.OpenSkyApi
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import org.springframework.web.client.HttpClientErrorException
import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.readValue
import java.nio.file.Files
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.cos
import kotlin.math.sin

@Component
class CachedOpenSkySource(
  private val openSkyApi: OpenSkyApi,
  private val properties: OpenSkyProperties,
  private val demoProperties: DemoProperties,
  private val jsonMapper: JsonMapper,
  private val redisTemplateProvider: ObjectProvider<StringRedisTemplate>,
) {
  private val logger = LoggerFactory.getLogger(javaClass)

  private data class CacheEntry<T>(
    val value: T,
    val expiresAt: Instant,
  )

  private val localStatesCache = ConcurrentHashMap<String, CacheEntry<List<StateVector>>>()
  private val localTrackCache = ConcurrentHashMap<String, CacheEntry<FlightTrack?>>()
  private val localAirportFlightsCache = ConcurrentHashMap<String, CacheEntry<List<AirportFlight>>>()

  fun fetchAllStates(
    lamin: Double? = null,
    lomin: Double? = null,
    lamax: Double? = null,
    lomax: Double? = null,
  ): List<StateVector> {
    val cacheKey = "opensky:states:${lamin ?: "all"}:${lomin ?: "all"}:${lamax ?: "all"}:${lomax ?: "all"}"

    readFromRedis<List<StateVector>>(cacheKey)?.let { return it }

    val now = Instant.now()
    localStatesCache[cacheKey]?.takeIf { it.expiresAt.isAfter(now) }?.let { return it.value }

    val vectors =
      if (!properties.hasCredentials() && demoProperties.enabled) {
        loadDemoStates(lamin, lomin, lamax, lomax)
      } else {
        val response =
          openSkyApi.getAllStates(
            lamin = lamin,
            lomin = lomin,
            lamax = lamax,
            lomax = lomax,
          )
        OpenSkyMapper.toStateVectors(response)
      }

    writeToRedis(cacheKey, vectors)
    localStatesCache[cacheKey] = CacheEntry(vectors, now.plus(properties.cacheTtl))
    return vectors
  }

  fun fetchTrack(icao24: String): FlightTrack? {
    val normalized = icao24.trim().lowercase()
    val cacheKey = "opensky:track:$normalized"

    readFromRedis<FlightTrack>(cacheKey)?.let { return it }

    val now = Instant.now()
    localTrackCache[cacheKey]?.takeIf { it.expiresAt.isAfter(now) }?.let { return it.value }

    val track =
      if (!properties.hasCredentials() && demoProperties.enabled) {
        loadDemoTrack(normalized)
      } else {
        val response =
          try {
            openSkyApi.getTrack(icao24 = normalized, time = 0)
          } catch (_: HttpClientErrorException.NotFound) {
            null
          }
        OpenSkyMapper.toFlightTrack(response)
      }

    if (track != null) {
      writeToRedis(cacheKey, track)
    }
    localTrackCache[cacheKey] = CacheEntry(track, now.plus(properties.cacheTtl))
    return track
  }

  fun fetchArrivals(
    airport: String,
    date: LocalDate = LocalDate.now(ZoneOffset.UTC),
  ): List<AirportFlight> =
    fetchAirportFlights(kind = "arrival", airport = airport, date = date) { code, begin, end ->
      openSkyApi.getArrivals(airport = code, begin = begin, end = end)
    }

  fun fetchDepartures(
    airport: String,
    date: LocalDate = LocalDate.now(ZoneOffset.UTC),
  ): List<AirportFlight> =
    fetchAirportFlights(kind = "departure", airport = airport, date = date) { code, begin, end ->
      openSkyApi.getDepartures(airport = code, begin = begin, end = end)
    }

  private fun fetchAirportFlights(
    kind: String,
    airport: String,
    date: LocalDate,
    loader: (airport: String, begin: Long, end: Long) -> List<io.peaches.support.opensky.OpenSkyFlight>,
  ): List<AirportFlight> {
    val normalizedAirport = airport.trim().uppercase()
    val cacheKey = "opensky:flights:$kind:$normalizedAirport:$date"

    readFromRedis<List<AirportFlight>>(cacheKey)?.let { return it }

    val now = Instant.now()
    localAirportFlightsCache[cacheKey]?.takeIf { it.expiresAt.isAfter(now) }?.let { return it.value }

    val flights =
      if (!properties.hasCredentials() && demoProperties.enabled) {
        loadDemoAirportFlights(kind)
      } else {
        val begin = date.atStartOfDay(ZoneOffset.UTC).toEpochSecond()
        val endOfDay = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toEpochSecond() - 1
        val end =
          if (date == LocalDate.now(ZoneOffset.UTC)) {
            maxOf(now.epochSecond, begin + 60)
          } else {
            endOfDay
          }

        val raw =
          try {
            loader(normalizedAirport, begin, end)
          } catch (_: HttpClientErrorException.NotFound) {
            emptyList()
          }
        OpenSkyMapper.toAirportFlights(raw)
      }

    writeToRedis(cacheKey, flights)
    localAirportFlightsCache[cacheKey] = CacheEntry(flights, now.plus(properties.cacheTtl))
    return flights
  }

  private fun loadDemoStates(
    lamin: Double?,
    lomin: Double?,
    lamax: Double?,
    lomax: Double?,
  ): List<StateVector> {
    val file = demoProperties.resolveSeedPath()?.resolve("opensky/states.json") ?: return emptyList()
    if (!Files.isRegularFile(file)) return emptyList()
    val all = jsonMapper.readValue<List<StateVector>>(Files.readString(file))
    return all.filter { s ->
      val lat = s.latitude
      val lon = s.longitude
      (lamin == null || (lat != null && lat >= lamin)) &&
        (lamax == null || (lat != null && lat <= lamax)) &&
        (lomin == null || (lon != null && lon >= lomin)) &&
        (lomax == null || (lon != null && lon <= lomax))
    }
  }

  private fun loadDemoAirportFlights(kind: String): List<AirportFlight> {
    val fileName = if (kind == "arrival") "arrivals.json" else "departures.json"
    val file = demoProperties.resolveSeedPath()?.resolve("opensky/$fileName") ?: return emptyList()
    if (!Files.isRegularFile(file)) return emptyList()
    return jsonMapper.readValue<List<AirportFlight>>(Files.readString(file))
  }

  private fun loadDemoTrack(icao24: String): FlightTrack? {
    val seedDir = demoProperties.resolveSeedPath()?.resolve("opensky") ?: return null
    val trackFile = seedDir.resolve("track-$icao24.json")
    if (Files.isRegularFile(trackFile)) {
      return jsonMapper.readValue<FlightTrack>(Files.readString(trackFile))
    }
    val state =
      loadDemoStates(null, null, null, null)
        .firstOrNull { it.icao24.equals(icao24, ignoreCase = true) }
        ?: return null
    val lat = state.latitude ?: return null
    val lon = state.longitude ?: return null
    val headingRad = Math.toRadians(state.trueTrack ?: 90.0)
    val nowEpoch = Instant.now().epochSecond
    val waypoints =
      (4 downTo 0).map { step ->
        val distDeg = step * 0.25
        TrackWaypoint(
          time = nowEpoch - step * 180L,
          latitude = lat - cos(headingRad) * distDeg,
          longitude = lon - sin(headingRad) * distDeg,
          baroAltitude = state.baroAltitude,
          trueTrack = state.trueTrack,
          onGround = state.onGround,
        )
      }
    return FlightTrack(
      icao24 = icao24,
      callsign = state.callsign,
      startTime = waypoints.first().time,
      endTime = waypoints.last().time,
      path = waypoints,
    )
  }

  private inline fun <reified T> readFromRedis(key: String): T? {
    val redis = redisTemplateProvider.ifAvailable ?: return null
    return try {
      val cached = redis.opsForValue().get(key) ?: return null
      jsonMapper.readValue<T>(cached)
    } catch (ex: Exception) {
      logger.debug("Redis cache read failed for key {}, falling back to local cache: {}", key, ex.message)
      null
    }
  }

  private fun writeToRedis(
    key: String,
    value: Any,
  ) {
    val redis = redisTemplateProvider.ifAvailable ?: return
    try {
      val json = jsonMapper.writeValueAsString(value)
      redis.opsForValue().set(key, json, properties.cacheTtl)
    } catch (ex: Exception) {
      logger.debug("Redis cache write failed for key {}: {}", key, ex.message)
    }
  }
}
