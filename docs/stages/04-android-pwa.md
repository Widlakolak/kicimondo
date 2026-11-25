# Stage 04: Android and offline web

Status: implementation for review. Stage 03 was accepted by the owner (19 checks). Physical Stage 04 acceptance is pending.

## Goal

Run the existing family-playtest game as an installable PWA and a standalone Android debug APK. Keep the same gameplay, bundled content and local progress. No network or backend is required to play the APK, including its first launch.

## Primary device and compatibility

The owner must accept this stage on a Huawei MediaPad T5. The reference device has a Kirin 659 ARM CPU, 2–3 GB RAM and a 1920 × 1200 10.1-inch display. Target the 2 GB model and verify the actual Android/API level, ABI and active WebView provider/version before testing. Android 8.0 Oreo / EMUI 8.0 (API 26) is the factory reference. The tablet has no Google Play Store. Use direct APK installation without Google accounts, Google Play Services, Firebase or Huawei Mobile Services.

Use the officially supported Capacitor minimum SDK. Capacitor 8.6.2 specifies API 24 and compile/target SDK 36. The universal APK carries Java bytecode and web assets and can run in ARM64 or ARMv7 Android processes. Verify this packaging from the assembled APK.

Capacitor's default standard WebView floor is Chromium 60, and it checks the Huawei provider against a separate provider version. Game compatibility also depends on the engine. The build targets Chromium 80 and checks key capabilities before mounting the game. Show the Polish compatibility message when the provider is below the configured threshold or the main module cannot load. Record real browser and native test versions separately. Use official system/provider updates only.

At 1920 × 1200 and representative tablet CSS viewports, check portrait and landscape, the software keyboard, large touch controls, the 4:3 pixel canvas, dialog bounds and system bars. Prefer a smooth landscape layout and steady 30 FPS or better on the 2 GB model. Measure frame rates on the device where possible. Retain Canvas and pause world activity in the background and during modal gameplay.

## PWA

- Use a build-time PWA integration compatible with the pinned Vite version; keep Node 24.13.1 and npm 11.11.0 supported. Add a Polish manifest, standalone display mode, start URL, theme/background colours, original 192/512 px and maskable icons. Record provenance.
- Precache the production HTML, CSS, JS (including lazy Phaser/Room chunks), maps, icons and all required assets. Check actual emitted asset sizes and the generated precache manifest; do not ignore a missing oversized chunk. Avoid external runtime resources. Keep service worker registration out of the ordinary development server and native APK.
- Signal offline readiness only after the complete cache is available. Once installed, a reload from the same origin must work offline even if the player has not previously entered the bedroom. A first-ever web visit without connectivity cannot work.
- Use versioned caches and a controlled update prompt outside active challenges. Keep old assets usable for running sessions; do not reload or activate incompatible code automatically during play. Preserve IndexedDB when caches change. Test upgrading between builds with saved progress.
- Service workers need HTTPS or a trusted localhost origin. A plain HTTP LAN address is useful for mobile layout testing but is not a valid PWA installation test. Do not configure a public domain or tunnel in this stage.

## Android

- Use Capacitor with a compatible stable release, pinned dependencies and a checked-in native Android project and Gradle wrapper. Verify the required Android SDK, JDK and Gradle versions against official documentation and the selected toolchain. Document Windows setup and actual commands. Do not upgrade unrelated frontend libraries.
- Application ID: io.github.widlakolak.kicimondo; label: Kicimondo. Bundle the Vite production output via webDir and cap sync. No server.url, live-reload URL, remote WebView wrapper or service worker in the native build. Use the same original icons.
- Handle native back, pause/resume, process restart, rotation and safe-area/system-bar insets. Back dismisses a challenge without awarding progress, resumes from pause or returns to an appropriate menu; it must not silently reset a save. Freeze input and cat simulation while backgrounded and dispose event listeners. Keep portrait and landscape usable.
- Use the existing validated, transactional save repository if IndexedDB in the selected Android WebView passes persistence, restart and upgrade checks. Keep a stable native origin and application ID. If it is unsuitable, introduce a small durable native repository adapter preserving atomicity, idempotence and migrations; do not introduce an unnecessary database plugin. Browser and APK saves are separate; no automatic transfer or cross-device sync. Uninstall/clear data may remove saves.
- Build a debug APK from bundled assets. Add a separate CI job to build, inspect and upload one universal APK named `kicimondo-debug.apk` after checks; no store publishing, signing secrets, or release keys. Do not commit APKs, generated web assets in android/, machine-specific local.properties or build directories. Review permissions and avoid sensitive permissions and tracking SDKs.
- If possible, test on an Android emulator. Physical-device acceptance remains the owner's responsibility. Document how to download/install the CI artifact (extract the ZIP first, if applicable) or build/install locally with Android Studio or adb. Document Windows PowerShell setup, APK transfer by USB or microSD, source-specific install grants, adb diagnostics, versionCode increments and a locally retained signing identity. The Actions artifact uses the runner’s debug key and is for first installation. Never instruct uninstalling an existing app without warning about data loss.

