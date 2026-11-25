package io.peaches.stc

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "spring-traffic-control.schiphol")
data class SchipholProperties(
  val baseUrl: String = "https://api.schiphol.nl/public/public-flights/v4",
  val tokenUrl: String = "https://api.auth.schiphol.nl/oauth/token",
  val clientId: String = "",
  val clientSecret: String = "",
  val audience: String = "https://api.schiphol.nl/public",
) {
  fun hasCredentials(): Boolean = clientId.isNotBlank() && clientSecret.isNotBlank()
}
