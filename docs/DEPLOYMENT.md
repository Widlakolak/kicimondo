# Deployment

Kicimondo has a static web build, an Android debug artifact and an optional content service. The QNAP deployment files are ready for owner review.

## Web

Run `npm run build` and `npm run preview` in `frontend`. Full PWA testing requires HTTPS or trusted localhost. An HTTP LAN address is useful for layout testing. To test offline from a clean origin, wait for the Polish readiness message, then disable connectivity before entering the room and reload. A first web visit requires connectivity. To apply a staged update, finish the current exercise, return to the menu and follow the prompt to close all game windows and reopen. IndexedDB remains on the same origin.

Deploy the entire `frontend/dist` directory as one release. Serve `index.html` and `sw.js` with revalidation and keep fingerprinted assets immutable. Retain the previous fingerprinted files long enough for clients in the middle of a first load. The build logs the precache membership and byte sizes.

## QNAP family web release

The QNAP TS-451 is the reference host. Confirm the actual CPU, Docker Compose v2, free disk, available memory and existing proxy setup before deployment. The local limits are 64 MiB for Nginx, 512 MiB for Java and 256 MiB for PostgreSQL. Budget additional RAM for Docker, the NAS and its existing services. The Compose defaults set Java's maximum heap to 256 MiB, cap its processor count at two and disable AVX. Set `KICIMONDO_JVM_OPTIONS` when adjusting the backend limit. Keep sufficient memory for native JVM overhead. These settings are provisional on the NAS.

### 1. Select a release

After reviewing and merging the PR, open **Actions → Release images → Run workflow**, select `main` and start the run. It re-runs frontend and Android checks, the backend tests and the production image smoke test for that checkout. The publish job uploads the two images tested in that run. PR checks build and test local images. The release workflow does not connect to the NAS.

The two registry paths are `ghcr.io/widlakolak/kicimondo/frontend` and `ghcr.io/widlakolak/kicimondo/backend`. A tag of the form `sha-<full-commit>` identifies both images. Download the successful run's **release-images** artifact and retain its `release-images.env` file. Use the image digests in that file, and retain previous successful files for rollback. If a push partially succeeds, re-run failed jobs while the tested image archive is available. An existing tag can be reused when its image matches the tested archive. Use a successful run with both digests for deployment.

The publish workflow uses the repository's GitHub token. If the packages are private, use a dedicated classic GitHub token with `read:packages` and access to these packages. Confirm access with the owner and keep the Docker credential store restricted to the deployment account. Package visibility decisions belong to the owner.

On QNAP, disable shell tracing and enter the read-only token at the prompt. Replace `YOUR_GH_USER` with the approved account.

```sh
(
  set -eu
  set +x
  terminal=$(stty -g)
  trap 'stty "$terminal"' 0
  trap 'exit 1' 1 2 15
  printf 'GHCR token: ' >&2
  stty -echo
  IFS= read -r token
  stty "$terminal"
  printf '\n' >&2
  printf '%s\n' "$token" | docker login ghcr.io -u YOUR_GH_USER --password-stdin
)
```

### 2. Inspect the host and prepare the project

Copy the reviewed `infrastructure/qnap/preflight.sh` to the NAS and run it without changing the existing Docker or proxy setup.

```sh
sh ./preflight.sh /share/CACHEDEV1_DATA/Container
```

Check `x86_64`, CPU flags, free memory, disk and running containers. Check that Docker reports a cgroup driver capable of enforcing the Compose memory limits. Verify that the NAS Docker version supports the image manifests and the Compose v2 features in the template. Record the status of Poetry App, PoetryStream and WorkDone. Choose the specific existing reverse proxy network and hostname for owner approval before attaching the network or adding a route. If the host has limited RAM or lacks the needed Compose features, use these results to scope the deployment before making changes.

Prepare the project under the confirmed directory. Copy `compose.yaml`, `compose.proxy.yaml`, `compose.local.yaml`, `.env.production.example`, `backup.sh` and `preflight.sh` from the reviewed `infrastructure/qnap/`. Copy `contracts/demo-math.json` as `demo-math.json`. Keep the approved release artifact under `releases/` and name it by commit.

