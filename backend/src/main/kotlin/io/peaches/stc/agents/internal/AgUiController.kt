package io.peaches.stc.agents.internal

import com.agui.community.core.agent.Agent
import com.agui.community.core.agent.RunAgentInput
import com.agui.community.core.event.Event
import com.agui.community.core.event.RunErrorEvent
import io.peaches.stc.agents.AguiSyncRequest
import io.peaches.stc.agents.AguiSyncResponse
import io.peaches.stc.agents.ProviderStatus
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import tools.jackson.databind.json.JsonMapper
import java.util.concurrent.Flow

/**
 * Spring WebMVC controller for the AG-UI protocol (`/api/agui`, `/api/agui/sync`, `/api/agui/providers`).
 */
@RestController
@RequestMapping("/api/agui")
class AgUiController(
  private val agent: Agent,
  private val jsonMapper: JsonMapper,
  private val capabilitiesRegistry: AguiCapabilitiesRegistry,
  private val chatClientFactory: AgentChatClientFactory,
) {
  private val log = LoggerFactory.getLogger(javaClass)

  @PostMapping(produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
  fun run(
    @RequestBody input: RunAgentInput,
  ): SseEmitter {
    val emitter = SseEmitter(0L)
    agent.run(input).subscribe(SseEventSubscriber(emitter))
    return emitter
  }

  @PostMapping("/sync")
  fun syncCapabilities(
    @RequestBody request: AguiSyncRequest,
  ): AguiSyncResponse = capabilitiesRegistry.sync(request)

  @GetMapping("/providers")
  fun listProviders(): List<ProviderStatus> = chatClientFactory.listProviders()

  private inner class SseEventSubscriber(
    private val emitter: SseEmitter,
  ) : Flow.Subscriber<Event> {
    private var subscription: Flow.Subscription? = null

    override fun onSubscribe(subscription: Flow.Subscription) {
      this.subscription = subscription
      emitter.onCompletion { subscription.cancel() }
      emitter.onTimeout { subscription.cancel() }
      subscription.request(Long.MAX_VALUE)
    }

    override fun onNext(event: Event) {
      try {
        emitter.send(SseEmitter.event().data(jsonMapper.writeValueAsString(event)))
      } catch (ex: Throwable) {
        log.error("Failed to send AG-UI event {}: {}", event.type(), ex.message, ex)
        subscription?.cancel()
        sendErrorAndComplete(ex)
      }
    }

    override fun onError(throwable: Throwable) = sendErrorAndComplete(throwable)

    override fun onComplete() = emitter.complete()

    private fun sendErrorAndComplete(throwable: Throwable) {
      runCatching {
        val errorEvent = RunErrorEvent(throwable.message ?: throwable.javaClass.simpleName)
        emitter.send(SseEmitter.event().data(jsonMapper.writeValueAsString(errorEvent)))
      }
      emitter.complete()
    }
  }
}
