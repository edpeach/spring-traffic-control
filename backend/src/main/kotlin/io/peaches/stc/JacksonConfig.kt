package io.peaches.stc

import com.fasterxml.jackson.annotation.JsonSetter
import com.fasterxml.jackson.annotation.Nulls
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import tools.jackson.databind.DeserializationFeature
import tools.jackson.module.kotlin.KotlinFeature
import tools.jackson.module.kotlin.kotlinModule

@Configuration
class JacksonConfig {
  @Bean
  fun openAipFriendlyJsonMapperCustomizer(): JsonMapperBuilderCustomizer =
    JsonMapperBuilderCustomizer { builder ->
      builder
        .addModule(
          kotlinModule {
            enable(KotlinFeature.NullToEmptyCollection)
            enable(KotlinFeature.NullToEmptyMap)
            enable(KotlinFeature.NullIsSameAsDefault)
          },
        ).disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
        .disable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
        .withConfigOverride(Collection::class.java) {
          it.nullHandling = JsonSetter.Value.forValueNulls(Nulls.AS_EMPTY)
        }.withConfigOverride(Map::class.java) {
          it.nullHandling = JsonSetter.Value.forValueNulls(Nulls.AS_EMPTY)
        }
    }
}
