package io.peaches.support.opensky

import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import org.springframework.web.client.support.RestClientAdapter
import org.springframework.web.service.invoker.HttpServiceProxyFactory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class OpenSkyApiTest {
  private fun createClient(): Pair<OpenSkyApi, MockRestServiceServer> {
    val builder = RestClient.builder().baseUrl("https://opensky-network.org/api")
    val server = MockRestServiceServer.bindTo(builder).build()
    val api =
      HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(builder.build()))
        .build()
        .createClient(OpenSkyApi::class.java)
    return api to server
  }

  @Test
  fun `deserializes OpenSky states and track responses`() {
    val (api, server) = createClient()

    server
      .expect(requestTo("https://opensky-network.org/api/states/all?lamin=50.0&lomin=3.0&lamax=54.0&lomax=7.0"))
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

    server
      .expect(requestTo("https://opensky-network.org/api/tracks/all?icao24=484f71&time=0"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          {
            "icao24": "484f71",
            "startTime": 1700000000,
            "endTime": 1700003600,
            "callsign": "KLM1051 ",
            "path": [
              [1700000000, 52.3086, 4.7639, 100.0, 275.0, false]
            ]
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    val states = api.getAllStates(lamin = 50.0, lomin = 3.0, lamax = 54.0, lomax = 7.0)
    assertNotNull(states)
    assertEquals(1, states.states.size)
    assertEquals("484f71", states.states.single()[0].asString())

    val track = api.getTrack("484f71")
    assertNotNull(track)
    assertEquals("484f71", track.icao24)
    assertEquals(1, track.path.size)
    server.verify()
  }
}
