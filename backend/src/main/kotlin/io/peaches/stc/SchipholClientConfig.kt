package io.peaches.stc

import io.peaches.support.schiphol.SchipholApi
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager
import org.springframework.security.oauth2.client.web.client.OAuth2ClientHttpRequestInterceptor
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer
import org.springframework.web.service.registry.ImportHttpServices

@Configuration
@ImportHttpServices(group = "schiphol", types = [SchipholApi::class])
class SchipholClientConfig {
  @Bean
  fun schipholHttpServiceGroupConfigurer(
    properties: SchipholProperties,
    authorizedClientManager: OAuth2AuthorizedClientManager,
  ): RestClientHttpServiceGroupConfigurer =
    RestClientHttpServiceGroupConfigurer { groups ->
      val oauth2Interceptor =
        OAuth2ClientHttpRequestInterceptor(authorizedClientManager).apply {
          setClientRegistrationIdResolver { SecurityConfig.SCHIPHOL_REGISTRATION_ID }
        }

      groups.filterByName("schiphol").forEachClient { _, builder ->
        builder
          .baseUrl(properties.baseUrl)
          .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
          .defaultHeader("ResourceVersion", "v4")
          .requestInterceptor(oauth2Interceptor)
      }
    }
}
