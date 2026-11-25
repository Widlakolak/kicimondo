# Stage 02: First quest and progression

Status: planned; start only after Stage 01 is accepted.

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
