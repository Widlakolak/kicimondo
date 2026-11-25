# Roadmap

Current status: Stage 04 and Stage 05 are merged with green CI. Stage 05 owner gameplay review and physical MediaPad T5 acceptance remain deferred. Stage 06 adds the garden at 16 PS, four visitors and Kicipedia, with 25 PS available. PR #6 is merged with green CI. Stage 05/06 owner reviews, MediaPad T5 testing and native upgrade verification are pending; the owner approved proceeding to Stage 07.

| Stage | Scope | Acceptance |
| --- | --- | --- |
| 00 | Project design and agent instructions | Documents consistent; initial stage ready for Codex |
| 01 | [Client and playable room](stages/01-room-prototype.md) | Merged. Owner confirmed local Windows play. Automated touch coverage used emulation. |
| 02 | [Tracing and progression](stages/02-first-quest.md) | Merged in PR #2. CI and all 14 owner checks passed. |
| 03 | [First resident cat](stages/03-first-cat.md) | Merged in PR #3. CI and all 19 owner checks passed. |
| 04 | [Android and offline web](stages/04-android-pwa.md) | Universal debug APK, PWA offline play and safe updates, MediaPad T5 lifecycle and save durability |
| 05 | [House expansion](stages/05-house-expansion.md) | Merged in PR #5 with green CI. Owner gameplay and device review deferred. |
| 06 | [Garden, visiting cats and Kicipedia](stages/06-garden-kicipedia.md) | Garden at 16 PS, eight restorations, four visitors and 25 total PS. Owner review pending. |
| 07 | [Java content backend](stages/07-java-content-backend.md) | Spring Boot, Gradle, Flyway, PostgreSQL, validated versioned packs, REST/OpenAPI and integration tests |
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
