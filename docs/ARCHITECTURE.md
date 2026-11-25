# Architecture

Status: Stage 01 client implemented. Later systems described here are planned.

## Stack and boundaries

The client is the game runtime: React, TypeScript, Vite, Phaser 3.x and Tiled JSON. Java 21 and Spring Boot 4.x will provide a content service and optional sync/learning analysis later. PostgreSQL and Flyway handle server data. Gradle Kotlin DSL and the wrapper keep builds reproducible. Capacitor packages the same client for Android. Check compatibility before pinning versions; do not use floating dependency versions.

Phaser scenes own map rendering, animations, input and collisions. React renders the profile, menus, educational overlays and parent settings. A typed, disposable bridge carries interaction requests and results; neither side reaches directly into the other's internals. Pure TypeScript domain functions decide whether an interaction is eligible, validate challenges, complete quests and update world state. No game state is derived from sprite visibility alone.

The server is a modular monolith. Planned feature packages: content, player, quest/progression, learning, sync and shared infrastructure. Separate application/domain/infrastructure where useful; no boilerplate layers for their own sake. Keep HTTP DTOs separate from persistence entities. Use REST under /api/v1, validation, consistent errors and OpenAPI when endpoints exist.

In Stage 01, the Phaser bedroom scene owns the avatar's position and resolves movement against map rectangles using pure TypeScript rules. React translates keyboard and pointer events into held directions on the typed room input bridge. The scene reports the nearest eligible interaction and hands deliberate requests back to React for the dialog. The room is loaded when the player enters it.

## Intended layout

    frontend/             game client and Android wrapper (when added)
      src/game/           Phaser scenes, input, interactions
      src/core/           game rules, domain state
      src/challenges/     educational components and validators
      src/features/       menus, profiles, collection, parent settings
      src/storage/        save repository and migrations
      src/sync/           optional later sync
      src/i18n/           Polish and later English strings
      public/assets/      bundled runtime assets
    backend/              Spring Boot (later)
    content/              source content, schemas, generated manifest
    design/tiled/         editable map sources
    contracts/            shared fixtures and future API contracts
    infrastructure/       deployment configuration (later)
    docs/                 design, decisions and stages

Do not create empty modules before they are needed. Keep one canonical content source; build/export into the frontend rather than maintaining separate copies manually.

## Persistence and offline

Client authoritative for ordinary single-player gameplay. Initial prototype may store only avatar/settings locally through a versioned repository interface. Stage 02 moves progress to IndexedDB (Dexie is an option); native Android uses an adapter backed by durable local storage, evaluated in the mobile spike. Save state includes schemaVersion, contentVersion, profile ID, avatar, spawn/location, completed quests, reward ledger, world changes, cats and settings as they become relevant. Save after meaningful state transitions, not every movement frame. Restore to a valid spawn if coordinates are no longer valid. Validate malformed data, retain the last good save and offer recovery/reset with confirmation.

Completing a quest writes quest status, its unique reward record, world changes and unlock effects in one local transaction. Key uniqueness is profile + quest reward ID, not merely event ID. Reload, repeated clicks and retries must not duplicate PS. Derive lifetime PS from the award ledger or verify a cached total against it. Persist and replay logical state, not engine objects.

Bundle core maps, content, graphics and sounds. PWA must cache a coherent version after the initial online load; Android ships a bundled client. A network failure cannot stop a local exercise. Do not force refresh during gameplay. Handle cache/save schema migrations explicitly. Export/import user-controlled backups; imported data is untrusted and validated. Browser storage can be cleared.

## Content and optional server

Version and validate packs before activating them. Pin a challenge instance's content version and generated seed for the duration of the attempt. A pack update must not reuse IDs for a different task or invalidate existing rewards. Ship a fallback bundled pack. Do not execute downloaded scripts.

Later server responsibilities: validated content pack publication, deterministic educational task generation and optional parent-controlled sync and reporting. Client-side challenge checks remain available offline. Share JSON schemas and fixed test vectors between Java and TypeScript where both implement a rule. The backend has a substantive role without becoming a mandatory dependency for gameplay.

Sync is deferred until there is a clear need. Model immutable completion events with profile ID, event ID, quest/reward ID and content version. Server deduplicates events and awards in a transaction; duplicate deliveries return the same outcome. Merge completed quest sets by stable IDs, avoid double rewards, and explicitly define conflicts for mutable settings and object placement before enabling multi-device sync. Authenticate ownership on every profile operation; never trust a client-supplied profile ID as authorization. No public writable APIs in the initial deployment.

## Performance

Render and simulate cats locally. Use grid collision and bounded NPC updates; initially fixed routes or adjacent walkable tiles are enough. Introduce A* only for obstacle-aware movement when needed. Pause world input and movement during a modal exercise and when the app backgrounds. Cap asset sizes and avoid remote dependencies. Measure on a modest Android device and the actual QNAP; no fixed capacity claim before measurements.

## Decisions

See [ADR 0001](adr/0001-local-first-web-client.md) and [ADR 0002](adr/0002-content-and-progression.md). Revisit decisions with evidence, not just to add portfolio technologies.
