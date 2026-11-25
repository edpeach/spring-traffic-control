package io.peaches.stc.agents.internal

import org.springframework.ai.chat.client.ChatClientRequest
import org.springframework.ai.chat.client.ChatClientResponse
import org.springframework.ai.chat.client.advisor.ToolCallingAdvisor
import org.springframework.ai.chat.client.advisor.api.AdvisorChain
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor
import org.springframework.stereotype.Component

/**
 * Spring AI 2.1 [BaseAdvisor] ordered **before** [ToolCallingAdvisor] that augments the system
 * prompt with live frontend route, UI selection state, and synced AG-UI capabilities.
 */
@Component
class UiContextAdvisor(
  private val capabilitiesRegistry: AguiCapabilitiesRegistry,
) : BaseAdvisor {
  override fun getName(): String = "UiContextAdvisor"

  override fun getOrder(): Int = ToolCallingAdvisor.DEFAULT_ORDER - 100

  override fun before(
    chatClientRequest: ChatClientRequest,
    advisorChain: AdvisorChain,
  ): ChatClientRequest {
    val ctx = chatClientRequest.context()
    val addendum =
      buildContextAddendum(
        appVersion = ctx[AgUiContextKeys.APP_VERSION] as? String,
        currentRoute = ctx[AgUiContextKeys.CURRENT_ROUTE] as? String,
        uiState = asMap(ctx[AgUiContextKeys.UI_STATE]),
      )
    if (addendum.isBlank()) return chatClientRequest

    val augmentedPrompt =
      chatClientRequest.prompt().augmentSystemMessage { existing ->
        val base = existing.text.orEmpty().trim()
        existing.mutate().text(if (base.isNotEmpty()) "$base\n\n$addendum" else addendum).build()
      }
    return chatClientRequest.mutate().prompt(augmentedPrompt).build()
  }

  override fun after(
    chatClientResponse: ChatClientResponse,
    advisorChain: AdvisorChain,
  ): ChatClientResponse = chatClientResponse

  internal fun buildContextAddendum(
    appVersion: String?,
    currentRoute: String?,
    uiState: Map<String, Any?> = emptyMap(),
  ): String =
    buildString {
      if (!currentRoute.isNullOrBlank()) {
        val page =
          uiState["currentPage"]
            ?.toString()
            ?.takeIf { it.isNotBlank() }
            ?.let { " (page=$it)" }
            .orEmpty()
        appendLine("Current frontend route: $currentRoute$page")
      }

      val uiSummary =
        listOf("theme", "colorMode", "mapProjection")
          .mapNotNull { key -> uiState[key]?.toString()?.takeIf { it.isNotBlank() }?.let { "$key=$it" } }
      if (uiSummary.isNotEmpty()) {
        appendLine("Current UI state: ${uiSummary.joinToString(", ")}")
      }

      val liveFlight = asMap(uiState["selectedLiveFlight"])
      val scheduledFlight = asMap(uiState["selectedScheduledFlight"])
      val stations = asMapList(uiState["selectedStations"])
      if (liveFlight.isNotEmpty() || scheduledFlight.isNotEmpty() || stations.isNotEmpty()) {
        appendLine(
          "\nCurrently selected / open in the UI " +
            "(refer to these when the user says 'this flight', 'this airport', or 'it'):",
        )
        if (liveFlight.isNotEmpty()) appendLine("- Live flight: $liveFlight")
        if (scheduledFlight.isNotEmpty()) appendLine("- Scheduled flight: $scheduledFlight")
        if (stations.isNotEmpty()) appendLine("- Stations: $stations")
      }

      val contextualActions = asMapList(uiState["contextualActions"])
      if (contextualActions.isNotEmpty()) {
        appendLine("\nRecommended contextual actions for this page:")
        contextualActions.forEach { appendLine("- ${it["action"]}: ${it["when"] ?: ""}") }
      }

      capabilitiesRegistry.get(appVersion)?.actions?.takeIf { it.isNotEmpty() }?.let { actions ->
        appendLine("\nAvailable frontend actions (call via triggerWebappAction):")
        actions.forEach { appendLine("- ${it.name}: ${it.description}") }
      }
    }.trim()

  private fun asMap(raw: Any?): Map<String, Any?> = (raw as? Map<*, *>)?.entries?.associate { (k, v) -> k.toString() to v }.orEmpty()

  private fun asMapList(raw: Any?): List<Map<String, Any?>> =
    (raw as? Iterable<*>)
      ?.mapNotNull {
        asMap(it).takeIf { m -> m.isNotEmpty() }
      }.orEmpty()
}
