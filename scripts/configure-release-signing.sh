#!/usr/bin/env bash
# Point the prebuilt Android app at a release keystore when the four
# ANDROID_KEYSTORE_* secrets are present. Otherwise leave Expo's default:
# release signed by android/app/debug.keystore.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_GRADLE="$ROOT/android/app/build.gradle"
KEYSTORE_OUT="$ROOT/android/app/release.keystore"

if [[ ! -f "$APP_GRADLE" ]]; then
  echo "android/app/build.gradle not found. Run npx expo prebuild -p android first." >&2
  exit 1
fi

have_b64="${ANDROID_KEYSTORE_BASE64:-}"
have_store_pw="${ANDROID_KEYSTORE_PASSWORD:-}"
have_alias="${ANDROID_KEY_ALIAS:-}"
have_key_pw="${ANDROID_KEY_PASSWORD:-}"

if [[ -z "$have_b64" && -z "$have_store_pw" && -z "$have_alias" && -z "$have_key_pw" ]]; then
  echo "No release keystore secrets. assembleRelease uses the debug keystore."
  echo "The APK is installable. Adding a real key later changes the signature, so the phone will require an uninstall before the new APK can replace it."
  exit 0
fi

if [[ -z "$have_b64" || -z "$have_store_pw" || -z "$have_alias" || -z "$have_key_pw" ]]; then
  echo "Release signing secrets are incomplete. Set all of ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD, or none of them." >&2
  exit 1
fi

echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$KEYSTORE_OUT"

if ! keytool -list -keystore "$KEYSTORE_OUT" -storepass "$ANDROID_KEYSTORE_PASSWORD" -alias "$ANDROID_KEY_ALIAS" >/dev/null; then
  echo "Keystore decoded, but keytool could not open it with ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS." >&2
  rm -f "$KEYSTORE_OUT"
  exit 1
fi

APPLY_LINE='apply from: new File(rootDir, "../scripts/ci-release-signing.gradle")'
if ! grep -qF "$APPLY_LINE" "$APP_GRADLE"; then
  printf '\n%s\n' "$APPLY_LINE" >> "$APP_GRADLE"
fi

# The next workflow step reads this. Exporting here only affects this process.
export ANDROID_KEYSTORE_FILE="$KEYSTORE_OUT"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "ANDROID_KEYSTORE_FILE=$KEYSTORE_OUT" >> "$GITHUB_ENV"
fi
echo "Release keystore configured (alias: $ANDROID_KEY_ALIAS)."
