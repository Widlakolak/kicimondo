# Architecture

Status: Stage 05 house expansion packaged for web and Android. Later systems described here are planned.

## Stack and boundaries

The client is the game runtime: React, TypeScript, Vite, Phaser 3.x and Tiled JSON. Java 21 and Spring Boot 4.x will provide a content service and optional sync/learning analysis later. PostgreSQL and Flyway handle server data. Gradle Kotlin DSL and the wrapper keep builds reproducible. Capacitor packages the same client for Android. Check compatibility before pinning versions; do not use floating dependency versions.

Phaser scenes own map rendering, animations, input and collisions. React renders the profile, menus, educational overlays and parent settings. A typed, disposable bridge carries interaction requests and results; neither side reaches directly into the other's internals. Pure TypeScript domain functions decide whether an interaction is eligible, validate challenges, complete quests and update world state. No game state is derived from sprite visibility alone.

The server is a modular monolith. Planned feature packages: content, player, quest/progression, learning, sync and shared infrastructure. Separate application/domain/infrastructure where useful; no boilerplate layers for their own sake. Keep HTTP DTOs separate from persistence entities. Use REST under /api/v1, validation, consistent errors and OpenAPI when endpoints exist.

One Phaser scene loads the current location from the Tiled map registry and resolves movement against map rectangles with pure TypeScript rules. The scene reports eligible interaction anchors through the room bridge. React selects a quest view by its challenge type and presents tracing, maths, matching, sequencing or category sorting. The quest, transition and dialogue definitions connect stable anchor IDs to challenge data, prop effects, destination spawns and contextual hints. Once a quest is committed, the existing scene redraws props and updates its active anchors. A location transition starts the same scene at the destination spawn. A pure cat state machine advances on active time and follows validated local routes to its greeting spot and restored attractions. Phaser draws the current animation frame and emits an accepted pet interaction only while the cat is receptive. The world clock pauses during overlays and when the page is hidden.

## Intended layout

    frontend/             game client and Android wrapper
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

The client is authoritative for single-player state. The game stores one local profile with a versioned gameplay record in IndexedDB. On first load, it imports a valid Stage 01 localStorage profile when the database is empty and preserves the original profile entry. Save schema 2 continues to store profile, content version, checkpoint, quest IDs, rewards, hidden and restored props, and trust. Content version 3 accepts the Stage 02 record and Stage 03/04 content version 2, validates their bedroom progress and preserves valid bedroom and landing checkpoints. A successful change writes the migrated record. Profile edits and location transitions preserve earned progress. Reload uses the saved spawn, with a safe entry spawn fallback if a map changes.

Each command reads the current record inside an IndexedDB read-write transaction. Quest completion adds its ID, unique reward, world effects and any associated restoration trust in the same transaction. The first accepted pet interaction adds its own trust event. The restored prop ledger also stores organization effects. Only cat attractions contribute restoration trust. Trust is derived from unique event IDs and persists independently of PS. Lifetime PS comes from the ledger. Door access uses the resulting point total. The previous valid snapshot is retained in the same transaction. A malformed record can be recovered from that snapshot. Unsupported versions and records with no recoverable snapshot are preserved for a compatible reader. If a write fails, the UI warns that later changes last only for the current session.

The production web build generates a manifest and a versioned service worker. The worker verifies integrity and precaches every emitted application file, including lazy chunks, before it can control a page. The old version continues serving its own cache while windows are open. A waiting worker activates after those windows close, then cleans up older caches within the scope. The menu shows update instructions; the app does not reload itself. IndexedDB stays independent of caches.

The Android build uses a separate output without a manifest or worker. Capacitor serves bundled content under `https://localhost`; retain that origin and the application ID for IndexedDB. Browser and APK data are separate. Capacitor App forwards Back and foreground state; the existing room bridge cancels an unfinished exercise, toggles pause, and suspends the renderer while backgrounded. Completed transactions survive normal restarts. Physical Android persistence and signing upgrades have their own acceptance checks. Backup/export/import remains deferred.

## Content and optional server

Build validation checks traversable map geometry, named arrival spawns, reachable anchors, usable return paths and rewards available before each gate. Save decoding checks that the completed quests could be reached with the saved ledger. Version and validate packs before activating them. Pin a challenge instance's content version and generated seed for the duration of the attempt. A pack update must not reuse IDs for a different task or invalidate existing rewards. Ship a fallback bundled pack. Do not execute downloaded scripts.

Later server responsibilities: validated content pack publication, deterministic educational task generation and optional parent-controlled sync and reporting. Client-side challenge checks remain available offline. Share JSON schemas and fixed test vectors between Java and TypeScript where both implement a rule. The backend has a substantive role without becoming a mandatory dependency for gameplay.

Sync is deferred until there is a clear need. Model immutable completion events with profile ID, event ID, quest/reward ID and content version. Server deduplicates events and awards in a transaction; duplicate deliveries return the same outcome. Merge completed quest sets by stable IDs, avoid double rewards, and explicitly define conflicts for mutable settings and object placement before enabling multi-device sync. Authenticate ownership on every profile operation; never trust a client-supplied profile ID as authorization. No public writable APIs in the initial deployment.

## Performance

Render and simulate cats locally. Use grid collision and bounded NPC updates; initially fixed routes or adjacent walkable tiles are enough. Introduce A* only for obstacle-aware movement when needed. Pause world input and movement during a modal exercise and when the app backgrounds. Cap asset sizes and avoid remote dependencies. Measure on a modest Android device and the actual QNAP; no fixed capacity claim before measurements.

## Decisions

See [ADR 0001](adr/0001-local-first-web-client.md) and [ADR 0002](adr/0002-content-and-progression.md). Revisit decisions with evidence, not just to add portfolio technologies.
