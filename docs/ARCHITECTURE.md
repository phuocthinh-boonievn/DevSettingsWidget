# Architecture

DevSettings Widget is an Expo SDK 57 app. The home-screen widget and the in-app button both open Settings by running the same plan. The plan is chosen in TypeScript and executed in Kotlin on Android.

```
DeviceContext
{ platform, manufacturer, brand, apiLevel, devOptionsEnabled }
        │
        ▼
src/platform/openers.ts          pure, no React Native imports
  OPENER_TABLE + selectOpeners()
        │
        ├─ in-app button ─ src/platform/device.ts ─ runPlan()
        │                         │
        │                         ▼
        └─ widget render ─ buildWidgetUri() ─ devsettingswidget://open?plan=<json>
                                  │
                                  ▼
                    modules/dev-settings-launcher (Kotlin)
                      DevSettingsTrampolineActivity
                      AttemptRunner.run(plan)   ← re-checks dev-options state
                                  │
                                  ▼
                    startActivity(first allowed Settings intent that resolves)
```

## Why a trampoline

`react-native-android-widget` can only fire `ACTION_VIEW` on a URI (`OPEN_URI`). That cannot express `android.settings.*` intents. The widget stores a `devsettingswidget://open?plan=...` URI. An exported, invisible activity catches it, runs the plan, and finishes without bringing the app UI forward (`taskAffinity=""`, `noHistory`, translucent theme).

The TypeScript table stays the source of truth. The widget does not boot the React Native runtime on tap.

## Selection rules

`selectOpeners(ctx, target)` in `src/platform/openers.ts`:

1. Keep table rows whose `match` fits the device. Omitted fields are wildcards. A row with `minApi` or `maxApi` does not match when `apiLevel` is null.
2. Sort most specific first. OEM is +4, an API bound is +2, a platform is +1. Earlier table order breaks ties.
3. Concatenate that row's attempts for the target, then less-specific rows as fallbacks.
4. Drop duplicates with the same launch signature (action + component + extra).
5. Drop attempts outside `minApi` / `maxApi`, and attempts whose `requires` does not hold. `devOptionsEnabled === null` keeps the attempt.
6. Move `lastResort` attempts (the Settings root) to the end.

Targets today: `developerOptions` and `wirelessDebugging`.

## Native allowlist

`AttemptRunner.kt` is the only code that calls `startActivity`. The trampoline is exported, so the runner refuses anything that is not a Settings-style action and a Settings package prefix (`ALLOWED_ACTION_PREFIXES`, `ALLOWED_PACKAGE_PREFIXES`). A new OEM component outside those prefixes does nothing until the prefix is added. See the README section "Adding a new device / OEM / Android version".

The runner reads `Settings.Global.DEVELOPMENT_SETTINGS_ENABLED` again at tap time and skips attempts whose `requires` does not hold. It cannot add attempts that the widget URI already dropped. The in-app button builds a fresh plan on every press. Opening the app also asks the widget to re-render (`refreshWidgets`).

## iOS

There is no public URL for Developer Mode. `ios-default` is `Linking.openSettings()` plus a hint. `targets/widget/` is a WidgetKit scaffold (`@bacons/apple-targets`) that opens `devsettings:///?open=developerOptions`. It is not built here. `IOS_PRIVATE_PREFS_ATTEMPT` is an optional local-only `App-Prefs:` hack and is not in the table.

## What is generated

`android/` and `ios/` are Continuous Native Generation output (`npx expo prebuild`). They are gitignored. Native behavior that must survive prebuild lives in `app.json` plugins and in `modules/dev-settings-launcher/`.