## Acceptance

- Existing Windows web flow and all Stage 03 regressions pass with npm ci --engine-strict, lint, typecheck, unit tests, production build and Playwright.
- Automated PWA test loads a fresh production origin, waits for service worker control and offline readiness, disables network before entering the room, reloads, completes quests and reloads again. The cat, all three challenges, assets and save work offline. Verify update handling without interrupting a challenge and preservation of earlier saves. Confirm no runtime external asset requests.
- APK assembles successfully in CI. On emulator or physical device: install, launch in airplane mode before any online launch, choose avatar, complete clothes/bowl/bed tasks, pet cat, visit landing, pause/background/resume, rotate and use hardware back. Close/reopen, force-stop, restart the device if available, and upgrade in place with the same signing identity: retain profile, 3 PS, attractions, checkpoint and trust. Distinguish actual native device tests from browser emulation.
- Try an API 26 emulator and a real Android 8-compatible WebView where available. Record Android installation/startup, back, lifecycle, save durability, upgrade and measured performance separately from emulation. The owner must complete the scenario on the MediaPad T5.
- Confirm previous Stage 01/02/03 browser saves remain valid on the same origin. Failed or unsupported saves are not silently overwritten. If native durability or in-place upgrades cannot be tested, report this explicitly and leave that acceptance pending.
- README and deployment notes describe actual build, install and offline behaviour. Update stage status only with evidence. Record Stage 03 owner acceptance (all 19 checks passed); do not claim a physical Android test before it occurs.

## Validation for review

- With Node 24.13.1 and npm 11.11.0, clean install, lint, type checking, production builds, 44 unit tests and 16 Playwright scenarios passed. The browser suite covers all three offline activities, cat trust, save reload, a two-window service worker update, tablet viewports and simulated Android bridge events.
- The web build precaches 10 files (about 1.46 MB uncompressed). The largest file is the lazy Room/Phaser chunk at 1.22 MB, about 329 kB gzipped. The build reports Vite's large-chunk warning.
- Chromium 80.0.3987.0 on Linux passed an offline smoke test with Canvas, lazy modules, the clothes dialog and a profile reload from IndexedDB. Chromium 156 passed the complete browser suite. This establishes a desktop browser baseline. Android WebView gameplay and a minimum verified WebView version still require a native run.
- The local debug APK assembled with JDK 21 and passed signature, app ID, SDK and universal archive checks. Android 8.0/API 26 x86 software emulation accepted the APK. The image contains Chromium WebView 58.0.3029.125 and reported no active provider. System UI did not respond reliably under software emulation, so native gameplay, hardware lifecycle, save durability, upgrade persistence and device FPS remain pending.
- The target review covered native modules, dynamic imports and `import.meta` in Vite, React 19 and Phaser 3.90, Canvas, dialog and pointer capture, IndexedDB, and CSS. The Chrome 80 build transpiles newer syntax and uses fallbacks for flex gaps, viewport units, the avatar selector and canvas proportions. Gameplay no longer relies on `Object.hasOwn` or event-listener AbortSignal options. `Array.prototype.at` is limited to tests and build-time validation. Runtime `flatMap` and `Object.fromEntries` are present by Chromium 80.
- The Vite 8 legacy plugin can wrap modules in SystemJS and inject ECMAScript polyfills. Chromium 60 predates dynamic imports and several required APIs and CSS features. A verified Chromium 80 browser build avoids maintaining a second loader and asset graph. The legacy plugin would still require low-version WebView, CSS and native bridge validation. Chromium 60 receives the compatibility diagnostic.

## Out of scope

Google Play release, signed release AAB, QNAP deployment, cloud sync, backend, new quests or maps, a production logo, user accounts and monetization. Backup/export/import remains a later separate feature unless a minimal recovery mechanism is essential for a discovered persistence issue.

Stop after Stage 04 and wait for owner review.

## References

- [Capacitor installation](https://capacitorjs.com/docs/getting-started)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Service worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Vite compatibility targets](https://vite.dev/guide/build.html#browser-compatibility)
