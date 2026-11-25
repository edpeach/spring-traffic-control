# Map Module Guidelines (`features/map/AGENTS.md`)

## 1. Modular Structure

Keep the `map` feature strictly separated by responsibility:

- `config/map.config.ts` — Base map configuration (basemap styles, default viewport, layer identifiers).
- `store/map.store.ts` — Base `@ngrx/signals` store (`MapStore`) managing projection (`mercator` / `globe`), ordered toggleable layers, camera target (`flyTo`), and the left sliding detail panel.
- `layers/<layer-id>/` — Every map layer lives in its own self-contained folder with three files:
  1. `<layer-id>.config.ts` — Layer/source IDs, paint/layout constants, and static defaults.
  2. `<layer-id>.store.ts` — `@ngrx/signals` store mapping domain data to map-ready state (e.g. GeoJSON) and tracking selections/highlights.
  3. `<layer-id>.layer.ts` — MapLibre adapter pulling reactive data from its layer store and managing MapLibre sources, layers, and pointer interactions.
- `components/` — Reusable Angular Material UI controls (e.g. `map-controls`).
- `pages/map-page/` — Hosts the MapLibre GL canvas, binds `MapStore` and layer adapters via `effect()`s, and renders the left sliding detail panel (`mat-sidenav`).

## 2. Base Map & Layer Rules

- **Projection**: Switchable between flat (`mercator`) and 3D (`globe`) via `MapStore.setProjection(...)`.
- **Layer Ordering & Visibility**: Every layer is toggleable and reorderable via `MapStore.toggleLayer(...)` and `MapStore.moveLayer(...)`. Default stack (bottom to top):
  1. `day-night` — Solar terminator overlay.
  2. `flight-paths` — Great-circle curved arcs linking origin and destination stations for scheduled flights.
  3. `stations` — Airport/station markers with selection highlighting.
  4. `flight-states` — Live OpenSky aircraft states for arriving and departing flights with aeroplane icons, heading rotation, dimming on selection, and Schiphol linking.
  - Dynamic layer: `flight-track` — Added automatically when a live flight is selected, rendering the flown OpenSky track waypoints (`/api/tracks`) and a dashed great-circle line to the destination airport.
- **UI Components**: Always use Angular Material components first (`mat-sidenav`, `mat-button-toggle-group`, `mat-menu`, `mat-slide-toggle`, `mat-icon-button`, `mat-card`, etc.) and reuse domain cards (such as `<app-station-card>`) inside the left sliding panel.

## 3. AG-UI Compatibility

- Every map action (projection switching, toggling/reordering layers, selecting/highlighting a station, opening/closing the left panel, flying the camera) **must** go through `MapStore` (or the relevant layer store) and be executed reactively via Angular `effect()`s so both UI interactions and AG-UI agent tool calls trigger the exact same code path.
