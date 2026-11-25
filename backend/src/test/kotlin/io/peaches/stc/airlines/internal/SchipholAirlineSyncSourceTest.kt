package io.peaches.stc.airlines.internal

import io.peaches.stc.SchipholProperties
import io.peaches.stc.airlines.AirlineSyncRequest
import io.peaches.support.schiphol.SchipholApi
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import org.springframework.web.client.support.RestClientAdapter
import org.springframework.web.service.invoker.HttpServiceProxyFactory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SchipholAirlineSyncSourceTest {
  private fun createSyncSource(
    clientId: String = "test-client",
    clientSecret: String = "test-secret",
  ): Pair<SchipholAirlineSyncSource, MockRestServiceServer> {
    val builder =
      RestClient
        .builder()
        .baseUrl("https://api.schiphol.nl/public/public-flights/v4")
    val server = MockRestServiceServer.bindTo(builder).build()
    val api =
      HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(builder.build()))
        .build()
        .createClient(SchipholApi::class.java)
    return SchipholAirlineSyncSource(
      api,
      SchipholProperties(clientId = clientId, clientSecret = clientSecret),
    ) to server
  }

  @Test
  fun `fetches paginated airlines from Schiphol until 204 No Content`() {
    val (source, server) = createSyncSource()

    server
      .expect(requestTo("https://api.schiphol.nl/public/public-flights/v4/airlines?page=0&sort=%2Biata"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          {
            "airlines": [
              { "iata": "KL", "icao": "KLM", "nvls": 100, "publicName": "KLM" },
              { "iata": "HV", "icao": "TRA", "nvls": 164, "publicName": "Transavia" }
            ]
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    server
      .expect(requestTo("https://api.schiphol.nl/public/public-flights/v4/airlines?page=1&sort=%2Biata"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(withNoContent())

    val batch = source.fetchAirlines(AirlineSyncRequest(maxPages = 5))

    assertEquals(2, batch.airlines.size)
    assertEquals(1, batch.pagesFetched)
    assertEquals("KLM", batch.airlines[0].id)
    assertEquals("TRA", batch.airlines[1].icao)
    server.verify()
  }

  @Test
  fun `rejects sync when no Schiphol credentials are configured`() {
    val (source, _) = createSyncSource(clientId = "", clientSecret = "")
    assertFailsWith<IllegalStateException> {
      source.fetchAirlines(AirlineSyncRequest())
    }
  }
}
