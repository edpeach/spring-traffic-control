package io.peaches.stc.agents.internal

import io.peaches.stc.schedule.FlightScheduleService
import io.peaches.stc.stations.LoadStationsService
import org.springframework.ai.chat.model.ToolContext
import org.springframework.ai.tool.annotation.Tool
import org.springframework.ai.tool.annotation.ToolParam
import org.springframework.stereotype.Component

/**
 * Frontend control `@Tool` bean that validates synced AG-UI actions and emits `webapp:action`
 * custom events via [ToolContext].
 */
@Component
class FrontendControlTools(
  private val capabilitiesRegistry: AguiCapabilitiesRegistry,
  private val loadStationsService: LoadStationsService,
  private val flightScheduleService: FlightScheduleService,
) {
  @Tool(
    description =
      "Execute a UI control action on the Angular frontend ('navigate', 'selectStationOnMap', " +
        "'selectFlightOnMap', 'showClosestAirportsOnMap', 'setMapProjection', 'toggleMapLayer', 'setTheme', or 'setColorMode').",
  )
  fun triggerWebappAction(
    @ToolParam(
      description =
        "Exact action name, e.g. 'navigate', 'selectStationOnMap', 'selectFlightOnMap', " +
          "'showClosestAirportsOnMap', 'setMapProjection', 'toggleMapLayer', 'setTheme', 'setColorMode'",
    )
    action: String,
    @ToolParam(
      description =
        "Action parameters matching the action schema, e.g. {\"route\": \"/map\"}, {\"code\": \"EHAM\"}, " +
          "{\"icao24\": \"484162\"}, {\"layerId\": \"day-night\", \"visible\": false}, " +
          "{\"theme\": \"autumn\"}, or {\"mode\": \"light\"}",
      required = false,
    )
    params: Map<String, Any?>? = null,
    toolContext: ToolContext? = null,
  ): String {
    val normalizedAction = action.trim()
    val capabilities = capabilitiesRegistry.get(toolContext.agUiAppVersion())
    if (capabilities != null && capabilities.actions.isNotEmpty() &&
      capabilities.actions.none { it.name == normalizedAction }
    ) {
      val validNames = capabilities.actions.joinToString(", ") { it.name }
      return "Unknown action '$normalizedAction'. Available actions: $validNames."
    }

    val safeParams = (params ?: emptyMap()).toMutableMap()
    if (normalizedAction == "navigate") {
      val rawRoute = safeParams["route"]?.toString()?.trim().orEmpty()
      val normalizedRoute = if (rawRoute.startsWith("/")) rawRoute else "/$rawRoute"
      validateAndNormalizeDetailRoute(normalizedRoute, safeParams)?.let { return it }
    }

    toolContext.agUiEmitter()?.emitWebappAction(normalizedAction, safeParams)
    return "Triggered frontend action '$normalizedAction' with params=$safeParams."
  }

  private fun validateAndNormalizeDetailRoute(
    route: String,
    params: MutableMap<String, Any?>,
  ): String? {
    val path = route.substringBefore("?").trimEnd('/')

    STATION_DETAIL_REGEX.matchEntire(path)?.let { match ->
      val code = match.groupValues[1].trim()
      val station =
        loadStationsService.findByCode(code)
          ?: loadStationsService.findAll(query = code).firstOrNull()
          ?: return "Cannot navigate to '$route': no station found matching '$code'."
      params["route"] = "/stations/${station.routeCode()}"
      return null
    }

    FLIGHT_DETAIL_REGEX.matchEntire(path)?.let { match ->
      val id = match.groupValues[1].trim().uppercase()
      val digits =
        Regex("(\\d+)")
          .find(id)
          ?.groupValues
          ?.get(1)
          ?.toLongOrNull()
      val flight =
        flightScheduleService.findByFlightName(id).firstOrNull()
          ?: flightScheduleService.findAll(query = id).firstOrNull()
          ?: digits?.let { num -> flightScheduleService.findAll(query = num.toString()).firstOrNull { it.flightNumber == num } }
          ?: return "Cannot navigate to '$route': no scheduled flight found matching '$id'."
      params["route"] = "/flights/${flight.flightName}"
      return null
    }

    params["route"] = route
    return null
  }

  companion object {
    private val STATION_DETAIL_REGEX = Regex("^/stations/([^/]+)$", RegexOption.IGNORE_CASE)
    private val FLIGHT_DETAIL_REGEX = Regex("^/flights/([^/]+)$", RegexOption.IGNORE_CASE)
  }
}
