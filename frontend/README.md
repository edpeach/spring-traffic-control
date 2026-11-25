# Spring Traffic Control — Frontend

**Angular 22.3** application showcasing **AG-UI**, **A2UI**, **NgRx SignalStore**, **MapLibre GL**, **Angular Material**, and **Tailwind CSS v4**.

## Features & Structure

Organized into four lazy-loaded feature modules under `src/app/features/`:

- **`map`**: Interactive MapLibre GL map (globe & mercator projections) with toggleable, reorderable layers (`day-night`, `stations`, `flight-paths`, `flight-states`, `flight-track`), live flight selection, and closest-airport diversion overlays.
- **`stations`**: Searchable airport directory, station detail view (runways, frequencies, operational flags), and OpenAIP sync dialog.
- **`flights`**: Scheduled flights board, turnaround pairing cards, flight detail view, and Schiphol schedule sync dialog.
- **`agent`**: Fullscreen `/agent` view and deferred floating drawer (`@defer (on idle)`) powered by `@ag-ui/client`, `ngx-markdown` chat output, Web Speech API voice input, and dynamic A2UI cards (`StationCard`, `FlightCard`, `NearestAirportsCard`) rendered via `NgComponentOutlet` (`A2UiSurfaceHost`).

### AG-UI & A2UI Integration

- **`AguiControlService`**: Syncs Zod-derived action and A2UI surface schemas to `/api/agui/sync` on startup and executes agent-triggered `webapp:action` events (`navigate`, `selectStationOnMap`, `selectFlightOnMap`, `showClosestAirportsOnMap`, `setMapProjection`, `toggleMapLayer`, `setTheme`, `setColorMode`).
- **`AguiClientService`**: Streams SSE runs from `POST /api/agui` and forwards live UI state (`currentRoute`, `currentPage`, theme/mode, active map or detail selection).
- **Themes**: Four seasonal themes (`spring`, `summer`, `autumn`, `winter`), each with `dark` and `light` modes driven by CSS custom properties in `src/styles.css`.

## Commands

```bash
pnpm install        # Install dependencies
pnpm start          # Start dev server (ng serve)
pnpm build          # Production build
pnpm test           # Run Vitest 5 unit test suite
pnpm ng lint        # Run angular-eslint checks
pnpm format         # Format src/ with Prettier
pnpm format:check   # Check formatting with Prettier
```

When running against the local backend, use the proxy config (handled automatically by `mise dev`):

```bash
pnpm ng serve --port 4200 --proxy-config proxy.conf.js
```
