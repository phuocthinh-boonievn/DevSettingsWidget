/**
 * Shared types for the "open a settings page" strategy layer.
 *
 * Everything in this file is platform-agnostic and pure, so the selection logic
 * can be unit-tested in Node without a device.
 */

/** What the user wants to open. Add new targets here (e.g. 'usbDebugging'). */
export type OpenTarget = 'developerOptions' | 'wirelessDebugging';

/** Runtime facts about the device that influence which opener to use. */
export interface DeviceContext {
  /** `Platform.OS`: 'android' | 'ios' | 'web' | anything else. */
  platform: string;
  /** `Build.MANUFACTURER` (via expo-device). Matched case-insensitively. */
  manufacturer: string | null;
  /** `Build.BRAND` (via expo-device). Used as a secondary OEM signal. */
  brand?: string | null;
  /** Android API level (`Build.VERSION.SDK_INT`). null on iOS/web/unknown. */
  apiLevel: number | null;
  /**
   * `Settings.Global.DEVELOPMENT_SETTINGS_ENABLED`.
   * true/false when readable (native module present), null when unknown.
   */
  devOptionsEnabled: boolean | null;
}

/** Conditions evaluated at selection time (and again natively at tap time). */
export type AttemptCondition = 'devOptionsEnabled' | 'devOptionsDisabled';

interface AttemptBase {
  /** Stable id, used for de-duplication and logging. */
  id: string;
  /** Human label shown in the in-app debug list. */
  label: string;
  /** Hint shown to the user if this attempt is the one that opened. */
  hint?: string;
  /** Skip this attempt unless the condition holds (unknown state = keep). */
  requires?: AttemptCondition;
  /** Attempt-level API bounds (inclusive). Entry-level bounds also exist. */
  minApi?: number;
  maxApi?: number;
  /** Marks shaky/undocumented intents so the UI can label them. */
  bestEffort?: boolean;
  /** Always succeeds (e.g. Settings root): moved to the end of the merged plan. */
  lastResort?: boolean;
}

/** An explicit `ComponentName` passed as a Parcelable extra (e.g. QS tile prefs). */
export interface ComponentExtra {
  key: string;
  packageName: string;
  className: string;
}

/**
 * Extras copied onto the Intent.
 * `bundles` values become nested string-only Bundles (Settings highlight args).
 */
export interface IntentExtras {
  strings?: Record<string, string>;
  bundles?: Record<string, Record<string, string>>;
}

/** Android `startActivity(Intent(action).setComponent(...))`. */
export interface AndroidIntentAttempt extends AttemptBase {
  kind: 'androidIntent';
  action: string;
  packageName?: string;
  className?: string;
  componentExtra?: ComponentExtra;
  extras?: IntentExtras;
}

/** Open a URL with `Linking.openURL` (iOS `app-settings:`, etc.). */
export interface UrlAttempt extends AttemptBase {
  kind: 'url';
  url: string;
}

/** `Linking.openSettings()` — this app's page in the system Settings app. */
export interface AppSettingsAttempt extends AttemptBase {
  kind: 'appSettings';
}

export type OpenAttempt = AndroidIntentAttempt | UrlAttempt | AppSettingsAttempt;

/** Which devices an entry applies to. Omitted fields are wildcards. */
export interface EntryMatch {
  /** 'android' | 'ios' | ... ; '*' or omitted = any platform. */
  platform?: string;
  /** Lower-case manufacturer/brand names, e.g. ['samsung']. */
  oem?: string[];
  /** Inclusive API-level range. An entry with a bound never matches an unknown api level. */
  minApi?: number;
  maxApi?: number;
}

/** One row of the strategy table. */
export interface OpenerEntry {
  id: string;
  description: string;
  match: EntryMatch;
  /** Ordered attempts per target. A missing target falls through to less specific entries. */
  targets: Partial<Record<OpenTarget, OpenAttempt[]>>;
}

/** Result of `selectOpeners`. */
export interface OpenerPlan {
  target: OpenTarget;
  /** Entry ids that contributed, most specific first. */
  entryIds: string[];
  /** Ordered, de-duplicated, condition-filtered attempts. */
  attempts: OpenAttempt[];
}
