# Kicimondo

Kicimondo is a 2D adventure game for children in the first years of primary school. I started it for my daughter, who loves cats. The idea is to make learning part of exploring a world, completing everyday tasks and creating places where cats want to spend time.

## Status

Stage 01 includes a playable bedroom prototype. Choose an avatar and nickname, explore with a keyboard or on-screen controls, and inspect the scattered clothes and closed door. The avatar and nickname are stored in the browser. The room and avatars use original placeholder pixel art. Owner acceptance is pending.

## Getting started

Use Node.js `24.22.3` (see `.nvmrc`) and npm `11.19.1`.

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
- [Codex task prompt](docs/CODEX.md)

The game uses Polish text. Code and technical documentation are in English. Names other than Kicimondo and Kicipedia are provisional. No open-source license has been selected.
