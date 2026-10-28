/**
 * Strategy table: which settings page to open, per platform / OEM / API level.
 *
 * HOW TO ADD A DEVICE: add one `OpenerEntry` to `OPENER_TABLE` (see README).
 * `selectOpeners` is pure: same context in -> same plan out. No React Native imports here.
 */
import type {
  AndroidIntentAttempt,
  AttemptCondition,
  DeviceContext,
  IntentExtras,
  OpenAttempt,
  OpenerEntry,
  OpenerPlan,
  OpenTarget,
} from './types';

// ---------------------------------------------------------------------------
// Android building blocks (reuse these in table entries)
// ---------------------------------------------------------------------------

export const SETTINGS_PKG = 'com.android.settings';

export const ACTIONS = {
  DEVELOPMENT: 'android.settings.APPLICATION_DEVELOPMENT_SETTINGS',
  DEVICE_INFO: 'android.settings.DEVICE_INFO_SETTINGS',
  SETTINGS: 'android.settings.SETTINGS',
  QS_TILE_PREFERENCES: 'android.service.quicksettings.action.QS_TILE_PREFERENCES',
} as const;

/** AOSP `SettingsActivity` extras that scroll to and flash one preference row. */
export const SETTINGS_HIGHLIGHT = {
  FRAGMENT_ARGS_KEY: ':settings:fragment_args_key',
  SHOW_FRAGMENT_ARGS: ':settings:show_fragment_args',
} as const;

/**
 * Preference key for the Build number row.
 * AOSP/Pixel (`firmware_version.xml` / `BuildNumberPreferenceController`) and
 * Samsung One UI Software information both use `build_number`.
 */
export const BUILD_NUMBER_PREFERENCE_KEY = 'build_number';

export const BUILD_NUMBER_HINT = 'Tap Build number 7 times';

/** Top-level highlight extra, and the same key inside `:settings:show_fragment_args`. */
export function highlightPreferenceExtras(preferenceKey: string): IntentExtras {
  return {
    strings: { [SETTINGS_HIGHLIGHT.FRAGMENT_ARGS_KEY]: preferenceKey },
    bundles: {
      [SETTINGS_HIGHLIGHT.SHOW_FRAGMENT_ARGS]: {
        [SETTINGS_HIGHLIGHT.FRAGMENT_ARGS_KEY]: preferenceKey,
      },
    },
  };
}

const BUILD_NUMBER_EXTRAS = highlightPreferenceExtras(BUILD_NUMBER_PREFERENCE_KEY);

/** Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS — the public, documented intent. */
export const DEV_OPTIONS_ACTION: AndroidIntentAttempt = {
  kind: 'androidIntent',
  id: 'android.devOptions.action',
  label: 'Developer options (public intent)',
  action: ACTIONS.DEVELOPMENT,
  requires: 'devOptionsEnabled',
};

/** Explicit AOSP component (Android 8+). Also present on One UI. */
export const DEV_OPTIONS_DASHBOARD_COMPONENT: AndroidIntentAttempt = {
  kind: 'androidIntent',
  id: 'android.devOptions.dashboardComponent',
  label: 'Developer options (explicit Settings component)',
  action: 'android.intent.action.MAIN',
  packageName: SETTINGS_PKG,
  className: 'com.android.settings.Settings$DevelopmentSettingsDashboardActivity',
  requires: 'devOptionsEnabled',
  minApi: 26,
  bestEffort: true,
};

/** Pre-Oreo component name. */
export const DEV_OPTIONS_LEGACY_COMPONENT: AndroidIntentAttempt = {
  kind: 'androidIntent',
  id: 'android.devOptions.legacyComponent',
  label: 'Developer options (legacy Settings component)',
  action: 'android.intent.action.MAIN',
  packageName: SETTINGS_PKG,
  className: 'com.android.settings.Settings$DevelopmentSettingsActivity',
  requires: 'devOptionsEnabled',
  maxApi: 25,
  bestEffort: true,
};

