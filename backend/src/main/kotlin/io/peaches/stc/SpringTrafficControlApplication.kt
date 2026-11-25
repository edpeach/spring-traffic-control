package io.peaches.stc

import org.springframework.ai.model.chat.client.autoconfigure.ChatClientAutoConfiguration
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication(
  exclude = [
    ChatClientAutoConfiguration::class,
  ],
)
@ConfigurationPropertiesScan
class SpringTrafficControlApplication

fun main(args: Array<String>) {
  runApplication<SpringTrafficControlApplication>(*args)
}
