package io.peaches.stc.agents.internal

import io.peaches.stc.agents.AguiSyncRequest
import io.peaches.stc.agents.AguiSyncResponse
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference

@Component
class AguiCapabilitiesRegistry {
  private val byVersion = ConcurrentHashMap<String, AguiSyncRequest>()
  private val latestVersion = AtomicReference<String?>(null)

  fun sync(request: AguiSyncRequest): AguiSyncResponse {
    val version = request.appVersion.trim().ifBlank { "default" }
    val normalized = request.copy(appVersion = version)
    byVersion[version] = normalized
    latestVersion.set(version)
    return AguiSyncResponse(
      appVersion = version,
      surfaceCount = normalized.surfaces.size,
      actionCount = normalized.actions.size,
    )
  }

  fun get(appVersion: String?): AguiSyncRequest? {
    val requested = appVersion?.trim()?.takeIf { it.isNotBlank() }
    if (requested != null) {
      byVersion[requested]?.let { return it }
    }
    return latestVersion.get()?.let { byVersion[it] }
  }
}