/**
 * About phone (`Settings.ACTION_DEVICE_INFO_SETTINGS`).
 * On Pixel/AOSP, Build number is the `build_number` row (often under Android version);
 * the highlight extras scroll to it when that row is on this screen.
 */
export const DEVICE_INFO: AndroidIntentAttempt = {
  kind: 'androidIntent',
  id: 'android.deviceInfo',
  label: 'About phone (enable developer options)',
  action: ACTIONS.DEVICE_INFO,
  extras: BUILD_NUMBER_EXTRAS,
  hint: BUILD_NUMBER_HINT,
};

/** Generic Settings root — last resort. */
export const SETTINGS_ROOT: AndroidIntentAttempt = {
  kind: 'androidIntent',
  id: 'android.settings',
  label: 'Settings',
  action: ACTIONS.SETTINGS,
  lastResort: true,
  hint: 'Could not open Developer options directly. Look for System → Developer options (or About phone → Build number ×7 to enable it).',
};

/** Wireless debugging page via the QS-tile long-press path (Android 12+, dev options on). */
export const WIRELESS_DEBUGGING_QS_TILE: AndroidIntentAttempt = {
  kind: 'androidIntent',
  id: 'android.wirelessDebugging.qsTile',
  label: 'Wireless debugging (QS tile preference)',
  action: ACTIONS.QS_TILE_PREFERENCES,
  componentExtra: {
    key: 'android.intent.extra.COMPONENT_NAME',
    packageName: SETTINGS_PKG,
    className: 'com.android.settings.development.qstile.DevelopmentTiles$WirelessDebugging',
  },
  requires: 'devOptionsEnabled',
  minApi: 31,
  bestEffort: true,
  hint: 'If this landed on Developer options instead, scroll to "Wireless debugging".',
};

// Samsung specifics --------------------------------------------------------

export const SAMSUNG_DEV_OPTIONS_COMPONENT: AndroidIntentAttempt = {
  ...DEV_OPTIONS_DASHBOARD_COMPONENT,
  id: 'samsung.devOptions.component',
  label: 'Developer options (Samsung Settings component)',
};

/**
 * One UI Software information, where Build number actually lives (About phone only
 * links here). Samsung Settings exports `Settings$SoftwareInformationActivity`
 * (`com.android.settings` manifest; Pithus decompiles). The fragment behind it is
 * `com.samsung.android.settings.deviceinfo.softwareinfo.SoftwareInfoSettings`
 * (older builds: `...deviceinfo.SoftwareInfoSettings`). `SubSettings` is not
 * exported, so the activity is the component to launch. `Settings$SoftwareInfoSettingsActivity`
 * is not that activity, which is why the tap used to land on About phone.
 */
export const SAMSUNG_SOFTWARE_INFO: AndroidIntentAttempt = {
  kind: 'androidIntent',
  id: 'samsung.softwareInfo',
  label: 'Software information (Samsung)',
  action: 'android.intent.action.MAIN',
  packageName: SETTINGS_PKG,
  className: 'com.android.settings.Settings$SoftwareInformationActivity',
  extras: BUILD_NUMBER_EXTRAS,
  requires: 'devOptionsDisabled',
  hint: BUILD_NUMBER_HINT,
  bestEffort: true,
};

// iOS ------------------------------------------------------------------------

const IOS_DEV_MODE_HINT =
  'iOS has no public link to Developer Mode. Go back to Settings → Privacy & Security → Developer Mode (it only appears after the iPhone has been connected to Xcode or has a dev build installed).';

export const IOS_APP_SETTINGS: OpenAttempt = {
  kind: 'appSettings',
  id: 'ios.appSettings',
  label: 'Settings (this app’s page)',
  hint: IOS_DEV_MODE_HINT,
};

/**
 * Private iOS URL. Not in the table: it can break on any iOS update and is not
 * acceptable for the App Store. The iOS row opens this app's Settings page instead.
 */
