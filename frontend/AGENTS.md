# Frontend Guidelines (`frontend/AGENTS.md`)

## 1. Purpose: AG-UI & A2UI Demo
- This Angular `22.3` application is a demo for **AG-UI** and **A2UI** (Agentic / Generative UI) backed by Spring Boot & Spring AI.
- **Educational Simplicity**: Always take the simplest, cleanest, and most idiomatic approach so learners can easily understand the underlying concepts without unnecessary abstractions.

## 2. Themes, Design Tokens & Tailwind CSS
- **Light & Dark Mode per Theme**: The app supports selectable themes, and every theme is split into both **light** and **dark** modes (e.g. `body.theme-spring-dark` as default and `body.theme-spring-light`, plus any additional theme pairs).
- **Body-Class Switchable Tokens**: All colors, surfaces, borders, and text tokens are defined as CSS custom properties in `src/styles.css` per theme/mode class and mapped into Tailwind v4 via `@theme inline`.
- **Token & Tailwind Rules**:
  - Always use Tailwind utility classes backed by semantic tokens (`bg-canvas`, `bg-surface`, `bg-surface-elevated`, `border-edge`, `text-ink`, `text-ink-muted`, `text-accent`, `text-accent-bright`).
  - Never hardcode hex/rgb colors in components.
  - Custom CSS is only permitted when Tailwind cannot express it (e.g. token definitions in `styles.css` or container query specifics).

## 3. Domain Modules & Folder Structure
The application is organized into four lazy-loaded domain modules under `src/app/features/`:
- `stations`
- `flights`
- `map`
- `agent`

Each domain module follows a consistent structure:
- `components/` — Dumb, pure signal-input standalone components designed for reuse across modules and A2UI rendering in `agent` (e.g., station and flight components reused in `map` and `agent`).
- `pages/` — Complex, routed page components composed from dumb components and connected to stores.
- `store/` — NgRx Signal Stores (`@ngrx/signals`: `signalStore`, `withState`, `withComputed`, `withMethods`) specific to the module.
- `services/` (when fetching/translating data) — Service layer responsible for fetching backend data, translating DTOs into frontend domain models, and populating the store so the store stays focused on state management.

## 4. A2UI & AG-UI Integration
All dumb components and application-level features **must** support A2UI and AG-UI:
- **Dual-Mounted Dumb Components**: Domain components must use signal inputs (`input()`) and container queries (`@container`) so they render cleanly in module pages, `map`, and `agent` chat streams via `NgComponentOutlet`.
- **Zod Schemas**: Every dumb/Agentic UI component must define a `zod` schema with `.describe(...)` metadata, derive its TypeScript domain model via `z.infer<typeof Schema>`, and export a JSON Schema (`z.toJSONSchema(Schema)`) that the `agent` service can understand.
- **AG-UI Effect-Driven Actions**: Navigation events and app-level controls (such as theme/mode switching or feature state updates) must be executed through `effect()`-based actions that the agent can invoke via AG-UI (see `AguiControlService`).
- **Synced Actions & Surfaces**: Available AG-UI actions and A2UI component surfaces are synced with the backend rather than being passed on every individual request.

## 5. Code & Generation Standards
- **Ask Before Assuming**: Before scaffolding components, folders, or routes, if the exact folder placement, component split, or behavior is not explicitly specified, **ask the user first** instead of guessing or creating unrequested stubs/nested folders (e.g., avoid `layout/layout`).
- **Strict File Separation**: Never mix templates, styles, and TypeScript component code. Always use external `templateUrl` and `styleUrl` files—never inline `template` or `styles`.
- **Service-to-Store Data Flow**: When fetching data from the backend, translate responses into frontend domain models in a service layer and populate the store from there, keeping stores clean and focused.
- **Skills & CLI First**:
  - Always follow [`.agents/skills/angular-developer/SKILL.md`](../.agents/skills/angular-developer/SKILL.md) alongside [`.agents/skills/angular-22-agentic-ui/SKILL.md`](../.agents/skills/angular-22-agentic-ui/SKILL.md).
  - Always use the Angular CLI (`pnpm ng generate component ...`, `service`, `pipe`, etc.) when generating new components or Angular artifacts.
- **Angular 22 Idioms**: Do not set `standalone: true` or `ChangeDetectionStrategy.OnPush` (both are defaults). Use `input()`, `output()`, `signal()`, `computed()`, `effect()`, `inject()`, and `@if`/`@for` control flow.
