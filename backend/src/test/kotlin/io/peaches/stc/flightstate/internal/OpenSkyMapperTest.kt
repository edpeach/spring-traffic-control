package io.peaches.stc.flightstate.internal

import io.peaches.support.opensky.OpenSkyStatesResponse
import io.peaches.support.opensky.OpenSkyTrackResponse
import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.kotlinModule
import tools.jackson.module.kotlin.readValue
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull

class OpenSkyMapperTest {
  private val mapper = JsonMapper.builder().addModule(kotlinModule()).build()

  @Test
  fun `maps OpenSky raw tuples into StateVector and FlightTrack`() {
    val statesResponse =
      mapper.readValue<OpenSkyStatesResponse>(
        """
        {
          "time": 1700000000,
          "states": [
            ["484F71", "KLM1051 ", "Netherlands", 1700000000, 1700000000, 4.7639, 52.3086, 10000.0, false, 230.5, 275.0, 0.0, null, 10200.0, "2145", false, 0]
          ]
        }
        """.trimIndent(),
      )

    val vectors = OpenSkyMapper.toStateVectors(statesResponse)
    assertEquals(1, vectors.size)
    val sv = vectors.single()
    assertEquals("484f71", sv.icao24)
    assertEquals("KLM1051", sv.callsign)
    assertEquals(52.3086, sv.latitude)
    assertEquals(4.7639, sv.longitude)
    assertEquals(275.0, sv.trueTrack)
    assertFalse(sv.onGround)

    val trackResponse =
      mapper.readValue<OpenSkyTrackResponse>(
        """
        {
          "icao24": "484F71",
          "callsign": "KLM1051 ",
          "path": [
            [1700000000, 52.3086, 4.7639, 10000.0, 275.0, false]
          ]
        }
        """.trimIndent(),
      )

    val track = OpenSkyMapper.toFlightTrack(trackResponse)
    assertNotNull(track)
    assertEquals("484f71", track.icao24)
    assertEquals("KLM1051", track.callsign)
    assertEquals(1, track.path.size)
    assertEquals(52.3086, track.path.single().latitude)
  }
}
