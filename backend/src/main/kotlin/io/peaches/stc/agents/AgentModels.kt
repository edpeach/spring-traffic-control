package io.peaches.stc.agents

enum class AgentProvider {
  GEMINI,
  OLLAMA,
}

data class ProviderStatus(
  val id: AgentProvider,
  val label: String,
  val model: String,
  val available: Boolean,
  val default: Boolean,
)

data class AguiSurfaceDescriptor(
  val name: String,
  val description: String,
  val schema: Map<String, Any?> = emptyMap(),
)

data class AguiActionDescriptor(
  val name: String,
  val description: String,
  val parametersSchema: Map<String, Any?> = emptyMap(),
)

data class AguiSyncRequest(
  val appVersion: String,
  val surfaces: List<AguiSurfaceDescriptor> = emptyList(),
  val actions: List<AguiActionDescriptor> = emptyList(),
)

data class AguiSyncResponse(
  val appVersion: String,
  val surfaceCount: Int,
  val actionCount: Int,
)

data class A2UiSurfacePayload(
  val surfaceId: String,
  val component: String,
  val data: Map<String, Any?>,
)

data class WebappActionPayload(
  val action: String,
  val params: Map<String, Any?> = emptyMap(),
)
