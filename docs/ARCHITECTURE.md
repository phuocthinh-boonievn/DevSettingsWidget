# Architecture

The home-screen widget and the in-app button open Settings with the same plan. TypeScript chooses the plan. Kotlin runs it on Android.

```
DeviceContext
{ platform, manufacturer, brand, apiLevel, devOptionsEnabled }
        │
        ▼
src/platform/openers.ts
  OPENER_TABLE + selectOpeners()
        │
        ├─ in-app button ─ src/platform/device.ts ─ runPlan()
        │
        └─ widget render ─ buildWidgetUri()
                                  │
                                  ▼
                    DevSettingsTrampolineActivity
                      AttemptRunner.run(plan)
                                  │
                                  ▼
                    startActivity(first Settings intent that resolves)
```

`react-native-android-widget` can only fire a URI. The widget stores a plan URI. An invisible activity runs that plan and finishes without bringing the app UI forward. The TypeScript table stays the source of truth. A tap does not boot the React Native runtime.

## Selection

`selectOpeners(ctx, target)` in `src/platform/openers.ts`:

1. Keep rows whose `match` fits the device. A row with an API bound does not match when `apiLevel` is null.
2. Sort most specific first (OEM, then API range, then platform). Earlier rows break ties.
3. Concatenate attempts, then less-specific rows as fallbacks.
4. Drop duplicates with the same launch signature (action, component, extras).
5. Drop attempts outside their API bounds, and attempts whose `requires` does not hold. Unknown dev-options state keeps the attempt.
6. Move `lastResort` attempts to the end.

Targets: `developerOptions` and `wirelessDebugging`.

When developer options are off, Samsung opens Software information and asks Settings to scroll to the Build number row. Other Android devices open About phone the same way. The main Settings screen is the last resort. The toast on those steps is "Tap Build number 7 times".

## Native runner

`AttemptRunner.kt` is the only code that calls `startActivity`. It re-reads whether developer options are enabled at tap time and skips steps that do not match. It cannot add steps the widget plan already dropped. Opening the app asks placed widgets to re-render.

The runner only starts Settings screens. A package it does not already accept is skipped, and only the Build number highlight extras are copied onto the intent.

## iOS

There is no public URL for Developer Mode. The iOS row opens this app's Settings page and shows a hint. `targets/widget/` is an unbuilt WidgetKit scaffold.

## Generated projects

`android/` and `ios/` come from `npx expo prebuild` and are gitignored. Native behavior that must survive prebuild lives in `app.json` plugins and in `modules/dev-settings-launcher/`.
