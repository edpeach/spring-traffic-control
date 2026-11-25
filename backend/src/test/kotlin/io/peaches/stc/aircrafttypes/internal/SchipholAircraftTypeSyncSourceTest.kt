package io.peaches.stc.aircrafttypes.internal

import io.peaches.stc.SchipholProperties
import io.peaches.stc.aircrafttypes.AircraftTypeSyncRequest
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

class SchipholAircraftTypeSyncSourceTest {
  @Test
  fun `paginates aircraft types until 204 No Content`() {
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
    val source =
      SchipholAircraftTypeSyncSource(
        api,
        SchipholProperties(clientId = "test-client", clientSecret = "test-secret"),
      )

    server
      .expect(requestTo("https://api.schiphol.nl/public/public-flights/v4/aircrafttypes?page=0&sort=%2BiataMain"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          {
            "aircraftTypes": [
              { "iataMain": "EMJ", "iataSub": "295", "shortDescription": "E195-E2", "longDescription": "Embraer 195-E2" }
            ]
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    server
      .expect(requestTo("https://api.schiphol.nl/public/public-flights/v4/aircrafttypes?page=1&sort=%2BiataMain"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(withNoContent())

    val batch = source.fetchAircraftTypes(AircraftTypeSyncRequest(maxPages = 5))

    assertEquals(1, batch.pagesFetched)
    assertEquals(1, batch.aircraftTypes.size)
    assertEquals("EMJ-295", batch.aircraftTypes.single().id)
    server.verify()
  }
}
