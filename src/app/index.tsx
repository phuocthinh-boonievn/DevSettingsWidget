import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDeviceContext, openTarget } from '../platform/device';
import { selectOpeners } from '../platform/openers';
import type { DeviceContext, OpenTarget } from '../platform/types';

const isOpenTarget = (v: unknown): v is OpenTarget => v === 'developerOptions' || v === 'wirelessDebugging';

export default function Home() {
  const dark = useColorScheme() === 'dark';
  const c = dark ? palette.dark : palette.light;
  const params = useLocalSearchParams<{ open?: string }>();
  const [ctx, setCtx] = useState<DeviceContext>(() => getDeviceContext());
  const [message, setMessage] = useState<string | null>(null);
  const autoFired = useRef(false);

  const refresh = useCallback(() => {
    setCtx(getDeviceContext());
    if (Platform.OS === 'android') {
      // Keep the widget's "Enabled / Off" line in sync after the user toggles things.
      import('../widget/widget-task-handler').then((m) => m.refreshWidgets()).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const open = useCallback(async (target: OpenTarget) => {
    const res = await openTarget(target);
    setMessage(res.hint ?? (res.opened ? null : 'Nothing could be opened.'));
  }, []);

  // Deep link: devsettings://?open=developerOptions (used by the iOS widget / shortcuts).
  useEffect(() => {
    if (!autoFired.current && isOpenTarget(params.open)) {
      autoFired.current = true;
      void open(params.open);
    }
  }, [params.open, open]);

  const plan = useMemo(() => selectOpeners(ctx, 'developerOptions'), [ctx]);
  const canPinWidget = Platform.OS === 'android' && (ctx.apiLevel ?? 0) >= 26;
  const devState =
    ctx.devOptionsEnabled === null ? 'Unknown' : ctx.devOptionsEnabled ? 'Enabled' : 'Off — tap the button, then Build number ×7';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.fg }]}>DevSettings Widget</Text>
        <Text style={[styles.sub, { color: c.sub }]}>
          {ctx.manufacturer ?? 'Unknown'} · {Platform.OS} {ctx.apiLevel ? `API ${ctx.apiLevel}` : ''}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => open('developerOptions')}
          style={({ pressed }) => [styles.bigButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.bigButtonText}>
            {Platform.OS === 'ios' ? 'Open Settings' : 'Open Developer options'}
          </Text>
        </Pressable>

        {message ? (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.hint, { color: c.fg }]}>{message}</Text>
          </View>
        ) : null}

        {Platform.OS === 'android' ? (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Row label="Developer options" value={devState} c={c} />
            <Row label="Strategy" value={plan.entryIds[0] ?? '-'} c={c} />
          </View>
        ) : null}

        {Platform.OS === 'android' && (ctx.apiLevel ?? 0) >= 30 ? (
          <Pressable onPress={() => open('wirelessDebugging')} style={[styles.secondary, { borderColor: c.accent }]}>
            <Text style={[styles.secondaryText, { color: c.accent }]}>Wireless debugging (best effort)</Text>
          </Pressable>
        ) : null}

        {canPinWidget ? (
          <Pressable
            onPress={async () => {
              const { requestPinWidget } = await import('react-native-android-widget');
              const { WIDGET_NAME } = await import('../widget/DevSettingsWidget');
              const ok = await requestPinWidget({ widgetName: WIDGET_NAME }).catch(() => false);
              if (!ok) setMessage('Long-press the home screen → Widgets → DevSettings Widget.');
            }}
            style={[styles.secondary, { borderColor: c.accent }]}
          >
            <Text style={[styles.secondaryText, { color: c.accent }]}>Add widget to home screen</Text>
          </Pressable>
        ) : null}

        {Platform.OS === 'ios' ? (
          <Text style={[styles.note, { color: c.sub }]}>
            iOS has no public link to Developer Mode. This opens Settings; then go to Privacy & Security → Developer Mode.
          </Text>
        ) : null}

        <Text style={[styles.section, { color: c.sub }]}>Open chain on this device</Text>
        {plan.attempts.map((a, i) => (
          <Text key={a.id} style={[styles.attempt, { color: c.sub }]}>
            {i + 1}. {a.label}
            {a.bestEffort ? ' (best effort)' : ''}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, c }: { label: string; value: string; c: (typeof palette)['light'] }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.sub }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.fg }]}>{value}</Text>
    </View>
  );
}

const palette = {
  light: { bg: '#F5F7FA', fg: '#101418', sub: '#5B6573', card: '#FFFFFF', accent: '#2F7DF6' },
  dark: { bg: '#0F1115', fg: '#F2F4F7', sub: '#9AA4B2', card: '#1C1F24', accent: '#5B9BFF' },
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: -8 },
  bigButton: {
    backgroundColor: '#2F7DF6',
    borderRadius: 28,
    paddingVertical: 36,
    alignItems: 'center',
    marginTop: 8,
  },
  bigButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  card: { borderRadius: 16, padding: 16, gap: 10 },
  hint: { fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  secondary: { borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 19 },
  section: { fontSize: 13, fontWeight: '700', marginTop: 8, textTransform: 'uppercase' },
  attempt: { fontSize: 13 },
});
