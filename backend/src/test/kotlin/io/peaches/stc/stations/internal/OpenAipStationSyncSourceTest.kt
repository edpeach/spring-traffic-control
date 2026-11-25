package io.peaches.stc.stations.internal

import io.peaches.stc.stations.StationSyncRequest
import io.peaches.support.openaip.OpenAipApi
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import org.springframework.web.client.support.RestClientAdapter
import org.springframework.web.service.invoker.HttpServiceProxyFactory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class OpenAipStationSyncSourceTest {
  private fun createSyncSource(apiKey: String = "secret-key"): Pair<OpenAipStationSyncSource, MockRestServiceServer> {
    val builder =
      RestClient
        .builder()
        .baseUrl("https://api.core.openaip.net/api")
        .defaultHeader("x-openaip-api-key", apiKey)
    val server = MockRestServiceServer.bindTo(builder).build()
    val api =
      HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(builder.build()))
        .build()
        .createClient(OpenAipApi::class.java)
    return OpenAipStationSyncSource(api, OpenAipProperties(apiKey = apiKey)) to server
  }

  @Test
  fun `fetches paginated airports with x-openaip-api-key header and maps flags`() {
    val (source, server) = createSyncSource("my-openaip-key")

    server
      .expect(requestTo("https://api.core.openaip.net/api/airports?page=1&limit=1&country=NL"))
      .andExpect(method(HttpMethod.GET))
      .andExpect(header("x-openaip-api-key", "my-openaip-key"))
      .andRespond(
        withSuccess(
          """
          {
            "page": 1,
            "limit": 1,
            "totalCount": 2,
            "totalPages": 2,
            "nextPage": 2,
            "items": [
              {
                "_id": "apt-1",
                "name": "Amsterdam Airport Schiphol",
                "icaoCode": "EHAM",
                "iataCode": "AMS",
                "country": "NL",
                "ppr": false,
                "skydiveActivity": false,
                "winchOnly": false
              }
            ]
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    server
      .expect(requestTo("https://api.core.openaip.net/api/airports?page=2&limit=1&country=NL"))
      .andExpect(method(HttpMethod.GET))
      .andExpect(header("x-openaip-api-key", "my-openaip-key"))
      .andRespond(
        withSuccess(
          """
          {
            "page": 2,
            "limit": 1,
            "totalCount": 2,
            "totalPages": 2,
            "nextPage": null,
            "items": [
              {
                "_id": "apt-2",
                "name": "Texel International Airport",
                "icaoCode": "EHTX",
                "country": "NL",
                "ppr": true,
                "skydiveActivity": true,
                "winchOnly": true
              }
            ]
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    val batch = source.fetchStations(StationSyncRequest(country = "nl", limit = 1, maxPages = 5))

    assertEquals(2, batch.stations.size)
    assertEquals(2, batch.pagesFetched)
    assertEquals(2, batch.totalAvailable)
    assertEquals("EHAM", batch.stations[0].icao)
    assertTrue(batch.stations[1].ppr)
    assertTrue(batch.stations[1].skydiveActivity)
    assertTrue(batch.stations[1].winchOnly)
    server.verify()
  }

  @Test
  fun `rejects sync when OPENAIP_API_KEY is blank`() {
    val (source, _) = createSyncSource(apiKey = "")
    assertFailsWith<IllegalStateException> {
      source.fetchStations(StationSyncRequest(country = "NL"))
    }
  }
}
