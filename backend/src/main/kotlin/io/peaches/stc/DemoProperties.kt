package io.peaches.stc

import org.springframework.boot.context.properties.ConfigurationProperties
import java.nio.file.Files
import java.nio.file.Path

@ConfigurationProperties(prefix = "spring-traffic-control.demo")
data class DemoProperties(
  val enabled: Boolean = true,
  val seedDir: String = "",
) {
  fun resolveSeedPath(): Path? {
    val candidates =
      buildList {
        if (seedDir.isNotBlank()) add(Path.of(seedDir))
        add(Path.of("data/seed"))
        add(Path.of("../data/seed"))
      }
    return candidates.firstOrNull { Files.isDirectory(it) }
  }
}
