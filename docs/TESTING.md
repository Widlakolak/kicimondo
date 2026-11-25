# Testing

## General

Use deterministic fixtures and fake clocks/seeds where needed. Report real command output and distinguish automated, manual and unrun checks. CI success does not replace a mobile playtest.

## Client

Use Vitest for pure domain rules and React components where appropriate; Playwright for a small browser smoke suite as soon as the room is available. Test Phaser-independent functions directly. Browser smoke tests should verify meaningful visible behaviour through accessible controls and a minimal observable game state, not rely on brittle screenshots or arbitrary sleeps. Run lint, type checking, unit tests and the production build on every implementation PR. Add visual/manual checks for canvas interactions.

Critical regressions by stage:
- movement, collision, interaction range, input release and modal focus;
- tracing success, off-path failure, cancellation and resume, accessible alternative;
- one award per quest, correct threshold boundary, room object persistence, reload and malformed save recovery;
- valid quest/content references, sufficient reachable rewards, missing asset errors;
- cat eligibility, bounded visitors, trust, refusal to pet, no inactivity penalty;
- offline reload after initial cache, app background/resume and Android process restart;
- Polish labels, keyboard controls, touch targets, layout and zoom at different viewport sizes.

## Backend (later)

JUnit 5, Spring Boot tests and Testcontainers PostgreSQL for migrations, repository behaviour and transactional deduplication. Test malformed content, schema/version incompatibility and API errors. If sync exists, test cross-profile access, concurrent retries and deterministic merge rules. Do not replace PostgreSQL tests with H2 when relying on PostgreSQL behaviour.

## Manual checks

Test the room on desktop and an actual Android phone before expanding the world. Check portrait and landscape, touch movement, interaction clarity, audio controls, pause/back and app reopening. Verify the first task is understandable without an adult explaining the solution. Ask for voluntary feedback; avoid recording identifiable child data.

Use the stage-specific checklist. Label owner acceptance separately from code completion and CI results.
