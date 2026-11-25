package io.peaches.stc.agents.internal

import com.agui.community.core.agent.Agent
import com.agui.community.core.agent.RunAgentInput
import com.agui.community.core.event.Event
import com.agui.community.core.event.RunErrorEvent
import com.agui.community.core.event.RunFinishedEvent
import com.agui.community.core.event.RunStartedEvent
import com.agui.community.core.message.Role
import io.peaches.stc.agents.AgentProvider
import org.reactivestreams.FlowAdapters
import org.slf4j.LoggerFactory
import org.springframework.ai.chat.messages.AssistantMessage
import org.springframework.ai.chat.messages.Message
import org.springframework.ai.chat.messages.SystemMessage
import org.springframework.ai.chat.messages.UserMessage
import org.springframework.stereotype.Component
import reactor.core.publisher.Flux
import reactor.core.scheduler.Schedulers
import java.util.concurrent.Flow
import com.agui.community.core.message.Message as AgUiMessage

/**
 * AG-UI [Agent] delegating prompt augmentation ([UiContextAdvisor]), recursive tool execution
 * (`ToolCallingAdvisor`), and AG-UI stream translation ([AgUiEventStreamAdvisor]) to Spring AI
 * 2.1's built-in advisor chain and `ToolContext`.
 */
@Component
class TrafficControlAgUiAgent(
  private val chatClientFactory: AgentChatClientFactory,
) : Agent {
  private val log = LoggerFactory.getLogger(javaClass)

  override fun run(input: RunAgentInput): Flow.Publisher<Event> {
    val threadId = input.threadId().orEmpty().ifBlank { "default-thread" }
    val runId = input.runId().orEmpty().ifBlank { "run-${System.currentTimeMillis()}" }
    val forwarded = extractMap(input.forwardedProps())
    val requestedProvider = parseProvider(forwarded["provider"]?.toString())
    val appVersion = forwarded["appVersion"]?.toString()
    val currentRoute = forwarded["currentRoute"]?.toString()
    val uiState = extractMap(forwarded["uiState"])

    val flux =
      Flux.create { fluxSink ->
        val emitter =
          AgUiTurnEmitter { event ->
            if (!fluxSink.isCancelled) {
              fluxSink.next(event)
            }
          }

        try {
          emitter.emit(RunStartedEvent(threadId, runId))

          val chatClient = chatClientFactory.createChatClient(requestedProvider)
          val disposable =
            chatClient
              .prompt()
              .messages(input.messages().mapNotNull { it.toSpringMessage() })
              .advisors { spec ->
                spec.param(AgUiContextKeys.EMITTER, emitter)
                appVersion?.let { spec.param(AgUiContextKeys.APP_VERSION, it) }
                currentRoute?.let { spec.param(AgUiContextKeys.CURRENT_ROUTE, it) }
                if (uiState.isNotEmpty()) spec.param(AgUiContextKeys.UI_STATE, uiState)
              }.toolContext(
                buildMap {
                  put(AgUiContextKeys.EMITTER, emitter)
                  appVersion?.let { put(AgUiContextKeys.APP_VERSION, it) }
                },
              ).stream()
              .chatResponse()
              .subscribeOn(Schedulers.boundedElastic())
              .subscribe(
                { /* chunks are emitted inside AgUiEventStreamAdvisor */ },
                { ex ->
                  log.error("AG-UI run failed (threadId={}, runId={}): {}", threadId, runId, ex.message, ex)
                  emitter.emit(RunErrorEvent(ex.message ?: ex.javaClass.simpleName))
                  fluxSink.complete()
                },
                {
                  emitter.emit(RunFinishedEvent(threadId, runId))
                  fluxSink.complete()
                },
              )

          fluxSink.onDispose(disposable)
        } catch (ex: Exception) {
          log.error("AG-UI run initialization failed (threadId={}, runId={}): {}", threadId, runId, ex.message, ex)
          emitter.emit(RunErrorEvent(ex.message ?: ex.javaClass.simpleName))
          fluxSink.complete()
        }
      }

    return FlowAdapters.toFlowPublisher(flux)
  }

  private fun AgUiMessage.toSpringMessage(): Message? {
    val text = content()?.takeIf(String::isNotBlank) ?: return null
    return when (role()) {
      Role.USER -> UserMessage(text)
      Role.ASSISTANT -> AssistantMessage(text)
      Role.SYSTEM, Role.DEVELOPER -> SystemMessage(text)
      Role.TOOL, Role.REASONING, null -> null
    }
  }

  private fun extractMap(raw: Any?): Map<String, Any?> =
    when (raw) {
      is Map<*, *> -> raw.entries.associate { (k, v) -> k.toString() to v }
      else -> emptyMap()
    }

  private fun parseProvider(raw: String?): AgentProvider? =
    raw?.trim()?.uppercase()?.takeIf { it.isNotBlank() }?.let {
      runCatching { AgentProvider.valueOf(it) }.getOrNull()
    }
}
