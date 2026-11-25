package io.peaches.stc.flightstate.internal

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "spring-traffic-control.opensky")
data class OpenSkyProperties(
  val baseUrl: String = "https://opensky-network.org/api",
  val tokenUrl: String = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
  val clientId: String = "",
  val clientSecret: String = "",
  val cacheTtl: Duration = Duration.ofMinutes(30),
) {
  fun hasCredentials(): Boolean = clientId.isNotBlank() && clientSecret.isNotBlank()
}
