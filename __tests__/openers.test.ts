import { buildWidgetUri, runPlan, serializeAndroidPlan, type OpenDeps } from '../src/platform/execute';
import {
  DEV_OPTIONS_ACTION,
  OPENER_TABLE,
  entryMatches,
  selectOpeners,
  specificity,
} from '../src/platform/openers';
import type { DeviceContext, OpenerEntry } from '../src/platform/types';

const ctx = (over: Partial<DeviceContext>): DeviceContext => ({
  platform: 'android',
  manufacturer: null,
  brand: null,
  apiLevel: 36,
  devOptionsEnabled: null,
  ...over,
});

const ids = (c: DeviceContext, target: Parameters<typeof selectOpeners>[1] = 'developerOptions') =>
  selectOpeners(c, target).attempts.map((a) => a.id);

describe('selectOpeners — Samsung S26 Ultra (Android 16 / API 36)', () => {
  const s26 = { manufacturer: 'samsung', brand: 'samsung', apiLevel: 36 };

  it('dev options ON: public intent first, then Samsung component, Settings last', () => {
    expect(ids(ctx({ ...s26, devOptionsEnabled: true }))).toEqual([
      'android.devOptions.action',
      'samsung.devOptions.component',
      'samsung.deviceInfo',
      'android.settings',
      'default.appSettings',
    ]);
  });

  it('dev options OFF: skips dev-options intents, goes to Software information / About phone with hint', () => {
    const plan = selectOpeners(ctx({ ...s26, devOptionsEnabled: false }));
    expect(plan.attempts.map((a) => a.id)).toEqual([
      'samsung.softwareInfo',
      'samsung.deviceInfo',
      'android.settings',
      'default.appSettings',
    ]);
    expect(plan.attempts[0]?.hint).toMatch(/Build number/);
  });

  it('dev options UNKNOWN (no native module): keeps the full chain', () => {
    expect(ids(ctx({ ...s26, devOptionsEnabled: null }))).toEqual([
      'android.devOptions.action',
      'samsung.devOptions.component',
      'samsung.softwareInfo',
      'samsung.deviceInfo',
      'android.settings',
      'default.appSettings',
    ]);
  });

  it('Samsung entry wins and generic entries follow as fallbacks', () => {
    const plan = selectOpeners(ctx({ ...s26 }));
    expect(plan.entryIds[0]).toBe('android-samsung-oneui');
    expect(plan.entryIds).toContain('android-default');
    expect(plan.entryIds.at(-1)).toBe('default');
  });

  it('matches OEM case-insensitively and via brand', () => {
    expect(selectOpeners(ctx({ manufacturer: 'SAMSUNG' })).entryIds[0]).toBe('android-samsung-oneui');
    expect(selectOpeners(ctx({ manufacturer: null, brand: 'Samsung' })).entryIds[0]).toBe('android-samsung-oneui');
  });

  it('wireless debugging: QS-tile deep link, then dev options chain', () => {
    expect(ids(ctx({ ...s26, devOptionsEnabled: true }), 'wirelessDebugging')).toEqual([
      'android.wirelessDebugging.qsTile',
      'android.devOptions.action',
      'android.devOptions.dashboardComponent',
      'android.deviceInfo',
      'android.settings',
      'default.appSettings',
    ]);
  });
});

describe('selectOpeners — generic Android', () => {
  it('Pixel / API 35 uses android-default', () => {
    const plan = selectOpeners(ctx({ manufacturer: 'Google', apiLevel: 35, devOptionsEnabled: true }));
    expect(plan.entryIds[0]).toBe('android-default');
    expect(plan.attempts.map((a) => a.id)).toEqual([
      'android.devOptions.action',
      'android.devOptions.dashboardComponent',
      'android.deviceInfo',
      'android.settings',
      'default.appSettings',
    ]);
  });

  it('unknown OEM behaves like generic Android', () => {
    expect(ids(ctx({ manufacturer: 'NoNameCorp', apiLevel: 33 }))).toEqual(
      ids(ctx({ manufacturer: 'Google', apiLevel: 33 })),
    );
  });

  it('unknown API level: bounded entries do not match, attempts are not API-filtered', () => {
    const plan = selectOpeners(ctx({ manufacturer: 'samsung', apiLevel: null }));
    expect(plan.entryIds).not.toContain('android-samsung-oneui');
    expect(plan.entryIds[0]).toBe('android-default');
    expect(plan.attempts.map((a) => a.id)).toContain('android.devOptions.dashboardComponent');
  });

  it('Xiaomi gets its own hint', () => {
    const plan = selectOpeners(ctx({ manufacturer: 'Xiaomi', devOptionsEnabled: false }));
    expect(plan.attempts[0]?.id).toBe('xiaomi.deviceInfo');
    expect(plan.attempts[0]?.hint).toMatch(/OS version/);
  });
});

describe('selectOpeners — old Android', () => {
  it('API 23 (Marshmallow) uses legacy component, drops Oreo+ component', () => {
    const list = ids(ctx({ manufacturer: 'motorola', apiLevel: 23, devOptionsEnabled: true }));
    expect(list).toEqual([
      'android.devOptions.action',
      'android.devOptions.legacyComponent',
      'android.deviceInfo',
      'android.settings',
      'default.appSettings',
    ]);
  });

  it('old Samsung (API 23) falls to legacy entry, not the One UI entry (minApi 26)', () => {
    const plan = selectOpeners(ctx({ manufacturer: 'samsung', apiLevel: 23 }));
    expect(plan.entryIds[0]).toBe('android-legacy');
  });

  it('wireless debugging on API 29: no QS-tile attempt, falls back to dev options', () => {
    expect(ids(ctx({ apiLevel: 29, devOptionsEnabled: true }), 'wirelessDebugging')[0]).toBe('android.devOptions.action');
  });
});

