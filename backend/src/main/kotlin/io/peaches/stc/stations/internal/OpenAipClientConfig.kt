package io.peaches.stc.stations.internal

import io.peaches.support.openaip.OpenAipApi
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer
import org.springframework.web.service.registry.ImportHttpServices

@Configuration
@ImportHttpServices(group = "openaip", types = [OpenAipApi::class])
class OpenAipClientConfig {
  @Bean
  fun openAipHttpServiceGroupConfigurer(properties: OpenAipProperties): RestClientHttpServiceGroupConfigurer =
    RestClientHttpServiceGroupConfigurer { groups ->
      groups.filterByName("openaip").forEachClient { _, builder ->
        builder.baseUrl(properties.baseUrl)
        if (properties.apiKey.isNotBlank()) {
          builder.defaultHeader("x-openaip-api-key", properties.apiKey.trim())
        }
      }
    }
}
