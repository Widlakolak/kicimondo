# Roadmap

Stage 04 and Stage 05 are merged with green CI. Stage 05 owner gameplay review and physical MediaPad T5 acceptance remain deferred. Stage 06 adds the garden at 16 PS, four visitors and Kicipedia, with 25 PS available. PR #6 is merged with green CI. Stage 05/06 owner reviews, MediaPad T5 testing and native upgrade verification are pending. The owner approved proceeding to Stage 07. PR #7 is merged with green CI. The owner will review the optional math content service during Stage 08; physical device and earlier owner acceptance checks remain pending. Stage 08 production images are published and deployed on the QNAP. The owner confirmed all three containers healthy and the HTTPS family site at https://kicimondo.cc.cd works. NAS backup/restore, content import and physical device checks remain pending. Stage 08.1 is merged in PR #9; release ae144322 is published and running on the QNAP with all containers healthy and backend UP, as confirmed by the owner. The owner deferred gameplay/device acceptance until the next playtest and explicitly approved Stage 09 content development. NAS backup/restore and actual content import remain unverified.

| Stage | Scope | Acceptance |
| --- | --- | --- |
| 00 | Project design and agent instructions | Documents consistent; initial stage ready for Codex |
| 01 | [Client and playable room](stages/01-room-prototype.md) | Merged. Owner confirmed local Windows play. Automated touch coverage used emulation. |
| 02 | [Tracing and progression](stages/02-first-quest.md) | Merged in PR #2. CI and all 14 owner checks passed. |
| 03 | [First resident cat](stages/03-first-cat.md) | Merged in PR #3. CI and all 19 owner checks passed. |
| 04 | [Android and offline web](stages/04-android-pwa.md) | Universal debug APK, PWA offline play and safe updates, MediaPad T5 lifecycle and save durability |
| 05 | [House expansion](stages/05-house-expansion.md) | Merged in PR #5 with green CI. Owner gameplay and device review deferred. |
| 06 | [Garden, visiting cats and Kicipedia](stages/06-garden-kicipedia.md) | Garden at 16 PS, eight restorations, four visitors and 25 total PS. Owner review pending. |
| 07 | [Java content backend](stages/07-java-content-backend.md) | Read-only REST, immutable math packs, operator import, offline client cache and PostgreSQL integration tests. Owner review pending. |
| 08 | [Family web release on QNAP](stages/08-qnap-family-release.md) | Isolated Compose, read-only content routing, offline update, backup/restore and rollback tested locally. GHCR published, NAS healthy and HTTPS confirmed by owner. Further owner checks pending. |
| 08.1 | [Kids UX and playtest fixes](stages/08-1-kids-ux.md) | Landscape camera, direct touch movement, visible quests, scratch tracing, cat roaming, reset and installation. Owner gameplay and physical device acceptance pending. |
| 09 | [Basement and cat workshop](stages/09-basement-workshop.md) | 50 total PS, 35 before the 32 PS staircase, three new maps, six fixed-slot recipes, sixth cat, compatible saves and educational packs |
| 10 | Educational refinement | Skill-based difficulty, reviewed Polish pools, local parent reports and export |
| 11 | Forest | Reach 64 PS with sufficient pre-forest content, stories and nature challenges |
| 12 | Android release readiness | Device matrix, accessibility, privacy, licenses, signed AAB, Play policy and closed testing |
| 13+ | Village, academy, further world | 128/256+ PS, cat pupils, optional building freedom, later sync if justified |

Stages 00–03 target a small family playtest, not a store-ready product. Stages 04 and 08 provide early mobile and web validation. The garden is the first full habitat loop. Public release depends on the quality and review of content, not merely a stage number.

For each stage, create a short specification before implementation: objective, scope, out of scope, design constraints, acceptance tests, commands and manual verification. A stage may be split if too large. Record changes in docs/stages/ and keep README status current. Do not advance without owner approval.

## Deferred

Real-time multiplayer, public profiles, cloud accounts, user-generated content, AI tutors, free-form construction, full economy, large simulation, cross-device sync and iOS are not initial requirements. No monetization or advertising in the family release.
