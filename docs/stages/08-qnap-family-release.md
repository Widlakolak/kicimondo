# Stage 08: Family web release on QNAP

Status: infrastructure implemented for owner review. PR #7 is merged with green CI. The owner will review Stage 07 and deployment together. Stage 04–06 owner reviews, physical MediaPad T5 testing and native upgrade durability remain pending.

## Goal

Build reproducible frontend and backend images, publish reviewed builds to GHCR, and prepare an isolated QNAP Compose deployment for the web/PWA game and optional content API. Owner executes and verifies deployment after review. No actual NAS, DNS, tunnel or existing service changes from Codex.

## Environment and constraints

- Reference NAS: QNAP TS-451, Intel Celeron J1800 (2 cores, older x86-64 without AVX), approximately 8 GB RAM; existing Poetry App, PoetryStream and other containers may be running. Verify actual CPU flags, Docker/Compose versions, available memory, disk and network names on the host before deployment. Do not assume current capacity or routes.
- Proposed host directory: /share/CACHEDEV1_DATA/Container/kicimondo. Use a dedicated Compose project kicimondo, project-scoped containers, networks and database volume. Do not modify other projects or reuse their database.
- Start with frontend 64 MiB, backend 512 MiB and PostgreSQL 256 MiB limits as provisional local test targets; measure real consumption and adjust only based on evidence. Check JVM heap and nonheap headroom and container startup. Support frontend-only mode without running backend/database, and keep frontend working if backend is down.
- QNAP must pull prebuilt linux/amd64 images; never compile on NAS. Verify base image architecture, minimum CPU ISA (x86-64 baseline, no AVX or x86-64-v2 requirement where unavailable), Java runtime and PostgreSQL compatibility. Modern runner success alone does not verify old CPU support; document evidence and pending physical host test.

## Images, CI and releases

- Add a lightweight production frontend image serving the complete Vite output with Nginx, VITE_CONTENT_API_ORIGIN=same-origin for web. Retain all PWA assets and cache rules: revalidate index.html, sw.js and manifest, immutable fingerprinted files. Do not return HTML for missing assets or API errors. Plan retention of previous hashed assets during rolling updates or an atomic maintenance/retry strategy validated for interrupted first loads. Preserve service worker controlled updates and IndexedDB.
- Build backend bootJar in CI and package using a pinned Java 21 runtime. Pin base versions/digests where appropriate. Non-root runtime where feasible, minimal permissions, no secrets in images or build args. Keep local development compose working.
- Build and smoke-test both images in PR CI without pushing. Add a release workflow on reviewed main only (explicit workflow_dispatch is acceptable and preferred for initial deployment), gated by required frontend/backend checks including real PostgreSQL tests and image smoke tests. Prevent untrusted PR writes. Use GITHUB_TOKEN with packages:write only in publish job. Publish ghcr.io/widlakolak/kicimondo/frontend and /backend (confirm lowercase names and document visibility/access). Both images must correspond to the same commit. Publish immutable SHA tags, capture resolved digests, optionally version aliases; never rely on latest for deployment/rollback. Do not change repository/package visibility or create credentials. If private, document owner-approved read-only GHCR auth using password-stdin and secure local storage; avoid exposing tokens in logs. No publishing directly from the feature branch.
- Keep frontend/Android and backend CI regression checks. Produce existing debug APK artifact; if distributed Android contents change, bump versionCode monotonically, otherwise retain version 0.7.0 and explain why. No signing keys, no store publishing. Default APK remains fully offline; document an optional configured HTTPS build after an approved hostname exists, with exact allowed native origin https://localhost, never wildcard CORS or insecure TLS.

## Compose and routing

- Add isolated production compose file and separate example env under infrastructure/ or deployment/. Use image references only, no build stanza. Pin both images to approved release digests/immutable SHA, and pin PostgreSQL version/digest. Use restart policy, health checks, log rotation, resource limits, persistent database storage. Keep DB private with no published ports, backend private with no host port; only frontend reachable from explicitly approved shared proxy network or a loopback/local test port. No Docker socket, privileged containers or broad mounts. Use a securely generated DB password stored outside Git with restricted permissions; never copy local-dev-only password to production.
- Frontend proxy only necessary read-only /api/v1/content/packs paths and minimal health when explicitly needed; same-origin requests, no public Swagger, /v3/api-docs, actuator management or import/write endpoints. Reject other API paths and unsafe methods. Keep operational Swagger/health access local/private if needed. Use bounded timeouts and ensure static game loads even if optional backend is missing or restarting (avoid startup dependency on backend DNS; test dynamic resolution or suitable alternative).
- Prepare additive Nginx/Cloudflare instructions, not active configuration changes. Do not choose or claim a domain exists. Inspect existing external network, proxy configuration and tunnel capacity via owner-provided sanitized outputs; use unique service DNS aliases and avoid collisions. No new host port, proxy modification, domain, tunnel or public route without separate owner approval. Preserve Poetry App, PoetryStream and WorkDone routes. HTTPS needed for web PWA; plain LAN HTTP only layout/smoke.
- Document optional frontend-only rollout and full rollout, operator-only demo pack import with the deployed image, secret-safe commands and exact release selection.

## Operations

