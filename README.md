# DevSettings Widget

One tap from the Android home screen to **Developer options**. Built for a Samsung Galaxy S26 Ultra (Android 16 / One UI 8) and other phones via a small strategy table.

Package: `com.phuocthinh.devsettings`. Expo SDK 57, React Native 0.86. The widget uses [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget). It does not run in Expo Go — install the APK.

## Install

**Latest release:** https://github.com/phuocthinh-boonievn/DevSettingsWidget/releases/latest

**Direct APK:** https://github.com/phuocthinh-boonievn/DevSettingsWidget/releases/latest/download/DevSettingsWidget-universal.apk

Universal release APK (all ABIs). Both links 404 until the first `v*` release exists. After that, `releases/latest` tracks the newest tag.

If the signing secrets below are unset, the release APK is signed with the Android debug key. Switching later to an upload key changes the signature: uninstall the app, then install the new APK.

### Samsung (One UI 8 / Android 16)

1. Open the direct APK link in Chrome, or open the file in My Files. If Chrome warns, tap **Download anyway**, then **Open**.
2. Turn **Auto Blocker** off: **Settings → Security and privacy → Auto Blocker → Off**. Turn it back on after install.
3. Allow the source under **Settings → Apps → ⋮ → Special access → Install unknown apps** (Chrome or My Files).
4. Tap the APK and **Install**.
5. If Play Protect blocks it, tap **More details → Install anyway**. If there is no bypass: Play Store → profile → Play Protect → gear → turn scanning off, install, then turn it back on.
6. Open the app once so the widget can refresh.

`adb install -r DevSettingsWidget-universal.apk` also works once USB debugging is already on.

## Using the widget

1. Long-press the Home screen → **Widgets**.
2. Find **DevSettings Widget**, then drag it onto the Home screen.
3. Resize it. Around two rows tall, a **Wireless debugging** row appears on Android 11+.

**Add widget to home screen** inside the app asks the launcher to pin it (Android 8+). If the launcher refuses, use the long-press path above.

![DevSettings widget preview](assets/widget-preview.png)

## Behaviour

A tap does not open this app. It starts the first Settings screen in the plan that exists. The in-app **Open Developer options** button builds a fresh plan. The widget uses the plan from the last time it rendered (when you added it, opened the app, or after a tap). Opening the app refreshes placed widgets.

**Developer options on:** the public Developer options screen, then About phone, then Settings.

**Developer options off (Samsung):** **About phone → Software information**, scrolled to **Build number**. The toast says **Tap Build number 7 times**. If that screen is missing, About phone with the same highlight, then Settings.

**Developer options off (other Android):** About phone, scrolled to **Build number**, with the same toast, then Settings.

After you enable Developer options, open the app once (or tap the widget so it refreshes) and tap again.

**Wireless debugging** (Android 12+, Developer options on): a best-effort shortcut. If the phone ignores it, the tap opens Developer options.

If nothing opens, the toast is "Could not open Settings on this device."

On a Galaxy, the hand path is **Settings → About phone → Software information**, then tap **Build number** seven times. Developer options shows up at the bottom of Settings.

iOS has no public Developer Mode link. The app opens its own Settings page and explains the rest. iOS is not built in CI.

## Releasing a version

[`.github/workflows/release-apk.yml`](.github/workflows/release-apk.yml) runs on `v*` tags and from **Actions → Release APK**. It typechecks, tests, prebuilds Android, and publishes `DevSettingsWidget-universal.apk`. Release dexing needs a 4 GB Gradle heap; the workflow sets that.

1. Bump `version` in `package.json`, `expo.version` in `app.json`, and `expo.android.versionCode` (must increase).
2. Merge to `main`.
3. Publish a GitHub release with tag `vX.Y.Z` on `main`, or run **Release APK** on `main` with that tag (empty uses `v` plus `package.json`'s version).

Optional signing secrets — set all four, or none: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

Pull requests run [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (typecheck and Jest).

## Building locally

Node.js 22, JDK 21, Android SDK: platform `android-36`, build-tools `36.0.0`, NDK `27.1.12297006`, CMake `3.22.1` and `3.30.5`.

```bash
npm ci
npx tsc --noEmit
npm test
npx expo prebuild -p android --clean
```

Before `assembleRelease`, set a 4 GB Gradle heap in `android/gradle.properties` (same as CI):

```
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

```bash
cd android
./gradlew assembleRelease
```

The APK is `android/app/build/outputs/apk/release/app-release.apk`. `android/`, `ios/`, and `node_modules/` are generated and not committed.

An arm64-only APK (enough for the S26 Ultra): `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`.

## Adding a device

Add one row to `OPENER_TABLE` in `src/platform/openers.ts`. The most specific match wins (OEM, then API range, then platform); other rows stay as fallbacks. OEM names are matched case-insensitively against manufacturer or brand.

Add a Jest case in `__tests__/openers.test.ts`, then run `npm test` and `npx tsc --noEmit`.

A new target also needs a member on `OpenTarget` in `src/platform/types.ts`. If the row names a Settings package the native runner does not already accept, that step is skipped. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

[MIT](LICENSE).
