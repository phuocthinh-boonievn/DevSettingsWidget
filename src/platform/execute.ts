/**
 * Runs an OpenerPlan with injectable side-effect functions (so it is unit-testable).
 */
import type { AndroidIntentAttempt, OpenAttempt, OpenerPlan } from './types';

export interface OpenDeps {
  /** Start an Android intent. Resolve true if an activity started. */
  startAndroidIntent(a: AndroidIntentAttempt): Promise<boolean>;
  openUrl(url: string): Promise<boolean>;
  openAppSettings(): Promise<boolean>;
}

export interface OpenResult {
  opened: OpenAttempt | null;
  /** Ids attempted, in order (including the one that opened). */
  tried: string[];
  hint?: string;
}

export async function runPlan(plan: OpenerPlan, deps: OpenDeps): Promise<OpenResult> {
  const tried: string[] = [];
  for (const a of plan.attempts) {
    tried.push(a.id);
    let ok = false;
    try {
      switch (a.kind) {
        case 'androidIntent':
          ok = await deps.startAndroidIntent(a);
          break;
        case 'url':
          ok = await deps.openUrl(a.url);
          break;
        case 'appSettings':
          ok = await deps.openAppSettings();
          break;
      }
    } catch {
      ok = false;
    }
    if (ok) return { opened: a, tried, hint: a.hint };
  }
  return {
    opened: null,
    tried,
    hint: 'Could not open Settings on this device. Open Settings manually and look for Developer options.',
  };
}

/** Compact JSON for the native runner / widget URI (Android intents only). */
export function serializeAndroidPlan(plan: OpenerPlan): string {
  const compact = plan.attempts
    .filter((a): a is AndroidIntentAttempt => a.kind === 'androidIntent')
    .map(({ kind, id, action, packageName, className, componentExtra, extras, requires, minApi, maxApi, hint }) => ({
      kind,
      id,
      action,
      packageName,
      className,
      componentExtra,
      extras,
      requires,
      minApi,
      maxApi,
      hint,
    }));
  return JSON.stringify(compact);
}

export const WIDGET_URI_SCHEME = 'devsettingswidget';

/** URI handled by the native DevSettingsTrampolineActivity (see modules/dev-settings-launcher). */
export function buildWidgetUri(plan: OpenerPlan): string {
  return `${WIDGET_URI_SCHEME}://open?target=${plan.target}&plan=${encodeURIComponent(serializeAndroidPlan(plan))}`;
}
