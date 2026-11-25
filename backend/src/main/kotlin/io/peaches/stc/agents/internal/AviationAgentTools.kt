package io.peaches.stc.agents.internal

import io.peaches.stc.flightstate.InFlightService
import io.peaches.stc.schedule.FlightDirection
import io.peaches.stc.schedule.FlightScheduleService
import io.peaches.stc.stations.AircraftCategory
import io.peaches.stc.stations.LoadStationsService
import io.peaches.stc.stations.Station
import org.springframework.ai.chat.model.ToolContext
import org.springframework.ai.tool.annotation.Tool
import org.springframework.ai.tool.annotation.ToolParam
import org.springframework.stereotype.Component
import kotlin.math.roundToInt

/**
 * Aviation domain `@Tool` bean exposed to Spring AI 2.1.
 * Queries Modulith services, emits A2UI surfaces via [ToolContext], and returns concise telemetry to the LLM.
 */
@Component
class AviationAgentTools(
  private val loadStationsService: LoadStationsService,
  private val flightScheduleService: FlightScheduleService,
  private val inFlightService: InFlightService,
) {
  @Tool(description = "Search airports or stations by name, city, IATA, or ICAO code and render StationCard A2UI surfaces.")
  fun findStations(
    @ToolParam(description = "Search term such as 'Amsterdam', 'AMS', 'EHAM', or 'Schiphol'", required = false) query: String? = null,
    @ToolParam(description = "Optional ISO 2-letter country code such as 'NL'", required = false) country: String? = null,
    @ToolParam(description = "Maximum number of stations to return (default 5)", required = false) limit: Int? = null,
    toolContext: ToolContext? = null,
  ): String {
    val stations = loadStationsService.findAll(country = country, query = query).take((limit ?: 5).coerceIn(1, 10))
    if (stations.isEmpty()) return "No stations found matching query='$query' country='$country'."

    stations.take(3).forEach { toolContext.agUiEmitter()?.emitSurface("StationCard", mapOf("station" to it)) }
    return stations.joinToString("\n") { s ->
      "- ${s.name} (routeCode=${s.routeCode()}, iata=${s.iata ?: "—"}, icao=${s.icao ?: "—"}, " +
        "city=${s.city ?: "—"}, country=${s.country ?: "—"}, lat=${s.latitude}, lon=${s.longitude})"
    }
  }

  @Tool(
    description =
      "Look up a single airport/station by IATA/ICAO code or name (e.g. 'AMS', 'EHAM', 'Schiphol') " +
        "with runways and frequencies, and render its StationCard A2UI surface.",
  )
  fun findStationByCode(
    @ToolParam(description = "IATA/ICAO code or airport name, e.g. 'AMS', 'EHAM', or 'Schiphol'") code: String,
    toolContext: ToolContext? = null,
  ): String {
    val trimmed = code.trim()
    val station =
      loadStationsService.findByCode(trimmed) ?: loadStationsService.findAll(query = trimmed).firstOrNull()?.let {
        loadStationsService.findByCode(it.routeCode()) ?: it
      } ?: return "No station found matching '$code'."

    toolContext.agUiEmitter()?.emitSurface("StationCard", mapOf("station" to station))

    val runways =
      station.runways
        .joinToString("; ") { r ->
          "RWY ${r.designator} (${r.surfaceType}, ${r.lengthMeters}x${r.widthMeters}m, hdg ${r.trueHeading}°)"
        }.ifEmpty { "none" }
    val frequencies =
      station.frequencies
        .joinToString("; ") { f ->
          "${f.value} MHz ${f.type}${if (f.primary) " [primary]" else ""}"
        }.ifEmpty { station.primaryFrequency ?: "none" }

    return buildString {
      append("${station.name} (routeCode=${station.routeCode()}, icao=${station.icao ?: "—"}, iata=${station.iata ?: "—"}, ")
      append("city=${station.city ?: "—"}, country=${station.country ?: "—"}, ")
      append("lat=${station.latitude}, lon=${station.longitude}, ")
      append("maxRunwayMeters=${station.maxRunwayMeters ?: "unknown"}, maxAircraftCategory=${station.maxAircraftCategory}, ")
      append("emergencyMedicalCapable=${station.emergencyMedicalCapable}). ")
      append("Runways (${station.runways.size}): $runways. ")
      append("Frequencies: $frequencies.")
    }
  }

  @Tool(
    description =
      "Search scheduled commercial flights by flight number, destination, airline, or direction " +
        "and render FlightCard A2UI surfaces.",
  )
  fun findScheduledFlights(
    @ToolParam(
      description = "Flight number, destination, or search query (e.g. 'KL702', 'LHR')",
      required = false,
    )
    query: String? = null,
    @ToolParam(
      description = "Optional direction: 'A' for arrivals or 'D' for departures",
      required = false,
    )
    direction: String? = null,
    @ToolParam(
      description = "Maximum number of flights to return (default 5)",
      required = false,
    )
    limit: Int? = null,
    toolContext: ToolContext? = null,
  ): String {
    val parsedDirection = direction?.trim()?.uppercase()?.let { runCatching { FlightDirection.valueOf(it) }.getOrNull() }
    val flights = flightScheduleService.findAll(direction = parsedDirection, query = query).take((limit ?: 5).coerceIn(1, 10))
    if (flights.isEmpty()) return "No scheduled flights found for query='$query'."

    flights.take(3).forEach { toolContext.agUiEmitter()?.emitSurface("FlightCard", mapOf("flight" to it)) }
    return flights.joinToString("\n") { f ->
      "- ${f.flightName} (${f.flightDirection}) ${f.originCode ?: "—"} -> ${f.destinationCode ?: "—"} " +
        "gate=${f.gate ?: "—"} reg=${f.aircraftRegistration ?: "—"}"
    }
  }

  @Tool(
    description =
      "Find a live airborne flight by flight number or callsign (e.g. 'KL702', 'KLM702', or '702'), " +
        "returning its icao24 hex, coordinates, altitude, and rendering a FlightCard if scheduled.",
  )
  fun findFlightByCallsign(
    @ToolParam(description = "Flight number or ATC callsign such as 'KL702', 'KLM702', or '702'") callsign: String,
    toolContext: ToolContext? = null,
  ): String {
    val cleaned = callsign.trim().uppercase()
    val digits = Regex("(\\d+)").find(cleaned)?.groupValues?.get(1)

    val match =
      inFlightService.getCurrentFlights(query = cleaned, airportFlightsOnly = false).firstOrNull() ?: digits?.let {
        inFlightService
          .getCurrentFlights(
            query = it,
            airportFlightsOnly = false,
          ).firstOrNull()
      }
    if (match != null) {
      match.schedule?.let { toolContext.agUiEmitter()?.emitSurface("FlightCard", mapOf("flight" to it)) }
      val s = match.state
      return buildString {
        append("Live flight: callsign=${s.callsign?.trim() ?: cleaned}, icao24=${s.icao24}, ")
        append("lat=${s.latitude}, lon=${s.longitude}, altitudeMeters=${s.baroAltitude?.roundToInt() ?: "unknown"}, ")
        append("onGround=${s.onGround}, route=${match.originCode ?: "—"}->${match.destinationCode ?: "—"}")
        match.schedule?.let { append(", flightName=${it.flightName}, gate=${it.gate ?: "—"}") }
      }
    }

    val scheduled =
      flightScheduleService.findByFlightName(cleaned).firstOrNull() ?: flightScheduleService.findAll(query = cleaned).firstOrNull()
        ?: digits?.let { num -> flightScheduleService.findAll(query = num).firstOrNull { it.flightNumber == num.toLongOrNull() } }
    if (scheduled != null) {
      toolContext.agUiEmitter()?.emitSurface("FlightCard", mapOf("flight" to scheduled))
      return "Flight $cleaned is not currently airborne, but is scheduled: ${scheduled.flightName} " +
        "(${scheduled.originCode ?: "—"} -> ${scheduled.destinationCode ?: "—"}, " +
        "date=${scheduled.scheduleDate}, gate=${scheduled.gate ?: "—"})."
    }

    return "No live or scheduled flight found matching '$cleaned'."
  }

  @Tool(
    description =
      "Find the closest airports to a live airborne flight by its icao24 hex code, " +
        "render a NearestAirportsCard A2UI surface, and highlight them on the map.",
  )
  fun findNearestAirportsForFlight(
    @ToolParam(description = "Aircraft icao24 transponder hex code returned by findFlightByCallsign")
    icao24: String,
    @ToolParam(
      description = "Number of closest airports to return (default 5)",
      required = false,
    )
    limit: Int? = null,
    @ToolParam(
      description = "If true, filter to emergency medical capable airports only",
      required = false,
    )
    emergencyOnly: Boolean? = null,
    @ToolParam(
      description = "Optional aircraft category: LIGHT, REGIONAL, NARROW_BODY, or WIDE_BODY",
      required = false,
    )
    category: String? = null,
    toolContext: ToolContext? = null,
  ): String {
    val count = (limit ?: 5).coerceIn(1, 10)
    val emergency = emergencyOnly ?: false
    val aircraftCategory =
      category?.trim()?.uppercase()?.let {
        runCatching { AircraftCategory.valueOf(it) }.getOrNull()
      } ?: AircraftCategory.LIGHT
    val normalizedIcao24 = icao24.trim().lowercase()

    val nearest = inFlightService.findNearestAirports(normalizedIcao24, emergency, aircraftCategory, count)
    if (nearest.isEmpty()) {
      return "No nearest airports found for icao24='$icao24' (aircraft position may be unavailable)."
    }

    val codes = nearest.map { it.station.routeCode() }
    toolContext.agUiEmitter()?.let { emitter ->
      emitter.emitSurface(
        "NearestAirportsCard",
        mapOf("icao24" to normalizedIcao24, "emergencyOnly" to emergency, "airports" to nearest),
      )
      emitter.emitWebappAction(
        "showClosestAirportsOnMap",
        mapOf("icao24" to normalizedIcao24, "limit" to count, "emergencyOnly" to emergency, "stationCodes" to codes),
      )
    }

    val lines =
      nearest
        .mapIndexed { idx, item ->
          val st = item.station
          "${idx + 1}. ${st.name} (${st.routeCode()}, ${"%.1f".format(item.distanceKm)} km, " +
            "category=${st.maxAircraftCategory}, medical=${st.emergencyMedicalCapable})"
        }.joinToString("\n")
    return "Closest ${nearest.size} airports to icao24=$normalizedIcao24 (stationCodes=$codes; highlighted on map):\n$lines"
  }
}

internal fun Station.routeCode(): String = icao?.takeIf { it.isNotBlank() } ?: iata?.takeIf { it.isNotBlank() } ?: id
