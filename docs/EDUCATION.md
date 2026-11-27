# Educational design

The game supports practice, not a substitute for school or an assessment tool. Initial content is Polish and aimed at early primary school, particularly first-year skills. Have a teacher review material and compare it with the applicable Polish curriculum before claiming curriculum alignment.

## Challenge types

| Type | Skills | Initial examples |
| --- | --- | --- |
| TRACE_PATH | Hand-eye coordination, pre-writing | straight/curved paths, waves, loops |
| MATH_CHOICE | Counting, addition/subtraction | objects and numbers within 10 |
| MATCH_PAIRS | Reading, vocabulary | match kot/pies to pictures; picture-to-picture alternative |
| SORT_ORDER | Logic, sequences, categories | colours, shapes, ordering daily actions |
| Later | Phonics, time, money, nature, English | syllables, clock, coins, habitats |

Each task has a skill ID, difficulty, content version, a clear instruction, a hint and appropriate feedback. One short exercise is sufficient for a small quest. A failed attempt is not a failed quest: offer a useful hint, retry, simpler alternative or exit without penalty. Do not lock children out because of motor, reading or input difficulties.

## Tracing

The clothes and tunnel activities show a broad guide with a start and finish, a finger-following brush and a revealed section. SVG coordinates come from the current viewBox transform. Interpolation between pointer samples measures progress through an ordered path using each task's tolerance and coverage threshold. An excursion can be retraced with the same finger still down. Lifting or cancellation preserves the accepted section and shows where to resume. A stationary tap or shortcut that skips valid coverage earns no star. Reaching the endpoint after enough coverage completes the task during the stroke. The numbered alternative remains available with keyboard and touch controls. Tracing provides untimed coordination practice.

## Maths and matching

Generate seeded valid questions from bounded operands and a maximum result. No negative subtraction in the first level. Ensure distinct choices, exactly one correct answer and shuffled positions. Render objects clearly and offer a countable visual hint. Matching uses stable item IDs, unambiguous pictures, no duplicated labels and an accessible tap-select/tap-match option instead of drag-only controls. Polish spelling and diacritics must be correct.

Use short landscape overlays with large choices and sans-serif instructions. Maths uses prominent numerals and visual counters. Matching preserves the intended Polish words and provides picture choices and an optional clue. Sorting pairs large illustrations with short labels. Incorrect choices offer another attempt. The first committed completion gives one independence star and updates the world.
## Difficulty and reporting

Start with manually selected difficulty and fixed pools. Later track each skill independently with recent attempts, hints, content level and practice recency. Use a bounded deterministic rule; do not infer ability from speed or one wrong answer. Allow parent override and offer revision. Explain successes and next suggested skills in the parent view; no diagnostic labels, public ranking or misleading precision.

## Review checklist

- One clear learning objective and age-appropriate wording.
- Correct expected answer and meaningful distractors.
- Clear image, adequate text size and touch targets.
- No reliance on colour alone; no unnecessary audio requirement.
- No unsafe real-world instructions, punishment or shame.
- Verify with an adult and test comprehension with the child voluntarily. Collect no identifying test data in the repository.
