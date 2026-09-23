package com.chesslab.tracker

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.system.Os
import android.util.Log
import com.chesslab.tracker.runtime.AppPaths
import com.chesslab.tracker.service.NOTIFICATION_CHANNEL_ID
import com.chesslab.tracker.sync.scheduleSync
import com.chesslab.tracker.sync.sweepEmptyRecordings
import org.opencv.android.OpenCVLoader
import java.io.File

private const val TAG = "chesslabApp"

/** The Hexagon-side half of the QNN HTP backend for this SoC. Loaded BY THE DSP, not by us. */
private const val HTP_SKEL = "libQnnHtpV75Skel.so"

/** fastRPC's skeleton search path, semicolon-separated. Ours is prepended at runtime: only the app
 *  knows its own `nativeLibraryDir`. */
private val VENDOR_SKEL_PATHS = listOf("/vendor/lib/rfsa/adsp", "/vendor/dsp/cdsp", "/dsp")

/** OpenCV loads HERE, not lazily: a `Mat` touched before `initLocal` throws `UnsatisfiedLinkError`
 *  deep inside a warp, where it reads as a geometry bug. */
class ChesslabApp : Application() {
    override fun onCreate() {
        super.onCreate()
        pointFastRpcAtOurSkels()
        if (!OpenCVLoader.initLocal()) Log.e(TAG, "OpenCV native load FAILED — warps and ArUco will not work")
        val channel =
            NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                getString(R.string.notif_channel),
                NotificationManager.IMPORTANCE_LOW,
            )
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        // Idempotent (KEEP), so it simply runs at every start: the periodic transfer must survive a
        // reboot, and nothing else in the process is guaranteed to be created after one.
        scheduleSync(this)
        sweepEmptySessions()
    }

    /** Off the main thread: it walks the sessions tree. No race with a live recorder — the sweep skips
     *  anything modified within the settle window. */
    private fun sweepEmptySessions() {
        Thread {
            val swept = sweepEmptyRecordings(AppPaths(filesDir).sessions, System.currentTimeMillis())
            if (swept.isNotEmpty()) Log.i(TAG, "removed ${swept.size} moveless session(s): ${swept.joinToString()}")
        }.apply { name = "chesslabJanitor" }.start()
    }

    /** fastRPC ignores `nativeLibraryDir`: without `ADSP_LIBRARY_PATH` it misses our HTP skel, QNN claims no
     *  node and the graph runs SILENTLY on the CPU (the 166 ms once read as a model problem). Needs
     *  `useLegacyPackaging = true`: fastRPC opens a real file, not a compressed APK entry. */
    private fun pointFastRpcAtOurSkels() {
        val ours = applicationInfo.nativeLibraryDir
        val path = (listOf(ours) + VENDOR_SKEL_PATHS).joinToString(";")
        runCatching { Os.setenv("ADSP_LIBRARY_PATH", path, true) }
            .onFailure { Log.e(TAG, "could not set ADSP_LIBRARY_PATH — the NPU will fall back to the CPU", it) }
            .onSuccess { Log.i(TAG, "ADSP_LIBRARY_PATH=$path") }
        // Loud, because a missing skel is the one way this can be correct and still not work.
        if (!File(ours, HTP_SKEL).exists()) Log.w(TAG, "$HTP_SKEL is not in $ours — QNN cannot reach the DSP")
    }
}
