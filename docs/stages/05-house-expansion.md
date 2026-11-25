# Stage 05: House expansion

Status: ready for implementation. Stage 04 is merged; physical MediaPad T5 acceptance and repeatable native upgrades remain pending. The owner approved continuing gameplay development before that review.

## Goal

Expand the existing bedroom and landing into a small explorable house. The player can choose short educational activities upstairs, unlock the ground floor at 8 lifetime PS and continue playing there.

## Scope

- Preserve the bedroom, landing, Bursztynek, all existing quests and stable IDs. Keep the current first-point bedroom exit rule. Extend the landing with access to a study room, bathroom and playroom; add a ground-floor hall, kitchen and living room. Rooms may share a small map if that improves navigation. Use original editable Tiled maps, named spawns, validated collision geometry and bidirectional transitions.
- Add a simple fictional household NPC with short Polish dialogue, contextual hints and no pressure or mandatory daily routines. Keep dialogue separate from challenge completion. NPCs must not obstruct required routes.
- Add six distinct eligible upstairs quests: school bag matching, counting school supplies, ordering book sizes, ordering everyday hygiene steps, matching bathroom items, and sorting toys. Add three ground-floor quests: fruit arithmetic, matching table settings and sorting household objects. These are proposed content examples; keep the reward distribution and learning goals while adjusting details if needed for clarity.
- Reuse TRACE_PATH, MATH_CHOICE and MATCH_PAIRS where suitable. Add a reusable SORT_ORDER challenge with explicit sequence and category variants, unambiguous accepted answers, accessible tap/keyboard controls (no drag-only input), hints, retry and cancel. Keep arithmetic within 10 and Polish instructions short. Do not impose time limits or punish mistakes.
- Each first-time quest awards exactly 1 lifetime PS. No repeat reward or petting PS. The three existing quests and six upstairs quests provide 9 reachable PS before the 8 PS ground-floor gate; the three downstairs quests bring the maximum to 12 PS. Show the required/current PS at the locked stairway and open it permanently at 8. Preserve return routes. Do not advertise garden access as playable or ship a dead-end 16 PS gate: Stage 06 must provide sufficient additional pre-garden content before enabling that transition.
- Show visible quest completion effects using typed, validated world commands, without tying reward eligibility to sprite visibility. Extend existing data-driven content and localization rather than duplicating scene or challenge code. Validate stable IDs, quest effects, NPC references, spawns, anchor reachability from entry, return transitions and the reward graph including the 8 PS gate.
- Extend save/content migrations from all supported earlier versions. Preserve profile, checkpoint, rewards, completed quests, hidden clothes, restored attractions and trust. Keep quest completion atomic and idempotent. Preserve offline and native lifecycle behavior, PWA update safety, Chromium 80 target and Android API 24 minimum. Use existing Node/npm compatibility. Avoid new browser APIs without fallbacks or unneeded dependencies; keep tablet controls usable and assets lightweight.
- Maintain the native APK CI job, increment versionCode for the new distributed build, and keep the application ID and native origin stable. Do not introduce signing keys or claim CI artifacts can upgrade an existing installation. Physical Android testing and stable signing are separate pending owner actions.

## Acceptance

- From a clean save, complete any available bedroom quest, enter upstairs, complete the new quests and reach 8 PS without visiting the ground floor. Verify the gate is locked at 7, open at 8, and return paths are usable. Demonstrate that one pre-gate quest may be skipped. Complete all 12 quests and confirm exactly 12 PS.
- Verify all new maps, collisions, NPC hints, sorting modes, quest visuals, wrong answers, retry, cancellation and keyboard/touch access. No reward for dialogue, repeated completion or incomplete challenges.
- Reload and migrate a Stage 03/04 save with 3 PS and existing trust/attractions. Complete new quests, move between floors, reload and verify all progress and checkpoints. Test failed writes and duplicate rewards. Preserve older saves.
- Run npm ci --engine-strict, lint, typecheck, unit tests, production build and Playwright. Add domain and browser tests for the new content, reachability, sorting, migration and full house progression. Extend offline checks to cover new locations and tasks; verify all required chunks/maps are precached. Retain the Android build and APK verification, report actual device tests separately. No fake test or compatibility claims.
- Update README, roadmap, game design, architecture, content, stage notes and asset records with actual implementation and results. Keep code/docs concise English, player UI Polish.

## Out of scope

Garden, visiting cats, Kicipedia, basement, free building, crafting, economy, adaptive difficulty, backend, QNAP deployment, store publishing and production signing. No new public services.

Stop after Stage 05 and wait for owner review.
