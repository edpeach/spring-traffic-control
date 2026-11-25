package io.peaches.stc.stations.internal

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "spring-traffic-control.openaip")
data class OpenAipProperties(
  val baseUrl: String = "https://api.core.openaip.net/api",
  val apiKey: String = "",
)
