package io.peaches.stc.agents.internal

import io.micrometer.observation.ObservationRegistry
import io.peaches.stc.agents.AgentProvider
import io.peaches.stc.agents.ProviderStatus
import org.springframework.ai.chat.client.ChatClient
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor
import org.springframework.ai.chat.client.advisor.ToolCallingAdvisor
import org.springframework.ai.chat.client.advisor.observation.AdvisorObservationConvention
import org.springframework.ai.chat.client.observation.ChatClientObservationConvention
import org.springframework.ai.chat.model.ChatModel
import org.springframework.ai.google.genai.GoogleGenAiChatModel
import org.springframework.ai.model.google.genai.autoconfigure.chat.GoogleGenAiChatProperties
import org.springframework.ai.model.google.genai.autoconfigure.chat.GoogleGenAiConnectionProperties
import org.springframework.ai.model.openai.autoconfigure.OpenAiChatProperties
import org.springframework.ai.model.tool.ToolCallingManager
import org.springframework.ai.openai.OpenAiChatModel
import org.springframework.beans.factory.ObjectProvider
import org.springframework.stereotype.Component

/**
 * Resolves the active Spring AI 2.1 [ChatClient] per AG-UI request (`GEMINI` vs `OLLAMA`).
 *
 * Uses Spring AI 2.1's 5-argument `ChatClient.builder(...)` so every `ChatClient`, `ChatModel`,
 * `Advisor`, and `ToolCallingManager` invocation records Micrometer / OpenTelemetry spans and
 * metrics (`gen_ai.client.operation`, `gen_ai.client.token.usage`, `spring.ai.tool`) to Grafana LGTM.
 */
@Component
class AgentChatClientFactory(
  private val agentProperties: AgentProperties,
  private val uiContextAdvisor: UiContextAdvisor,
  private val agUiEventStreamAdvisor: AgUiEventStreamAdvisor,
  private val aviationAgentTools: AviationAgentTools,
  private val frontendControlTools: FrontendControlTools,
  private val googleGenAiChatModel: ObjectProvider<GoogleGenAiChatModel>,
  private val openAiChatModel: ObjectProvider<OpenAiChatModel>,
  private val googleConnectionProperties: ObjectProvider<GoogleGenAiConnectionProperties>,
  private val googleChatProperties: ObjectProvider<GoogleGenAiChatProperties>,
  private val openAiChatProperties: ObjectProvider<OpenAiChatProperties>,
  private val observationRegistry: ObjectProvider<ObservationRegistry>,
  private val chatClientObservationConvention: ObjectProvider<ChatClientObservationConvention>,
  private val advisorObservationConvention: ObjectProvider<AdvisorObservationConvention>,
  private val toolCallingManager: ObjectProvider<ToolCallingManager>,
) {
  fun createChatClient(requestedProvider: AgentProvider?): ChatClient {
    val provider = requestedProvider ?: agentProperties.provider
    val chatModel =
      resolveChatModel(provider)
        ?: throw IllegalStateException("ChatModel for provider '$provider' is not configured or available.")
    val registry = observationRegistry.getIfUnique { ObservationRegistry.NOOP }
    val toolAdvisorBuilder =
      toolCallingManager.ifAvailable?.let { manager ->
        ToolCallingAdvisor.builder().toolCallingManager(manager)
      }
    val loggerAdvisor =
      SimpleLoggerAdvisor
        .builder()
        .order(ToolCallingAdvisor.DEFAULT_ORDER + 50)
        .build()
    return ChatClient
      .builder(
        chatModel,
        registry,
        chatClientObservationConvention.ifAvailable,
        advisorObservationConvention.ifAvailable,
        toolAdvisorBuilder,
      ).defaultSystem(agentProperties.systemPrompt.trim())
      .defaultTools(aviationAgentTools, frontendControlTools)
      .defaultAdvisors(uiContextAdvisor, loggerAdvisor, agUiEventStreamAdvisor)
      .build()
  }

  fun listProviders(): List<ProviderStatus> {
    val defaultProvider = agentProperties.provider
    val geminiKey =
      googleConnectionProperties.ifAvailable
        ?.apiKey
        ?.trim()
        .orEmpty()
    val geminiAvailable =
      googleGenAiChatModel.ifAvailable != null &&
        geminiKey.isNotBlank() &&
        !geminiKey.equals("disabled", ignoreCase = true)
    val geminiModel =
      googleChatProperties.ifAvailable
        ?.model
        .orEmpty()
        .ifBlank { "gemini" }

    val ollamaAvailable = openAiChatModel.ifAvailable != null
    val ollamaModel =
      openAiChatProperties.ifAvailable
        ?.model
        .orEmpty()
        .ifBlank { "ollama" }

    return listOf(
      ProviderStatus(
        id = AgentProvider.OLLAMA,
        label = "Ollama (Local)",
        model = ollamaModel,
        available = ollamaAvailable,
        default = defaultProvider == AgentProvider.OLLAMA,
      ),
      ProviderStatus(
        id = AgentProvider.GEMINI,
        label = "Google Gemini",
        model = geminiModel,
        available = geminiAvailable,
        default = defaultProvider == AgentProvider.GEMINI,
      ),
    )
  }

  private fun resolveChatModel(provider: AgentProvider): ChatModel? =
    when (provider) {
      AgentProvider.GEMINI -> googleGenAiChatModel.ifAvailable
      AgentProvider.OLLAMA -> openAiChatModel.ifAvailable
    }
}
