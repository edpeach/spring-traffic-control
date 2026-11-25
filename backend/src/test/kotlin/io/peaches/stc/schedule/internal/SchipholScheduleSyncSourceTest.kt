package io.peaches.stc.schedule.internal

import io.peaches.stc.SchipholProperties
import io.peaches.stc.schedule.ScheduleSyncRequest
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
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals

class SchipholScheduleSyncSourceTest {
  @Test
  fun `syncs full day of flights across pages until 204 No Content`() {
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
      SchipholScheduleSyncSource(
        api,
        SchipholProperties(clientId = "test-client", clientSecret = "test-secret"),
      )

    server
      .expect(
        requestTo(
          "https://api.schiphol.nl/public/public-flights/v4/flights?scheduleDate=2026-11-21&includedelays=false&page=0&sort=%2BscheduleTime",
        ),
      ).andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          {
            "flights": [
              {
                "id": "146259647587066693",
                "flightName": "VS6946",
                "mainFlight": "KL1051",
                "flightDirection": "D",
                "scheduleDate": "2026-11-21",
                "scheduleTime": "21:05:00",
                "route": { "destinations": ["BHX"] }
              }
            ]
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )

    server
      .expect(
        requestTo(
          "https://api.schiphol.nl/public/public-flights/v4/flights?scheduleDate=2026-11-21&includedelays=false&page=1&sort=%2BscheduleTime",
        ),
      ).andExpect(method(HttpMethod.GET))
      .andRespond(withNoContent())

    val batch =
      source.fetchDaySchedule(
        ScheduleSyncRequest(scheduleDate = LocalDate.of(2026, 11, 21), maxPages = 10),
      )

    assertEquals(LocalDate.of(2026, 11, 21), batch.scheduleDate)
    assertEquals(1, batch.pagesFetched)
    assertEquals(1, batch.flights.size)
    assertEquals("VS6946", batch.flights.single().flightName)
    server.verify()
  }
}