export const IOS_PRIVATE_PREFS_ATTEMPT: OpenAttempt = {
  kind: 'url',
  id: 'ios.privatePrefs.developerMode',
  label: 'Developer Mode (private App-Prefs URL)',
  url: 'App-Prefs:root=Privacy&path=DEVELOPER_MODE',
  bestEffort: true,
};

export const DEFAULT_APP_SETTINGS: OpenAttempt = {
  kind: 'appSettings',
  id: 'default.appSettings',
  label: 'System settings',
  hint: 'Open your system settings and look for developer options.',
  lastResort: true,
};

// ---------------------------------------------------------------------------
// The table. Order only matters to break specificity ties (earlier wins).
// ---------------------------------------------------------------------------

export const OPENER_TABLE: OpenerEntry[] = [
  {
    id: 'android-samsung-oneui',
    description: 'Samsung Galaxy (One UI), Android 8+. Primary target: S26 Ultra / Android 16 / One UI 8.',
    match: { platform: 'android', oem: ['samsung'], minApi: 26 },
    targets: {
      developerOptions: [
        DEV_OPTIONS_ACTION,
        SAMSUNG_DEV_OPTIONS_COMPONENT,
        SAMSUNG_SOFTWARE_INFO,
        DEVICE_INFO,
        SETTINGS_ROOT,
      ],
    },
  },
  {
    id: 'android-xiaomi',
    description: 'Xiaomi / Redmi / POCO (MIUI, HyperOS). Build number is "OS version" there.',
    match: { platform: 'android', oem: ['xiaomi', 'redmi', 'poco'] },
    targets: {
      developerOptions: [
        DEV_OPTIONS_ACTION,
        DEV_OPTIONS_DASHBOARD_COMPONENT,
        {
          ...DEVICE_INFO,
          id: 'xiaomi.deviceInfo',
          hint: 'Developer options are off. Tap "MIUI version" / "OS version" 7 times, then tap the widget again.',
        },
        SETTINGS_ROOT,
      ],
    },
  },
  {
    id: 'android-legacy',
    description: 'Android 7.1 and older (API <= 25): old component name.',
    match: { platform: 'android', maxApi: 25 },
    targets: {
      developerOptions: [DEV_OPTIONS_ACTION, DEV_OPTIONS_LEGACY_COMPONENT, DEVICE_INFO, SETTINGS_ROOT],
    },
  },
  {
    id: 'android-wireless-debugging',
    description: 'Android 11+ has Wireless debugging; deep link only works on 12+ (QS tile path).',
    match: { platform: 'android', minApi: 30 },
    targets: {
      wirelessDebugging: [WIRELESS_DEBUGGING_QS_TILE],
    },
  },
  {
    id: 'android-default',
    description: 'Any Android (AOSP, Pixel, unknown OEM).',
    match: { platform: 'android' },
    targets: {
      developerOptions: [DEV_OPTIONS_ACTION, DEV_OPTIONS_DASHBOARD_COMPONENT, DEVICE_INFO, SETTINGS_ROOT],
      // Fallback for wireless debugging = developer options chain.
      wirelessDebugging: [DEV_OPTIONS_ACTION, DEV_OPTIONS_DASHBOARD_COMPONENT, DEVICE_INFO, SETTINGS_ROOT],
    },
  },
  {
    id: 'ios-default',
    description: 'iOS: no public Developer Mode link; open Settings (best effort).',
    match: { platform: 'ios' },
    targets: {
      developerOptions: [IOS_APP_SETTINGS],
      wirelessDebugging: [IOS_APP_SETTINGS],
    },
  },
  {
    id: 'default',
    description: 'Anything else (web, unknown platform).',
    match: {},
    targets: {
      developerOptions: [DEFAULT_APP_SETTINGS],
      wirelessDebugging: [DEFAULT_APP_SETTINGS],
    },
  },
];

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** Does an entry apply to this device? */
export function entryMatches(entry: OpenerEntry, ctx: DeviceContext): boolean {
  const m = entry.match;
  if (m.platform && m.platform !== '*' && m.platform !== norm(ctx.platform)) return false;
  if (m.oem && m.oem.length > 0) {
    const oems = m.oem.map(norm);
    if (!oems.includes(norm(ctx.manufacturer)) && !oems.includes(norm(ctx.brand))) return false;
  }
  if (m.minApi !== undefined || m.maxApi !== undefined) {
    if (ctx.apiLevel === null) return false;
    if (m.minApi !== undefined && ctx.apiLevel < m.minApi) return false;
    if (m.maxApi !== undefined && ctx.apiLevel > m.maxApi) return false;
  }
  return true;
}

