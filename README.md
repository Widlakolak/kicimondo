# Kicimondo

Kicimondo is a 2D adventure game for children in the first years of primary school. I started it for my daughter, who loves cats. The idea is to make learning part of exploring a world, completing everyday tasks and creating places where cats want to spend time.

## Status

Play in landscape with a camera that follows your character. Tap the floor to walk, and tap a nearby marked object to try its activity. Fullscreen has optional on-screen arrows. The short introduction shows new players where to start.

Meet Bursztynek, the resident cat. Reveal a path to put away the clothes, count drops for the water bowl and match words to pictures to prepare the cat bed. Bursztynek roams, uses restored spots and shows when he is ready for petting. The first independence star opens the upstairs landing.

At eight stars the stairs open to the ground floor. At 16 stars the hall opens to the garden. At 32 stars the basement stairs open. The house and garden offer 35 stars, so three activities can wait. The basement adds a corridor, material storage and a workshop, bringing the game to 50 stars across 12 rooms. Find six material kits and build a hideout, ball, mat, ramp, scratching board and tunnel. Meet Iskierka in the workshop alongside Bursztynek and the four garden visitors. Approach a cat to reveal its Kicipedia entry.

The browser stores the profile, quest progress, location, discoveries and trust in IndexedDB. Earlier saves carry over on the same origin and browser profile. The adult menu offers a two-step restart that keeps the avatar, nickname and downloaded educational pack.

The production web build is installable on supported browsers and plays offline after “Gra gotowa do działania bez internetu” appears. The Android debug build bundles the game for a first launch in airplane mode. Android and browser saves are separate. MediaPad T5 device acceptance is pending. See the [installation and upgrade guide](docs/DEPLOYMENT.md#android).

The optional Java content service publishes compatible math variants. With an API configured, an adult can download a pack from the main menu and use it offline after restart. The bundled game and its save work with no configured backend. See the [local content service guide](docs/DEPLOYMENT.md#local-content-service).

The owner confirmed that Stage 08.1 is running on QNAP over HTTPS. Owner gameplay, NAS content import and backup/restore checks are pending. Stage 09 is prepared for review. See the [QNAP deployment guide](docs/DEPLOYMENT.md#qnap-family-web-release).

## Getting started

Use Node.js 24.13.1 or a later 24.x release, with npm 11.11.0 or a later 11.x release. CI uses Node.js 24.13.1 (see `.nvmrc`) and npm 11.11.0 with the committed lockfile.

```sh
cd frontend
npm ci --engine-strict
npm run dev
```

Open the local address printed by Vite. Tap or click the floor to walk. Tap a quest object again after approaching it. You can also move with arrows, WASD or the on-screen controls and interact with E or **Sprawdź**.

## Checks

Run these commands from `frontend/`.

```sh
npm run lint
npm run typecheck
npm test
npm run contracts:check
npm run build
npx playwright install chromium
npm run test:browser
```

The browser suite serves the production build. On Linux, use `npx playwright install --with-deps chromium` when browser system libraries are missing. Where browser downloads are restricted, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium executable before running the suite.

## Documentation

- [Game design](docs/GAME_DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Education](docs/EDUCATION.md)
- [Content](docs/CONTENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Privacy](docs/PRIVACY.md)
- [Originality](docs/ORIGINALITY.md)
- [Asset licenses](ASSET_LICENSES.md)
- [Development instructions](AGENTS.md)
- [Architecture decisions](docs/adr/0001-local-first-web-client.md)
- [Stage 01](docs/stages/01-room-prototype.md)
- [Stage 02](docs/stages/02-first-quest.md)
- [Stage 03](docs/stages/03-first-cat.md)
- [Stage 04](docs/stages/04-android-pwa.md)
- [Stage 05](docs/stages/05-house-expansion.md)
- [Stage 06](docs/stages/06-garden-kicipedia.md)
- [Stage 07](docs/stages/07-java-content-backend.md)
- [Stage 08](docs/stages/08-qnap-family-release.md)
- [Stage 08.1](docs/stages/08-1-kids-ux.md)
- [Stage 09](docs/stages/09-basement-workshop.md)
- [Codex task prompt](docs/CODEX.md)

The game uses Polish text. Code and technical documentation are in English. Names other than Kicimondo and Kicipedia are provisional. No open-source license has been selected.
