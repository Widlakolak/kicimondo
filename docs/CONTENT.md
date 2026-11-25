# Content model

Status: proposed data contract. Implement schemas only as each feature is introduced.

Keep stable ASCII IDs separate from Polish and English display strings. Use UTF-8 and locale keys. Source content lives in content/ and design/tiled/; a build step validates and packages the runtime data. Do not keep hand-edited duplicate exports.

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

## Initial content

Bedroom: bed, desk, wardrobe, scattered clothes, door, resident cat, water bowl and bed for the cat. Upstairs: corridor and a small set of everyday tasks. Ground floor: table, fruit, kitchen and recycling. Garden: clean water, shelter, drapak (scratching post), toys, flower beds and visitor slots.

Stage 01 only needs the room, a valid avatar spawn, collision geometry and an interaction anchor. Stage 02 adds the first trace quest and unlocked transition. Stage 03 adds the cat, maths and matching quests. Design later missions only when their locations are implemented.

## Asset provenance

Every externally sourced or generated asset needs a provenance entry. Do not include unverified images, commercial game assets, scraped media or fonts without a compatible license. Use original geometric placeholder art where necessary; label it as such. Record attribution requirements and keep required notices with distributed builds.
