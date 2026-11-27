# Content model

Stage 06 bundles content version 4 and nine editable Tiled maps.

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

The maps in [frontend/src/game/maps](../frontend/src/game/maps) are the canonical editable sources. Each has furniture, collision, interaction and spawn layers. A furniture object selects its drawing through `art`, and `solid` adds its footprint to collision geometry. A shared scene renders the house and garden with a viewport independent of map dimensions. Maps are finite and orthogonal, with 16 px tiles and a limit of 4,096 tiles. Unfinished quest markers use the furniture referenced by the quest effect.

The [content pack](../frontend/src/content/pack.ts) connects anchors to quests, doors, stairs and dialogue. Quest effects hide an object, restore a cat attraction or organize an existing prop. All effects are validated and stored with the completion and reward. A prop drawing reflects the stored effect. Cats and quest rewards use independent ledgers.

`SORT_ORDER` challenges define a unique item list and either one ordered permutation or one group assignment per item. Sequencing accepts the next correct item, while category sorting accepts items in any order. Each mode supports tap and keyboard buttons, a hint, reset and cancellation. Matching and maths reuse the existing exercise types with new picture sets and counting objects.

## House content

| Location | Activities |
| --- | --- |
| Bedroom | Clothes, water bowl, cat bed and desk reading |
| Upstairs landing | Ciocia Hania, three room doors and the stairway |
| Study | School bag matching, supplies arithmetic, book sizes and pencil lengths |
| Bathroom | Handwashing sequence, object matching and counting towels |
| Playroom | Sort toys into vehicles and plush toys |
| Ground-floor hall | Return stairway, kitchen and living-room doors and the garden gate |
| Kitchen | Fruit arithmetic, table setting matching and counter sorting |
| Living room | Household sorting and shelf matching |

Each quest awards one lifetime PS. The 17 indoor quests let the player leave one unfinished before opening the 16 PS gate. The eight garden quests bring the total to 25 PS.

## Garden and visitors

The garden map contains fixed plots for water, a sheltered bed, a scratching post, a tunnel, toys, a platform, a shelter and flowers. Each plot has one restoration quest and one validated activity position. Garden visitors require all their tags to come from restored plots in that location. Flowers contribute visual changes and a reward. The other tags are used by visitor requirements. The cat catalog also defines the resident's original bedroom spots and palette. Kicipedia uses the same portraits and attraction names as the scene and habitat rules.

## Downloadable math variants

The [version 1 schema](../contracts/educational-pack.v1.schema.json) sets the JSON shape. A pack targets one bundled game version and the Polish locale. Each variant references an existing math challenge by ID and supplies one unsigned 32-bit seed. The bundled definition still controls the skill, operations, maximum, illustration, instructions and rewards. Multiple variants may reference the same challenge. The game selects one at the start of an attempt and uses it throughout that attempt.

The client and backend permit up to 32 distinct variant IDs and 16 KiB of UTF-8 JSON per pack. They reject unknown fields and references, unsupported versions and invalid generated questions. The deterministic generator follows the existing operation sequence, keeps answers within the bundled maximum and gives three distinct choices. The [shared fixtures](../contracts/fixtures) exercise both implementations.

Run `npm run contracts:generate` in `frontend` after changing bundled math definitions. The generated [compatibility manifest](../contracts/compatibility.json) is checked in and included in the backend JAR, and `npm run contracts:check` checks it against the game. To publish variants, start with the [demo pack](../contracts/demo-math.json) and use the [local operator command](DEPLOYMENT.md#local-content-service). Publish a higher version for changed content under the same pack ID.

## Asset provenance

Every externally sourced or generated asset needs a provenance entry. Do not include unverified images, commercial game assets, scraped media or fonts without a compatible license. Use original geometric placeholder art where necessary; label it as such. Record attribution requirements and keep required notices with distributed builds.
