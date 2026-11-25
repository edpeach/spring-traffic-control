# Spring Traffic Control — Backend

**Spring Boot 4.2 + Spring Modulith 2.2 + Spring AI 2.1** backend written in **Kotlin 2.4** on **Java 25** and **Gradle 9.9**.

## Architecture

The application follows a strict two-level **Spring Modulith** layout under `io.peaches.stc.*`, enforced by `ModulithArchitectureTests`:

- **Module root (`io.peaches.stc.<module>`)**: Pure Kotlin public API (domain models and public `*Service` interface, zero Spring or `internal` dependencies).
- **Module internals (`io.peaches.stc.<module>.internal`)**: `@Service` implementations, DuckDB repositories (`JdbcClient`), external sync sources, REST controllers, and Spring AI advisors/tools.
- **External API isolation (`io.peaches.support.*`)**: Declarative `@HttpExchange` interfaces (`OpenAipApi`, `SchipholApi`, `OpenSkyApi`) and wire DTOs, mapped into domain models at the module boundary.

### Modules

| Module | Responsibility |
| --- | --- |
| `stations` | International airports, runways, frequencies, and native DuckDB Haversine nearest-airport queries |
| `airlines` | Airline reference directory synced from Schiphol Public Flights API |
| `aircrafttypes` | Aircraft type reference directory synced from Schiphol Public Flights API |
| `schedule` | Daily Schiphol commercial timetable (`scheduled_flights`) |
| `flightstate` | Live OpenSky states, arrivals/departures, enriched flight tracks, and Redis/in-memory caching |
| `agents` | AG-UI SSE endpoint (`/api/agui`), capability sync (`/api/agui/sync`), provider status (`/api/agui/providers`), and Spring AI 2.1 advisor pipeline |

### Spring AI 2.1 Advisor Pipeline (`agents`)

```text
RunAgentInput → UiContextAdvisor (BaseAdvisor)
             → ToolCallingAdvisor (built-in, preserves Gemini thought_signature)
             → SimpleLoggerAdvisor
             → AgUiEventStreamAdvisor (StreamAdvisor → AG-UI SSE events)
```

- `AviationAgentTools` and `FrontendControlTools` are singleton `@Component` `@Tool` beans receiving the per-turn `AgUiTurnEmitter` and `appVersion` via Spring AI `ToolContext`.
- `AgUiJacksonModule` registers minimal Jackson 3 mixins for `com.ag-ui.community:java-core` types.

## Commands

```bash
./gradlew bootRun          # Run backend on BACKEND_PORT (default 8090)
./gradlew test             # Run JUnit 5, Spring Modulith, and Spring Boot 4.2 ArchUnit tests
./gradlew spotlessApply    # Format Kotlin and Gradle files with Spotless + ktlint
./gradlew spotlessCheck    # Verify formatting against root .editorconfig
./gradlew assemble         # Build executable JAR
```

## Key Configuration (`application.yaml`)

| Variable | Default | Description |
| --- | --- | --- |
| `BACKEND_PORT` | `8090` | HTTP server port |
| `DEMO_MODE` | `true` | Auto-seed empty DuckDB tables from `SEED_DIR` and serve OpenSky seed snapshots when unconfigured |
| `SEED_DIR` | `${PROJECT_DIR:.}/data/seed` | Path to Parquet & OpenSky seed files |
| `AGENT_PROVIDER` | `OLLAMA` | Default LLM provider (`OLLAMA` or `GEMINI`) |
| `OLLAMA_BASE_URL` | `http://localhost:12434/engines/v1` | OpenAI-compatible local model endpoint |
| `OLLAMA_MODEL` | `ai/gemma4:E2B` | Local model identifier |
| `GEMINI_API_KEY` | `disabled` | Google GenAI API key |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini model identifier |
| `OPENAIP_API_KEY` | *(empty)* | OpenAIP API key for station sync |
| `SCHIPHOL_CLIENT_ID` / `SCHIPHOL_CLIENT_SECRET` | *(empty)* | Schiphol OAuth2 client credentials |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | *(empty)* | OpenSky OAuth2 client credentials |
| `OPENSKY_CACHE_TTL` | `30m` | Redis / in-memory TTL for OpenSky responses |

## Local Infrastructure (`compose.yaml`)

```bash
docker compose up -d
```

Starts **Redis** (`6379`) and **Grafana LGTM** (`3000` UI, `4317`/`4318` OTLP) with a provisioned Spring AI telemetry dashboard.