```sh
umask 077
mkdir -p /share/CACHEDEV1_DATA/Container/kicimondo/releases
cd /share/CACHEDEV1_DATA/Container/kicimondo
chmod 644 demo-math.json
release_file="$PWD/releases/APPROVED_COMMIT.env"
(
  set +x
  set -euC
  password=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
  test "${#password}" -eq 64
  {
    cat "$release_file"
    grep -vE '^KICIMONDO_(RELEASE_SHA|FRONTEND_IMAGE|BACKEND_IMAGE|DB_PASSWORD)=' .env.production.example
    printf 'KICIMONDO_DB_PASSWORD=%s\n' "$password"
  } > .env.production
)
chmod 600 .env.production
```

Run these initial configuration commands once. Keep `.env.production` outside Git with the approved operator's permissions. Compose reads the password from that file. Preserve it between releases and omit environment dumps from diagnostics. Set `KICIMONDO_PROXY_NETWORK` to the exact approved external network when using the proxy overlay. Leave `KICIMONDO_ALLOWED_ORIGINS` blank for same-origin web. Add exact origins only for approved clients that use a different origin.

### 3. Pull and start

Use the proxy overlay when Nginx runs in a container on the approved network. Use `compose.local.yaml` instead when Nginx runs on the host or for a local smoke test. The latter binds only to `127.0.0.1` and uses `KICIMONDO_WEB_PORT` (8088 by default). The base file alone publishes no port. Use one overlay at a time. Prefer the external Docker network overlay on older engines. Verify LAN isolation for any loopback publication before routing traffic.

```sh
overlay=compose.proxy.yaml
dc() {
  docker compose -p kicimondo --env-file .env.production --env-file "$release_file" \
    -f compose.yaml -f "$overlay" "$@"
}
dc --profile content config --quiet
dc --profile content pull
dc --profile content up -d
dc --profile content ps
dc --profile content logs --tail 60 kicimondo-backend kicimondo-postgres
```

For a frontend-only install, run `dc config --quiet`, `dc pull kicimondo-frontend` and `dc up -d kicimondo-frontend`. To switch an existing full install to frontend-only, first run `dc --profile content stop kicimondo-backend kicimondo-postgres`. Their data volume remains available for the next full start. Before and after, compare the status of the host's existing services. Keep changes scoped to project `kicimondo`.

In a full install, wait for healthy frontend, PostgreSQL and backend entries in `dc --profile content ps`. The following commands check the two private services and import the demo pack with the deployed backend image.

```sh
dc --profile content exec -T kicimondo-postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
dc --profile content exec -T kicimondo-backend wget -Y off -qO - http://127.0.0.1:8080/actuator/health
dc --profile content run --rm --no-deps --volume "$PWD/demo-math.json:/import/demo-math.json:ro" \
  kicimondo-backend import /import/demo-math.json
```

Repeat the import and check for `ALREADY_PUBLISHED`. The first successful import prints `PUBLISHED`. Backend startup runs Flyway and Hibernate schema validation. Use the last backend logs for a failed connection, migration or memory limit. Use `docker stats --no-stream` for measured RAM and CPU with real traffic.

### 4. Add the approved HTTPS route

Add a dedicated virtual host for the approved hostname through the owner's existing reverse proxy process. Leave all existing routes in place. For a containerized Nginx on the approved network, use this location in the new virtual host. The variable makes Docker DNS resolution refresh after frontend replacement.

```nginx
location / {
    resolver 127.0.0.11 valid=5s ipv6=off;
    resolver_timeout 2s;
    set $kicimondo_web kicimondo-family-web:8080;
    proxy_pass http://$kicimondo_web;
    proxy_set_header Host $host;
    proxy_connect_timeout 2s;
    proxy_read_timeout 10s;
}
```

For Nginx running on the NAS host with the loopback overlay, use `proxy_pass http://127.0.0.1:8088;` with the configured port. Test the additive configuration with the existing proxy's `nginx -t` procedure before any approved reload. Have Cloudflare Tunnel send the approved hostname to the existing reverse proxy virtual host. The reverse proxy forwards the complete origin to the frontend. The frontend serves static content and permits only the content pack read paths through to Java. PostgreSQL and Java have no host ports. Swagger, OpenAPI, Actuator and imports remain private.

Use HTTPS for PWA installation. Configure Cloudflare and any outer proxy to respect the origin cache policy. Bypass cache for the entry page, worker, manifest and API. Fingerprinted files under `/assets/` can use long immutable caching. A fresh browser loads the current static release. The project volume retains previous fingerprinted bytes for interrupted first loads and rollback. A service worker verifying a changing entry page may defer installation until the next visit. Existing controlled windows stay on their installed worker until they close. Keep the saved browser origin stable.

### 5. Verify the family experience

