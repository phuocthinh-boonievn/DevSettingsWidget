import SwiftUI
import WidgetKit

// iOS has NO public URL for Settings → Privacy & Security → Developer Mode.
// A widget can only open its host app (widgetURL / Link). The host app then runs the
// shared opener plan (src/platform/openers.ts, "ios-default"), i.e. Linking.openSettings().
// Private `App-Prefs:` URLs are intentionally NOT used (see README, "iOS limitations").
//
// TODO(ios): if Apple ever ships a public Developer Mode URL or an OpenURLIntent-capable
// AppIntent for it, open it directly from here (iOS 17+ AppIntent button) instead of the app.

private let openURL = URL(string: "devsettings:///?open=developerOptions")!

struct Entry: TimelineEntry {
  let date: Date
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: .now) }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(Entry(date: .now)) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    completion(Timeline(entries: [Entry(date: .now)], policy: .never))
  }
}

struct DevSettingsWidgetView: View {
  var entry: Entry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Image(systemName: "hammer.fill")
        .font(.title2)
        .foregroundStyle(Color.accentColor)
      Text("Developer Mode")
        .font(.headline)
      Text("Opens Settings")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
    .widgetURL(openURL)
  }
}

struct DevSettingsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "DevSettingsWidget", provider: Provider()) { entry in
      DevSettingsWidgetView(entry: entry)
    }
    .configurationDisplayName("DevSettings")
    .description("Open Settings to reach Developer Mode.")
    .supportedFamilies([.systemSmall])
  }
}
