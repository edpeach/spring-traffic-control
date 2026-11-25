package io.peaches.stc.agents.internal

import com.agui.community.core.event.Event
import com.agui.community.core.event.EventType
import com.agui.community.core.message.AssistantMessage
import com.agui.community.core.message.DeveloperMessage
import com.agui.community.core.message.Message
import com.agui.community.core.message.ReasoningMessage
import com.agui.community.core.message.Role
import com.agui.community.core.message.SystemMessage
import com.agui.community.core.message.ToolMessage
import com.agui.community.core.message.UserMessage
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonSubTypes.Type
import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.fasterxml.jackson.annotation.JsonValue
import org.springframework.stereotype.Component
import tools.jackson.databind.module.SimpleModule

/**
 * Minimal Jackson 3 [SimpleModule] auto-registered by Spring Boot 4.2 into the primary
 * `JsonMapper` so dependency-free `com.ag-ui.community:java-core` types serialize/deserialize
 * natively across Spring WebMVC `@RequestBody` and SSE responses.
 */
@Component
class AgUiJacksonModule : SimpleModule("ag-ui") {
  init {
    setMixInAnnotation(Event::class.java, EventMixin::class.java)
    setMixInAnnotation(Role::class.java, RoleMixin::class.java)
    setMixInAnnotation(Message::class.java, MessageMixin::class.java)
  }

  @JsonInclude(JsonInclude.Include.NON_NULL)
  private interface EventMixin {
    @JsonProperty("type")
    fun type(): EventType
  }

  private interface RoleMixin {
    @JsonValue
    fun value(): String
  }

  @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "role")
  @JsonSubTypes(
    Type(value = DeveloperMessage::class, name = "developer"),
    Type(value = SystemMessage::class, name = "system"),
    Type(value = AssistantMessage::class, name = "assistant"),
    Type(value = UserMessage::class, name = "user"),
    Type(value = ToolMessage::class, name = "tool"),
    Type(value = ReasoningMessage::class, name = "reasoning"),
  )
  private interface MessageMixin
}
