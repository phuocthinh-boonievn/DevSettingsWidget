import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { buildWidgetUri } from '../platform/execute';
import { selectOpeners } from '../platform/openers';
import type { DeviceContext } from '../platform/types';

export const WIDGET_NAME = 'DevSettings';

interface Props {
  ctx: DeviceContext;
  dark?: boolean;
  /** Widget height in dp; the wireless row is hidden on 1-row widgets. */
  height?: number;
}

/**
 * Home-screen widget. Each tap uses OPEN_URI -> devsettingswidget://open?plan=...
 * which the native trampoline turns into the real Settings intent (no app launch).
 */
export function DevSettingsWidget({ ctx, dark = false, height = 110 }: Props) {
  const devUri = buildWidgetUri(selectOpeners(ctx, 'developerOptions'));
  const wifiUri = buildWidgetUri(selectOpeners(ctx, 'wirelessDebugging'));
  const showWireless = (ctx.apiLevel ?? 0) >= 30 && height >= 100;
  const bg = dark ? '#1C1F24' : '#FFFFFF';
  const fg = dark ? '#F2F4F7' : '#101418';
  const sub = dark ? '#9AA4B2' : '#5B6573';
  const accent = '#2F7DF6';
  const status =
    ctx.devOptionsEnabled === null ? 'Tap to open' : ctx.devOptionsEnabled ? 'Enabled · tap to open' : 'Off · tap to enable';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: bg,
        borderRadius: 24,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: devUri }}
      accessibilityLabel="Open Developer options"
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: accent, justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget text="{ }" style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10 }}>
          <TextWidget text="Developer options" style={{ fontSize: 15, color: fg, fontWeight: 'bold' }} maxLines={1} truncate="END" />
          <TextWidget text={status} style={{ fontSize: 12, color: sub }} maxLines={1} truncate="END" />
        </FlexWidget>
      </FlexWidget>
      {showWireless ? (
        <FlexWidget
          style={{
            marginTop: 10,
            width: 'match_parent',
            backgroundColor: dark ? '#2A2F36' : '#EEF3FB',
            borderRadius: 14,
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: wifiUri }}
          accessibilityLabel="Open Wireless debugging"
        >
          <TextWidget text="Wireless debugging (beta)" style={{ fontSize: 12, color: accent, fontWeight: '600' }} maxLines={1} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
