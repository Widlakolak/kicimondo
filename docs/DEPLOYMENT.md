# Deployment

Kicimondo has a static web build, an Android debug artifact and an optional local content service. QNAP hosting and public releases remain planned.

## Web

Run `npm run build` and `npm run preview` in `frontend`. Full PWA testing requires HTTPS or trusted localhost. An HTTP LAN address is useful for layout testing. To test offline from a clean origin, wait for the Polish readiness message, then disable connectivity before entering the room and reload. A first web visit requires connectivity. To apply a staged update, finish the current exercise, return to the menu and follow the prompt to close all game windows and reopen. IndexedDB remains on the same origin.

Deploy the entire `frontend/dist` directory as one release. Serve `index.html` and `sw.js` with revalidation and keep fingerprinted assets immutable. Retain the previous fingerprinted files long enough for clients in the middle of a first load. The build logs the precache membership and byte sizes.

Use the existing QNAP environment only after inspecting resources and obtaining approval. Keep Kicimondo in a separate Compose project with unique service names, bind mounts or named volumes, and its own private database network if the backend is present. Initial family version can be a static frontend only. Proposed NAS directory: /share/CACHEDEV1_DATA/Container/kicimondo. Confirm the path on the host before use.

Follow the useful parts of the Poetry App deployment: CI builds images on GitHub, publishes to GHCR after a reviewed merge, and the NAS pulls images. Use linux/amd64 images compatible with the actual Celeron host; verify CPU features and memory headroom before choosing images. Pin immutable release tags/digests for rollback. Avoid building on the NAS. Frontend uses a small static server; backend is added only when needed.

The existing shared Nginx/Cloudflare setup may be reused after checking network names, service names and available hostnames. Do not overwrite Poetry App, PoetryStream or WorkDone routing. Prefer same-origin /api/ proxying for the web client. No public database port, no public admin endpoints, and no new tunnel or DNS changes without approval. Keep health checks private or limited to minimal status. Never commit credentials, NAS configuration dumps or tunnel tokens.

Before deployment: validate Compose, inspect the diff, check disk/CPU/RAM, check image availability and backup persistent data. Deploy only Kicimondo services. Verify TLS, health, first load, offline reload, asset paths and actual phone play. Document exact commands and image tags after the implementation exists. Keep a rollback plan; never use down -v on persistent production data.

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

PR: reproducible npm ci, lint/typecheck/test/build; content validation, backend Gradle tests and Compose checks when those files exist. CI must not publish from untrusted PRs. On approved merges, build and publish only configured images with minimum workflow permissions. Pin action versions and use a checked-in lockfile and Gradle wrapper. No production secrets in build logs.

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
