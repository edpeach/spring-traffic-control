package io.peaches.support.openaip

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

class OpenAipApiTest {
  private fun createClient(): Pair<OpenAipApi, MockRestServiceServer> {
    val builder =
      RestClient
        .builder()
        .baseUrl("https://api.core.openaip.net/api")
        .defaultHeader("x-openaip-api-key", "test-api-key")
    val server = MockRestServiceServer.bindTo(builder).build()
    val factory =
      HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(builder.build()))
        .build()
    return factory.createClient(OpenAipApi::class.java) to server
  }

  @Test
  fun `listAirports deserializes paginated airport response`() {
    val (api, server) = createClient()
    val payload =
      """
      {
        "page": 1,
        "limit": 10,
        "totalCount": 1,
        "totalPages": 1,
        "nextPage": null,
        "items": [
          {
            "_id": "60085dd4268e90000eb327ce",
            "name": "Amsterdam Airport Schiphol",
            "icaoCode": "EHAM",
            "iataCode": "AMS",
            "country": "NL",
            "geometry": {
              "type": "Point",
              "coordinates": [4.76389, 52.30861]
            }
          }
        ]
      }
      """.trimIndent()

    server
      .expect(requestTo("https://api.core.openaip.net/api/airports?page=1&limit=10&country=NL"))
      .andExpect(method(HttpMethod.GET))
      .andExpect(header("x-openaip-api-key", "test-api-key"))
      .andRespond(withSuccess(payload, MediaType.APPLICATION_JSON))

    val result = api.listAirports(page = 1, limit = 10, country = "NL")

    assertEquals(1, result.totalCount)
    assertEquals(1, result.items.size)
    val airport = result.items.single()
    assertEquals("60085dd4268e90000eb327ce", airport.id)
    assertEquals("EHAM", airport.icaoCode)
    assertEquals("AMS", airport.iataCode)
    assertEquals("NL", airport.country)
    assertEquals(listOf(4.76389, 52.30861), airport.geometry?.coordinates)
    server.verify()
  }

  @Test
  fun `getAirport fetches single airport by id`() {
    val (api, server) = createClient()
    val payload =
      """
      {
        "_id": "60085dd4268e90000eb327ce",
        "name": "Amsterdam Airport Schiphol",
        "icaoCode": "EHAM",
        "iataCode": "AMS"
      }
      """.trimIndent()

    server
      .expect(requestTo("https://api.core.openaip.net/api/airports/60085dd4268e90000eb327ce"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(withSuccess(payload, MediaType.APPLICATION_JSON))

    val airport = api.getAirport("60085dd4268e90000eb327ce")

    assertEquals("60085dd4268e90000eb327ce", airport.id)
    assertEquals("Amsterdam Airport Schiphol", airport.name)
    assertEquals("EHAM", airport.icaoCode)
    server.verify()
  }
}
