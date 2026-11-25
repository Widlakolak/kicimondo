# Roadmap

Current status: Stage 04 is merged with green CI. Stage 05 expands the house to eight locations and 12 lifetime PS, with the ground floor opening at 8 PS. Stage 05 owner review, physical MediaPad T5 acceptance and native upgrade verification are pending.

| Stage | Scope | Acceptance |
| --- | --- | --- |
| 00 | Project design and agent instructions | Documents consistent; initial stage ready for Codex |
| 01 | [Client and playable room](stages/01-room-prototype.md) | Merged. Owner confirmed local Windows play. Automated touch coverage used emulation. |
| 02 | [Tracing and progression](stages/02-first-quest.md) | Merged in PR #2. CI and all 14 owner checks passed. |
| 03 | [First resident cat](stages/03-first-cat.md) | Merged in PR #3. CI and all 19 owner checks passed. |
| 04 | [Android and offline web](stages/04-android-pwa.md) | Universal debug APK, PWA offline play and safe updates, MediaPad T5 lifecycle and save durability |
| 05 | [House expansion](stages/05-house-expansion.md) | Nine pre-gate quests, three downstairs, dialogue and return routes. Owner review pending. |
| 06 | Garden and visiting cats | Reach 16 PS, restore fixed habitats, deterministic visitors, basic Kicipedia |
| 07 | Java content backend | Spring Boot, Gradle, Flyway, PostgreSQL, validated versioned packs, REST/OpenAPI and integration tests |
| 08 | Family web release on QNAP | CI, GHCR, Compose, HTTPS, offline smoke, backup/restore and rollback |
| 09 | Basement workshop | Reach 32 PS, simple recipes and fixed upgrade slots; enough accessible tasks |
| 10 | Educational refinement | Skill-based difficulty, reviewed Polish pools, local parent reports and export |
| 11 | Forest | Reach 64 PS with sufficient pre-forest content, stories and nature challenges |
| 12 | Android release readiness | Device matrix, accessibility, privacy, licenses, signed AAB, Play policy and closed testing |
| 13+ | Village, academy, further world | 128/256+ PS, cat pupils, optional building freedom, later sync if justified |

Stages 00–03 target a small family playtest, not a store-ready product. Stages 04 and 08 provide early mobile and web validation. The garden is the first full habitat loop. Public release depends on the quality and review of content, not merely a stage number.

For each stage, create a short specification before implementation: objective, scope, out of scope, design constraints, acceptance tests, commands and manual verification. A stage may be split if too large. Record changes in docs/stages/ and keep README status current. Do not advance without owner approval.

## Deferred

Real-time multiplayer, public profiles, cloud accounts, user-generated content, AI tutors, free-form construction, full economy, large simulation, cross-device sync and iOS are not initial requirements. No monetization or advertising in the family release.
