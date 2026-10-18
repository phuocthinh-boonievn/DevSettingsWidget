import { requireOptionalNativeModule } from 'expo';

/** Native helpers (Android only). `null` on iOS, web, Expo Go and in Jest. */
export interface DevSettingsLauncherNative {
  isDevelopmentSettingsEnabled(): boolean | null;
  tryStartAttempt(attemptJson: string): boolean;
  runPlan(planJson: string): string | null;
}

export default requireOptionalNativeModule<DevSettingsLauncherNative>('DevSettingsLauncher');
