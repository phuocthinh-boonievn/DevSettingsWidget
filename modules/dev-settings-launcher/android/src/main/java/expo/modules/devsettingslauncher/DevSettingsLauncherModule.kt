package expo.modules.devsettingslauncher

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class DevSettingsLauncherModule : Module() {
  private val context
    get() = appContext.currentActivity ?: appContext.reactContext
      ?: throw IllegalStateException("No Android context")

  override fun definition() = ModuleDefinition {
    Name("DevSettingsLauncher")

    /** Settings.Global.DEVELOPMENT_SETTINGS_ENABLED (true/false), null if unreadable. */
    Function("isDevelopmentSettingsEnabled") {
      AttemptRunner.isDevOptionsEnabled(context)
    }

    /** Try a single attempt (JSON). Returns true if an activity started. */
    Function("tryStartAttempt") { attemptJson: String ->
      AttemptRunner.tryStart(context, JSONObject(attemptJson))
    }

    /** Run an ordered plan (JSON array). Returns the id of the attempt that opened, or null. */
    Function("runPlan") { planJson: String ->
      AttemptRunner.run(context, planJson)?.optString("id")
    }
  }
}
