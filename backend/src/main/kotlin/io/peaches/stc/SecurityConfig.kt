package io.peaches.stc

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.oauth2.client.AuthorizedClientServiceOAuth2AuthorizedClientManager
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientProviderBuilder
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService
import org.springframework.security.oauth2.client.endpoint.RestClientClientCredentialsTokenResponseClient
import org.springframework.security.oauth2.client.registration.ClientRegistration
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository
import org.springframework.security.oauth2.core.AuthorizationGrantType
import org.springframework.security.oauth2.core.ClientAuthenticationMethod
import org.springframework.security.web.SecurityFilterChain
import org.springframework.util.LinkedMultiValueMap

@Configuration
class SecurityConfig {
  @Bean
  fun securityFilterChain(http: HttpSecurity): SecurityFilterChain =
    http
      .csrf { it.disable() }
      .authorizeHttpRequests { it.anyRequest().permitAll() }
      .build()

  @Bean
  fun schipholClientRegistration(schipholProperties: SchipholProperties): ClientRegistration =
    ClientRegistration
      .withRegistrationId(SCHIPHOL_REGISTRATION_ID)
      .clientId(schipholProperties.clientId.ifBlank { "unconfigured" })
      .clientSecret(schipholProperties.clientSecret.ifBlank { "unconfigured" })
      .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
      .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
      .tokenUri(schipholProperties.tokenUrl)
      .build()

  @Bean
  fun clientRegistrationRepository(registrations: List<ClientRegistration>): ClientRegistrationRepository = InMemoryClientRegistrationRepository(registrations)

  @Bean
  fun authorizedClientService(clientRegistrationRepository: ClientRegistrationRepository): OAuth2AuthorizedClientService =
    InMemoryOAuth2AuthorizedClientService(clientRegistrationRepository)

  @Bean
  fun authorizedClientManager(
    clientRegistrationRepository: ClientRegistrationRepository,
    authorizedClientService: OAuth2AuthorizedClientService,
    schipholProperties: SchipholProperties,
  ): OAuth2AuthorizedClientManager {
    val tokenResponseClient =
      RestClientClientCredentialsTokenResponseClient().apply {
        addParametersConverter { grantRequest ->
          val params = LinkedMultiValueMap<String, String>()
          if (
            grantRequest.clientRegistration.registrationId == SCHIPHOL_REGISTRATION_ID &&
            schipholProperties.audience.isNotBlank()
          ) {
            params.add("audience", schipholProperties.audience)
          }
          params
        }
      }

    val provider =
      OAuth2AuthorizedClientProviderBuilder
        .builder()
        .clientCredentials { it.accessTokenResponseClient(tokenResponseClient) }
        .build()

    return AuthorizedClientServiceOAuth2AuthorizedClientManager(
      clientRegistrationRepository,
      authorizedClientService,
    ).apply {
      setAuthorizedClientProvider(provider)
    }
  }

  companion object {
    const val SCHIPHOL_REGISTRATION_ID = "schiphol"
  }
}
