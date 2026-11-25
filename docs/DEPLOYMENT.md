# Deployment

Stage 04 defines a static web build and an Android debug artifact. QNAP hosting and public releases remain planned.

## Web

Run `npm run build` and `npm run preview` in `frontend`. Full PWA testing requires HTTPS or trusted localhost. An HTTP LAN address is useful for layout testing. To test offline from a clean origin, wait for the Polish readiness message, then disable connectivity before entering the room and reload. A first web visit requires connectivity. To apply a staged update, finish the current exercise, return to the menu and follow the prompt to close all game windows and reopen. IndexedDB remains on the same origin.

Deploy the entire `frontend/dist` directory as one release. Serve `index.html` and `sw.js` with revalidation and keep fingerprinted assets immutable. Retain the previous fingerprinted files long enough for clients in the middle of a first load. The build logs the precache membership and byte sizes.

Use the existing QNAP environment only after inspecting resources and obtaining approval. Keep Kicimondo in a separate Compose project with unique service names, bind mounts or named volumes, and its own private database network if the backend is present. Initial family version can be a static frontend only. Proposed NAS directory: /share/CACHEDEV1_DATA/Container/kicimondo. Confirm the path on the host before use.

Follow the useful parts of the Poetry App deployment: CI builds images on GitHub, publishes to GHCR after a reviewed merge, and the NAS pulls images. Use linux/amd64 images compatible with the actual Celeron host; verify CPU features and memory headroom before choosing images. Pin immutable release tags/digests for rollback. Avoid building on the NAS. Frontend uses a small static server; backend is added only when needed.

The existing shared Nginx/Cloudflare setup may be reused after checking network names, service names and available hostnames. Do not overwrite Poetry App, PoetryStream or WorkDone routing. Prefer same-origin /api/ proxying for the web client. No public database port, no public admin endpoints, and no new tunnel or DNS changes without approval. Keep health checks private or limited to minimal status. Never commit credentials, NAS configuration dumps or tunnel tokens.

Before deployment: validate Compose, inspect the diff, check disk/CPU/RAM, check image availability and backup persistent data. Deploy only Kicimondo services. Verify TLS, health, first load, offline reload, asset paths and actual phone play. Document exact commands and image tags after the implementation exists. Keep a rollback plan; never use down -v on persistent production data.

## CI/CD

PR: reproducible npm ci, lint/typecheck/test/build; content validation, backend Gradle tests and Compose checks when those files exist. CI must not publish from untrusted PRs. On approved merges, build and publish only configured images with minimum workflow permissions. Pin action versions and use a checked-in lockfile and Gradle wrapper. No production secrets in build logs.

## Android

The standalone APK has application ID `io.github.widlakolak.kicimondo`. Capacitor 8.6.2 uses Android API 24 as its minimum and API 36 for compile and target. The toolchain uses JDK 21, Gradle 8.14.3, Android Gradle Plugin 8.13.0, Android platform 36 and Build Tools 35.0.0 for AGP and 36.0.0 for artifact inspection. The repository pins Node 24.13.1 and npm 11.11.0 for CI. The APK contains local game assets, no PWA worker, no remote server URL and no native ABI-specific libraries. Android can install the same file on ARM64 and ARMv7 devices. Capacitor’s standard manifest includes the normal INTERNET permission for its WebView. The game uses bundled files and has no runtime external service.

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
