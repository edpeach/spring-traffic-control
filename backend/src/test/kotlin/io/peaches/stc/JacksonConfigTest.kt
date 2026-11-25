package io.peaches.stc

import io.peaches.stc.stations.StationSyncRequest
import io.peaches.support.openaip.OpenAipAirport
import org.springframework.core.io.ClassPathResource
import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.readValue
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class JacksonConfigTest {
  private fun configuredMapper(): JsonMapper {
    val builder = JsonMapper.builder()
    JacksonConfig().openAipFriendlyJsonMapperCustomizer().customize(builder)
    return builder.build()
  }

  @Test
  fun `deserializes KAKR OpenAIP airport with partial and missing hoursOfOperation`() {
    val mapper = configuredMapper()
    val airport =
      ClassPathResource("fixtures/openaip/airport-KAKR.json").inputStream.use {
        mapper.readValue<OpenAipAirport>(it)
      }

    assertEquals("KAKR", airport.icaoCode)
    assertEquals("AKC", airport.iataCode)
    assertEquals(2, airport.runways.size)
    assertEquals(1, airport.runways[1].instrumentApproachAids.size)
    assertNull(airport.runways[1].instrumentApproachAids[0].hoursOfOperation)
    assertEquals(emptyList(), airport.hoursOfOperation?.operatingHours)
  }

  @Test
  fun `defaults null and missing collections and maps to empty`() {
    val mapper = configuredMapper()

    val syncRequest =
      mapper.readValue<StationSyncRequest>(
        """{"country": "NL", "type": null, "trafficType": null}""",
      )
    assertEquals("NL", syncRequest.country)
    assertEquals(emptyList(), syncRequest.type)
    assertEquals(emptyList(), syncRequest.trafficType)

    val airport =
      mapper.readValue<OpenAipAirport>(
        """
        {
          "name": "Minimal Strip",
          "runways": [
            {
              "designator": "09",
              "trueHeading": 90,
              "alignedTrueNorth": false,
              "operations": 0,
              "mainRunway": true,
              "surface": {
                "composition": null,
                "mainComposite": 0,
                "condition": 0,
                "mtow": null
              },
              "dimension": {
                "length": { "value": 800, "unit": 0 },
                "width": { "value": 20, "unit": 0 }
              },
              "declaredDistance": {}
            }
          ],
          "frequencies": null
        }
        """.trimIndent(),
      )

    assertEquals(emptyList(), airport.frequencies)
    assertEquals(
      emptyList(),
      airport.runways
        .single()
        .surface.composition,
    )
    assertEquals(
      emptyMap(),
      airport.runways
        .single()
        .surface.mtow,
    )
  }
}