describe('selectOpeners — iOS and unknown platforms', () => {
  it('iOS: app settings only, no private App-Prefs URL', () => {
    const plan = selectOpeners({ platform: 'ios', manufacturer: 'Apple', brand: 'Apple', apiLevel: null, devOptionsEnabled: null });
    expect(plan.entryIds[0]).toBe('ios-default');
    expect(plan.attempts.map((a) => a.id)).toEqual(['ios.appSettings']);
    expect(plan.attempts.some((a) => a.kind === 'url' && a.url.startsWith('App-Prefs'))).toBe(false);
    expect(plan.attempts[0]?.hint).toMatch(/Developer Mode/);
  });

  it('unknown platform gets the default entry', () => {
    const plan = selectOpeners({ platform: 'windows', manufacturer: null, apiLevel: null, devOptionsEnabled: null });
    expect(plan.entryIds).toEqual(['default']);
    expect(plan.attempts.map((a) => a.id)).toEqual(['default.appSettings']);
  });

  it('web gets the default entry', () => {
    expect(selectOpeners({ platform: 'web', manufacturer: null, apiLevel: null, devOptionsEnabled: null }).entryIds).toEqual(['default']);
  });
});

describe('table extension ("one entry" to add a device)', () => {
  it('a new OEM entry takes priority without touching other entries', () => {
    const pixelEntry: OpenerEntry = {
      id: 'android-pixel',
      description: 'test',
      match: { platform: 'android', oem: ['google'] },
      targets: { developerOptions: [{ ...DEV_OPTIONS_ACTION, id: 'pixel.custom' }] },
    };
    const plan = selectOpeners(ctx({ manufacturer: 'Google' }), 'developerOptions', [pixelEntry, ...OPENER_TABLE]);
    expect(plan.entryIds[0]).toBe('android-pixel');
    // Same intent as DEV_OPTIONS_ACTION -> de-duplicated by signature, the specific one wins.
    expect(plan.attempts.map((a) => a.id)).toEqual([
      'pixel.custom',
      'android.devOptions.dashboardComponent',
      'android.deviceInfo',
      'android.settings',
      'default.appSettings',
    ]);
  });

  it('specificity: OEM > API range > platform > wildcard', () => {
    const e = (match: OpenerEntry['match']): OpenerEntry => ({ id: 'x', description: '', match, targets: {} });
    expect(specificity(e({ platform: 'android', oem: ['a'] }))).toBeGreaterThan(specificity(e({ platform: 'android', minApi: 1 })));
    expect(specificity(e({ platform: 'android', minApi: 1 }))).toBeGreaterThan(specificity(e({ platform: 'android' })));
    expect(specificity(e({ platform: 'android' }))).toBeGreaterThan(specificity(e({})));
  });

  it('every table entry has an id, unique', () => {
    const all = OPENER_TABLE.map((t) => t.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('entryMatches respects maxApi', () => {
    const legacy = OPENER_TABLE.find((t) => t.id === 'android-legacy')!;
    expect(entryMatches(legacy, ctx({ apiLevel: 25 }))).toBe(true);
    expect(entryMatches(legacy, ctx({ apiLevel: 26 }))).toBe(false);
  });
});

describe('runPlan / serialization', () => {
  const s26On = ctx({ manufacturer: 'samsung', apiLevel: 36, devOptionsEnabled: true });

  it('stops at the first attempt that opens and returns its hint', async () => {
    const tried: string[] = [];
    const deps: OpenDeps = {
      startAndroidIntent: async (a) => {
        tried.push(a.id);
        return a.id === 'samsung.deviceInfo';
      },
      openUrl: async () => false,
      openAppSettings: async () => false,
    };
    const res = await runPlan(selectOpeners(s26On), deps);
    expect(res.opened?.id).toBe('samsung.deviceInfo');
    expect(res.tried).toEqual(['android.devOptions.action', 'samsung.devOptions.component', 'samsung.deviceInfo']);
    expect(res.hint).toMatch(/Build number/);
  });

  it('treats thrown errors as failure and reports when nothing opened', async () => {
    const deps: OpenDeps = {
      startAndroidIntent: async () => {
        throw new Error('ActivityNotFound');
      },
      openUrl: async () => false,
      openAppSettings: async () => false,
    };
    const res = await runPlan(selectOpeners(s26On), deps);
    expect(res.opened).toBeNull();
    expect(res.hint).toBeDefined();
  });

  it('widget URI carries only Android intents and round-trips', () => {
    const plan = selectOpeners(s26On);
    const uri = buildWidgetUri(plan);
    expect(uri.startsWith('devsettingswidget://open?target=developerOptions&plan=')).toBe(true);
    const json = JSON.parse(decodeURIComponent(uri.split('&plan=')[1]!));
    expect(json.map((a: { id: string }) => a.id)).toEqual([
      'android.devOptions.action',
      'samsung.devOptions.component',
      'samsung.deviceInfo',
      'android.settings',
    ]);
    expect(JSON.parse(serializeAndroidPlan(plan))).toEqual(json);
  });
});
