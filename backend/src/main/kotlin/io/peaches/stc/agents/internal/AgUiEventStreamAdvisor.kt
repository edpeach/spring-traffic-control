package io.peaches.stc.agents.internal

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
import com.agui.community.core.message.Role
import org.springframework.ai.chat.client.ChatClientRequest
import org.springframework.ai.chat.client.ChatClientResponse
import org.springframework.ai.chat.client.advisor.ToolCallingAdvisor
import org.springframework.ai.chat.client.advisor.api.StreamAdvisor
import org.springframework.ai.chat.client.advisor.api.StreamAdvisorChain
import org.springframework.ai.chat.messages.AssistantMessage
import org.springframework.stereotype.Component
import reactor.core.publisher.Flux
import java.util.UUID

/**
 * Stateless Spring AI 2.1 [StreamAdvisor] ordered strictly **after** [ToolCallingAdvisor.DEFAULT_ORDER]
 * so it observes streamed chunks read-only inside the recursive tool-calling loop — preserving
 * Gemini `PAYLOAD_THOUGHT_SIGNATURE` while translating `ReasoningPart`, text, and `ToolCall`s
 * into AG-UI protocol events.
 */
@Component
class AgUiEventStreamAdvisor : StreamAdvisor {
  override fun getName(): String = "AgUiEventStreamAdvisor"

  override fun getOrder(): Int = ToolCallingAdvisor.DEFAULT_ORDER + 100

  override fun adviseStream(
    chatClientRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ): Flux<ChatClientResponse> {
    val emitter =
      chatClientRequest.context()[AgUiContextKeys.EMITTER] as? AgUiTurnEmitter
        ?: return streamAdvisorChain.nextStream(chatClientRequest)
    val state = TurnStreamState(emitter)
    return streamAdvisorChain
      .nextStream(chatClientRequest)
      .doOnNext { response ->
        response
          .chatResponse()
          ?.result
          ?.output
          ?.let(state::onChunk)
      }.doOnComplete(state::finish)
      .doOnError { state.finish() }
      .doOnCancel(state::finish)
  }

  private class TurnStreamState(
    private val emitter: AgUiTurnEmitter,
  ) {
    private val messageId = "msg-${UUID.randomUUID()}"
    private val reasoningId = "$messageId-reasoning"
    private val emittedToolCallIds = LinkedHashSet<String>()
    private var reasoningOpen = false
    private var textOpen = false

    fun onChunk(message: AssistantMessage) {
      for (part in message.reasoning) {
        val delta = part.text()?.takeIf { it.isNotEmpty() } ?: part.summary()?.takeIf { it.isNotEmpty() } ?: continue
        closeText()
        if (!reasoningOpen) {
          emitter.emit(ReasoningStartEvent(reasoningId))
          emitter.emit(ReasoningMessageStartEvent(reasoningId))
          reasoningOpen = true
        }
        emitter.emit(ReasoningMessageContentEvent(reasoningId, delta))
      }

      val text = message.text
      if (!text.isNullOrEmpty()) {
        closeReasoning()
        if (!textOpen) {
          emitter.emit(TextMessageStartEvent(messageId, Role.ASSISTANT))
          textOpen = true
        }
        emitter.emit(TextMessageContentEvent(messageId, text))
      }

      if (message.hasToolCalls()) {
        finish()
        for (toolCall in message.toolCalls) {
          val callId = toolCall.id().ifBlank { "tc-${UUID.randomUUID()}" }
          if (emittedToolCallIds.add(callId)) {
            emitter.emit(ToolCallStartEvent(callId, toolCall.name(), messageId, null, null))
            if (toolCall.arguments().isNotBlank()) {
              emitter.emit(ToolCallArgsEvent(callId, toolCall.arguments()))
            }
            emitter.emit(ToolCallEndEvent(callId))
          }
        }
      }
    }

    fun finish() {
      closeReasoning()
      closeText()
    }

    private fun closeReasoning() {
      if (reasoningOpen) {
        emitter.emit(ReasoningMessageEndEvent(reasoningId))
        emitter.emit(ReasoningEndEvent(reasoningId))
        reasoningOpen = false
      }
    }

    private fun closeText() {
      if (textOpen) {
        emitter.emit(TextMessageEndEvent(messageId))
        textOpen = false
      }
    }
  }
}
