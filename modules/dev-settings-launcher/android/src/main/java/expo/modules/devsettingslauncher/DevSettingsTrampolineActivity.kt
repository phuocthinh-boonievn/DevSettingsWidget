package expo.modules.devsettingslauncher

import android.app.Activity
import android.os.Bundle
import android.widget.Toast

/**
 * Invisible activity started by the widget tap (devsettingswidget://open?target=...&plan=<json>).
 * Runs the plan natively and finishes; shows the attempt's hint as a Toast (e.g. "tap Build number 7x").
 */
class DevSettingsTrampolineActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val plan = intent?.data?.getQueryParameter("plan")
    val opened = AttemptRunner.run(this, plan)
    val hint = opened?.optString("hint")?.ifEmpty { null }
    when {
      opened == null -> Toast.makeText(this, "Could not open Settings on this device.", Toast.LENGTH_LONG).show()
      hint != null -> Toast.makeText(applicationContext, hint, Toast.LENGTH_LONG).show()
    }
    finish()
    overridePendingTransition(0, 0)
  }
}
