package io.peaches.stc.agents.internal

import com.agui.community.core.event.ActivitySnapshotEvent
import com.agui.community.core.event.CustomEvent
import com.agui.community.core.event.Event
import io.peaches.stc.agents.A2UiSurfacePayload
import io.peaches.stc.agents.WebappActionPayload
import org.springframework.ai.chat.model.ToolContext
import java.util.UUID

internal object AgUiContextKeys {
  const val EMITTER = "agui.emitter"
  const val APP_VERSION = "agui.appVersion"
  const val CURRENT_ROUTE = "agui.currentRoute"
  const val UI_STATE = "agui.uiState"
}

internal fun ToolContext?.agUiEmitter(): AgUiTurnEmitter? = this?.context?.get(AgUiContextKeys.EMITTER) as? AgUiTurnEmitter

internal fun ToolContext?.agUiAppVersion(): String? =
  (this?.context?.get(AgUiContextKeys.APP_VERSION) as? String)?.takeIf {
    it.isNotBlank()
  }

/**
 * Thread-safe per-turn AG-UI event emitter shared between backend `@Tool` methods (via Spring AI
 * [ToolContext]) and [AgUiEventStreamAdvisor] (via advisor context). Backed by a serialized
 * Reactor `FluxSink<Event>` (or list in tests) so concurrent emissions are never dropped.
 */
class AgUiTurnEmitter(
  private val onEvent: (Event) -> Unit,
) {
  fun emit(event: Event) {
    onEvent(event)
  }

  fun emitSurface(
    component: String,
    data: Map<String, Any?>,
  ): String {
    val surfaceId = "a2ui-${UUID.randomUUID()}"
    val payload =
      A2UiSurfacePayload(
        surfaceId = surfaceId,
        component = component,
        data = data,
      )
    emit(ActivitySnapshotEvent(surfaceId, A2UI_ACTIVITY_TYPE, payload))
    return surfaceId
  }

  fun emitWebappAction(
    action: String,
    params: Map<String, Any?> = emptyMap(),
  ) {
    emit(CustomEvent(WEBAPP_ACTION_EVENT, WebappActionPayload(action, params)))
  }

  companion object {
    const val A2UI_ACTIVITY_TYPE = "a2ui-surface"
    const val WEBAPP_ACTION_EVENT = "webapp:action"
  }
}
