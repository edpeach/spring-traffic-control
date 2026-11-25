---
name: modulith-module-architecture
description: >-
  Module and package organization for Spring Modulith backend modules under
  io.peaches.stc, combining Robert C. Martin's Clean Architecture / Package
  Principles with Oliver Drotbohm's Spring Modulith conventions. Activate
  whenever creating, refactoring, or reviewing backend modules, packages,
  service boundaries, repositories, controllers, or Modulith architecture tests.
---

# Spring Modulith Module & Package Architecture

Follow these package-layout and boundary rules for every application module under `io.peaches.stc.*`. The design follows **Robert C. Martin** (*Clean Architecture*, *Screaming Architecture*, Package Cohesion/Coupling Principles) and **Oliver Drotbohm** (*Spring Modulith*).

---

## 1. Core Principles

1. **Screaming Architecture (Robert C. Martin)**:
   - Top-level packages under `io.peaches.stc` represent business domains (`stations`, `schedule`, `airlines`, `aircrafttypes`, `flightstate`), never horizontal technical layers.
2. **Module Root = Public API (Oliver Drotbohm)**:
   - In Spring Modulith, `io.peaches.stc.<module>` is automatically the module's public API.
   - Place **only** what other modules are allowed to depend on in the module root: domain models, value types, domain events, and the module's public service **interface**.
   - Do **not** create `domain/` or `application/` subpackages or scatter `@NamedInterface` / `package-info.java` boilerplate just to re-expose public API types.
3. **Encapsulate All Internals Under `internal/` (Oliver Drotbohm)**:
   - In Spring Modulith, all subpackages are hidden from other modules and enforced by `ApplicationModules.verify()`.
   - Never expose persistence ports (`*Repository`), outbound sync ports (`*SyncSource`, `OpenSkySource`), service implementations, mappers, client configs/properties, or REST controllers in the module root. All of them belong in `io.peaches.stc.<module>.internal`.
4. **Common Closure & Dependency Inversion (Robert C. Martin)**:
   - **Common Closure Principle (CCP):** Avoid four nested technical subpackages (`application/`, `domain/`, `infrastructure/`, `web/`) per module; keep each module flat at two levels: `<module>` (API) and `<module>.internal` (implementation).
   - **Dependency Inversion Principle (DIP):** The module root must have **zero** dependencies on `..internal..` or `org.springframework..`. All classes in `internal/` depend strictly **inward** on the module root's interfaces and models.

---

## 2. Canonical Module Layout

```text
io.peaches.stc.<module>/                     # Public API ONLY (pure Kotlin, zero Spring deps)
├── <Module>Models.kt                        # Domain models, value types, request/result DTOs, events
├── <Module>Service.kt                       # Public service interface (use-case boundary)
└── internal/                                # Encapsulated (inaccessible to other modules)
    ├── <Module>ServiceImpl.kt               # @Service implementing <Module>Service
    ├── <Module>Repository.kt                # Module-internal persistence port
    ├── DuckDb<Module>Repository.kt          # @Repository DuckDB adapter
    ├── <Module>SyncSource.kt                # Module-internal outbound sync port
    ├── <External><Module>SyncSource.kt      # External API sync adapter
    ├── <External><Module>Mapper.kt          # Anti-corruption mapper from io.peaches.support.*
    ├── <External>ClientConfig.kt            # Module-specific HTTP client config (when not shared)
    ├── <External>Properties.kt              # @ConfigurationProperties for module-specific client
    └── <Module>Controller.kt                # @RestController delivery adapter
```

### Placement Rules

| Artifact | Package | Visibility to Other Modules |
| --- | --- | --- |
| Domain models, enums, events, request/result types | `io.peaches.stc.<module>` | Public API |
| Public service interface (`*Service`) | `io.peaches.stc.<module>` | Public API |
| Service implementation (`*ServiceImpl`) | `io.peaches.stc.<module>.internal` | Encapsulated |
| Repository interface & DuckDB implementation | `io.peaches.stc.<module>.internal` | Encapsulated |
| Outbound sync port & adapter (`*SyncSource`, `OpenSkySource`) | `io.peaches.stc.<module>.internal` | Encapsulated |
| Anti-corruption mappers (`*Mapper`) | `io.peaches.stc.<module>.internal` | Encapsulated |
| REST controllers (`*Controller`) | `io.peaches.stc.<module>.internal` | Encapsulated |
| Shared cross-module client configs (e.g. `SchipholClientConfig`) | `io.peaches.stc` | Application root |

---

## 3. Architecture Enforcement (`ModulithArchitectureTests`)

Every backend change must pass `ModulithArchitectureTests`:

1. **`ApplicationModules.of(SpringTrafficControlApplication::class.java).verify()`**:
   - Guarantees acyclic module dependencies and ensures no module accesses another module's `internal` package.
2. **Two-Level Package Whitelist & No `@NamedInterface`**:
   - Every class under `io.peaches.stc..` must reside in `io.peaches.stc`, `io.peaches.stc.*`, or `io.peaches.stc.*.internal..` (forbidding `domain/`, `application/`, `infrastructure/`, `web/`, or other ad-hoc subpackages).
   - No `@NamedInterface` workarounds — promote public types to the module root instead.
3. **Pure Module Root (DIP & Anti-Corruption)**:
   - Classes in module root packages (`io.peaches.stc.*`) must **not** depend on `io.peaches.stc..internal..` (scoped to `io.peaches.stc` so `kotlin.jvm.internal` is not matched), `io.peaches.support..`, or `org.springframework..`.
   - Public `*Service` types in module roots must be interfaces.
4. **Internal Encapsulation of Ports, Stereotypes, and Controllers**:
   - `*Repository`, `*SyncSource`, and `*Source` types must reside in `io.peaches.stc.*.internal..`.
   - `@RestController`, `@Service`, `@Repository`, and `@Component` beans must reside in `io.peaches.stc.*.internal..`.
   - `@RestController` classes must delegate through the module's public service interface and never depend directly on `*Repository`, `*SyncSource`, or `*Source`.
5. **No `@Value` Injection**:
   - All configuration must use `@ConfigurationProperties`.

---

## 4. Verification Checklist

After adding or refactoring a module:

```bash
./gradlew :backend:test
```

Confirm `ModulithArchitectureTests` and all module tests pass with zero warnings.
