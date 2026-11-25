package io.peaches.stc.flightstate.internal

import io.peaches.support.opensky.OpenSkyApi
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager
import org.springframework.security.oauth2.client.registration.ClientRegistration
import org.springframework.security.oauth2.client.web.client.OAuth2ClientHttpRequestInterceptor
import org.springframework.security.oauth2.core.AuthorizationGrantType
import org.springframework.security.oauth2.core.ClientAuthenticationMethod
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer
import org.springframework.web.service.registry.ImportHttpServices

@Configuration
@ImportHttpServices(group = "opensky", types = [OpenSkyApi::class])
class OpenSkyClientConfig {
  @Bean
  fun openSkyClientRegistration(properties: OpenSkyProperties): ClientRegistration =
    ClientRegistration
      .withRegistrationId(OPENSKY_REGISTRATION_ID)
      .clientId(properties.clientId.ifBlank { "unconfigured" })
      .clientSecret(properties.clientSecret.ifBlank { "unconfigured" })
      .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
      .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
      .tokenUri(properties.tokenUrl)
      .build()

  @Bean
  fun openSkyHttpServiceGroupConfigurer(
    properties: OpenSkyProperties,
    authorizedClientManager: OAuth2AuthorizedClientManager,
  ): RestClientHttpServiceGroupConfigurer =
    RestClientHttpServiceGroupConfigurer { groups ->
      groups.filterByName("opensky").forEachClient { _, builder ->
        builder.baseUrl(properties.baseUrl)
        if (properties.hasCredentials()) {
          val oauth2Interceptor =
            OAuth2ClientHttpRequestInterceptor(authorizedClientManager).apply {
              setClientRegistrationIdResolver { OPENSKY_REGISTRATION_ID }
            }
          builder.requestInterceptor(oauth2Interceptor)
        }
      }
    }

  companion object {
    const val OPENSKY_REGISTRATION_ID = "opensky"
  }
}
