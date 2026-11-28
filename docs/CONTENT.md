# Content model

Stage 09 bundles world content version 5 and twelve editable Tiled maps. The downloadable math contract retains educational compatibility version 4.

Keep stable ASCII IDs separate from Polish and English display strings. Use UTF-8 and locale keys. Runtime content lives in `frontend/src/content/`, with editable sources in `frontend/src/game/maps/` and Polish strings in `frontend/src/i18n/`. The build validates and packages these files. Do not keep hand-edited duplicate exports.

## Content types

| Type | Important fields |
| --- | --- |
| Manifest | schemaVersion, contentVersion, packId, locales, asset list |
| Location | id, mapId, entrySpawnId, unlock rule, transitions |
| Quest | id, locationId, interactionId, titleKey, challengePoolId, rewardId, effects, repeatable |
| Challenge | id, type, skillId, difficulty, instructionKey, payload |
| Cat | id, location, appearance palette and silhouette, pace, greeting and rest points, preferred attractions |
| Attraction | location, object ID, habitat tag, activity, position |
| Habitat rule | visitor ID, location and required restored tags |
| Dialogue | id, locale keys, choices and allowed effects |

Example quest (illustrative, not a live asset):

    {
      "id": "bedroom-clean-clothes",
      "locationId": "bedroom",
      "interactionId": "dirty-clothes",
      "titleKey": "quest.bedroom.cleanClothes",
      "challengePoolId": "trace-basic",
      "rewardId": "bedroom-clean-clothes-first",
      "rewards": { "independencePoints": 1 },
      "effects": [{ "type": "HIDE_OBJECT", "objectId": "dirty-clothes" }],
      "repeatable": false
    }

Allowed effects are typed commands interpreted by the game, never arbitrary JavaScript. Validate unique IDs, cross-references, locale keys, assets, difficulty bounds and transition targets. Verify the graph contains a reachable spawn and a return path; test that the next planned gate can actually be reached with available eligible rewards.

## Tiled

Use orthogonal JSON tilemaps, initially 16 × 16 px tiles. Use layers Ground, Decorations, Furniture, AbovePlayer, Collisions, Interactions, NPC, Transitions, SpawnPoints as needed. Define collisions and interaction areas explicitly; no pixel-colour tests. Object custom properties use stable IDs such as interactionId, questId, destinationLocationId and destinationSpawnId. Resolve an interaction only within range; avoid multiple triggers per input. Define an interaction anchor beside blocked furniture. Keep tileset/image paths relative and valid.

The maps in [frontend/src/game/maps](../frontend/src/game/maps) are the canonical editable sources. Each has furniture, collision, interaction and spawn layers. A furniture object selects its drawing through `art`, and `solid` adds its footprint to collision geometry. A shared scene renders the house, garden and basement with a viewport independent of map dimensions. Maps are finite and orthogonal, with 16 px tiles and a limit of 4,096 tiles. Unfinished quest markers use the furniture referenced by the quest effect.

The [content pack](../frontend/src/content/pack.ts) connects anchors to quests, doors, stairs and dialogue. Quest effects hide an object, restore a cat attraction or organize an existing prop. All effects are validated and stored with the completion and reward. A prop drawing reflects the stored effect. Cats and quest rewards use independent ledgers.

`SORT_ORDER` challenges define a unique item list and either one ordered permutation or one group assignment per item. Sequencing accepts the next correct item, while category sorting accepts items in any order. Each mode supports tap and keyboard buttons, a hint, reset and cancellation. Matching and maths reuse the existing exercise types with new picture sets and counting objects.

## House content

| Location | Activities |
| --- | --- |
| Bedroom | Clothes, water bowl, cat bed, desk reading and sock patterns |
| Upstairs landing | Ciocia Hania, three room doors and the stairway |
| Study | School bag matching, supplies arithmetic, book sizes, pencil lengths, crayon counting and geometric shapes |
| Bathroom | Handwashing sequence, object matching, counting towels and hygiene symbols |
| Playroom | Sort toys, sort blocks by shape and order tower-building pictures |
| Ground-floor hall | Return stairway, kitchen and living-room doors the garden gate and the basement staircase |
| Kitchen | Fruit arithmetic, table settings, counter sorting and snack apple counting |
| Living room | Household sorting, shelf matching and family-day sequencing |

Each first-time quest awards one PS. The house above the basement offers 25 PS. The garden adds ten PS, for 35 before the 32 PS staircase. The basement adds 15 PS.

## Garden and visitors

The garden map contains fixed plots for water, a sheltered bed, a scratching post, a tunnel, toys, a platform, a shelter and flowers. Each plot has one restoration quest and one validated activity position. Garden visitors require all their tags to come from restored plots in that location. Flowers contribute visual changes and a reward. The other tags are used by visitor requirements. The leaf path and seed tray add two independent tasks. The cat catalog defines both residents and their spots in the bedroom and workshop. Kicipedia uses the same portraits and attraction names as the scene and habitat rules.

## Basement maps and crafting

| Map | Dimensions | Layout |
| --- | --- | --- |
| Basement corridor | 416 × 256 | Return stairs south, storage and workshop doors north, labelled boxes, felt basket and drawers along the route |
| Material storage | 448 × 256 | Five activities around a central aisle with room to pass the sorting bench |
| Cat workshop | 448 × 288 | Six fixed slots around a central rug, a workbench and Iskierka's walking route |

Each kit has exactly one source and one recipe. The scene uses the same prop footprint in both states. Restoring the hideout, mat or felt ball makes its activity spot available to Iskierka. The [Stage 09 roster](stages/09-basement-workshop.md#implemented-content) lists the IDs and kit pairs.

## Downloadable math variants

The [version 1 schema](../contracts/educational-pack.v1.schema.json) sets the JSON shape. A pack targets educational compatibility version 4 and the Polish locale. The seven supported challenge IDs retain their existing capabilities. Each variant references an existing math challenge by ID and supplies one unsigned 32-bit seed. The bundled definition still controls the skill, operations, maximum, illustration, instructions and rewards. Multiple variants may reference the same challenge. The game selects one at the start of an attempt and uses it throughout that attempt.

The client and backend permit up to 32 distinct variant IDs and 16 KiB of UTF-8 JSON per pack. They reject unknown fields and references, unsupported versions and invalid generated questions. The deterministic generator follows the existing operation sequence, keeps answers within the bundled maximum and gives three distinct choices. The [shared fixtures](../contracts/fixtures) exercise both implementations.

Run `npm run contracts:generate` in `frontend` after an approved change to the downloadable math contract. The generated [compatibility manifest](../contracts/compatibility.json) is checked in and included in the backend JAR, and `npm run contracts:check` checks it against the game. To publish variants, start with the [demo pack](../contracts/demo-math.json) and use the [local operator command](DEPLOYMENT.md#local-content-service). Publish a higher version for changed content under the same pack ID.

## Asset provenance

Every externally sourced or generated asset needs a provenance entry. Do not include unverified images, commercial game assets, scraped media or fonts without a compatible license. Use original geometric placeholder art where necessary; label it as such. Record attribution requirements and keep required notices with distributed builds.
