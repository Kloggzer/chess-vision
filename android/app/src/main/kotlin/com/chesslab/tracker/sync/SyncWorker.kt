package com.chesslab.tracker.sync

import android.content.Context
import android.os.Build
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.games.sessionsDir
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

private const val PERIODIC = "chesslab-sync-periodic"
private const val ONCE = "chesslab-sync-now"
private const val EVERY_MINUTES = 15L
private const val PERCENT = 100L

/** One transfer at a time: the periodic and the one-shot chains DO overlap, and doubled chunks never seal. */
private val running = Mutex()

/** WorkManager, not a coroutine: the recording is finished exactly when the phone is put down, and a reboot
 *  must not lose the job. The periodic run (15 min, WorkManager's floor) is the SAFETY NET; [syncNow] is
 *  the normal path. */
class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    // IO explicitly: `CoroutineWorker` runs on `Dispatchers.Default`, and this is blocking `HttpURLConnection` work.
    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            if (!running.tryLock()) return@withContext Result.success()
            try {
                transfer()
            } finally {
                running.unlock()
            }
        }

    private suspend fun transfer(): Result {
        val settings = SyncHost.get(applicationContext)
        val prefs = settings.load()
        val run =
            SyncRun(
                sessionsDir = sessionsDir(applicationContext),
                gamesDir = gamesDir(applicationContext),
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
        // After the send: a run that just sealed a recording is when the phone provably holds nothing new.
        val gone = sweepSentRecordings(sessionsDir(applicationContext), System.currentTimeMillis(), prefs.retentionDays * DAY_MS)
        if (gone.isNotEmpty()) Log.i(TAG, "removed ${gone.size} sent recording(s) after ${prefs.retentionDays} d: ${gone.joinToString()}")
        // RETRY, not drop: usually the Wi-Fi went away mid-transfer, and the resume costs only what is missing.
        return if (report.failed.isEmpty()) Result.success() else Result.retry()
    }

    private fun percent(
        sent: Long,
        total: Long,
    ): Int = if (total <= 0) 0 else ((sent * PERCENT) / total).toInt()
}

private const val TAG = "chesslabSync"

private fun constraints() =
    Constraints
        .Builder()
        .setRequiredNetworkType(NetworkType.UNMETERED)
        .setRequiresBatteryNotLow(true)
        .build()

fun scheduleSync(context: Context) {
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        PERIODIC,
        ExistingPeriodicWorkPolicy.KEEP,
        PeriodicWorkRequestBuilder<SyncWorker>(EVERY_MINUTES, TimeUnit.MINUTES).setConstraints(constraints()).build(),
    )
}

/** `REPLACE`, not `KEEP`: the newest request knows the session the older one did not. */
fun syncNow(
    context: Context,
    delayMinutes: Long = 0L,
) {
    val request =
        OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints())
            // The session that just closed is still in the recorder's quiet window (`QUIET_MS`): wait it out, or the
            // run finds nothing and the recording waits a quarter hour.
            .setInitialDelay(delayMinutes, TimeUnit.MINUTES)
            .build()
    WorkManager.getInstance(context).enqueueUniqueWork(ONCE, ExistingWorkPolicy.REPLACE, request)
}

const val SETTLE_MINUTES = 3L