From a workstation with HTTPS access, substitute the approved hostname and compare SHA-256 from the response header and the downloaded bytes.

```sh
site=https://APPROVED_HOSTNAME
curl -fsSI "$site/sw.js"
curl -fsS "$site/api/v1/content/packs/kicimondo-math/latest?gameContentVersion=4"
curl -fsS -D pack.headers -o pack.json "$site/api/v1/content/packs/kicimondo-math/versions/1?gameContentVersion=4"
grep -i '^X-Content-SHA256:' pack.headers
sha256sum pack.json
```

Check that the worker and manifest are revalidated, missing hashed assets return 404, and `/actuator/health` and `/v3/api-docs` return 404 through the public route. Open the game and download the demo pack in the adult menu. Disconnect after the offline-ready message, reload, and complete the water-bowl activity for one PS. Check the earlier owner gameplay scenarios, including the 25 PS path, discoveries and progress after reloading. Recreate the backend with `dc --profile content up -d --no-deps --force-recreate kicimondo-backend` and check its health and the exact pack checksum again. The static game remains available during a backend outage. Inspect CPU, RAM and logs and check the existing apps again.

For HTTP 503 on the content endpoint, check the backend health, PostgreSQL readiness and the app network. The frontend refreshes backend DNS after a short cache interval. For a failed first load after an upgrade, verify that the old hashed URL still returns its bytes, check asset volume permissions, then retry the entry page. For a 502 at the external proxy, verify the approved network, frontend health and DNS alias. If the NAS reports an illegal instruction or an unexpected image architecture, stop the affected Kicimondo service and record the image digest, CPU flags and logs.

### 6. Back up, upgrade and roll back

Before changing releases, make a logical backup. Run `sh ./backup.sh` from the deployment directory. It writes a timestamped directory with a restricted custom-format dump, archive listing, running image references and Flyway versions. A directory containing `incomplete` is a failed backup. Store completed copies away from the NAS and restrict access. These backups contain the server's published educational packs. Gameplay saves live on the browser or Android device in IndexedDB.

Test a completed backup in a uniquely named, isolated disposable PostgreSQL container. Use the same approved PostgreSQL image reference from `.env.production`. Set `backup` to the completed backup directory before running the commands.

```sh
postgres_image=$(sed -n 's/^KICIMONDO_POSTGRES_IMAGE=//p' .env.production)
restore="kicimondo-restore-$(date -u '+%Y%m%dT%H%M%SZ')-$$"
docker run -d --rm --name "$restore" --network none -e POSTGRES_HOST_AUTH_METHOD=trust \
  -e POSTGRES_USER=kicimondo -e POSTGRES_DB=kicimondo "$postgres_image"
# Wait for the final server to accept connections after the init process completes.
docker logs "$restore"
docker exec "$restore" pg_isready -h 127.0.0.1 -U kicimondo -d kicimondo
docker exec -i "$restore" pg_restore --exit-on-error --single-transaction --no-owner --no-privileges \
  -U kicimondo -d kicimondo < "$backup/content.dump"
docker exec "$restore" psql -X -v ON_ERROR_STOP=1 -U kicimondo -d kicimondo -c \
  "SELECT pack_id, version, checksum = encode(sha256(convert_to(payload,'UTF8')),'hex') AS verified FROM published_pack ORDER BY pack_id, version"
docker exec "$restore" psql -X -v ON_ERROR_STOP=1 -U kicimondo -d kicimondo -c \
  "SELECT version, checksum FROM flyway_schema_history WHERE success ORDER BY installed_rank"
docker stop "$restore"
```

Compare the restored pack rows and Flyway record with the source metadata and backup listing. For a full check, compare the SHA-256 values to the exact API responses. This verification uses the disposable container's own data directory.

For an upgrade, archive the current release file and verify the backup. Set `release_file` to the next approved digest pair, then repeat `config --quiet`, `pull`, `up -d` and the health checks for the selected profile. Retain the PostgreSQL and hashed-asset volumes. Monitor asset volume growth as more images are deployed. Keep assets referenced by retained rollback releases and potentially open browsers when planning any manual cleanup.

To roll back, first compare the current Flyway migration versions and checksums with the older release. Roll back on the live volume only if that backend supports the current database schema. Point `release_file` at the prior approved digest pair, validate, pull, run `up -d` and check both the content API and offline game. For an incompatible database change, verify the matching backup and older release in a separate project before planning recovery. Keep the existing data volume available for recovery.


## Local content service

