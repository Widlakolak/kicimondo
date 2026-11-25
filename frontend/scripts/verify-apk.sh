#!/usr/bin/env bash
set -euo pipefail

apk=${1:?Usage: bash scripts/verify-apk.sh /path/to/kicimondo-debug.apk}
sdk=${ANDROID_HOME:-${ANDROID_SDK_ROOT:?Set ANDROID_HOME to the Android SDK directory}}
tools="$sdk/build-tools/36.0.0"
manifest=$("$tools/aapt" dump badging "$apk")
printf '%s\n' "$manifest"
grep -q "^package: name='io.github.widlakolak.kicimondo' " <<< "$manifest"
grep -Fxq "sdkVersion:'24'" <<< "$manifest"
grep -Fxq "targetSdkVersion:'36'" <<< "$manifest"
grep -Fxq "application-label:'Kicimondo'" <<< "$manifest"
entries=$(unzip -Z1 "$apk")
grep -Fxq 'assets/public/index.html' <<< "$entries"
grep -Fxq 'assets/public/compatibility.html' <<< "$entries"
grep -Eq '^assets/public/assets/Room-.+\.js$' <<< "$entries"
if grep -Eq '^assets/public/(sw\.js|manifest\.webmanifest)$' <<< "$entries"; then
  echo 'The Android build contains PWA files.' >&2
  exit 1
fi
if grep -q '^lib/' <<< "$entries"; then
  echo 'Unexpected native libraries in the ABI-independent APK.' >&2
  exit 1
fi
"$tools/apksigner" verify --print-certs "$apk"
