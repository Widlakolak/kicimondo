# Deployment

Status: planned. No domain, container or Android release is configured.

## Web

Use the existing QNAP environment only after inspecting resources and obtaining approval. Keep Kicimondo in a separate Compose project with unique service names, bind mounts or named volumes, and its own private database network if the backend is present. Initial family version can be a static frontend only. Proposed NAS directory: /share/CACHEDEV1_DATA/Container/kicimondo. Confirm the path on the host before use.

Follow the useful parts of the Poetry App deployment: CI builds images on GitHub, publishes to GHCR after a reviewed merge, and the NAS pulls images. Use linux/amd64 images compatible with the actual Celeron host; verify CPU features and memory headroom before choosing images. Pin immutable release tags/digests for rollback. Avoid building on the NAS. Frontend uses a small static server; backend is added only when needed.

The existing shared Nginx/Cloudflare setup may be reused after checking network names, service names and available hostnames. Do not overwrite Poetry App, PoetryStream or WorkDone routing. Prefer same-origin /api/ proxying for the web client. No public database port, no public admin endpoints, and no new tunnel or DNS changes without approval. Keep health checks private or limited to minimal status. Never commit credentials, NAS configuration dumps or tunnel tokens.

Before deployment: validate Compose, inspect the diff, check disk/CPU/RAM, check image availability and backup persistent data. Deploy only Kicimondo services. Verify TLS, health, first load, offline reload, asset paths and actual phone play. Document exact commands and image tags after the implementation exists. Keep a rollback plan; never use down -v on persistent production data.

## CI/CD

PR: reproducible npm ci, lint/typecheck/test/build; content validation, backend Gradle tests and Compose checks when those files exist. CI must not publish from untrusted PRs. On approved merges, build and publish only configured images with minimum workflow permissions. Pin action versions and use a checked-in lockfile and Gradle wrapper. No production secrets in build logs.

## Android

Use Capacitor with bundled web assets, not a remote URL wrapper. Proposed application ID: io.github.widlakolak.kicimondo. Verify that namespace and identifier before first store release. Handle hardware back, pause/resume, audio, orientation and safe areas. No sensitive permissions are needed for the base game. Use a durable save adapter and test upgrades and process death.

Start with a debug APK on a real device. Later produce a signed AAB using a protected upload key, keep signing material outside Git and document recovery. Verify current Google Play requirements (target SDK, developer account testing, Families, content rating, data safety and privacy) using official documentation at release time. A policy checklist is not proof of compliance or store approval.
