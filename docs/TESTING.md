# Testing

## General

Use deterministic fixtures and fake clocks/seeds where needed. Report real command output and distinguish automated, manual and unrun checks. CI success does not replace a mobile playtest.

## Client

Use Vitest for pure domain rules and React components where appropriate; Playwright for a small browser smoke suite as soon as the room is available. Test Phaser-independent functions directly. Browser smoke tests should verify meaningful visible behaviour through accessible controls and a minimal observable game state, not rely on brittle screenshots or arbitrary sleeps. Run lint, type checking, unit tests and the production build on every implementation PR. Add visual/manual checks for canvas interactions.

Critical regressions by stage:
- movement, collision, interaction range, input release and modal focus;
- tracing both paths with mouse and touch, same-gesture off-guide recovery, cancellation and resume, shortcut rejection, and the accessible alternative;
- one award per quest, correct threshold boundary, room object persistence, reload and malformed save recovery;
- valid quest/content references, sufficient reachable rewards, missing asset errors;
- cat eligibility, bounded visitors, trust, refusal to pet, no inactivity penalty;
- offline reload after initial cache, app background/resume and Android process restart;
- Polish labels, keyboard and touch controls, route cancellation, camera bounds and hit tests at nonzero scroll;
- first-minute onboarding, fullscreen and rotation, visual progression, and reset cancellation, transaction failure and stale tabs.

## Backend

JUnit 5, Spring Boot tests and Testcontainers PostgreSQL for migrations, repository behaviour and transactional deduplication. Test malformed content, schema/version incompatibility and API errors. If sync exists, test cross-profile access, concurrent retries and deterministic merge rules. Do not replace PostgreSQL tests with H2 when relying on PostgreSQL behaviour.

## Manual checks

Review the running build at 640 × 360 and 844 × 390 on phones, 960 × 600 and 1920 × 1200 on tablets, and 1920 × 1080 on desktop. Test the dock, fullscreen with controls shown and hidden, scrolled world and all four exercise types. At 360 × 640 and 600 × 960 check rotation guidance, then return to the same exercise. Test both landscape directions, app reopening and hardware Back on a physical Android device. Verify that a first-time player can understand the first activity. Ask for voluntary feedback and keep identifying child data out of the evidence.

Use the stage-specific checklist. Label owner acceptance separately from code completion and CI results.

Set `KICIMONDO_VISUAL_REVIEW=1` when running Playwright to save representative screenshots in `frontend/test-results`. Frontend CI uploads them as `stage-08-1-visual-review` and keeps the failure report and traces in `playwright-failure`.
