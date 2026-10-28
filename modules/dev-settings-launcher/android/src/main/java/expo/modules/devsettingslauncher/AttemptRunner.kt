package expo.modules.devsettingslauncher

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Executes an ordered list of "open attempts" (JSON produced by src/platform/openers.ts).
 * Shared by the JS module (in-app button) and the widget trampoline activity.
 */
object AttemptRunner {
  private const val TAG = "DevSettingsLauncher"

  /** Only Settings-ish targets may be launched (the trampoline is exported). */
  private val ALLOWED_ACTION_PREFIXES = listOf(
    "android.settings.",
    "com.android.settings.",
    "android.service.quicksettings.action.",
    "android.intent.action.MAIN",
  )
  private val ALLOWED_PACKAGE_PREFIXES = listOf(
    "com.android.settings",
    "com.samsung.android.",
    "com.sec.android.",
    "com.miui.",
    "com.xiaomi.",
    "com.coloros.",
    "com.oplus.",
    "com.oneplus.",
    "com.huawei.",
    "com.google.android.settings",
  )

  /** Row-highlight extras only. Anything else on a crafted plan is dropped. */
  private val ALLOWED_STRING_EXTRA_KEYS = setOf(":settings:fragment_args_key")
  private val ALLOWED_BUNDLE_EXTRA_KEYS = setOf(":settings:show_fragment_args")
  private const val MAX_EXTRA_VALUE_LEN = 128

  /** Built-in plan used when the widget URI carries none (mirrors android-default in openers.ts). */
  val DEFAULT_PLAN: String = """
    [
      {"kind":"androidIntent","id":"android.devOptions.action","action":"android.settings.APPLICATION_DEVELOPMENT_SETTINGS","requires":"devOptionsEnabled"},
      {"kind":"androidIntent","id":"android.devOptions.dashboardComponent","action":"android.intent.action.MAIN","packageName":"com.android.settings","className":"com.android.settings.Settings${'$'}DevelopmentSettingsDashboardActivity","requires":"devOptionsEnabled"},
      {"kind":"androidIntent","id":"android.deviceInfo","action":"android.settings.DEVICE_INFO_SETTINGS","hint":"Tap Build number 7 times","extras":{"strings":{":settings:fragment_args_key":"build_number"},"bundles":{":settings:show_fragment_args":{":settings:fragment_args_key":"build_number"}}}},
      {"kind":"androidIntent","id":"android.settings","action":"android.settings.SETTINGS"}
    ]
  """.trimIndent()

  /** Settings.Global.DEVELOPMENT_SETTINGS_ENABLED; null if unreadable. */
  fun isDevOptionsEnabled(context: Context): Boolean? = try {
    Settings.Global.getInt(context.contentResolver, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED) != 0
  } catch (e: Settings.SettingNotFoundException) {
    false // never toggled on this device = off
  } catch (e: Throwable) {
    null
  }

  private fun allowedPackage(pkg: String?) = pkg == null || ALLOWED_PACKAGE_PREFIXES.any { pkg.startsWith(it) }

  private fun conditionHolds(cond: String?, enabled: Boolean?): Boolean = when (cond) {
    null, "" -> true
    "devOptionsEnabled" -> enabled != false
    "devOptionsDisabled" -> enabled != true
    else -> true
  }

  private fun apiOk(a: JSONObject): Boolean {
    val api = Build.VERSION.SDK_INT
    if (a.has("minApi") && api < a.getInt("minApi")) return false
    if (a.has("maxApi") && api > a.getInt("maxApi")) return false
    return true
  }

  /** Build the Intent for one attempt, or null if it is not an allowed Android intent. */
  fun buildIntent(a: JSONObject): Intent? {
    if (a.optString("kind") != "androidIntent") return null
    val action = a.optString("action")
    if (action.isEmpty() || ALLOWED_ACTION_PREFIXES.none { action.startsWith(it) }) return null
    val intent = Intent(action)
    val pkg = a.optString("packageName").ifEmpty { null }
    val cls = a.optString("className").ifEmpty { null }
    if (cls != null) {
      if (pkg == null || !allowedPackage(pkg)) return null
      intent.component = ComponentName(pkg, cls)
    }
    a.optJSONObject("componentExtra")?.let { ce ->
      val cePkg = ce.optString("packageName")
      if (!allowedPackage(cePkg)) return null
      intent.putExtra(ce.optString("key"), ComponentName(cePkg, ce.optString("className")))
    }
    applyExtras(intent, a)
    return intent
  }

  private fun putAllowedStrings(target: (String, String) -> Unit, obj: JSONObject) {
    val keys = obj.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      if (key !in ALLOWED_STRING_EXTRA_KEYS) continue
      val value = obj.optString(key)
      if (value.isEmpty() || value.length > MAX_EXTRA_VALUE_LEN) continue
      target(key, value)
    }
  }

  /** Copy Settings highlight extras. Other keys are ignored. */
  private fun applyExtras(intent: Intent, a: JSONObject) {
    val extras = a.optJSONObject("extras") ?: return
    extras.optJSONObject("strings")?.let { strings ->
      putAllowedStrings({ key, value -> intent.putExtra(key, value) }, strings)
    }
    val bundles = extras.optJSONObject("bundles") ?: return
    val keys = bundles.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      if (key !in ALLOWED_BUNDLE_EXTRA_KEYS) continue
      val inner = bundles.optJSONObject(key) ?: continue
      val bundle = Bundle()
      putAllowedStrings({ innerKey, value -> bundle.putString(innerKey, value) }, inner)
      if (!bundle.isEmpty) intent.putExtra(key, bundle)
    }
  }

  /** Try one attempt. true = an activity was started. */
  fun tryStart(context: Context, a: JSONObject): Boolean {
    val intent = buildIntent(a) ?: return false
    if (context !is Activity) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return try {
      context.startActivity(intent)
      true
    } catch (e: ActivityNotFoundException) {
      Log.i(TAG, "No activity for ${a.optString("id")}")
      false
    } catch (e: SecurityException) {
      Log.i(TAG, "Not allowed: ${a.optString("id")}: ${e.message}")
      false
    } catch (e: Throwable) {
      Log.w(TAG, "Failed ${a.optString("id")}", e)
      false
    }
  }

  /**
   * Run attempts in order, re-checking conditions at launch time.
   * Returns the attempt that opened (JSON), or null if none did.
   */
  fun run(context: Context, planJson: String?): JSONObject? {
    val plan = try {
      JSONArray(if (planJson.isNullOrBlank()) DEFAULT_PLAN else planJson)
    } catch (e: Throwable) {
      JSONArray(DEFAULT_PLAN)
    }
    val enabled = isDevOptionsEnabled(context)
    for (i in 0 until plan.length()) {
      val a = plan.optJSONObject(i) ?: continue
      if (!apiOk(a) || !conditionHolds(a.optString("requires").ifEmpty { null }, enabled)) continue
      if (tryStart(context, a)) return a
    }
    return null
  }
}
