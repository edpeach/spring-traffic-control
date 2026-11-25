# Backend Guidelines (`backend/AGENTS.md`)

## Purpose & Stack

- **Spring Boot 4.2 + Kotlin** backend showcasing **AG-UI**, **A2UI**, and **Spring AI** tool calling.
- Built with **Spring Modulith**, **Spring WebMVC**, **DuckDB**, and **OpenTelemetry (`otel`)** using Gradle.

## Architectural Principles

- **Strict Acyclic Module Boundaries**: Verified by `ModulithArchitectureTests` (`ApplicationModules.verify()`).
  Cross-module communication goes through each module's root public API (service interfaces, models, and domain
  events) — never through `internal` packages.
- **Two-Level Spring Modulith + Clean Architecture Layout per Module** (see [
  `.agents/skills/modulith-module-architecture/SKILL.md`](../.agents/skills/modulith-module-architecture/SKILL.md)):
    1. `io.peaches.stc.<module>` (module root = public API): Pure Kotlin domain models, value types, events, and the
       public service interface (zero Spring or `internal` dependencies).
    2. `io.peaches.stc.<module>.internal` (encapsulated internals): Service implementation, module-internal repository
       and sync-source ports, DuckDB repositories, external HTTP clients/mappers, caches, and Spring WebMVC REST
       controllers.
- **DuckDB vs. Ephemeral Cache**: Durable, queryable datasets (`stations`, `airlines`, `aircraft_types`,
  `scheduled_flights`) live in DuckDB; high-churn OpenSky state vectors and tracks stay in-memory/Redis with a
  configurable TTL (`OPENSKY_CACHE_TTL`, default `30m`).

## Module Map (`io.peaches.stc.*`)

- **`stations`** *(zero outgoing module dependencies)*: Airport/rail infrastructure, `AircraftCategory`, opening hours,
  and native DuckDB Haversine + capability queries (`LoadStationsService`, `StationController`).
- **`airlines`**: Airline reference data synced from Schiphol Public Flights API (`AirlineService`,
  `AirlineController`).
- **`aircrafttypes`**: Aircraft type reference data synced from Schiphol Public Flights API (`AircraftTypeService`,
  `AircraftTypeController`).
- **`schedule`**: Planned commercial timetable (`scheduled_flights` synced from Schiphol Public Flights API;
  `FlightScheduleService`, `ScheduleController`).
- **`flightstate`** *(depends on `stations`, `schedule`)*: Live flight states, Redis/in-memory cached OpenSky
  `/states/all`, `/tracks`, arrivals/departures, and emergency diversion queries (`InFlightService`,
  `InFlightController`).
- **`agents`** *(depends on `stations`, `schedule`, `flightstate`)*: Spring AI `@Tool`s (`AviationAgentTools`,
  `FrontendControlTools`), AG-UI SSE (`POST /api/agui`), `appVersion`-scoped capability sync (`POST /api/agui/sync`,
  `AguiCapabilitiesRegistry`), and A2UI surface emission (`AgUiTurnEmitter`).

## External API Isolation (`io.peaches.support.*`)

- **Separate External Clients & Models**: External API clients and their wire/DTO models must be isolated from
  `io.peaches.stc.*` and live under:
    - `io.peaches.support.openaip`
    - `io.peaches.support.opensky`
    - `io.peaches.support.schiphol`
- **Anti-Corruption / Early Adaptation**: Code under `io.peaches.stc.*` must call these support services and map/adapt
  external response structures into internal `stc` domain models as early as possible (at the module's infrastructure
  boundary). Never leak external `support` DTOs into `domain`, `application`, or `web` layers.

## Conventions & Standards

- **Skill Alignment**: Follow [
  `.agents/skills/spring-boot-4-ai-kotlin/SKILL.md`](../.agents/skills/spring-boot-4-ai-kotlin/SKILL.md) for Kotlin
  backend code, Spring AI `@Tool` / `ChatClient` integrations, SSE endpoints, and Gradle build scripts.
- **Idiomatic Kotlin Best Practices**: Always favour Kotlin-style implementations for simplicity and clarity:
    - Prefer immutable `val`s, `data class`es, `enum class`es, and `sealed interface`/`sealed class` hierarchies over
      Java-style POJOs, mutable state, or getter/setter boilerplate.
    - Use null-safety (`?`, `?.`, `?:`, `let`), default arguments, named parameters, and expression bodies
      (`fun ... = ...`) instead of overloaded methods or verbose builder patterns.
    - Prefer Kotlin stdlib collection operations (`map`, `filter`, `firstOrNull`, `associateBy`), `when` expressions,
      and extension functions over Java `Stream`s or `Optional`.
    - Use constructor injection (`private val ...`) without `@Autowired` on single-constructor Spring beans.
- **Typed Configuration Properties Only (No `@Value`)**:
    - Always bind configuration using immutable Kotlin `@ConfigurationProperties` `data class`es (scanned via
      `@ConfigurationPropertiesScan` on `SpringTrafficControlApplication`).
    - **NEVER** use `@Value` on fields, constructors, methods, or parameters (enforced by `ModulithArchitectureTests`).
- **Declarative HTTP Service Groups**:
    - Register external HTTP clients via `@ImportHttpServices` and configure them with
      `RestClientHttpServiceGroupConfigurer` beans rather than manually constructing `HttpServiceProxyFactory`.
- **Keep It Minimal & Explainable**: Favour straightforward, idiomatic Kotlin without unnecessary abstractions so
  learners can easily trace each module, query, and agent tool.
- **Verification**: Run `ModulithArchitectureTests` and module tests whenever module boundaries or dependencies change.
