package io.peaches.support.schiphol

import org.springframework.http.HttpHeaders
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
import kotlin.test.assertNotNull

class SchipholApiTest {
  private fun createClient(): Pair<SchipholApi, MockRestServiceServer> {
    val builder =
      RestClient
        .builder()
        .baseUrl("https://api.schiphol.nl/public/public-flights/v4")
        .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
        .defaultHeader("ResourceVersion", "v4")
        .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer test-jwt-token")
    val server = MockRestServiceServer.bindTo(builder).build()
    val factory =
      HttpServiceProxyFactory
        .builderFor(RestClientAdapter.create(builder.build()))
        .build()
    return factory.createClient(SchipholApi::class.java) to server
  }

  @Test
  fun `getFlights deserializes inbound and outbound flight schedules`() {
    val (api, server) = createClient()
    val payload =
      """
      {
        "flights": [
          {
            "id": "141988470640710484",
            "flightName": "KL672",
            "flightNumber": 672,
            "flightDirection": "A",
            "prefixIATA": "KL",
            "prefixICAO": "KLM",
            "isOperationalFlight": true,
            "scheduleDate": "2026-11-21",
            "scheduleTime": "15:25:00",
            "scheduleDateTime": "2026-11-21T15:25:00.000+01:00",
            "gate": "E09",
            "pier": "E",
            "terminal": 2,
            "aircraftRegistration": "PHBHA",
            "aircraftType": {
              "iataMain": "787",
              "iataSub": "789"
            },
            "route": {
              "destinations": ["YUL"],
              "eu": "N",
              "visa": false
            },
            "publicFlightState": {
              "flightStates": ["AIR"]
            },
            "baggageClaim": {
              "belts": ["14"]
            },
            "codeshares": {
              "codeshares": ["DL9371"]
            }
          }
        ]
      }
      """.trimIndent()

    server
      .expect(
        requestTo(
          "https://api.schiphol.nl/public/public-flights/v4/flights?scheduleDate=2026-11-21&flightDirection=A&page=0",
        ),
      ).andExpect(method(HttpMethod.GET))
      .andExpect(header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE))
      .andExpect(header("ResourceVersion", "v4"))
      .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-jwt-token"))
      .andRespond(withSuccess(payload, MediaType.APPLICATION_JSON))

    val result =
      api.getFlights(
        scheduleDate = "2026-11-21",
        flightDirection = SchipholFlightDirection.A,
        page = 0,
      )

    assertNotNull(result)
    assertEquals(1, result.flights.size)
    val flight = result.flights.single()
    assertEquals("141988470640710484", flight.id)
    assertEquals("KL672", flight.flightName)
    assertEquals(SchipholFlightDirection.A, flight.flightDirection)
    assertEquals("789", flight.aircraftType?.iataSub)
    assertEquals(listOf("YUL"), flight.route?.destinations)
    assertEquals(listOf("AIR"), flight.publicFlightState?.flightStates)
    assertEquals(listOf("14"), flight.baggageClaim?.belts)
    assertEquals(listOf("DL9371"), flight.codeshares?.codeshares)
    server.verify()
  }

  @Test
  fun `getFlightIds and reference endpoints deserialize cleanly`() {
    val (api, server) = createClient()

    server
      .expect(
        requestTo(
          "https://api.schiphol.nl/public/public-flights/v4/flights/ids?fromDateTime=2026-11-21T00%3A00%3A00&toDateTime=2026-11-21T23%3A59%3A59",
        ),
      ).andExpect(method(HttpMethod.GET))
      .andRespond(withSuccess("""["141988470640710484","141988470640710485"]""", MediaType.APPLICATION_JSON))

    server
      .expect(requestTo("https://api.schiphol.nl/public/public-flights/v4/airlines/KL"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """{"iata":"KL","icao":"KLM","nvls":100,"publicName":"KLM"}""",
          MediaType.APPLICATION_JSON,
        ),
      )

    server
      .expect(requestTo("https://api.schiphol.nl/public/public-flights/v4/destinations/VCE"))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """{"iata":"VCE","city":"Venice","country":"Italy","publicName":{"dutch":"Venetië","english":"Venice"}}""",
          MediaType.APPLICATION_JSON,
        ),
      )

    val ids = api.getFlightIds("2026-11-21T00:00:00", "2026-11-21T23:59:59")
    val airline = api.getAirlineByCode("KL")
    val destination = api.getDestinationByCode("VCE")

    assertEquals(listOf("141988470640710484", "141988470640710485"), ids)
    assertEquals("KLM", airline.icao)
    assertEquals("Venice", destination.publicName?.english)
    server.verify()
  }
}
