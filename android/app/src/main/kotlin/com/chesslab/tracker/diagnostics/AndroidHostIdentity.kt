package com.chesslab.tracker.diagnostics

import android.content.Context
import android.os.Build

fun androidHostIdentity(context: Context): HostIdentity =
    HostIdentity(
        version =
            runCatching {
                val info = context.packageManager.getPackageInfo(context.packageName, 0)
                AppVersion(info.versionName ?: "?", info.longVersionCode)
            }.getOrDefault(AppVersion("?", 0L)),
        device = "${Build.MANUFACTURER} ${Build.MODEL}",
        sdk = Build.VERSION.SDK_INT,
    )
