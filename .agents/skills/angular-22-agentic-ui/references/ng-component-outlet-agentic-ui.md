# Dynamic Agentic UI Rendering with `@ag-ui/client`, A2UI v0.9, and `NgComponentOutlet` in Angular 22

## Why `@ag-ui/client` + A2UI v0.9 + `NgComponentOutlet`?

When a Spring Boot + Spring AI backend streams **AG-UI 1.0** events carrying **A2UI v0.9** `a2ui-surface` snapshots (`createSurface`, `updateComponents`, `updateDataModel`), Angular 22 can:
1. Consume the SSE stream using `@ag-ui/client`'s `HttpAgent`.
2. Reduce `createSurface`, `updateComponents`, and `updateDataModel` operations into materialized `A2UiSurfaceState` objects, resolving JSON Pointer references (`{ path: "/flight" }`) against the surface's `dataModel`.
3. Mount the exact same standalone components used in the main web dashboard (`FlightCardComponent`, `DestinationCardComponent`, `AircraftRotationPairComponent`) via `NgComponentOutlet` and `[ngComponentOutletInputs]`.

## Complete Pattern

### 1. Catalog Component Resolver

```typescript
resolveComponentType(componentName: A2UiSurfaceState['rootComponent']): Type<unknown> {
  switch (componentName) {
    case 'FlightCard':
      return FlightCardComponent;
    case 'DestinationCard':
      return DestinationCardComponent;
    case 'AircraftRotationPair':
      return AircraftRotationPairComponent;
    default:
      return FlightCardComponent;
  }
}
```

### 2. Template Mounting

```html
@for (surface of msg.surfaces; track surface.surfaceId) {
  <ng-container
    [ngComponentOutlet]="resolveComponentType(surface.rootComponent)"
    [ngComponentOutletInputs]="surface.resolvedInputs"
  />
}
```
