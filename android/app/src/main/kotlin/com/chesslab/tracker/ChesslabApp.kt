package com.chesslab.tracker

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.util.Log
import com.chesslab.tracker.service.NOTIFICATION_CHANNEL_ID
import org.opencv.android.OpenCVLoader

private const val TAG = "chesslabApp"

/**
 * Process-wide setup, and nothing else.
 *
 * OpenCV is loaded HERE rather than lazily on the analyzer thread: `initLocal` maps the native
 * library, and a first `Mat` touched before that fails with an `UnsatisfiedLinkError` deep inside
 * a warp, where it reads as a geometry bug. Failing at process start is the loud version.
 */
class ChesslabApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (!OpenCVLoader.initLocal()) Log.e(TAG, "OpenCV native load FAILED — warps and ArUco will not work")
        val channel =
            NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                getString(R.string.notif_channel),
                // LOW: the tracker notification is a persistent status line, not an alert. The
                // alarm reaches the user through the UI, which is where they are looking.
                NotificationManager.IMPORTANCE_LOW,
            )
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}
