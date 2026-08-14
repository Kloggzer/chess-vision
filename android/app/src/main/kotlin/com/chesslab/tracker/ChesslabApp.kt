package com.chesslab.tracker

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.system.Os
import android.util.Log
import com.chesslab.tracker.service.NOTIFICATION_CHANNEL_ID
import com.chesslab.tracker.sync.scheduleSync
import com.chesslab.tracker.sync.sweepEmptyRecordings
import org.opencv.android.OpenCVLoader
import java.io.File

private const val TAG = "chesslabApp"

/** The Hexagon-side half of the QNN HTP backend for this SoC. Loaded BY THE DSP, not by us. */
private const val HTP_SKEL = "libQnnHtpV75Skel.so"

/**
 * Where fastRPC looks for DSP-side skeleton libraries, semicolon-separated.
 *
 * The vendor paths are the stock ones; ours is prepended at runtime because only the app knows
 * its own `nativeLibraryDir`.
 */
private val VENDOR_SKEL_PATHS = listOf("/vendor/lib/rfsa/adsp", "/vendor/dsp/cdsp", "/dsp")

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
        pointFastRpcAtOurSkels()
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
        // Idempotent (KEEP), so it simply runs at every start: the periodic transfer must survive a
        // reboot, and nothing else in the process is guaranteed to be created after one.
        scheduleSync(this)
        sweepEmptySessions()
    }

    /**
     * Remove zero-commit session leftovers — killed processes and pre-2026-08-14 builds; a live
     * recorder cannot be racing this, because the service starts long after `onCreate` and the
     * sweep skips anything modified within the settle window anyway. Off the main thread: it
     * walks the sessions tree, and process start is the one moment jank is guaranteed visible.
     */
    private fun sweepEmptySessions() {
        Thread {
            val swept = sweepEmptyRecordings(File(filesDir, "sessions"), System.currentTimeMillis())
            if (swept.isNotEmpty()) Log.i(TAG, "removed ${swept.size} moveless session(s): ${swept.joinToString()}")
        }.apply { name = "chesslabJanitor" }.start()
    }

    /**
     * Tell fastRPC where OUR Hexagon skeleton lives, before anything can load `libQnnHtp.so`.
     *
     * This is the step that was missing, and its absence is why the NPU looked unreachable. QNN
     * has two halves: `libQnnHtpV75Stub.so` runs on the CPU (the linker finds it, we declare
     * `libcdsprpc.so` in the manifest for it) and `libQnnHtpV75Skel.so` has to be loaded ON THE
     * DSP by fastRPC. fastRPC does not know about `nativeLibraryDir`; with `ADSP_LIBRARY_PATH`
     * unset it searches the vendor defaults only, hits `/vendor/dsp` — which this ROM does not
     * let an app read — and reports `open_shell failed for domain 3 … Permission denied`. That
     * error names a path we never needed: the skel it should have opened is in our own APK.
     *
     * The failure is SILENT in the way that matters. `QnnDevice_create` fails inside
     * `GetCapability`, QNN then claims no node, and the quantized graph runs on the CPU while the
     * session looks healthy — which is exactly the 166 ms we measured and read as a model problem.
     * `OnnxSquareClassifier.verify()` is what catches that, and it stays.
     *
     * Requires `useLegacyPackaging = true` (already set for Stockfish): fastRPC opens a real file
     * and cannot read a skel out of a compressed APK.
     */
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
