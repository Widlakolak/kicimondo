# Stage 01: Client and playable room

Status: merged. The owner launched and tested the game locally on Windows and accepted Stage 01.

## Goal

Create a small, runnable web game foundation. A child can choose an avatar, enter an original bedroom, move around it with a keyboard or touch controls, and interact with the scattered clothes. This stage stops before the educational challenge and point system.

## Scope

- Initialize frontend/ with React, strict TypeScript, Vite and compatible stable Phaser 3.x. Choose and pin a supported Node LTS and exact dependency resolution via package-lock.json. Use npm scripts for dev, lint, typecheck, test and build. Set up Vitest and a small browser smoke test with Playwright. Add PR CI for frontend checks; no publishing.
- Implement a Polish start screen: boy/girl avatar, nickname (non-empty after trim, maximum 20 Unicode characters or documented equivalent), start button, validation. No real name requirement or account. Localize visible strings. Store the selected profile/settings through a small versioned storage adapter; tolerate unavailable storage with a clear local notice. Continue or change avatar without silently erasing data.
- Create one original top-down bedroom with a bed, desk, wardrobe, scattered clothes and a closed door, using original placeholder graphics or verified licensed assets. Use Tiled-compatible orthogonal JSON and editable map source where practical. Keep collision and interaction IDs data-driven. Use 16 px tiles and a logical 320 × 240 world viewport as defaults; preserve aspect ratio and readable UI.
- Implement four-direction keyboard movement (arrows and WASD), visible touch D-pad and interaction button. Handle key/touch release, pointer cancellation, focus loss and resize; no stuck movement. Normalize diagonal input or use cardinal-only movement consistently. Prevent walking through walls/furniture, and use a valid spawn. Add a simple original walk animation.
- Within interaction range of the clothes, show a clear Polish prompt. A deliberate interaction opens a short modal stating that the cleaning task will be available in the next stage; closing it restores control. Do not fake completion, award PS or claim educational functionality. The locked door has a clear message. Disable movement during overlays.
- Keep game rules independent of Phaser and React. Ensure Phaser instance and event listeners are disposed on unmount. No remote asset requests. Update README with actual run commands, current scope and a short note on placeholder assets.

## Out of scope

Tracing, PS, unlocked map transitions, cats, other minigames, database, backend, accounts, cloud sync, PWA service worker, Android wrapper, QNAP deployment and store publication. These are explicit later stages, not missing requirements for this one.

## Acceptance

- Clean checkout: documented Node version, npm ci, npm run lint, npm run typecheck, npm test and npm run build succeed. Run the documented browser smoke test. CI uses the same versions and commands.
- Choose either avatar, reject blank nickname, start in the room. Display Polish strings correctly. Reload retains the selected profile; corrupted data cannot crash the app.
- Keyboard and touch move the avatar; collision prevents crossing walls and furniture; key/pointer release stops movement. Layout fits representative desktop and mobile viewports without horizontal overflow. Controls remain usable.
- Interact near the clothes, not across the room. Overlay pauses movement, closes reliably and grants no reward. Door stays closed.
- Automated tests cover profile validation, storage parsing/recovery, input normalization or cardinal selection, range/collision helpers and a browser start/interaction flow. Actual touch device testing is reported separately if unavailable.
- Asset provenance documented. No credentials, private child data, copied sprites, generated build output or unrelated changes in Git.

## Handoff

Return the branch/PR if created, a brief change summary, actual test commands/results and manual test steps in Polish for the owner. Mark code implemented only if verified; leave owner acceptance pending. Stop here and wait for approval before Stage 02.

## Implementation and verification

The client uses Node.js 24.22.3, npm 11.19.1, React 19.2.9, Phaser 3.90.0, Vite 8.3.8 and TypeScript 6.0.3. The npm lockfile fixes dependency resolution. The nickname limit counts Unicode code points after trimming. A cancelled profile edit retains the saved profile. The profile uses version 1 of the local browser storage record; the avatar starts beside the bed on entry.

The editable Tiled object map defines the spawn, furniture footprints, walls and walkable interaction anchors. The production build validates the map. Phaser renders the room and owns movement and collision updates. React handles the profile, on-screen controls and native dialog, with a typed input and interaction bridge. The clothes interaction displays a placeholder and the door stays closed.

Local checks from `frontend/`:

| Command | Result |
| --- | --- |
| `npm ci --engine-strict` | Passed with the pinned Node.js and npm versions |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 18 passed across 4 files |
| `npm run build` | Passed, including map validation. Vite flagged the separately loaded Phaser chunk for size |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser` | 4 passed on system Chromium 156 with desktop and emulated touch coverage |

The cloud network blocked the Playwright browser download. The pull-request workflow installs Playwright Chromium on GitHub Actions.

### Manual review

- On desktop, choose each avatar and try an empty nickname and a nickname with Polish characters. Reload and check that the saved profile can be resumed or edited.
- Move with arrows and WASD. Walk into a wall and the furniture. Release movement, then switch away while holding a key and return.
- Approach the scattered clothes and press E or **Sprawdź**. Read the placeholder, try moving while the dialog is open, then close it. Approach the door and check that it stays closed.
- On an Android phone, repeat movement and interaction with the on-screen buttons in portrait and landscape. Release a direction, rotate the device while holding a direction, and check that movement stops. Check text and button sizes in both layouts.

The owner later confirmed hands-on play on Windows. Physical Android testing has yet to take place. The tool versions and results above record the original Stage 01 run.
