---
name: angular-22-agentic-ui
description: >-
  Official Angular 22 best practices, Signals architecture, modern CSS container
  queries, and Generative / Agentic UI patterns using NgComponentOutlet.
  Activate this skill whenever creating, modifying, or testing Angular 22
  components, services, templates, styles, or SSE streaming chat interfaces.
---

# Angular 22 & Agentic UI Best Practices

Follow these mandatory conventions for all frontend TypeScript, HTML template, and CSS work in this workspace.

---

## 1. Angular 22 Component & Decorator Rules

1. **Standalone & Zoneless OnPush by Default**:
   - **MUST NOT** set `standalone: true` inside `@Component`, `@Directive`, or `@Pipe` decorators (it is the default in Angular v20+).
   - **MUST NOT** set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly (it is the default in Angular v22+).
2. **Signals for Inputs, Outputs, and State**:
   - Use `input()` and `input.required<T>()` instead of `@Input()`.
   - Use `output<T>()` instead of `@Output()`.
   - Use `model<T>()` for two-way binding (`[(prop)]`).
   - Use `signal()`, `computed()`, and `linkedSignal()` for local and derived state.
   - **DO NOT** use `.mutate()` on signals; always use `.set()` or `.update()`.
3. **Host Bindings & Dependency Injection**:
   - **DO NOT** use `@HostBinding` or `@HostListener` decorators; place all host bindings inside the `host: { ... }` property of `@Component` or `@Directive`.
   - Use `inject()` instead of constructor parameter injection.
4. **Templates & Control Flow**:
   - Always use native control flow (`@if`, `@for`, `@switch`) with explicit `track` expressions on `@for`. Never use `*ngIf`, `*ngFor`, or `*ngSwitch`.
   - **DO NOT** import `CommonModule`. Import only specific directives needed (e.g., `NgComponentOutlet`).
   - **DO NOT** use `ngClass` or `ngStyle`; use `[class.foo]="..."` and `[style.--token]="..."` bindings.
   - Prefer Signal Forms (`@angular/forms/signals`) when building complex validated forms in Angular 22.

---

## 2. Agentic / Generative UI Pattern (`NgComponentOutlet`)

When building components that are shared between a traditional web application view and an AI Agent chat stream:

1. **Single Component, Dual Mounting**:
   - Build domain cards (such as `<app-flight-card>`, `<app-destination-card>`, and `<app-aircraft-rotation-pair>`) as pure signal-input standalone components.
   - Mount them statically in dashboard templates (`<app-flight-card [flight]="..." />`) and dynamically inside the Agentic Chat stream via `NgComponentOutlet`:
     ```html
     <ng-container
       [ngComponentOutlet]="resolveComponentType(payload)"
       [ngComponentOutletInputs]="resolveComponentInputs(payload)"
     />
     ```
   - See [ng-component-outlet-agentic-ui.md](./references/ng-component-outlet-agentic-ui.md) for the complete mapping pattern.
2. **Container Queries Over Viewport Media Queries (`container-type: inline-size`)**:
   - Because a reusable card may be mounted in both a wide dashboard column and a narrow 420px chat drawer simultaneously, viewport `@media` queries alone will mis-size the card inside the chat drawer.
   - Always declare `container-type: inline-size` on `:host` and use `@container (min-width: ...)` rules wrapped in `@supports (container-type: inline-size)` with a progressive `@media` fallback.

---

## 3. Accessibility & Modern CSS Standards

1. **Semantic Card Structure**:
   - Use `<article>` as the root element of card components with direct `<header>`, content `<div>`, and `<footer>` children.
2. **Color & Contrast**:
   - Declare `<meta name="color-scheme" content="light dark">` in `index.html` and `color-scheme: light dark` on `:root` in `styles.css`.
   - Use `light-dark()` custom properties guarded by `@supports (color: light-dark(white, black))` alongside `@media (prefers-color-scheme: dark)` fallbacks.
   - Never rely on color alone to convey operational status (`DELAYED`, `BOARDING`, `LANDED`, `TIGHT_CONNECTION`); always pair colors with an icon and explicit text label.

---

## 4. Testing with Vitest 5 (`@angular/build:unit-test`)

- Always include `provideHttpClient()` **and** `provideHttpClientTesting()` in `TestBed.configureTestingModule` providers when testing components/services that trigger HTTP requests on initialization, preventing unhandled `ECONNREFUSED` errors in Vitest.
- Verify frontend builds and tests via:
  ```bash
  ./gradlew :frontend:check :frontend:assemble
  ```
