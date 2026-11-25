# Stage 06: Garden, visiting cats and Kicipedia

Status: ready for implementation after PR #5 is merged. Stage 05 CI passed; owner gameplay review and physical MediaPad T5 testing are deferred by owner approval. Do not mark either as accepted.

## Goal

Introduce the first outdoor habitat loop: explore, restore fixed attractions through educational quests, meet distinct visiting cats and discover their entries in Kicipedia. Everything works locally, without waiting for real-world time or requiring a server.

## Progression and world

- Preserve all 12 Stage 05 quests, maps, NPCs, Bursztynek and stable IDs. Add five independent indoor quests (suggested: reading at the desk, ordering school items, counting towels, sorting kitchen objects, matching living-room objects). Choose reachable anchors and recognizable props. This provides 17 reachable PS before the garden gate.
- Add a garden entrance from the ground-floor hall, permanently unlocked at 16 lifetime PS, with a safe return path and clear current/required PS. At 15 PS the gate stays locked; at 16 PS it opens; at least one indoor quest can be skipped.
- Add one small outdoor map or a few connected small garden maps, using existing Tiled sources and original pixel art. Maintain 320 x 240 logical viewport and existing 16 px tiles. Validate spawns, collision footprints, interactions and all return routes. No arbitrary expansion of the simulation or camera.
- Add eight garden restoration quests, for water bowl, sheltered bed, scratching post, tunnel, ball/toys, tree platform, cat shelter and flower bed (safe fictional plants; no real-world animal-care claims). Use fixed slots, initially worn/empty, with clear restored states. Reuse the four existing challenge types and their accessible controls. Keep math within 10 and content age appropriate; no timer or forced order. All 13 new quests award exactly 1 PS once; maximum total 25 PS. No basement gate yet (Stage 09 must supply sufficient reachable rewards before 32 PS).

## Habitat and cats

- Generalize the single-resident-cat scene to handle bounded multiple cat entities without changing Bursztynek's identity, behaviour, existing trust or bedroom attractions.
- Use stable data-driven cat definitions, original appearances (colour, markings and silhouette), Polish names, preferences, valid greeting/rest spots, attraction tags and explicit eligibility rules. Introduce four distinct fictional visitors. Suggested names: Puszek, Łatka, Cień, Migotka.
- Eligibility is deterministic from restored attractions and location, not elapsed real-world time, random chance or repeat clicking. Suggested combinations: Puszek = water + sheltered bed; Łatka = scratching post + tunnel; Cień = shelter + water; Migotka = tree platform + toys. Flower bed may improve visual habitat without being required for a visitor. Make requirements understandable through contextual hints. Do not count an unbuilt attraction or require a quest behind the same gate.
- Cap simultaneous garden visitors at three. If all four are eligible, use deterministic fair rotation during active play, ensuring every eligible visitor can be encountered within a bounded, documented interval (target within 60 active seconds on a running game, without needing to leave/re-enter). Never rotate out a cat during petting or a modal. No permanent disappearance or loss of trust.
- Generalize state machine and renderer to keep cats separate by stable ID. Each cat can walk, idle, rest, drink, play or accept petting as appropriate. Use validated fixed paths/waypoints, not complex pathfinding unless required. Ensure cats never cross solids, do not block the player, and reserve activity slots so two cats cannot occupy the same spot. Provide a deterministic safe fallback when a spot is occupied.
- Preserve visible consent cues and respect refusal. Petting gives no PS; trust only from distinct events, persists without decay. For new visitors use first accepted greeting and explicitly defined eligible habitat events; do not award unrelated or duplicate trust. No real-time chores, illness or penalties for absence.
- Pause all cat simulation while modal overlays are open, during native backgrounding and while the page is hidden. Bound update/render work and avoid per-frame React state changes. Preserve tablet controls and the low-performance baseline.

## Kicipedia

- Accessible from gameplay and pause/menu, with a short Polish title, simple collection view and detail view. Pause simulation while open; Back/close returns to the previous screen without losing progress.
- Include Bursztynek and four visitors. Unknown entries show a neutral silhouette and useful habitat hints, without exposing the full entry prematurely. Discover a cat once by approaching/observing it while actually present (not merely by restoring an attraction). Define the encounter radius and eligibility check. Discovering a cat does not require touching it or earn PS.
- Persist stable discovery IDs and optionally a deterministic encounter ordinal, not personal data or real-world location. Display original portrait, name, favourite activities, a short fictional fact and current trust for discovered cats. Keep collection readable and avoid scores, rankings or streaks.
- Persist discovery idempotently, including across reload, transitions and app restart. Preserve Bursztynek trust and progress from earlier saves. A legacy save with a recorded accepted greeting can derive its resident-cat discovery; otherwise discover through the normal encounter rule.
- Use the existing transactional save repository, explicit migrations from all supported prior versions and validated commands. Retain recovery snapshots and never silently overwrite a valid unsupported save. Test simultaneous discovery/completion/petting and duplicate events. No requirement to persist transient simulation positions or elapsed timers.

## Android, offline and assets

- Preserve Android API 24 minimum, Chromium 80 frontend target, compatibility diagnostics, Node 24.13.1/npm 11.11.0, application ID and native origin. Avoid unsupported APIs and unnecessary dependencies.
- Bundle all artwork and maps; include all new resources in the PWA precache. Preserve safe worker updates, offline first launch on APK, native Back, pause, rotation and touch controls. Add no runtime external requests.
- Keep APK CI, increment versionCode to 6 (versionName 0.6.0), verify metadata, bundle, signature and artifact. Independent CI keys do not guarantee in-place upgrades. Do not add keys or secrets.
- Physical Huawei gameplay, FPS, WebView and upgrade durability are pending. Do not invent results or block delivery solely because the owner deferred device checks. Report any discovered compatibility regression.
- Record all original asset provenance; no commercial character, map, music or art copying.

## Acceptance

- Verify a fresh save can reach garden at 16 PS, not 15; skip an indoor quest, return, then complete all 25 quests. Preserve earlier gates. Validate the reachability graph, unique reward IDs and no dead-end.
- Verify both indoor and garden quests, visible effects, all four visitors, deterministic habitat rules, fair rotation with max three visitors, exclusive activity spots, clear routes, consent and pause/resume. No extra PS or trust from repeated interaction.
- Verify Kicipedia unknown/discovered states, discovery only on encounter, resident-cat migration, unique discovery, persistent trust, reload and Back/close behaviour. Migrate actual Stage 05 (schema 2/content 3) fixtures with 12 PS and existing trust plus earlier supported saves. Cover failed writes and duplicate commands.
- Run npm ci --engine-strict, lint, typecheck, unit tests, production build and Playwright; retain existing regression and offline/update tests. Add unit tests for habitat eligibility/rotation, slot reservation, movement, discovery, migration and gate graph. Add browser flow for 15/16 gate, garden tasks, visitor discovery, Kicipedia and reload offline. Test all 25 rewards in domain/browser coverage as appropriate. Verify portrait/landscape layout, Android build and artifact. Re-run legacy Chromium smoke if available; distinguish browser testing from native testing.
- Update README, ROADMAP, GAME_DESIGN, ARCHITECTURE, CONTENT, stage notes and ASSET_LICENSES with actual results. Link this stage in the roadmap. Record the deferred owner reviews accurately. Code/docs concise English, player UI Polish.

## Out of scope

Backend, PostgreSQL, cloud sync, QNAP deployment, garden free placement, crafting, coins, basement, forest, academy, public profiles, advertising, store release, production signing and adaptive learning.

Stop after Stage 06 and wait for owner review.
