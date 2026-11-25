# Development instructions

## Before editing

- Read README.md, this file, docs/ROADMAP.md and the specification for the requested stage. Read the relevant game design, education, content and architecture documents before changing those areas.
- Inspect the actual working tree, branch, dependencies and tests. Do not assume a file, service or deployment exists because it appears in the roadmap.
- Work on one approved stage at a time. If a requirement conflicts with a design document, follow the owner's latest explicit decision and record the change. If scope is unclear, choose the smallest reversible implementation and state the assumption.
- Do not start the next stage, merge a PR, deploy to QNAP, change repository settings or publish to Google Play without approval.
- Treat the stage specification as the acceptance contract. Do not implement future features merely because they are mentioned in a design document.

## Code

- Use TypeScript in strict mode, React, Vite and a compatible stable Phaser 3.x release for the client. Verify exact versions and commit the npm lockfile. Use a supported Node LTS version pinned in the repository and CI.
- Phaser owns world rendering, physics, animation and movement. React owns menus, accessible educational UI and overlays. Keep pure domain rules separate from both. Use a small typed bridge between them; clean up listeners and game instances on unmount.
- Keep quests, maps, dialogue, unlock rules and challenge pools data-driven. Validate content at build time. Stable IDs must not depend on display text or array order.
- Use Java 21, a compatible stable Spring Boot 4.x release, Gradle Wrapper with Kotlin DSL, PostgreSQL and Flyway when the backend stage begins. Use feature packages and explicit module boundaries. Do not add a server to the initial room prototype.
- The local game must work without the server. Keep point awards and quest completion atomic and idempotent. Never reset a valid save silently. Version saves and content; test migrations.
- Do not add libraries, infrastructure or abstractions without a concrete need. No Kafka, microservices, paid AI or runtime external asset services for the initial scope.
- Prefer small functions, explicit types and useful names. Comments should explain non-obvious decisions, not repeat code. Code, commits and technical docs are in English; player-facing text is initially Polish and kept in locale resources.

## Child safety, originality and operations

- No advertisements, chat, public profiles, tracking, accounts for children or real personal details. Do not include the owner's child's name, photo, school or actual address in code, fixtures or logs.
- Do not copy commercial game assets, names, characters, layouts, distinctive screens, music or source code. Use original placeholders or assets with verified licenses and record them in ASSET_LICENSES.md.
- Cats are fictional. Do not reward chasing or touching an unwilling cat. Avoid streaks, countdown pressure, loss of rewards or punishment for time away.
- Do not commit secrets, signing keys, personal saves or production data. Do not expose PostgreSQL or management endpoints publicly. Do not change existing QNAP services, domains or routing without separate approval.
- Public README must describe only implemented and verified functionality. Keep it brief. Use roadmap and stage notes for future work and historical details; never invent test or deployment results.

## Finish a stage

1. Run relevant lint, type checks, tests and production build. Fix regressions in scope. If a tool or device is unavailable, report the exact limitation; do not claim the check passed.
2. Verify the acceptance scenario. Include useful manual checks for desktop and touch; report whether they were actually run.
3. Update README status, the roadmap and the affected design docs. Add a short stage note with commands, results and remaining limitations. Do not mark owner acceptance before the owner confirms it.
4. Review the diff for unrelated changes, accidental credentials, generated files and unlicensed assets.
5. Return a concise summary, tests with results, manual verification steps and unresolved issues. Use a focused branch and PR if available; do not auto-merge. Stop and wait for approval.
