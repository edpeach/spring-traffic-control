package io.peaches.stc.agents.internal

import io.peaches.stc.agents.AgentProvider
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "spring-traffic-control.agents")
data class AgentProperties(
  val provider: AgentProvider = AgentProvider.OLLAMA,
  val systemPrompt: String = DEFAULT_SYSTEM_PROMPT,
) {
  companion object {
    const val DEFAULT_SYSTEM_PROMPT =
      "You are the Spring Traffic Control aviation assistant. " +
        "Use your tools to fetch live data, render A2UI cards, and control the frontend."
  }
}
