# Architecture

Stage 07 adds optional math content to the web and Android game.

## Stack and boundaries

The game runs in a React and TypeScript client built with Vite. It uses Phaser 3.x and Tiled JSON. Java 21 and Spring Boot 4.2 provide an optional math content service. PostgreSQL and Flyway handle server data. Gradle Kotlin DSL and the wrapper keep builds reproducible. Capacitor packages the same client for Android.

Phaser scenes own map rendering, animations, input and collisions. React renders the profile, menus, educational overlays and parent settings. A typed, disposable bridge carries interaction requests and results; neither side reaches directly into the other's internals. Pure TypeScript domain functions decide whether an interaction is eligible, validate challenges, complete quests and update world state. No game state is derived from sprite visibility alone.

The content backend is a modular monolith. Its content feature separates the read-only API, transactional publication and queries, domain validation and math generation, and JPA persistence. Flyway owns the PostgreSQL schema, and Hibernate validates it. The database stores one immutable row per pack ID and version. The API sends metadata and the exact normalized JSON bytes without exposing persistence entities.

One Phaser scene loads the current location from the Tiled map registry and resolves movement against map rectangles with pure TypeScript rules. The scene reports eligible interaction anchors through the room bridge. React selects a quest view by its challenge type and presents tracing, maths, matching, sequencing or category sorting. The quest, transition and dialogue definitions connect stable anchor IDs to challenge data, prop effects, destination spawns and contextual hints. Once a quest is committed, the existing scene redraws props and updates its active anchors. A location transition starts the same scene at the destination spawn. The cat population owns independent state machines keyed by stable IDs. Restored tags enable visitors and an active-time queue admits up to three. Each visitor claims an activity spot before walking and keeps it until returning to its greeting spot. The build validates direct routes and the simulation falls back to the cat's resting point when its preferred spots are taken. The scene draws frames and sends encounter and accepted greeting events through the bridge. React receives nearby cue changes and saved discoveries. Cat simulation pauses during modal overlays, backgrounding and hidden pages.

## Repository layout

    frontend/             game client and Android wrapper
      src/game/           Phaser scenes, input and Tiled maps
      src/core/           game rules and domain state
      src/content/        canonical definitions and remote pack validation
      src/challenges/     educational components
      src/storage/        local gameplay saves and separate pack cache
      src/i18n/           Polish strings
    backend/              optional Spring Boot content service
    contracts/            pack schema, shared fixtures and generated manifest
    infrastructure/qnap/ production images, Compose and operator scripts
    docs/                 design, decisions and stages

## Persistence and offline

The client is authoritative for single-player state. The game stores one local profile with a versioned gameplay record in IndexedDB. On first load, it imports a valid Stage 01 localStorage profile when the database is empty and preserves the original profile entry. Save schema 3/content 4 stores the profile, checkpoint, quest IDs, reward and prop ledgers, trust and discoveries. It reads Stage 02 schema 1/content 1 and Stage 03–05 schema 2/content 2 or 3. A previous accepted greeting establishes Bursztynek's discovery. The next successful change writes the migrated record. Profile changes and location transitions preserve valid progress and checkpoints.

Each command reads the current record inside an IndexedDB read-write transaction. The client queues passive encounters alongside interaction commands without disabling movement. Concurrent tabs read the latest record inside the transaction. Quest completion adds its ID, unique reward, world effects and any associated restoration trust in the same transaction. The first accepted pet interaction adds its own trust event. The restored prop ledger also stores organization effects. Each resident attraction and each newly eligible visitor habitat has its own trust event. Trust is derived from unique event IDs and persists independently of PS. Lifetime PS comes from the ledger. Door access uses the resulting point total. The previous valid snapshot is retained in the same transaction. A malformed record can be recovered from that snapshot. Unsupported versions and records with no recoverable snapshot are preserved for a compatible reader. If a write fails, the UI warns that later changes last only for the current session.

