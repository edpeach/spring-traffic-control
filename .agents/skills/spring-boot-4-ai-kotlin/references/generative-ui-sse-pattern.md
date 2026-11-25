# Spring AI 2.1 `@Tool` + AG-UI 1.0 + A2UI v0.9 Reference Pattern

## Overview

In an Agentic / Generative UI architecture using **AG-UI 1.0** (CopilotKit's Agent-User Interaction protocol) and **A2UI v0.9** (Google's Agent-to-UI declarative surface specification):

1. **Tool Call Events (`TOOL_CALL_START` -> `TOOL_CALL_ARGS` -> `TOOL_CALL_END` -> `TOOL_CALL_RESULT`)**: Emitted when a Spring AI `@Tool` method runs.
2. **A2UI v0.9 Surface Snapshot (`ACTIVITY_SNAPSHOT` with `activityType = "a2ui-surface"`)**: Carries `a2ui_operations`:
   - `createSurface`: Declares `surfaceId` and `catalogId`.
   - `updateComponents`: Declares the component tree (`FlightCard`, `DestinationCard`, `AircraftRotationPair`) with JSON Pointer path bindings (`{ "path": "/flight" }`).
   - `updateDataModel`: Supplies the domain DTOs at `path = "/"`.
3. **Text Message Stream (`TEXT_MESSAGE_START` -> `TEXT_MESSAGE_CONTENT` -> `TEXT_MESSAGE_END`)**: Streams the assistant's concise natural-language synthesis.
4. **Run Lifecycle (`RUN_STARTED` / `RUN_FINISHED`)**: Frames the entire turn and reports provider/model metadata.

## End-to-End Flow

```kotlin
uiCollector.emitToolAndA2UiSurface(
    toolName = "renderFlightCard",
    toolArgs = mapOf("flightNumber" to flight.flightNumber),
    toolResultSummary = summary,
    surfaceId = "surface-flight-${flight.flightNumber.lowercase()}",
    rootComponent = "FlightCard",
    componentProps = mapOf(
        "flight" to A2UiDataPathRef("/flight"),
        "highlightConnection" to true
    ),
    dataModel = mapOf(
        "flight" to flight
    )
)
```
