import 'expo-router/entry';

import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // Headless JS task that renders the home-screen widget.
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/widget-task-handler') as typeof import('./src/widget/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
