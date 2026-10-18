/** Runtime glue: builds DeviceContext and the real OpenDeps. Not imported by pure logic/tests. */
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

import DevSettingsLauncher from '../../modules/dev-settings-launcher';
import { runPlan, type OpenDeps, type OpenResult } from './execute';
import { selectOpeners } from './openers';
import type { AndroidIntentAttempt, DeviceContext, OpenerPlan, OpenTarget } from './types';

export function readDevOptionsEnabled(): boolean | null {
  if (Platform.OS !== 'android' || !DevSettingsLauncher) return null;
  try {
    return DevSettingsLauncher.isDevelopmentSettingsEnabled();
  } catch {
    return null;
  }
}

export function getDeviceContext(): DeviceContext {
  return {
    platform: Platform.OS,
    manufacturer: Device.manufacturer ?? null,
    brand: Device.brand ?? null,
    apiLevel: Device.platformApiLevel ?? null,
    devOptionsEnabled: readDevOptionsEnabled(),
  };
}

export function planFor(target: OpenTarget, ctx: DeviceContext = getDeviceContext()): OpenerPlan {
  return selectOpeners(ctx, target);
}

/**
 * Fallback when the local native module is missing: expo-intent-launcher.
 * Its promise resolves only when the user comes back, but rejects quickly when no activity
 * exists, so "no rejection within ~1.2 s" is treated as success.
 */
async function startViaIntentLauncher(a: AndroidIntentAttempt): Promise<boolean> {
  if (a.componentExtra) return false; // Parcelable extras unsupported there
  const launched = IntentLauncher.startActivityAsync(a.action, {
    packageName: a.packageName,
    className: a.className,
  }).then(
    () => true,
    () => false,
  );
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1200));
  return Promise.race([launched, timeout]);
}

export const realDeps: OpenDeps = {
  async startAndroidIntent(a) {
    if (Platform.OS !== 'android') return false;
    if (DevSettingsLauncher) return DevSettingsLauncher.tryStartAttempt(JSON.stringify(a));
    return startViaIntentLauncher(a);
  },
  async openUrl(url) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  },
  async openAppSettings() {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  },
};

export async function openTarget(target: OpenTarget): Promise<OpenResult & { plan: OpenerPlan }> {
  const plan = planFor(target);
  const result = await runPlan(plan, realDeps);
  return { ...result, plan };
}