Stage 07 uses Java 21, Spring Boot 4.2.0, Gradle 8.14.3, springdoc 3.2.1 and PostgreSQL 17.9. The Spring Boot BOM pins Flyway 12.11.0, PostgreSQL JDBC 42.7.14, Hibernate 7.4.15.Final, JUnit 6.1.3, Mockito 5.24.0 and Testcontainers 2.0.5. See the [Spring Boot system requirements](https://github.com/spring-projects/spring-boot/blob/v4.2.0/documentation/spring-boot-docs/src/docs/antora/modules/ROOT/pages/system-requirements.adoc) and the [springdoc parent build](https://github.com/springdoc/springdoc-openapi/blob/v3.2.1/pom.xml).

### Run both services with Compose

Run these PowerShell commands from the repository root with JDK 21 and Docker running.

```powershell
Push-Location .\backend
.\gradlew.bat --no-daemon --max-workers=4 test bootJar
Pop-Location
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose config --quiet
docker compose up --build --wait
$demo = (Resolve-Path .\contracts\demo-math.json).Path
docker compose run --rm --volume "${demo}:/import/demo-math.json:ro" backend import /import/demo-math.json
```

Copy the example environment file when setting up the project for the first time. The image packages the JAR built by the wrapper. Import files must be readable by the container user (UID 10001). Compose exposes the API only on loopback and puts PostgreSQL on a private, internal network with a named data volume. The container limits are local development defaults. When finished, stop both services with `docker compose down`. The volume retains the published packs.

### Run Spring Boot directly

Use a separate PostgreSQL container with a loopback-only port when running the API outside Compose. Run these PowerShell commands from the repository root.

```powershell
$env:KICIMONDO_DB_PASSWORD = 'local-dev-only'
$env:KICIMONDO_ALLOWED_ORIGINS = 'http://127.0.0.1:5173,http://127.0.0.1:4173'
docker run -d --name kicimondo-dev-postgres -p 127.0.0.1:5432:5432 -v kicimondo-dev-postgres:/var/lib/postgresql/data -e POSTGRES_DB=kicimondo -e POSTGRES_USER=kicimondo -e "POSTGRES_PASSWORD=$env:KICIMONDO_DB_PASSWORD" postgres:17.9-alpine
docker exec kicimondo-dev-postgres pg_isready -U kicimondo -d kicimondo
Push-Location .\backend
.\gradlew.bat --no-daemon bootJar
Pop-Location
java -jar .\backend\build\libs\kicimondo-content.jar import .\contracts\demo-math.json
java -jar .\backend\build\libs\kicimondo-content.jar
```

Wait for PostgreSQL readiness before importing. For an existing stopped development container, use `docker start kicimondo-dev-postgres`. The import starts a local non-web process and runs Flyway before publishing. The same normalized pack yields `ALREADY_PUBLISHED`. A conflicting payload fails with a nonzero exit and leaves the original row intact. Stop the Java process with Ctrl+C, then use `docker stop kicimondo-dev-postgres`. Use local-only passwords for these examples. The API reads `KICIMONDO_DB_URL`, `KICIMONDO_DB_USER`, `KICIMONDO_DB_PASSWORD`, `SERVER_ADDRESS` and `SERVER_PORT`.

### Read the API

All three endpoints are GET under `/api/v1/content/packs` and require a positive `gameContentVersion`. The optional two-letter `locale` defaults to `pl`. The list returns the newest compatible version per pack ID, ordered by pack ID, with 50 results per page and an optional zero-based `page` (0–1000). Missing compatible versions return HTTP 404 and invalid parameters return HTTP 400. Both use `application/problem+json`. Publication conflicts are reported by the operator CLI.

```powershell
$api = 'http://127.0.0.1:8080/api/v1/content/packs'
Invoke-RestMethod "${api}?gameContentVersion=4&locale=pl&page=0"
Invoke-RestMethod "$api/kicimondo-math/latest?gameContentVersion=4"
$response = Invoke-WebRequest "$api/kicimondo-math/versions/1?gameContentVersion=4"
$response.Headers['X-Content-SHA256']
$response.Content
Invoke-RestMethod 'http://127.0.0.1:8080/actuator/health'
Start-Process 'http://127.0.0.1:8080/swagger-ui/index.html'
```

Metadata includes the pack ID, version, compatible game version, locale, SHA-256 and publication timestamp. The version endpoint returns the exact stored UTF-8 bytes and the same lowercase SHA-256 in `X-Content-SHA256`. Import produces compact JSON with variants sorted by ID. PostgreSQL stores that text to preserve the exact bytes, with a composite primary key and a trigger that rejects updates and deletes. Flyway creates the schema and Hibernate validates it. Actuator exposes health status only, and OpenAPI JSON is at `/v3/api-docs`.

### Configure the client and verify offline

Start the backend first. Run the production preview from the repository root in PowerShell to test the service worker.

```powershell
$env:VITE_CONTENT_API_ORIGIN = 'http://127.0.0.1:8080'
Set-Location .\frontend
npm ci --engine-strict
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173`. Create or open a profile, return to the main menu, and choose **Dla dorosłych · zadania dodatkowe → Sprawdź i pobierz pakiet zadań**. The menu requests the `kicimondo-math` pack. After the offline-ready message, disconnect or enable the browser's Offline setting and reload. Try the water-bowl activity. Its first downloaded question shows three drops. Completing it gives the existing quest's single PS. Check school supplies after reloading offline. Return to bundled exercises with **Wróć do zadań dołączonych do gry**.

Use `Remove-Item Env:VITE_CONTENT_API_ORIGIN` before building the default client. For a future web host that proxies `/api` on its own HTTPS origin, set `VITE_CONTENT_API_ORIGIN=same-origin` at build time. For a separate origin, configure the API's comma-separated `KICIMONDO_ALLOWED_ORIGINS` to include the exact client origin. Use trusted HTTPS outside loopback. An opt-in Android build uses an explicit trusted HTTPS API origin and requires `https://localhost` in the API CORS allowlist. The distributed debug build uses bundled content by default. Native HTTPS connectivity still needs a device check.

## CI/CD

Frontend and Backend workflows run their existing tests and produce the universal debug APK. Production images builds and tests both containers on PRs and on main. Release images can be dispatched on the upstream main branch after owner review. It runs all three checks again and publishes only the two tested image digests.

## Android

The standalone APK has application ID `io.github.widlakolak.kicimondo`. Capacitor 8.6.2 uses Android API 24 as its minimum and API 36 for compile and target. The toolchain uses JDK 21, Gradle 8.14.3, Android Gradle Plugin 8.13.0, Android platform 36 and Build Tools 35.0.0 for AGP and 36.0.0 for artifact inspection. The repository pins Node 24.13.1 and npm 11.11.0 for CI. The APK contains local game assets, no PWA worker, no remote server URL and no native ABI-specific libraries. Android can install the same file on ARM64 and ARMv7 devices. Capacitor’s standard manifest includes the normal INTERNET permission for its WebView. The APK runs from bundled files. A build configured for educational updates makes requests only from the adult menu.

### Get the APK

1. Open the repository’s **Actions** tab and select the **Frontend** workflow run for the commit or PR to test.
2. Open **Artifacts** and download **kicimondo-debug**. Extract the ZIP and use the single `kicimondo-debug.apk` inside. Each runner’s debug signature is suitable for a first installation. Use a stable signing identity for upgrades.
3. Connect the tablet by USB and select **File transfer**, or copy the APK to a microSD card. Put it in the tablet’s **Download** folder or browse to it on the card. Open the file with Huawei’s file manager.
4. If Android blocks the install, use the offered Settings link to grant **Install unknown apps** for that file manager only. On EMUI, the exact label and location depend on the version. Return to the file manager and complete the install. Revoke the file manager grant after installation if it is no longer needed.
5. Enable airplane mode before opening Kicimondo for the first time. This verifies the APK can use its bundled assets.

PowerShell, from the directory containing the downloaded ZIP:

```powershell
Expand-Archive .\kicimondo-debug.zip .\kicimondo-artifact
Get-FileHash .\kicimondo-artifact\kicimondo-debug.apk -Algorithm SHA256
```

### Build with an approved HTTPS API

For an optional Android build, set `VITE_CONTENT_API_ORIGIN` to the approved HTTPS origin before running `npm run build:android`. Use an origin without a path. Configure `KICIMONDO_ALLOWED_ORIGINS=https://localhost` on the production content backend and recreate the backend. Keep the existing TLS trust and cleartext policy. The regular CI build has no configured content origin.

```powershell
$env:VITE_CONTENT_API_ORIGIN = 'https://APPROVED_HOSTNAME'
Set-Location .\frontend
npm ci --engine-strict
npm run build:android
Remove-Item Env:VITE_CONTENT_API_ORIGIN
```

Continue with Gradle from `frontend/android` using the signing instructions below.

### Build locally and keep the same signing identity

Install JDK 21 and Android SDK Command-line Tools. Set `JAVA_HOME` and `ANDROID_HOME` to their installed directories. Android Studio can install the SDK components, or use `sdkmanager` and accept the required SDK licenses.

```powershell
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-36" "build-tools;35.0.0" "build-tools;36.0.0"
node --version
npm --version
Set-Location .\frontend
npm ci --engine-strict
npm run build:android
Set-Location .\android
.\gradlew.bat --no-daemon assembleDebug
Copy-Item .\app\build\outputs\apk\debug\app-debug.apk ..\kicimondo-debug.apk
```

On Linux/macOS use `./gradlew --no-daemon assembleDebug` from `frontend/android`. From `frontend/`, run `bash scripts/verify-apk.sh kicimondo-debug.apk` to check metadata, bundle contents and signature. On Windows the SDK commands below also show the manifest and certificate after returning to `frontend/`.

```powershell
& "$env:ANDROID_HOME\build-tools\36.0.0\aapt.exe" dump badging .\kicimondo-debug.apk
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --print-certs .\kicimondo-debug.apk
```

For a device whose progress you want to preserve, build the first APK locally with Gradle’s debug signing. Keep a secure copy of `$env:USERPROFILE\.android\debug.keystore` outside the repository, then reuse it on the machine that builds each upgrade. Keep the application ID and Capacitor origin `https://localhost` stable. Increment the committed `versionCode` in `frontend/android/app/build.gradle` for each newer distributed build. Stage 04 starts at 4.

Android compares the signing certificate and requires a version code that is at least as high as the installed one. A fresh GitHub Actions runner may create a different debug key on each run. Compare certificate SHA-256 digests when in doubt. An APK signed with a local key cannot replace an APK signed with a different CI key. Persistent CI signing would require the owner to provision a dedicated debug key and repository secrets in a separate action. Uninstalling Kicimondo or clearing its app data can delete progress. Browser saves live separately.

### MediaPad T5 and older WebView troubleshooting

Check the installed Android version under **Settings → System → About tablet**. If USB debugging is available, enable it in Developer options and authorize your own computer on the tablet. Read the effective SDK, CPU ABI and active WebView before testing. The active provider can be Chrome, Android System WebView or a Huawei provider, depending on the firmware. An installed browser’s version does not identify the active WebView by itself.

```powershell
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
& $adb devices -l
& $adb shell getprop ro.build.version.release
& $adb shell getprop ro.build.version.sdk
& $adb shell getprop ro.product.cpu.abilist
& $adb shell dumpsys webviewupdate
& $adb install .\kicimondo-debug.apk
# For an in-place upgrade using the same signing certificate
& $adb install -r .\kicimondo-debug.apk
& $adb shell dumpsys package io.github.widlakolak.kicimondo | Select-String 'versionCode|versionName'
& $adb logcat -d -s AndroidRuntime Capacitor Capacitor/Console chromium
```

For an installation failure, keep the exact `adb install` error, SDK level and certificate digest of the APK. `INSTALL_FAILED_OLDER_SDK` indicates an unsupported Android API. `INSTALL_FAILED_UPDATE_INCOMPATIBLE` indicates a signing mismatch. For a blank screen or a compatibility message, collect the active provider line and relevant startup errors. Remove personal information from logs before sharing them. Disable USB debugging when finished.

The APK targets Chromium 80 or newer for the game frontend. Capacitor’s default standard WebView check is Chromium 60 and its Huawei WebView default is provider version 10. The game also checks engine capabilities, including Pointer Events, dialog, Canvas and the JavaScript APIs used by gameplay. Huawei provider package numbers can differ from Chromium engine numbers. Chromium 80.0.3987.0 was tested in desktop Linux. The minimum fully verified Android WebView version remains pending. A Chromium 60-era provider may install the APK on Android 8 and still show the Polish compatibility message. If the provider is too old, check official EMUI/system updates and any provider choices the device already offers in Developer options. Avoid WebView APKs from third-party download sites.

For acceptance, test landscape and portrait on the T5, including the on-screen keyboard and game controls. Complete all three activities and a cat interaction in airplane mode, visit the landing, and check hardware Back from a partially completed challenge. Background the game, return, then force-stop and reopen. Restart the tablet and install a newer build signed by the same key. Verify the nickname, checkpoint, 3 PS, world changes and cat trust after each restart and upgrade.
