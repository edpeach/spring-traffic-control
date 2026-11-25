package io.peaches.stc.agents

import com.agui.community.core.agent.RunAgentInput
import com.agui.community.core.event.ActivitySnapshotEvent
import com.agui.community.core.event.CustomEvent
import com.agui.community.core.event.Event
import com.agui.community.core.event.ReasoningEndEvent
import com.agui.community.core.event.ReasoningMessageContentEvent
import com.agui.community.core.event.ReasoningMessageEndEvent
import com.agui.community.core.event.ReasoningMessageStartEvent
import com.agui.community.core.event.ReasoningStartEvent
import com.agui.community.core.event.TextMessageContentEvent
import com.agui.community.core.event.TextMessageEndEvent
import com.agui.community.core.event.TextMessageStartEvent
import com.agui.community.core.event.ToolCallArgsEvent
import com.agui.community.core.event.ToolCallEndEvent
import com.agui.community.core.event.ToolCallStartEvent
import io.peaches.stc.agents.internal.AgUiContextKeys
import io.peaches.stc.agents.internal.AgUiEventStreamAdvisor
import io.peaches.stc.agents.internal.AgUiJacksonModule
import io.peaches.stc.agents.internal.AgUiTurnEmitter
import io.peaches.stc.agents.internal.AguiCapabilitiesRegistry
import io.peaches.stc.agents.internal.AviationAgentTools
import io.peaches.stc.agents.internal.FrontendControlTools
import io.peaches.stc.agents.internal.UiContextAdvisor
import io.peaches.stc.flightstate.AirportFlight
import io.peaches.stc.flightstate.ConsolidatedFlight
import io.peaches.stc.flightstate.EnrichedFlightTrack
import io.peaches.stc.flightstate.InFlightService
import io.peaches.stc.flightstate.StateVector
import io.peaches.stc.schedule.FlightDirection
import io.peaches.stc.schedule.FlightScheduleService
import io.peaches.stc.schedule.ScheduleSyncRequest
import io.peaches.stc.schedule.ScheduleSyncResult
import io.peaches.stc.schedule.ScheduledFlight
import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.LoadStationsService
import io.peaches.stc.stations.NearestStation
import io.peaches.stc.stations.OpeningHours
import io.peaches.stc.stations.Runway
import io.peaches.stc.stations.Station
import io.peaches.stc.stations.StationFrequency
import io.peaches.stc.stations.StationSyncRequest
import io.peaches.stc.stations.StationSyncResult
import org.junit.jupiter.api.Test
import org.springframework.ai.chat.client.ChatClientRequest
import org.springframework.ai.chat.client.ChatClientResponse
import org.springframework.ai.chat.client.advisor.api.StreamAdvisorChain
import org.springframework.ai.chat.messages.AssistantMessage
import org.springframework.ai.chat.messages.part.OpaquePayload
import org.springframework.ai.chat.messages.part.ReasoningPart
import org.springframework.ai.chat.messages.part.TextPart
import org.springframework.ai.chat.messages.part.ToolCallPart
import org.springframework.ai.chat.model.ChatResponse
import org.springframework.ai.chat.model.Generation
import org.springframework.ai.chat.model.ToolContext
import org.springframework.ai.chat.prompt.Prompt
import reactor.core.publisher.Flux
import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.kotlinModule
import java.time.LocalDate
import java.time.LocalTime
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class AgentsModuleTests {
  @Test
  fun `stream advisor translates ReasoningPart, ToolCallPart, and TextPart while preserving thought_signature`() {
    val events = mutableListOf<Event>()
    val emitter = AgUiTurnEmitter(events::add)
    val advisor = AgUiEventStreamAdvisor()

    val signaturePayload = OpaquePayload("google", "thought_signature", "c2lnbmF0dXJl")
    val reasoningPart = ReasoningPart("Checking KL702 position...", null, signaturePayload, emptyMap())
    val toolCallPart =
      ToolCallPart.of(
        AssistantMessage.ToolCall("call-1", "function", "findFlightByCallsign", """{"callsign":"KL702"}"""),
      )

    val chunk1 =
      ChatClientResponse
        .builder()
        .chatResponse(
          ChatResponse(
            listOf(
              Generation(
                AssistantMessage
                  .builder()
                  .parts(listOf(reasoningPart, toolCallPart))
                  .build(),
              ),
            ),
          ),
        ).build()

    val chunk2 =
      ChatClientResponse
        .builder()
        .chatResponse(
          ChatResponse(
            listOf(
              Generation(
                AssistantMessage
                  .builder()
                  .parts(listOf(TextPart.of("KL702 is now shown on the map.")))
                  .build(),
              ),
            ),
          ),
        ).build()

    val chain =
      object : StreamAdvisorChain {
        override fun nextStream(chatClientRequest: ChatClientRequest): Flux<ChatClientResponse> = Flux.just(chunk1, chunk2)

        override fun getStreamAdvisors() = emptyList<org.springframework.ai.chat.client.advisor.api.StreamAdvisor>()

        override fun copy(after: org.springframework.ai.chat.client.advisor.api.StreamAdvisor): StreamAdvisorChain = this
      }

    val request =
      ChatClientRequest
        .builder()
        .prompt(Prompt("Show KL702"))
        .context(mapOf(AgUiContextKeys.EMITTER to emitter))
        .build()
    val downstream =
      advisor
        .adviseStream(request, chain)
        .collectList()
        .block()
        .orEmpty()

    // Downstream response must remain intact so ToolCallingAdvisor replays thought_signature to Gemini
    assertEquals(2, downstream.size)
    val preservedReasoning =
      downstream[0]
        .chatResponse()!!
        .result!!
        .output.reasoning
        .single()
    assertEquals(signaturePayload, preservedReasoning.payload())

    // AG-UI events must contain reasoning, tool call, and text lifecycle
    assertTrue(events.any { it is ReasoningStartEvent })
    assertTrue(events.any { it is ReasoningMessageStartEvent })
    assertTrue(events.any { it is ReasoningMessageContentEvent && it.delta() == "Checking KL702 position..." })
    assertTrue(events.any { it is ReasoningMessageEndEvent })
    assertTrue(events.any { it is ReasoningEndEvent })
    assertTrue(events.any { it is ToolCallStartEvent && it.toolCallName() == "findFlightByCallsign" })
    assertTrue(events.any { it is ToolCallArgsEvent && it.delta().contains("KL702") })
    assertTrue(events.any { it is ToolCallEndEvent && it.toolCallId() == "call-1" })
    assertTrue(events.any { it is TextMessageStartEvent })
    val fullText = events.filterIsInstance<TextMessageContentEvent>().joinToString("") { it.delta() }
    assertEquals("KL702 is now shown on the map.", fullText)
    assertTrue(events.any { it is TextMessageEndEvent })
  }

  @Test
  fun `frontend control tools validate synced actions and emit webapp action custom event`() {
    val registry = AguiCapabilitiesRegistry()
    registry.sync(
      AguiSyncRequest(
        appVersion = "0.1.0",
        actions =
          listOf(
            AguiActionDescriptor("navigate", "Navigate to a route"),
            AguiActionDescriptor("toggleMapLayer", "Toggle a map layer"),
          ),
      ),
    )

    val events = mutableListOf<Event>()
    val toolContext =
      ToolContext(
        mapOf(
          AgUiContextKeys.EMITTER to AgUiTurnEmitter(events::add),
          AgUiContextKeys.APP_VERSION to "0.1.0",
        ),
      )
    val tools = FrontendControlTools(registry, FakeStationsService(emptyList()), FakeScheduleService())

    val rejected = tools.triggerWebappAction("nonExistentAction", emptyMap(), toolContext)
    assertTrue(rejected.contains("Unknown action"))

    val accepted = tools.triggerWebappAction("navigate", mapOf("route" to "/map"), toolContext)
    assertTrue(accepted.contains("Triggered frontend action 'navigate'"))

    val toggledLayer = tools.triggerWebappAction("toggleMapLayer", mapOf("layerId" to "day-night", "visible" to false), toolContext)
    assertTrue(toggledLayer.contains("Triggered frontend action 'toggleMapLayer'"))

    assertEquals(2, events.size)
    val custom = assertIs<CustomEvent>(events[0])
    assertEquals(AgUiTurnEmitter.WEBAPP_ACTION_EVENT, custom.name())
    val payload = assertIs<WebappActionPayload>(custom.value())
    assertEquals("navigate", payload.action)
    assertEquals("/map", payload.params["route"])

    val layerEvent = assertIs<CustomEvent>(events[1])
    val layerPayload = assertIs<WebappActionPayload>(layerEvent.value())
    assertEquals("toggleMapLayer", layerPayload.action)
    assertEquals("day-night", layerPayload.params["layerId"])
    assertEquals(false, layerPayload.params["visible"])
  }

  @Test
  fun `aviation agent tools emit StationCard and NearestAirportsCard A2UI surfaces`() {
    val ams =
      Station(
        id = "eham-id",
        name = "Amsterdam Airport Schiphol",
        city = "Amsterdam",
        country = "NL",
        iata = "AMS",
        icao = "EHAM",
        latitude = 52.3086,
        longitude = 4.7639,
        openingHours = OpeningHours(alwaysOpen = false, openUtc = LocalTime.of(6, 0), closeUtc = LocalTime.of(23, 0)),
        maxAircraftCategory = AircraftCategory.WIDE_BODY,
        emergencyMedicalCapable = true,
      )
    val events = mutableListOf<Event>()
    val toolContext = ToolContext(mapOf(AgUiContextKeys.EMITTER to AgUiTurnEmitter(events::add)))
    val tools =
      AviationAgentTools(
        loadStationsService = FakeStationsService(listOf(ams)),
        flightScheduleService = FakeScheduleService(),
        inFlightService = FakeInFlightService(listOf(NearestStation(ams, 18.4))),
      )

    val stationSummary = tools.findStationByCode("AMS", toolContext)
    assertTrue(stationSummary.contains("EHAM"))

    val nearestSummary = tools.findNearestAirportsForFlight("484162", limit = 5, toolContext = toolContext)
    assertTrue(nearestSummary.contains("EHAM"))

    assertEquals(3, events.size)
    val first = assertIs<ActivitySnapshotEvent>(events[0])
    val second = assertIs<ActivitySnapshotEvent>(events[1])
    val third = assertIs<CustomEvent>(events[2])
    assertEquals("StationCard", assertIs<A2UiSurfacePayload>(first.content()).component)
    assertEquals("NearestAirportsCard", assertIs<A2UiSurfacePayload>(second.content()).component)
    assertEquals(AgUiTurnEmitter.WEBAPP_ACTION_EVENT, third.name())
    val actionPayload = assertIs<WebappActionPayload>(third.value())
    assertEquals("showClosestAirportsOnMap", actionPayload.action)
    assertEquals("484162", actionPayload.params["icao24"])

    // Verify Jackson 3 AgUiJacksonModule handles java.time.LocalTime, Event type, Role, and RunAgentInput
    val mapper =
      JsonMapper
        .builder()
        .addModule(kotlinModule())
        .addModule(AgUiJacksonModule())
        .build()
    val json = mapper.writeValueAsString(first)
    assertTrue(json.contains("\"type\":\"ACTIVITY_SNAPSHOT\""))
    assertTrue(json.contains("\"EHAM\""))
    assertTrue(json.contains("06:00"))

    val textStartJson = mapper.writeValueAsString(TextMessageStartEvent("m1", com.agui.community.core.message.Role.ASSISTANT))
    assertTrue(textStartJson.contains("\"type\":\"TEXT_MESSAGE_START\""))
    assertTrue(textStartJson.contains("\"role\":\"assistant\""))

    val inputJson =
      """{"threadId":"t1","runId":"r1","messages":[{"id":"m1","role":"user","content":"Open the map"}],""" +
        """"forwardedProps":{"provider":"OLLAMA"}}"""
    val parsedInput = mapper.readValue(inputJson, RunAgentInput::class.java)
    assertEquals("t1", parsedInput.threadId())
    assertEquals(1, parsedInput.messages().size)
  }

  @Test
  fun `findStationByCode includes runways, frequencies, and supports name lookup`() {
    val ams =
      Station(
        id = "eham-id",
        name = "Amsterdam Airport Schiphol",
        city = "Amsterdam",
        country = "NL",
        iata = "AMS",
        icao = "EHAM",
        latitude = 52.3086,
        longitude = 4.7639,
        elevationMeters = -3.0,
        airportType = "INTL_APT",
        trafficTypes = listOf("IFR", "VFR"),
        openingHours = OpeningHours(alwaysOpen = true),
        maxRunwayMeters = 3800,
        maxAircraftCategory = AircraftCategory.WIDE_BODY,
        runwayCount = 2,
        primaryFrequency = "119.230",
        emergencyMedicalCapable = true,
        runways =
          listOf(
            Runway(
              id = "r1",
              designator = "18R/36L",
              trueHeading = 183,
              mainRunway = true,
              lengthMeters = 3800,
              widthMeters = 60,
              surfaceType = "ASPHALT",
            ),
            Runway(
              id = "r2",
              designator = "04/22",
              trueHeading = 41,
              lengthMeters = 2014,
              widthMeters = 45,
              surfaceType = "CONCRETE",
            ),
          ),
        frequencies =
          listOf(
            StationFrequency(id = "f1", value = "119.230", type = "TWR", name = "Schiphol Tower", primary = true),
          ),
      )
    val events = mutableListOf<Event>()
    val toolContext = ToolContext(mapOf(AgUiContextKeys.EMITTER to AgUiTurnEmitter(events::add)))
    val tools =
      AviationAgentTools(
        loadStationsService = FakeStationsService(listOf(ams)),
        flightScheduleService = FakeScheduleService(),
        inFlightService = FakeInFlightService(emptyList()),
      )

    val details = tools.findStationByCode("Schiphol", toolContext)
    assertTrue(details.contains("Amsterdam Airport Schiphol"))
    assertTrue(details.contains("RWY 18R/36L"))
    assertTrue(details.contains("CONCRETE"))
    assertTrue(details.contains("119.230 MHz"))
    assertEquals(1, events.size)
    assertEquals("StationCard", assertIs<A2UiSurfacePayload>(assertIs<ActivitySnapshotEvent>(events.single()).content()).component)
  }

  @Test
  fun `detail navigation validates station and flight existence and callsign falls back to flight number`() {
    val schiphol =
      Station(
        id = "eham-id",
        name = "AMSTERDAM/SCHIPHOL",
        country = "NL",
        iata = "AMS",
        icao = "EHAM",
      )
    val kl844 =
      ScheduledFlight(
        id = "f-844",
        flightName = "KL844",
        flightNumber = 844L,
        prefixIata = "KL",
        prefixIcao = "KLM",
        mainFlight = "KL844",
        flightDirection = FlightDirection.D,
        originCode = "AMS",
        destinationCode = "SIN",
        scheduleDate = LocalDate.of(2026, 11, 22),
      )
    val stationsService = FakeStationsService(listOf(schiphol))
    val scheduleService =
      object : FlightScheduleService by FakeScheduleService() {
        override fun findAll(
          scheduleDate: LocalDate?,
          direction: FlightDirection?,
          query: String?,
        ): List<ScheduledFlight> {
          if (query.isNullOrBlank()) return listOf(kl844)
          val q = query.uppercase()
          return listOf(kl844).filter {
            it.flightName.uppercase().contains(q) || it.flightNumber.toString().contains(q)
          }
        }

        override fun findByFlightName(
          flightName: String,
          scheduleDate: LocalDate?,
        ) = listOf(kl844).filter { it.flightName.equals(flightName, ignoreCase = true) }
      }

    val registry = AguiCapabilitiesRegistry()
    registry.sync(
      AguiSyncRequest(
        appVersion = "0.1.0",
        actions = listOf(AguiActionDescriptor("navigate", "Navigate to a route")),
      ),
    )
    val events = mutableListOf<Event>()
    val toolContext =
      ToolContext(
        mapOf(
          AgUiContextKeys.EMITTER to AgUiTurnEmitter(events::add),
          AgUiContextKeys.APP_VERSION to "0.1.0",
        ),
      )
    val frontendTools =
      FrontendControlTools(
        capabilitiesRegistry = registry,
        loadStationsService = stationsService,
        flightScheduleService = scheduleService,
      )

    // Non-existent station and flight are rejected without emitting navigate
    assertTrue(
      frontendTools
        .triggerWebappAction("navigate", mapOf("route" to "/stations/ZZZZ"), toolContext)
        .contains("Cannot navigate"),
    )
    assertTrue(
      frontendTools
        .triggerWebappAction("navigate", mapOf("route" to "/flights/NOPE999"), toolContext)
        .contains("Cannot navigate"),
    )
    assertEquals(0, events.size)

    // Existing station & flight (via callsign -> flight number fallback) normalize and emit navigate
    assertTrue(
      frontendTools
        .triggerWebappAction("navigate", mapOf("route" to "/stations/AMS"), toolContext)
        .contains("/stations/EHAM"),
    )
    assertTrue(
      frontendTools
        .triggerWebappAction("navigate", mapOf("route" to "/flights/KLM844"), toolContext)
        .contains("/flights/KL844"),
    )
    assertEquals(2, events.size)
    assertEquals("/stations/EHAM", assertIs<WebappActionPayload>(assertIs<CustomEvent>(events[0]).value()).params["route"])
    assertEquals("/flights/KL844", assertIs<WebappActionPayload>(assertIs<CustomEvent>(events[1]).value()).params["route"])

    // AviationAgentTools.findFlightByCallsign falls back to numeric flight number 844
    val aviationTools =
      AviationAgentTools(
        loadStationsService = stationsService,
        flightScheduleService = scheduleService,
        inFlightService = FakeInFlightService(emptyList()),
      )
    val found = aviationTools.findFlightByCallsign("KLM844")
    assertTrue(found.contains("KL844"))

    // UiContextAdvisor builds route, UI selection, and synced actions addendum
    val uiContextAdvisor = UiContextAdvisor(registry)
    val addendum =
      uiContextAdvisor.buildContextAddendum(
        appVersion = "0.1.0",
        currentRoute = "/stations/EHAM",
        uiState =
          mapOf(
            "currentPage" to "station-detail",
            "selectedStations" to listOf(mapOf("name" to "Amsterdam Airport Schiphol", "icao" to "EHAM", "iata" to "AMS")),
          ),
      )
    assertTrue(addendum.contains("/stations/EHAM"))
    assertTrue(addendum.contains("Amsterdam Airport Schiphol"))
    assertTrue(addendum.contains("navigate: Navigate to a route"))
  }

  private class FakeStationsService(
    private val stations: List<Station>,
  ) : LoadStationsService {
    override fun saveAll(stations: List<Station>) = Unit

    override fun syncFromOpenAip(request: StationSyncRequest) = StationSyncResult(0, 0, 0)

    override fun findAll(
      country: String?,
      query: String?,
    ) = if (query.isNullOrBlank()) {
      stations
    } else {
      val q = query.uppercase()
      stations.filter {
        it.name.uppercase().contains(q) ||
          it.icao?.uppercase()?.contains(q) == true ||
          it.iata?.uppercase()?.contains(q) == true
      }
    }

    override fun findByCode(code: String) =
      stations.firstOrNull {
        it.iata.equals(code, true) || it.icao.equals(code, true)
      }

    override fun findNearestStations(
      lat: Double,
      lon: Double,
      limit: Int,
    ) = stations.take(limit).map { NearestStation(it, 10.0) }

    override fun findLandingCapableNearest(
      lat: Double,
      lon: Double,
      requiredCategory: AircraftCategory,
      atTimeUtc: LocalTime?,
      emergencyOnly: Boolean,
      limit: Int,
    ) = stations.take(limit).map { NearestStation(it, 10.0) }
  }

  private class FakeScheduleService : FlightScheduleService {
    override fun saveAll(flights: List<ScheduledFlight>) = Unit

    override fun syncDay(request: ScheduleSyncRequest) = ScheduleSyncResult(LocalDate.of(2026, 11, 22), 0, 0)

    override fun findAll(
      scheduleDate: LocalDate?,
      direction: FlightDirection?,
      query: String?,
    ) = emptyList<ScheduledFlight>()

    override fun findByFlightName(
      flightName: String,
      scheduleDate: LocalDate?,
    ) = emptyList<ScheduledFlight>()

    override fun findById(id: String) = null
  }

  private class FakeInFlightService(
    private val nearest: List<NearestStation>,
  ) : InFlightService {
    override fun getAllStates(
      lamin: Double?,
      lomin: Double?,
      lamax: Double?,
      lomax: Double?,
    ) = emptyList<StateVector>()

    override fun getArrivals(
      airport: String,
      date: LocalDate,
    ) = emptyList<AirportFlight>()

    override fun getDepartures(
      airport: String,
      date: LocalDate,
    ) = emptyList<AirportFlight>()

    override fun getCurrentFlights(
      query: String?,
      airport: String,
      airportFlightsOnly: Boolean,
      lamin: Double?,
      lomin: Double?,
      lamax: Double?,
      lomax: Double?,
    ) = emptyList<ConsolidatedFlight>()

    override fun getEnrichedTrack(icao24: String): EnrichedFlightTrack? = null

    override fun findNearestAirports(
      icao24: String,
      emergencyOnly: Boolean,
      category: AircraftCategory,
      limit: Int,
    ) = nearest.take(limit)
  }
}
