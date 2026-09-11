package com.prime.devx.prime_signal_app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

/**
 * The in-app updater's Android half (lib/services/app_updater.dart is the
 * rest): this build's version, where to put a download, whether the phone
 * lets this app install packages, and the hand-off to the system installer.
 * Android always asks the player to confirm an install — nothing here can
 * skip that, and nothing tries to.
 */
class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "ariyan/updater")
            .setMethodCallHandler { call, result ->
                try {
                    when (call.method) {
                        "info" -> {
                            val info = packageManager.getPackageInfo(packageName, 0)
                            @Suppress("DEPRECATION")
                            val code = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
                            val dir = File(cacheDir, "updates").apply { mkdirs() }
                            result.success(
                                mapOf(
                                    "versionCode" to code,
                                    "versionName" to (info.versionName ?: ""),
                                    "downloadDir" to dir.absolutePath,
                                ),
                            )
                        }
                        "canInstall" -> result.success(
                            Build.VERSION.SDK_INT < 26 || packageManager.canRequestPackageInstalls(),
                        )
                        "openInstallSettings" -> {
                            startActivity(
                                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")),
                            )
                            result.success(null)
                        }
                        "install" -> {
                            val file = File(call.argument<String>("path")!!)
                            val uri = FileProvider.getUriForFile(this, "$packageName.updates", file)
                            @Suppress("DEPRECATION")
                            val intent = Intent(Intent.ACTION_INSTALL_PACKAGE)
                                .setDataAndType(uri, "application/vnd.android.package-archive")
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                            result.success(true)
                        }
                        else -> result.notImplemented()
                    }
                } catch (e: Exception) {
                    result.error("updater", e.message, null)
                }
            }
    }
}
