---
name: spring-boot-4-ai-kotlin
description: >-
  Best practices for building backend services and Agentic UI endpoints with
  Spring Boot 4.2, Spring AI 2.1, Kotlin 2.4, Java 25, and Gradle 9.8+.
  Activate this skill whenever creating, modifying, or reviewing Kotlin backend
  code, Spring Boot configuration, Spring AI @Tool / ChatClient integrations,
  SSE streaming endpoints, or Gradle build scripts.
---

# Spring Boot 4.2 + Spring AI 2.1 + Kotlin 2.4 Best Practices

Follow these guidelines when authoring or updating backend code and Gradle build files in this workspace.

---

## 1. Gradle 9.8+ & Kotlin 2.4 Build Conventions

1. **Centralized Version Catalog (`gradle/libs.versions.toml`)**:
   - Declare all versions, libraries, and plugins in [libs.versions.toml](../../../gradle/libs.versions.toml). Never hardcode dependency versions inside module `build.gradle.kts` files.
   - Include `maven { url = uri("https://repo.spring.io/milestone") }` in both `pluginManagement.repositories` and `dependencyResolutionManagement.repositories` in [settings.gradle.kts](../../../settings.gradle.kts) for milestone releases (`4.2.0-M2`, `2.1.0-M1`).
2. **Gradle 9.6+ Task Registration**:
   - **DO NOT** use the deprecated `val myTask by tasks.registering(Exec::class)` property delegate in Gradle 9.6+.
   - **DO** use `val myTask = tasks.register<Exec>("myTask") { ... }` to stay compatible with Gradle 9.8+ and Gradle 10.
3. **Kotlin 2.4 Compiler Options**:
   - Configure Java 25 toolchain (`JavaLanguageVersion.of(25)`) and `-Xjsr305=strict`.
   - **DO NOT** pass `-Xannotation-default-target=param-property` in Kotlin 2.4+; it is already the default in language version 2.4 and triggers a compiler warning.

---

## 2. Spring Boot 4.2 Conventions

1. **Modular Starters & Jackson 3**:
   - Use `org.springframework.boot:spring-boot-starter-webmvc` and `org.springframework.boot:spring-boot-starter-webmvc-test` for Servlet/Virtual-Thread MVC services.
   - Use Jackson 3 Kotlin module coordinates: `tools.jackson.module:jackson-module-kotlin`.
2. **Immutable Kotlin Configuration & DI**:
   - Use constructor injection exclusively (no `@Autowired` field injection in application classes).
   - Bind configuration with `@ConfigurationProperties` onto immutable Kotlin `data class` hierarchies and enable `@ConfigurationPropertiesScan` on the main `@SpringBootApplication` class.
3. **Java 25 Virtual Threads for Streaming**:
   - Use `Executors.newVirtualThreadPerTaskExecutor()` when streaming `SseEmitter` events so concurrent agentic turns never block platform threads.

---

## 3. Spring AI 2.1 & Multi-Provider Architecture

1. **Starter Naming in Spring AI 2.x**:
   - Import `org.springframework.ai:spring-ai-bom:2.1.0-M1` via `dependencyManagement`.
   - Use the `spring-ai-starter-model-*` naming convention:
     - Google GenAI (Gemini): `org.springframework.ai:spring-ai-starter-model-google-genai`
     - Ollama (Local LLM): `org.springframework.ai:spring-ai-starter-model-ollama`
     - Chat Memory: `org.springframework.ai:spring-ai-starter-model-chat-memory`
2. **Coexisting ChatModel Providers (`ObjectProvider`)**:
   - When multiple model starters are on the classpath (e.g., Gemini + Ollama + Smart Mock), set `spring.ai.model.chat: none` in `application.yml` and inject `ObjectProvider<GoogleGenAiChatModel>` and `ObjectProvider<OllamaChatModel>`.
   - Always provide a deterministic fallback (`SMART_MOCK`) so the application works out-of-the-box without requiring API keys or a running local LLM daemon.
3. **Declarative `@Tool` Function Calling for Generative UI**:
   - Annotate domain tool methods with `@Tool(description = "...")` and parameters with `@ToolParam(description = "...")`.
   - Attach tools per turn via `ChatClient.create(chatModel).prompt().system(SYSTEM_PROMPT).user(prompt).tools(tools).call()`.
   - Never ask the LLM to output raw HTML or large UI JSON blobs in its text response. Instead, have `@Tool` methods push strongly-typed `AgentUiComponentPayload` instances into a per-turn collector and return a concise operational summary string to the LLM.
   - See [generative-ui-sse-pattern.md](./references/generative-ui-sse-pattern.md) for the complete reference pattern.

---

## 4. Verification Checklist

Before completing any backend change, run:

```bash
./gradlew :backend:test
```
Ensure zero Kotlin compiler warnings, zero Gradle deprecation warnings, and 100% passing JUnit 5 tests.