/** Higher = more specific. OEM beats API range beats platform. */
export function specificity(entry: OpenerEntry): number {
  const m = entry.match;
  let score = 0;
  if (m.platform && m.platform !== '*') score += 1;
  if (m.minApi !== undefined || m.maxApi !== undefined) score += 2;
  if (m.oem && m.oem.length > 0) score += 4;
  return score;
}

/** Is an attempt allowed given the current dev-options state? Unknown state keeps it. */
export function conditionHolds(cond: AttemptCondition | undefined, ctx: DeviceContext): boolean {
  if (!cond) return true;
  if (ctx.devOptionsEnabled === null) return true;
  return cond === 'devOptionsEnabled' ? ctx.devOptionsEnabled : !ctx.devOptionsEnabled;
}

/** Two attempts with the same signature launch the same thing; keep only the first. */
function stablePairs(record: Record<string, string> | undefined): string {
  return Object.entries(record ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
}

export function attemptSignature(a: OpenAttempt): string {
  switch (a.kind) {
    case 'androidIntent':
      return [
        'intent',
        a.action,
        a.packageName ?? '',
        a.className ?? '',
        a.componentExtra ? `${a.componentExtra.key}=${a.componentExtra.packageName}/${a.componentExtra.className}` : '',
        stablePairs(a.extras?.strings),
        Object.entries(a.extras?.bundles ?? {})
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([k, inner]) => `${k}{${stablePairs(inner)}}`)
          .join(','),
      ].join('|');
    case 'url':
      return `url|${a.url}`;
    case 'appSettings':
      return 'appSettings';
  }
}

function attemptApiOk(a: OpenAttempt, ctx: DeviceContext): boolean {
  if (ctx.apiLevel === null) return true; // unknown: let the runtime try it
  if (a.minApi !== undefined && ctx.apiLevel < a.minApi) return false;
  if (a.maxApi !== undefined && ctx.apiLevel > a.maxApi) return false;
  return true;
}

/**
 * Pick the ordered attempts for a target.
 * Matching entries are sorted most-specific first; their attempt lists are concatenated
 * (so less specific entries act as safety-net fallbacks), de-duplicated by launch signature
 * (action, component, and extras), filtered by API bounds and dev-options state;
 * `lastResort` attempts are moved to the end.
 */
export function selectOpeners(
  ctx: DeviceContext,
  target: OpenTarget = 'developerOptions',
  table: OpenerEntry[] = OPENER_TABLE,
): OpenerPlan {
  const ranked = table
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entryMatches(entry, ctx) && entry.targets[target]?.length)
    .sort((a, b) => specificity(b.entry) - specificity(a.entry) || a.index - b.index);

  const seen = new Set<string>();
  const merged: OpenAttempt[] = [];
  for (const { entry } of ranked) {
    for (const a of entry.targets[target] ?? []) {
      const sig = attemptSignature(a);
      if (seen.has(sig)) continue;
      seen.add(sig);
      if (attemptApiOk(a, ctx) && conditionHolds(a.requires, ctx)) merged.push(a);
    }
  }
  // Stable partition: "always works" attempts go last so they never shadow specific ones.
  const attempts = [...merged.filter((a) => !a.lastResort), ...merged.filter((a) => a.lastResort)];
  return { target, entryIds: ranked.map((r) => r.entry.id), attempts };
}
