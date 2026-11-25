# Kicimondo

Kicimondo is a 2D adventure game for children in the first years of primary school. I started it for my daughter, who loves cats. The idea is to make learning part of exploring a world, completing everyday tasks and creating places where cats want to spend time.

## Status

Meet Bursztynek, the resident cat. Put away the clothes by tracing, fill the water bowl with counting and arithmetic, and prepare the cat bed by matching Polish words to pictures. The cat uses the restored spots and shows when it is ready for petting. The first independence point opens the door to the landing.

The browser stores the profile, quest progress, location and trust in IndexedDB. Earlier saves carry over on the same origin and browser profile.

The production web build is installable on supported browsers and plays offline after “Gra gotowa do działania bez internetu” appears. The Android debug build bundles the game for a first launch in airplane mode. Android and browser saves are separate. MediaPad T5 device acceptance is pending. See the [installation and upgrade guide](docs/DEPLOYMENT.md#android).

## Getting started

Use Node.js 24.13.1 or a later 24.x release, with npm 11.11.0 or a later 11.x release. CI uses Node.js 24.13.1 (see `.nvmrc`) and npm 11.11.0 with the committed lockfile.

```sh
cd frontend
npm ci --engine-strict
npm run dev
```

Open the local address printed by Vite. Move with arrows, WASD, or the on-screen controls. Press E or **Sprawdź** when the interaction prompt appears.

## Checks

Run these commands from `frontend/`:

```sh
npm run lint
npm run typecheck
npm test
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
- [Codex task prompt](docs/CODEX.md)

The game uses Polish text. Code and technical documentation are in English. Names other than Kicimondo and Kicipedia are provisional. No open-source license has been selected.
