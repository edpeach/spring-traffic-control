package io.peaches.stc.flightstate.internal

import io.peaches.stc.DemoProperties
import io.peaches.stc.JacksonConfig
import io.peaches.support.opensky.OpenSkyApi
import org.springframework.beans.factory.ObjectProvider
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import org.springframework.web.client.support.RestClientAdapter
import org.springframework.web.service.invoker.HttpServiceProxyFactory
import tools.jackson.databind.json.JsonMapper
import java.time.Duration
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals

class CachedOpenSkySourceTest {
  private val emptyRedisProvider =
    object : ObjectProvider<StringRedisTemplate> {
      override fun getObject(): StringRedisTemplate = error("No Redis in unit test")

      override fun getObject(vararg args: Any?): StringRedisTemplate = error("No Redis in unit test")

      override fun getIfAvailable(): StringRedisTemplate? = null

      override fun getIfUnique(): StringRedisTemplate? = null
    }

  @Test
  fun `caches OpenSky states response for configured 30m TTL so API is only called once`() {
    val builder = RestClient.builder().baseUrl("https://opensky-network.org/api")
    val server = MockRestServiceServer.bindTo(builder).build()
    val api =
      HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(builder.build()))
        .build()
        .createClient(OpenSkyApi::class.java)

    val mapperBuilder = JsonMapper.builder()
    JacksonConfig().openAipFriendlyJsonMapperCustomizer().customize(mapperBuilder)
    val source =
      CachedOpenSkySource(
        openSkyApi = api,
        properties = OpenSkyProperties(cacheTtl = Duration.ofMinutes(30)),
        demoProperties = DemoProperties(enabled = false),
        jsonMapper = mapperBuilder.build(),
        redisTemplateProvider = emptyRedisProvider,
      )

    server
      .expect(requestTo("https://opensky-network.org/api/states/all"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          {
            "time": 1700000000,
            "states": [
              ["484f71", "KLM1051 ", "Netherlands", 1700000000, 1700000000, 4.7639, 52.3086, 10000.0, false, 230.5, 275.0, 0.0, null, 10200.0, "2145", false, 0]
            ]
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    val first = source.fetchAllStates()
    val second = source.fetchAllStates()

    assertEquals(1, first.size)
    assertEquals(first, second)
    server.verify()
  }

  @Test
  fun `caches EHAM arrivals and departures for the day`() {
    val builder = RestClient.builder().baseUrl("https://opensky-network.org/api")
    val server = MockRestServiceServer.bindTo(builder).build()
    val api =
      HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(builder.build()))
        .build()
        .createClient(OpenSkyApi::class.java)

    val mapperBuilder = JsonMapper.builder()
    JacksonConfig().openAipFriendlyJsonMapperCustomizer().customize(mapperBuilder)
    val source =
      CachedOpenSkySource(
        openSkyApi = api,
        properties = OpenSkyProperties(cacheTtl = Duration.ofMinutes(30)),
        demoProperties = DemoProperties(enabled = false),
        jsonMapper = mapperBuilder.build(),
        redisTemplateProvider = emptyRedisProvider,
      )

    val day = LocalDate.of(2026, 11, 20)
    val begin = 1795132800L
    val end = 1795219199L

    server
      .expect(requestTo("https://opensky-network.org/api/flights/arrival?airport=EHAM&begin=$begin&end=$end"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          [
            {"icao24": "484f71", "callsign": "KLM1051 ", "firstSeen": $begin, "lastSeen": ${begin + 3600}, "estDepartureAirport": "EGLL", "estArrivalAirport": "EHAM"}
          ]
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    server
      .expect(requestTo("https://opensky-network.org/api/flights/departure?airport=EHAM&begin=$begin&end=$end"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          [
            {"icao24": "484f72", "callsign": "KLM1052 ", "firstSeen": $begin, "lastSeen": ${begin + 3600}, "estDepartureAirport": "EHAM", "estArrivalAirport": "LFPG"}
          ]
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    val arr1 = source.fetchArrivals("EHAM", day)
    val arr2 = source.fetchArrivals("EHAM", day)
    val dep1 = source.fetchDepartures("EHAM", day)
    val dep2 = source.fetchDepartures("EHAM", day)

    assertEquals(1, arr1.size)
    assertEquals("KLM1051", arr1.single().callsign)
    assertEquals(arr1, arr2)
    assertEquals(1, dep1.size)
    assertEquals("KLM1052", dep1.single().callsign)
    assertEquals(dep1, dep2)
    server.verify()
  }
}