The production web build generates a manifest and a versioned service worker. The worker verifies integrity and precaches every emitted application file, including lazy chunks, before it can control a page. The old version continues serving its own cache while windows are open. A waiting worker activates after those windows close, then cleans up older caches within the scope. The menu shows update instructions; the app does not reload itself. IndexedDB stays independent of caches.

The Android build uses a separate output without a manifest or worker. Capacitor serves bundled content under `https://localhost`; retain that origin and the application ID for IndexedDB. Browser and APK data are separate. Capacitor App forwards Back and foreground state; the existing room bridge cancels an unfinished exercise, toggles pause, and suspends the renderer while backgrounded. Completed transactions survive normal restarts. Physical Android persistence and signing upgrades have their own acceptance checks. Backup/export/import remains deferred.

## Content and optional server

Build validation checks traversable map geometry, named arrival spawns, reachable anchors, usable return paths and rewards available before each gate. Save decoding checks that the completed quests could be reached with the saved ledger. Version and validate packs before activating them. Pin a challenge instance's content version and generated seed for the duration of the attempt. A pack update must not reuse IDs for a different task or invalidate existing rewards. Ship a fallback bundled pack. Do not execute downloaded scripts.

The frontend exports math challenge IDs, operation sequences and maxima from its bundled catalog. Both runtimes validate pack shape, references and generated questions against that catalog. The Java operator command imports local JSON and publishes it in a single transaction. The primary key and an insert-on-conflict statement serialize repeated publication. A repeat with the same normalized payload preserves the original publication timestamp. The database rejects updates and deletes of published rows.

The client only checks the API when an adult uses the main menu. A download shares an eight-second request deadline across metadata and payload, limits bytes before JSON parsing and verifies SHA-256 with Web Crypto. The client activates the pack after the separate IndexedDB transaction commits. Each challenge attempt snapshots its selected seed when opened. A reload revalidates the cached bytes without contacting the service. Choosing bundled content deletes the cached selection without touching the gameplay database. The existing service worker caches the application assets independently.

Sync is deferred until there is a clear need. Model immutable completion events with profile ID, event ID, quest/reward ID and content version. Server deduplicates events and awards in a transaction; duplicate deliveries return the same outcome. Merge completed quest sets by stable IDs, avoid double rewards, and explicitly define conflicts for mutable settings and object placement before enabling multi-device sync. Authenticate ownership on every profile operation; never trust a client-supplied profile ID as authorization. No public writable APIs in the initial deployment.

## Production web boundary

The Linux amd64 frontend image serves the same-origin build through Nginx. It revalidates entry files and caches fingerprinted assets as immutable. At startup it archives the release's hashed assets into a project volume so a browser that already fetched an older entry page can finish loading after the image changes. The service worker still verifies the full release before installation and waits for open windows before activation.

Nginx queries Docker DNS at request time for content pack reads and returns a bounded 503 when the backend is unavailable. The frontend has an optional ingress network. Java joins a separate internal database network as well as the internal application network. PostgreSQL joins only the database network. The frontend has no startup dependency on Java. The content profile enables Java and PostgreSQL together.

An explicit main-branch workflow tests the checkout, promotes the exact tested images, writes their digests and leaves host deployment to the owner. The PostgreSQL volume stores the educational packs across image replacements. A backup uses `pg_dump` and records running images and Flyway versions. Restoring or rolling back the server does not change IndexedDB on clients.

## Performance

Render and simulate cats locally. Use grid collision and bounded NPC updates; initially fixed routes or adjacent walkable tiles are enough. Introduce A* only for obstacle-aware movement when needed. Pause world input and movement during a modal exercise and when the app backgrounds. Cap asset sizes and avoid remote dependencies. Measure on a modest Android device and the actual QNAP; no fixed capacity claim before measurements.

## Decisions

See [ADR 0001](adr/0001-local-first-web-client.md) and [ADR 0002](adr/0002-content-and-progression.md). Revisit decisions with evidence, not just to add portfolio technologies.
