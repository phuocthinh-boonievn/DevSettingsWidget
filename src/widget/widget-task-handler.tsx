import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { getDeviceContext } from '../platform/device';
import type { DeviceContext } from '../platform/types';
import { DevSettingsWidget, WIDGET_NAME } from './DevSettingsWidget';

function safeContext(): DeviceContext {
  try {
    return getDeviceContext();
  } catch {
    // Native plan in the trampoline still re-checks dev-options state at tap time.
    return { platform: 'android', manufacturer: null, brand: null, apiLevel: null, devOptionsEnabled: null };
  }
}

function render(height?: number) {
  const ctx = safeContext();
  return {
    light: <DevSettingsWidget ctx={ctx} height={height} />,
    dark: <DevSettingsWidget ctx={ctx} height={height} dark />,
  };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK': // OPEN_URI is handled natively; re-render to refresh the status line.
      props.renderWidget(render(props.widgetInfo.height));
      break;
    default:
      break;
  }
}

/** Refresh all placed widgets (e.g. after the user enabled developer options). */
export function refreshWidgets() {
  return requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info) => render(info.height),
  });
}
