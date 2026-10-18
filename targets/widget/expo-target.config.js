/**
 * iOS home-screen widget (WidgetKit) — scaffolded via @bacons/apple-targets.
 * Generated into the Xcode project by `npx expo prebuild -p ios` (macOS + Xcode 16 required).
 * NOT built/verified yet (no Mac in this environment). Set `ios.appleTeamId` in app.json before building.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'widget',
  name: 'DevSettingsWidgetExt',
  displayName: 'DevSettings',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  colors: {
    $accent: '#2F7DF6',
    $widgetBackground: { color: '#FFFFFF', darkColor: '#1C1F24' },
  },
  frameworks: ['SwiftUI', 'WidgetKit'],
};
