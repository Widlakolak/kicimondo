# Content model

Stage 05 bundles content version 3 and eight editable Tiled maps.

Keep stable ASCII IDs separate from Polish and English display strings. Use UTF-8 and locale keys. Runtime content lives in `frontend/src/content/`, with editable sources in `frontend/src/game/maps/` and Polish strings in `frontend/src/i18n/`. The build validates and packages these files. Do not keep hand-edited duplicate exports.

## Content types

| Type | Important fields |
| --- | --- |
| Manifest | schemaVersion, contentVersion, packId, locales, asset list |
| Location | id, mapId, entrySpawnId, unlock rule, transitions |
| Quest | id, locationId, interactionId, titleKey, challengePoolId, rewardId, effects, repeatable |
| Challenge | id, type, skillId, difficulty, instructionKey, payload |
| Cat | id, nameKey, appearanceAssetId, personality, preferences |
| Attraction | id, tags, footprint, interaction spots, repaired state |
| Habitat rule | id, locationId, required tags/counts, max distance, eligible cat IDs, capacity |
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

The maps in [frontend/src/game/maps](../frontend/src/game/maps) are the canonical editable sources. Each has furniture, collision, interaction and spawn layers. A furniture object selects its drawing through `art`, and `solid` adds its footprint to collision geometry. A shared scene renders all eight rooms.

The [content pack](../frontend/src/content/pack.ts) connects anchors to quests, doors, stairs and dialogue. Quest effects hide an object, restore a cat attraction or organize an existing prop. All effects are validated and stored with the completion and reward. A prop drawing reflects the stored effect. Cats and quest rewards use independent ledgers.

`SORT_ORDER` challenges define a unique item list and either one ordered permutation or one group assignment per item. Sequencing accepts the next correct item, while category sorting accepts items in any order. Each mode supports tap and keyboard buttons, a hint, reset and cancellation. Matching and maths reuse the existing exercise types with new picture sets and counting objects.

## House content

| Location | Activities |
| --- | --- |
| Bedroom | Clothes, water bowl and cat bed |
| Upstairs landing | Ciocia Hania, three room doors and the stairway |
| Study | School bag matching, arithmetic with supplies and book sizes |
| Bathroom | Handwashing sequence and object matching |
| Playroom | Sort toys into vehicles and plush toys |
| Ground-floor hall | Return stairway and doors to kitchen and living room |
| Kitchen | Fruit arithmetic and table setting matching |
| Living room | Sort household objects into clothes and dishes |

Each eligible quest awards one lifetime PS. The three bedroom and six upstairs quests can earn nine PS before taking the 8 PS stairway. The three downstairs activities bring the total to twelve. The garden remains planned.

## Asset provenance

Every externally sourced or generated asset needs a provenance entry. Do not include unverified images, commercial game assets, scraped media or fonts without a compatible license. Use original geometric placeholder art where necessary; label it as such. Record attribution requirements and keep required notices with distributed builds.
