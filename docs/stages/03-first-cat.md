# Stage 03: First resident cat

Status: planned; start only after Stage 02 is accepted.

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
