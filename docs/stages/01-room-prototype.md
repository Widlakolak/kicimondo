# Stage 01: Client and playable room

Status: ready for implementation; not started.

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
