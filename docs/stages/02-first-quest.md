# Stage 02: First quest and progression

Status: merged in PR #2. GitHub Actions passed and the owner accepted Stage 02 after all 14 manual checks passed.

## Goal

Complete the first educational loop. The player cleans up the clothes by tracing a path, earns one independence point, sees the room change and can leave through the door. Progress survives reload.

## Scope

- Replace the Stage 01 placeholder with a real TRACE_PATH challenge loaded from content. Keep the challenge UI accessible and independent of Phaser.
- Add normalized ordered-path evaluation with configurable distance tolerance and coverage threshold. Start with a generous corridor, visible start/end and simple curved path; show a preview. Use Pointer Events, capture/cancel, coordinate transforms on resize and resumable strokes. Interpolate between input samples where necessary; reject shortcuts. Do not require a continuous stroke or impose a timer.
- Make parameters explicit and testable. Suggested starting values: accept at least 90% ordered coverage of sampled reference points inside a tolerance of 5% of the shorter drawing-area dimension, including start/end within tolerance. Tune after testing; these are not educational norms. Track contiguous forward progress so a shortcut cannot jump to the end. Provide an accessible alternative (e.g. tap numbered targets in sequence) with the same quest reward.
- Add a versioned local save repository and atomic completion. Persist quest status, reward ledger, room object state and location/spawn. Keep a last-known-good save or recovery path, validate imports/old formats and never clear a valid save silently. Use IndexedDB for the gameplay state, with a migration from Stage 01 profile storage.
- Add a small upstairs landing with a safe spawn and a return transition. A locked door explains the requirement of one PS. After completing the quest, hide the clothes, award exactly one lifetime PS, and unlock the door. No automatic transition; let the player choose to leave.
- A failed attempt offers a hint, retry or exit without penalty. A completed quest can be practised again only if explicitly offered; it never awards another PS. Acknowledge success with short visual feedback and optional sound, not a forced celebration.

## Out of scope

Other minigames, full upstairs, cats, server, store build, multiplayer, coins, achievements, complex animations and full content authoring UI.

## Acceptance

- Desktop mouse and touch: correct tracing or alternative completes the quest; tapping the end, skipping the curve and interrupted invalid strokes do not pass. A resumed valid stroke can finish.
- On success exactly one award is stored, clothes disappear and the door opens. Double click, repeat completion and reload do not duplicate PS. The initial door is locked before success.
- Save/reload restores the avatar and completed world state. Invalid or old saves have a safe recovery path. If persistence fails, show a clear notice rather than claiming progress was saved.
- Enter the upstairs landing and return to the room; both transitions preserve valid spawn and state. No further progress gate is advertised as playable.
- Tests cover geometry, tolerance/coverage/order, cancelled pointer, duplicate awards, unlock boundaries, save migration and failed writes. Browser smoke test covers the end-to-end loop, including accessible alternative and reload. Run the existing CI commands.

Stop after the first quest and wait for owner acceptance.

## Implementation and verification

The bundled quest links the scattered clothes anchor to a curved tracing exercise and a reward of 1 PS. The drawing area uses normalized coordinates with a 5% tolerance and 90% ordered coverage. The player can lift and resume at the last checkpoint, use a hint, restart, cancel, or use the numbered buttons with a keyboard or pointer. Pointer cancellation rolls back the unfinished stroke.

The quest, reward and removal of the clothes commit together in IndexedDB. The saved checkpoint tracks both transitions between the bedroom and the landing. The repository migrates the Stage 01 profile on the same browser origin and retains a previous valid snapshot for recovery. Unsupported save versions are preserved. When writing fails, the player can continue for the current session and sees a save notice.

The clean install and checks below ran on Linux with the owner's Node.js 24.13.1 and npm 11.11.0 versions. CI pins those versions. The package accepts later releases within both major versions.

| Command from `frontend/` | Result |
| --- | --- |
| `npm ci --engine-strict` | Passed with the committed lockfile |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 35 passed across 7 files |
| `npm run build` | Passed, including content and map validation. Vite warned about the size of the separately loaded Phaser chunk |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser` | 7 passed on Chromium 156, including mouse tracing, emulated touch, keyboard alternative, migration, save errors and the landing round trip |

The cloud network denied the Playwright Chromium download. The browser suite ran on the installed Chromium. The owner later confirmed all 14 manual acceptance checks, including installation, tracing, progression, transitions and persistent saves. Physical Android testing has yet to take place.

### Manual review

- Use the same browser and local address as Stage 01 to check that the saved avatar and nickname migrate. Check the door at 0 PS.
- Open the clothes quest. Tap the end or draw a shortcut, then use the hint or restart. Follow the line and lift partway, then resume from the green point. Try the numbered buttons with Tab and Enter on a separate browser profile.
- After success, check for 1 PS, an empty floor where the clothes were, and an open door. Walk to the door and interact to visit the landing. Reload there, resume, and return to the bedroom. Check that the point total remains 1 PS.
- Repeat tracing and the alternative on a physical phone. Check that a cancelled touch lets the player resume safely.
