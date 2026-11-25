# Game design

## Concept

Kicimondo is a single-player, top-down 2D adventure for early primary school children (initially ages 6–9, with the first year as the starting point). The player explores a familiar world, solves short educational challenges and restores places for cats. There is no combat.

The first language is Polish. A child should be able to play without reading long instructions. Introduce mechanics one at a time, use visible feedback and avoid time limits by default.

## Main loop

Explore a location -> interact with an object or NPC -> complete a short challenge -> see a change in the world -> receive rewards -> discover another activity.

A second loop runs alongside it: repair or place an attraction -> meet cats -> build trust -> discover preferences and entries in Kicipedia -> unlock new habitat possibilities. Exploring or decorating without doing an exercise should also be enjoyable.

## Opening

Stage 02 covers avatar selection, bedroom exploration, the clothes quest and the landing. The first quest can be completed by tracing or using numbered buttons in order.

The player chooses a boy or girl avatar and an in-game name (not a real name requirement). Start next to the bed in a bedroom. The first mission is picking up scattered clothes by tracing a path. On success, remove the clothes, award one independence point (PS in Polish) and unlock the bedroom door. Return to exploration rather than chaining another exercise automatically.

A resident cat is introduced in the first playable release. The child can prepare its water bowl and bed through counting and image/word matching. Petting is available only when the cat is receptive. The room remains accessible after leaving it.

## World and progression

| Location | Lifetime PS required | Activities |
| --- | ---: | --- |
| Bedroom | 0 | Clothes, desk, bed, first cat |
| Upstairs | 1 | Books, school bag, bathroom, toys |
| Ground floor | 8 | Table, kitchen, sorting, household tasks |
| Garden | 16 | Plants, water bowls, shelters, cat playground |
| Basement | 32 | Workshop, materials and puzzles |
| Forest | 64 | Nature, trails and mysteries |
| Village | 128 | Shops, money, community and animal care |
| Academy | 256 | Cat pupils, classes, library and school adventures |
| Mountains | 512 | Later adventures |
| Coastal region | 1024 | Later adventures |

Thresholds are provisional and cumulative, not costs. Basement is a branch from the ground floor, not a mandatory route through the garden. Unlocks are permanent, and gates show progress in simple language. A first-time eligible quest awards one PS; repeated practice does not award the same point again. PS represents in-game progression, not an assessment of real-world independence.

Content must provide enough accessible first-time missions to reach the next gate. Before a gate is shipped, validate reachability and give children a choice of activities. Do not ship a gate whose required content is missing. With the proposed thresholds, a release that includes the forest needs at least 64 eligible completions before the forest. Start with the bedroom/upstairs and expand incrementally.

## Cats and habitats

Use fictional free-roaming cats, not wild animal species. Cats have stable IDs, appearance, personality, favourite activities and trust. The initial cat is a household pet; visiting cats appear later in outdoor areas.

| Attraction | Example challenge | Effect |
| --- | --- | --- |
| Clean water bowl | Tracing or counting | Restores a drinking spot |
| Scratching post | Match shapes | Adds a play spot |
| Sheltered bed | Match patterns | Adds a quiet resting spot |
| Tree platform | Count boards | Adds a climbing/resting spot |
| Tunnel and ball | Match words | Adds play opportunities |
| Cat shelter | Multi-step puzzle | Adds a sheltered habitat |

An eligible habitat is defined by attraction tags, counts, proximity and location. Adding suitable attractions increases the number and variety of eligible visitors, bounded by capacity. Multiple identical objects need not increase variety. Arrival is predictable within a short active-play window, with an understandable hint. No real-time waiting or forced daily check-ins. For the garden prototype use fixed placement slots and deterministic visitor selection. Free grid placement, recipes and A* navigation can come later.

Cats choose activities (idle, walk, drink, play, rest), can approach or move away, and occupy at most one activity spot at a time. Trust increases through appropriate, distinct interactions and habitat improvements; no point farming by repeatedly clicking the cat. Trust levels: unfamiliar, curious, comfortable, friendly, close friend, optional companion. Do not reduce trust when the player is away. A cat can decline petting at any level. Cats do not become ill or leave permanently because of inactivity.

Kicipedia stores discovered cats, their appearance, first encounter, preferences, trust and a short fact. It is a collection, not a ranking. Allow optional nicknames later.

## Rewards and building

PS unlocks locations. Optional in-game coins and materials support cosmetics and crafting, not purchases with real money. Trust is per cat. Badges acknowledge skills and discoveries without ranking children. Avoid mandatory grinding and reward loss.

Later: a build mode lets the player place and move attractions, with footprint/collision checks and undo. Crafting recipes consume materials only after successful placement or explicit crafting. Do not implement a full economy in the first release.

## Academy (future)

The academy is a location and a separate development loop. The player helps cat pupils with maths, reading, art, nature, music and language. Cats develop interests and earn fictional certificates. The child learns by explaining or solving problems with the cats. No mandatory school attendance or failure punishment. Kicikademia is a provisional in-world name, not the game's title.

## Visual direction

Original cozy pixel art, top-down 4-direction movement, 16 px tiles as a starting point, a 320 × 240 logical world viewport, nearest-neighbour scaling. Keep educational UI readable at device resolution rather than forcing tiny pixel fonts. Landscape is the first gameplay layout; allow a usable portrait layout or clear rotation guidance without losing a session. No copied maps, sprites or battle screens. Use licensed or original temporary art first.
