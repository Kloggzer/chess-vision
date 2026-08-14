package com.chesslab.tracker.sync

import android.content.Context
import android.os.Build
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

private const val PERIODIC = "chesslab-sync-periodic"
private const val ONCE = "chesslab-sync-now"
private const val EVERY_MINUTES = 15L
private const val PERCENT = 100L

/**
 * The transfer, as a job the system owns.
 *
 * A foreground coroutine would end with the screen, and the recording the user wants on the PC is
 * finished exactly when they put the phone down. WorkManager runs it when the constraints are met —
 * unmetered network, battery not low — and re-runs it after a reboot, which is what "automatically,
 * when I am on the same network" actually requires.
 *
 * Fifteen minutes is WorkManager's own floor for a periodic job. The end of a game triggers a
 * one-shot beside it ([syncNow]), so the periodic run is the SAFETY NET — the phone that was out of
 * Wi-Fi when the game ended, not the normal path.
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    // IO, explicitly: `CoroutineWorker` runs `doWork` on `Dispatchers.Default`, and the transfer is
    // blocking `HttpURLConnection` work that would otherwise sit on a CPU-sized thread pool.
    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            val settings = SyncHost.get(applicationContext)
            val prefs = settings.load()
            val run =
                SyncRun(
                    sessionsDir = sessionsDirOf(applicationContext),
                    gamesDir = gamesDirOf(applicationContext),
                    device = "${Build.MANUFACTURER} ${Build.MODEL}".trim(),
                    clientFor = { token -> HttpIngestClient(token) },
                    ownAddress = { lanAddressOf(applicationContext) },
                )
            val report =
                run.run(prefs) { sessionId, sent, total ->
                    SyncHost.publishProgress("$sessionId · ${percent(sent, total)} %")
                }
            SyncHost.publish(report)
            report.base?.let { settings.rememberHost(it) }
            // A failure RETRIES rather than disappearing: the usual cause is the Wi-Fi going away
            // mid-transfer, and the resume costs only what is still missing.
            if (report.failed.isEmpty()) Result.success() else Result.retry()
        }

    private fun percent(
        sent: Long,
        total: Long,
    ): Int = if (total <= 0) 0 else ((sent * PERCENT) / total).toInt()
}

private fun constraints() =
    Constraints
        .Builder()
        // UNMETERED, not CONNECTED: a gigabyte of QHD video over mobile data is not a transfer,
        // it is a phone bill.
        .setRequiredNetworkType(NetworkType.UNMETERED)
        .setRequiresBatteryNotLow(true)
        .build()

/** Called from the app's start: idempotent, so it is simply run every time. */
fun scheduleSync(context: Context) {
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        PERIODIC,
        ExistingPeriodicWorkPolicy.KEEP,
        PeriodicWorkRequestBuilder<SyncWorker>(EVERY_MINUTES, TimeUnit.MINUTES).setConstraints(constraints()).build(),
    )
}

/**
 * Send now, if the constraints allow it — the end of a game and the button in Settings.
 *
 * `REPLACE` rather than `KEEP`: the newest request knows about the session the older one did not,
 * and a queued duplicate would only re-declare a transfer the running one is already making.
 */
fun syncNow(
    context: Context,
    delayMinutes: Long = 0L,
) {
    val request =
        OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints())
            // A session that closed seconds ago is still inside the recorder's quiet window
            // (`QUIET_MS`), so the run triggered BY that close waits it out instead of finding
            // nothing and leaving the recording for the next periodic run a quarter hour later.
            .setInitialDelay(delayMinutes, TimeUnit.MINUTES)
            .build()
    WorkManager.getInstance(context).enqueueUniqueWork(ONCE, ExistingWorkPolicy.REPLACE, request)
}

/** Long enough that the closed session is out of the recorder's quiet window when the run starts. */
const val SETTLE_MINUTES = 3L
