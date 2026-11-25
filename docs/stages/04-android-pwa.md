# Stage 04: Android and offline web

Status: ready for implementation. Stage 03 owner acceptance confirmed.

## Goal

Run the existing family-playtest game as an installable PWA and a standalone Android debug APK. Keep the same gameplay, bundled content and local progress. No network or backend is required to play the APK, including its first launch.

## PWA

- Use a compatible, pinned PWA integration for the existing Vite version; keep Node 24.13.1 and npm 11.11.0 supported. Add a Polish manifest, standalone display mode, start URL, theme/background colours, original 192/512 px and maskable icons. Record provenance.
- Precache the production HTML, CSS, JS (including lazy Phaser/Room chunks), maps, icons and all required assets. Check actual emitted asset sizes and the generated precache manifest; do not ignore a missing oversized chunk. Avoid external runtime resources. Keep service worker registration out of the ordinary development server and native APK.
- Signal offline readiness only after the complete cache is available. Once installed, a reload from the same origin must work offline even if the player has not previously entered the bedroom. A first-ever web visit without connectivity cannot work.
- Use versioned caches and a controlled update prompt outside active challenges. Keep old assets usable for running sessions; do not reload or activate incompatible code automatically during play. Preserve IndexedDB when caches change. Test upgrading between builds with saved progress.
- Service workers need HTTPS or a trusted localhost origin. A plain HTTP LAN address is useful for mobile layout testing but is not a valid PWA installation test. Do not configure a public domain or tunnel in this stage.

## Android

- Use Capacitor with a compatible stable release, pinned dependencies and a checked-in native Android project and Gradle wrapper. Verify the required Android SDK, JDK and Gradle versions against official documentation and the selected toolchain. Document Windows setup and actual commands. Do not upgrade unrelated frontend libraries.
- Application ID: io.github.widlakolak.kicimondo; label: Kicimondo. Bundle the Vite production output via webDir and cap sync. No server.url, live-reload URL, remote WebView wrapper or service worker in the native build. Use the same original icons.
- Handle native back, pause/resume, process restart, rotation and safe-area/system-bar insets. Back dismisses a challenge without awarding progress, resumes from pause or returns to an appropriate menu; it must not silently reset a save. Freeze input and cat simulation while backgrounded and dispose event listeners. Keep portrait and landscape usable.
- Use the existing validated, transactional save repository if IndexedDB in the selected Android WebView passes persistence, restart and upgrade checks. Keep a stable native origin and application ID. If it is unsuitable, introduce a small durable native repository adapter preserving atomicity, idempotence and migrations; do not introduce an unnecessary database plugin. Browser and APK saves are separate; no automatic transfer or cross-device sync. Uninstall/clear data may remove saves.
- Build a debug APK from bundled assets. Add a separate CI job to build and upload the debug APK artifact after checks; no store publishing, signing secrets, or release keys. Do not commit APKs, generated web assets in android/, machine-specific local.properties or build directories. Review permissions and avoid sensitive permissions and tracking SDKs.
- If possible, test on an Android emulator. Physical-device acceptance remains the owner's responsibility. Document how to download/install the CI artifact (extract the ZIP first, if applicable) or build/install locally with Android Studio or adb. Document debug-only signing and the requirement for the same signing identity for in-place upgrades. Never instruct uninstalling an existing app without warning about data loss.

## Acceptance

- Existing Windows web flow and all Stage 03 regressions pass with npm ci --engine-strict, lint, typecheck, unit tests, production build and Playwright.
- Automated PWA test loads a fresh production origin, waits for service worker control and offline readiness, disables network before entering the room, reloads, completes quests and reloads again. The cat, all three challenges, assets and save work offline. Verify update handling without interrupting a challenge and preservation of earlier saves. Confirm no runtime external asset requests.
- APK assembles successfully in CI. On emulator or physical device: install, launch in airplane mode before any online launch, choose avatar, complete clothes/bowl/bed tasks, pet cat, visit landing, pause/background/resume, rotate and use hardware back. Force-stop/relaunch and upgrade in place with the same signing identity: retain profile, 3 PS, attractions, checkpoint and trust. Distinguish actual native device tests from browser emulation.
- Confirm previous Stage 01/02/03 browser saves remain valid on the same origin. Failed or unsupported saves are not silently overwritten. If native durability or in-place upgrades cannot be tested, report this explicitly and leave that acceptance pending.
- README and deployment notes describe actual build, install and offline behaviour. Update stage status only with evidence. Record Stage 03 owner acceptance (all 19 checks passed); do not claim a physical Android test before it occurs.

## Out of scope

Google Play release, signed release AAB, QNAP deployment, cloud sync, backend, new quests or maps, a production logo, user accounts and monetization. Backup/export/import remains a later separate feature unless a minimal recovery mechanism is essential for a discovered persistence issue.

Stop after Stage 04 and wait for owner review.

## References

- [Capacitor installation](https://capacitorjs.com/docs/getting-started)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)
- [PWA precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache)
- [PWA update prompts](https://vite-pwa-org.netlify.app/guide/prompt-for-update)
