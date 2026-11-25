# Game design

## Concept

Kicimondo is a single-player, top-down 2D adventure for early primary school children (initially ages 6–9, with the first year as the starting point). The player explores a familiar world, solves short educational challenges and restores places for cats. There is no combat.

The first language is Polish. A child should be able to play without reading long instructions. Introduce mechanics one at a time, use visible feedback and avoid time limits by default.

## Main loop

Explore a location -> interact with an object or NPC -> complete a short challenge -> see a change in the world -> receive rewards -> discover another activity.

A second loop runs alongside it: repair or place an attraction -> meet cats -> build trust -> discover preferences and entries in Kicipedia -> unlock new habitat possibilities. Exploring or decorating without doing an exercise should also be enjoyable.

## Opening

The opening includes three bedroom quests. The clothes task can be completed by tracing or using numbered buttons. Each quest grants 1 PS and the first point opens the door to the upstairs landing.

The player chooses a boy or girl avatar and an in-game name (not a real name requirement). Start next to the bed in a bedroom. Picking up scattered clothes removes them from the room and awards one independence point (PS in Polish). Any bedroom activity can earn the first point and open the door. Return to exploration rather than chaining another exercise automatically.

Bursztynek is the bedroom’s resident cat. The player can fill his water bowl with counting and arithmetic and prepare his bed with word-picture matching, in either order. The cat shows a heart when receptive. The first accepted petting interaction and each restored attraction grant lasting trust.

## World and progression

| Location | Lifetime PS required | Activities |
| --- | ---: | --- |
| Bedroom | 0 | Clothes, water bowl and cat bed |
| Upstairs | 1 | School bag, supplies, book sizes, handwashing, bathroom items and toys |
| Ground floor | 8 | Fruit arithmetic, table settings and household sorting |
| Garden | 16 | Eight activities restore water, bedding, play, shelter and flowers |
| Basement | 32 | Workshop, materials and puzzles |
| Forest | 64 | Nature, trails and mysteries |
| Village | 128 | Shops, money, community and animal care |
| Academy | 256 | Cat pupils, classes, library and school adventures |
| Mountains | 512 | Later adventures |
| Coastal region | 1024 | Later adventures |

Thresholds are provisional and cumulative, not costs. Basement is a branch from the ground floor, not a mandatory route through the garden. Unlocks are permanent, and gates show progress in simple language. A first-time eligible quest awards one PS; repeated practice does not award the same point again. PS represents in-game progression, not an assessment of real-world independence.

Upstairs leads from the landing to the study, bathroom and playroom. Ciocia Hania suggests a room with remaining tasks and explains the stairs. Nine activities are available before the stair gate, so the player can leave one for later. The ground-floor hall connects the stairs, kitchen and living room. Each room has a return route. The house offers 17 PS. At 16 PS the hall gate opens to the garden, so one indoor activity can wait. There are eight more PS outdoors. The same gate leads back to the hall.

Content must provide enough accessible first-time missions to reach the next gate. Before a gate is shipped, validate reachability and give children a choice of activities. Do not ship a gate whose required content is missing. With the proposed thresholds, a release that includes the forest needs at least 64 eligible completions before the forest. Start with the bedroom/upstairs and expand incrementally.

## Cats and habitats

Use fictional free-roaming cats, not wild animal species. Cats have stable IDs, appearance, personality, favourite activities and trust. Bursztynek stays in the bedroom. The garden has four visiting cats with distinct habitat requirements.

| Attraction | Example challenge | Effect |
| --- | --- | --- |
| Clean water bowl | Tracing or counting | Restores a drinking spot |
| Scratching post | Match shapes | Adds a play spot |
| Sheltered bed | Match patterns | Adds a quiet resting spot |
| Tree platform | Count boards | Adds a climbing/resting spot |
| Tunnel and ball | Match words | Adds play opportunities |
| Cat shelter | Multi-step puzzle | Adds a sheltered habitat |

An eligible habitat is defined by attraction tags, counts, proximity and location. Adding suitable attractions increases the number and variety of eligible visitors, bounded by capacity. Multiple identical objects need not increase variety. Arrival is predictable within a short active-play window, with an understandable hint. No real-time waiting or forced daily check-ins. The garden uses fixed slots. Puszek needs water and sheltered bedding, Łatka needs a scratching post and tunnel, Cień needs shelter and water, and Migotka needs a platform and toys. Up to three visitors appear at once. When all four qualify, waiting visitors take turns after eight active seconds. The rotation waits while a modal is open and keeps each petting cat until the interaction ends. Free grid placement, recipes and A* navigation can come later.

Cats choose activities (idle, walk, drink, play, rest), can approach or move away, and occupy at most one activity spot at a time. Trust increases through appropriate, distinct interactions and habitat improvements; no point farming by repeatedly clicking the cat. Trust levels: unfamiliar, curious, comfortable, friendly, close friend, optional companion. Do not reduce trust when the player is away. A cat can decline petting at any level. Cats do not become ill or leave permanently because of inactivity.

Kicipedia shows silhouettes and habitat hints for unknown cats. Walking near a cat while it is present unlocks its portrait, personality, favourites, trust and a short fictional description. Discoveries persist. A visitor gains trust once when its habitat is ready and once for its first accepted greeting. Neither event earns PS. Allow optional nicknames later.

## Rewards and building

PS unlocks locations. Optional in-game coins and materials support cosmetics and crafting, not purchases with real money. Trust is per cat. Badges acknowledge skills and discoveries without ranking children. Avoid mandatory grinding and reward loss.

Later: a build mode lets the player place and move attractions, with footprint/collision checks and undo. Crafting recipes consume materials only after successful placement or explicit crafting. Do not implement a full economy in the first release.

## Academy (future)

The academy is a location and a separate development loop. The player helps cat pupils with maths, reading, art, nature, music and language. Cats develop interests and earn fictional certificates. The child learns by explaining or solving problems with the cats. No mandatory school attendance or failure punishment. Kicikademia is a provisional in-world name, not the game's title.

## Visual direction

Original cozy pixel art, top-down 4-direction movement, 16 px tiles as a starting point, a 320 × 240 logical world viewport, nearest-neighbour scaling. Keep educational UI readable at device resolution rather than forcing tiny pixel fonts. Landscape is the first gameplay layout; allow a usable portrait layout or clear rotation guidance without losing a session. No copied maps, sprites or battle screens. Use licensed or original temporary art first.
