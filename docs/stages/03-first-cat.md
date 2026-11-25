# Stage 03: First resident cat

Status: accepted. PR #3 merged; CI and all 19 owner checks passed.

## Goal

Finish the first small family-playtest release. Introduce one original resident cat and two additional educational activities in the bedroom. Make the cat visibly respond to improvements without requiring real-time care.

## Scope

- Add a fictional resident cat with a stable ID, original appearance and simple local states: idle, walking, resting, drinking and optional petting. Use fixed valid movement targets or a short route, avoiding furniture. Stop or pause simulation during challenges and backgrounding.
- Add water bowl and bed as distinct interactions. Restore the bowl through a counting/math-choice task (result <= 10, exactly one valid answer); restore the bed through simple matching (e.g. words and images, with accessible tap selection). Show corrected visual states and let the cat use the restored spots.
- Award one PS once for each eligible first-time task. The cat, bowl and bed remain available after the first door is unlocked. No repeated point farming; no mandatory sequence for these two quests.
- Add a small trust state and a clear, non-verbal readiness cue. When receptive, allow a brief petting interaction and animation. When not receptive, let the player give the cat space; no penalty. Award trust only for meaningful distinct events (e.g. restored attraction or first accepted greeting). Persist it without decay. Do not imply that an unfamiliar real cat is safe to touch.
- Include short Polish instructions, helpful hints, optional sound controls and a safe pause. Keep all content and rules data-driven and record artwork provenance.

## Out of scope

Visiting cats, habitat combinations, full Kicipedia, crafting, free placement, complex pathfinding, economy, school, cloud and deployment. These are later stages.

## Acceptance

- Cat is visible and moves/rests without blocking the player or crossing walls. Interaction is understandable; refusal is respected.
- Water and bed tasks can be completed independently, restore their objects and grant at most one PS each. Math options are valid and matching pairs unambiguous. Errors offer retry or help.
- Cat uses restored attractions within a short active-play window. No need to wait overnight, no punishment for closing the game.
- Reload preserves all three quest completions, PS, attraction states and trust. A child can leave and return to the bedroom without losing them.
- Tests cover question generation, matching, trust, object state, duplicate rewards and valid cat destinations. Run build, lint, type checks, unit tests and browser smoke tests.
- Owner playtest: choose character, complete clothes/bowl/bed tasks, interact with cat, leave and reload. Report real device testing and any usability changes. Do not claim educational efficacy from this playtest.

Stop after the family-playtest release; do not start Android packaging or deployment without approval.

## Implementation and verification

Bursztynek follows short, deterministic routes in the bedroom. A heart and the interaction prompt signal when he is receptive. Petting, walking, resting and drinking have distinct frames. The cat takes turns visiting restored attractions during active play. Its clock stops during quests, pause and backgrounding. This release is silent.

The water bowl round presents counting, addition and subtraction with values from 0 to 10. The bed task uses three original pictures and Polish words, with selection by pointer or keyboard. Either quest can be completed first. Each restores its attraction, awards 1 PS and adds one trust event in a single IndexedDB transaction. The first accepted pet adds a separate trust event. Later greetings leave the trust total intact, and inactivity has no effect. Version 1 Stage 02 records are migrated without changing their profile, checkpoint, completed quest, reward or hidden clothes.

Checks ran on Linux with Node.js 24.13.1 and npm 11.11.0.

| Command from `frontend/` | Result |
| --- | --- |
| `npm ci --engine-strict` | Passed with the committed lockfile |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 44 passed across 9 files |
| `npm run build` | Passed, including challenge, map and cat-route validation. Vite warned about the size of the separately loaded Phaser chunk |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser` | 10 passed on system Chromium 156. Coverage includes both new quests, emulated touch selection, cat consent and pause, migration, reload and the Stage 02 regression suite |

The cloud network denied the Playwright Chromium download. Physical Android testing is pending. GitHub Actions run 45599222437 passed all checks, including 44 unit and 10 browser tests. Owner acceptance confirmed on 2026-11-25.

### Manual review

- Open the same address and browser profile as Stage 02. Verify the avatar, PS, cleared clothes and saved location.
- In the bedroom, try petting while the heart is visible. Wait for Bursztynek to get busy and check the give-space prompt. Later petting should keep trust unchanged.
- Open the empty bowl, try a wrong answer and a hint, then finish counting, addition and subtraction. Check the water and watch the cat drink.
- Match the Polish words to the pictures. Try a wrong pair, then finish by tapping or using Tab and Enter. Watch the cat use the restored bed.
- Check 3 PS after completing all three quests. Use pause and switch tabs to check that the cat stops. Visit the landing, reload, then return and check that progress, both attractions and trust are intact.

### Owner acceptance

All 19 checks passed: launch, profile/1 PS migration, cleared clothes, cat visibility and movement, petting and unique trust, maths and water restoration, drinking, matching and bed use, 3 PS, pause, landing round trip and persistent progress/trust after reload. Physical device testing was not reported.