- Provide POSIX sh-compatible NAS scripts or commands for preflight, deploy, status, backup and rollback (no assumptions about bash, jq, git, GNU tools on QNAP). Read-only preflight: disk, RAM, CPU, Docker/Compose, project/container/network names, current load and ports; do not dump env/secrets/tokens. Owner chooses existing route and approves.
- Deploy only project kicimondo. Validate Compose quietly, verify release digests, pull, start and check health. Use safe lock against concurrent deployment if scripting; report failure and leave rollback possible. Never prune Docker, use down -v, remove unrelated containers, overwrite shared nginx.conf or change NAS settings. Verify existing services before/after without printing credentials.
- Document logical pg_dump backup and pg_restore to a separate disposable database/project, verify row counts and checksum/HTTP content. Store backups with restrictive permissions, timestamp and release metadata; do not overwrite previous successful backups. Distinguish server content backup from client gameplay (browser/Android IndexedDB is local and not included; no sync/export feature in this stage). Test rollback to prior compatible image pair, preserve DB volume; assess migration compatibility before rollback, no automatic destructive database downgrade. Keep previous image references and a documented recovery path.
- Document CPU, memory, disk, health, image IDs, logs and restart verification. No claims of production uptime or measured NAS performance until owner checks.

## Acceptance

- PR CI: existing frontend tests, Android build, Gradle tests with PostgreSQL, generated contract, production image builds and actual Compose smoke using isolated test project. Verify static assets, same-origin API and checksum, demo import, no exposed database/admin paths, persistent data after backend recreation, service worker offline reload and safe update behaviour. Stop backend/database and verify web/PWA still plays; test frontend cold startup with backend unavailable. Validate backup and restore in disposable environment; verify rollback and previous asset strategy where possible. Report exact tests and limitations.
- After approved merge: owner triggers or verifies successful release workflow, checks images/digests, runs read-only QNAP preflight, approves specific network/hostname/routing, then performs deployment with provided commands. Test local access, HTTPS/PWA, optional math update from real backend and offline after download, 25 PS and Kicipedia persistence, restart, backup/restore and rollback, memory/CPU on physical NAS and existing apps unchanged. Physical Huawei first install in airplane mode, WebView/provider, gameplay, rotation/lifecycle, persistence, optional native HTTPS build and same-key upgrade remain separate checks. Do not mark Stage 08 accepted until owner confirms.
- Update README, ROADMAP, DEPLOYMENT, ARCHITECTURE, PRIVACY and this stage document with evidence, exact commands, release references and pending reviews. Concise natural English docs/code, Polish player-facing strings and owner report.

## Verification

- On Node.js 24.13.1 and npm 11.11.0, strict installation, lint, type checks, generated contract validation, the default and same-origin production builds, 80 unit tests and all 22 Playwright tests passed. Java 21 passed four unit tests, five PostgreSQL Testcontainers tests and `bootJar`.
- Docker built both Linux amd64 images. The pinned bases are Nginx 1.30.8 Alpine Slim, Eclipse Temurin 21.0.9+10 Alpine JRE and PostgreSQL 17.9 Alpine. QEMU 10.0.13 started `nginx -t`, `postgres --version` and `java -version` on an x86-64 CPU profile with AVX, SSSE3, SSE4 and POPCNT disabled. The Java test retained emulation after launcher initialization and logged the guest CPU features. This was a startup check. Full load and firmware compatibility remain for the J1800 host.
- The production Compose smoke ran with a separate project, default memory settings and a 256 MiB JVM heap cap. It verified the cache headers, retained previous hashed bytes, absent backend startup, restricted API and same-origin demo import, idempotence, checksum, CORS for the native origin, backend recreation, an offline reload and a worker that waited for the open exercise. The smoke restored the backup into a separate network-isolated database and verified it against the original rows and payload SHA-256. It rolled back to a synthetic previous image pair with compatible Flyway migrations.
- The external proxy overlay served the frontend via its unique alias with zero published host ports. The existing local development Compose brought PostgreSQL and Java to healthy status. Compose validation and actionlint passed.
- The first PR #8 production smoke failed before PostgreSQL startup because the digest-pinned image was missing locally. The test reproduced the failure with an uncached reference to the same digest. The full local smoke passed after explicitly pulling that reference for Linux amd64 and verifying the downloaded image. PostgreSQL was ready, Flyway recorded migration 1 as successful, and restore and rollback completed. The Compose default supplies the pin and the smoke uses the resolved reference for both startup and restore.
- Docker in the local test environment has no cgroup driver. It accepted the 64/512/256 MiB configuration and all services started. GitHub Actions requires a cgroup driver and reads each effective limit inside the container. Measure actual RAM and CPU on the NAS before family use.
- The universal Android debug APK built and passed signing and metadata checks. The packaged assets match Stage 07 byte for byte, so the APK keeps version 0.7.0 (7), minimum API 24, Chromium 80 and the native save origin. Physical MediaPad T5 and signed upgrades remain pending.
- The first registry publication, owner's application review and actual HTTPS route are pending.

To repeat the production smoke on a Linux development machine with Docker, Node and JDK 21, run these commands from the repository root.

```sh
(cd frontend && npm ci --engine-strict && npx playwright install chromium)
(cd frontend && VITE_CONTENT_API_ORIGIN=same-origin npm run build -- --outDir .vite/qnap-dist)
(cd backend && ./gradlew --no-daemon bootJar)
docker build --platform linux/amd64 -f infrastructure/qnap/frontend.Dockerfile -t kicimondo/frontend:verify .
docker build --platform linux/amd64 -f backend/Dockerfile -t kicimondo/backend:verify .
(cd frontend && KICIMONDO_FRONTEND_IMAGE=kicimondo/frontend:verify \
  KICIMONDO_BACKEND_IMAGE=kicimondo/backend:verify node scripts/qnapSmoke.mjs)
```

Follow the [owner deployment and verification guide](../DEPLOYMENT.md#qnap-family-web-release) for the read-only NAS preflight and the separate, approved release and rollout.

## Out of scope

New quests/maps/cats, sync, admin panel, user accounts, analytics, paid infrastructure, public store release, automatic deployment to NAS, real DNS or tunnel changes, altering existing projects and production signing.

Create a focused PR. Do not merge, publish from the PR, deploy, or start Stage 09. Stop for owner review.
