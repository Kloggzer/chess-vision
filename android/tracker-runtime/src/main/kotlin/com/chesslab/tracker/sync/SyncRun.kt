package com.chesslab.tracker.sync

import java.io.File

/** Where the phone is on the network — enough to name its own /24 and nothing else. */
data class LanAddress(
    val address: String,
    val prefixLength: Int,
)

/** What one run did, in the words the Settings screen shows. Never "something went wrong". */
data class SyncReport(
    val base: String? = null,
    val sent: List<Outcome.Sent> = emptyList(),
    val failed: List<Outcome.Failed> = emptyList(),
    /** Why nothing was sent, when nothing was sent. Null means the sessions above are the story. */
    val note: String? = null,
) {
    val bytes: Long get() = sent.sumOf { it.bytes }
}

/**
 * One transfer run: find the server, send every session that has not been sent.
 *
 * Platform-free on purpose — the Android side of this feature is a WorkManager shell around
 * [run], so the whole decision surface (what is pending, which host, what a failure is called)
 * is exercised on the desktop JVM.
 *
 * The order is deliberate: the pending list is built BEFORE the network is touched. A phone with
 * nothing to send must not sweep a subnet every time it joins a Wi-Fi.
 */
class SyncRun(
    private val sessionsDir: File,
    private val gamesDir: File,
    private val device: String,
    private val clientFor: (token: String) -> IngestClient,
    private val ownAddress: () -> LanAddress?,
    private val now: () -> Long = System::currentTimeMillis,
) {
    suspend fun run(
        prefs: SyncPrefs,
        onProgress: (sessionId: String, sent: Long, total: Long) -> Unit = { _, _, _ -> },
    ): SyncReport {
        offReason(prefs)?.let { return SyncReport(note = it) }
        val plans = pendingSessions(sessionsDir, now()).mapNotNull { dir -> planFor(dir, gamesDir)?.let { dir to it } }
        if (plans.isEmpty()) return SyncReport(note = idleNote())

        val client = clientFor(prefs.token)
        val base = resolve(prefs, client)
        return if (base == null) SyncReport(note = unreachable(prefs, client)) else send(base, client, plans, onProgress)
    }

    private fun offReason(prefs: SyncPrefs): String? =
        when {
            !prefs.enabled -> "transfer is off"
            !prefs.paired -> "no token — read it off the server's /transfers page"
            else -> null
        }

    /**
     * "Nothing to transfer" would be a lie a minute after a game: the session is there and unsent,
     * it is simply still settling. The two look identical from outside, so they are named apart.
     */
    private fun idleNote(): String {
        val empty = emptyRecordings(sessionsDir).size
        val settling = unsentSessions(sessionsDir).size - empty
        val nothing = if (empty > 0) "nothing to transfer · $empty empty recording" else "nothing to transfer"
        return if (settling > 0) "$settling recording still being written" else nothing
    }

    private fun send(
        base: String,
        client: IngestClient,
        plans: List<Pair<File, UploadPlan>>,
        onProgress: (String, Long, Long) -> Unit,
    ): SyncReport {
        val uploader = SessionUploader(client, device, now)
        val sent = mutableListOf<Outcome.Sent>()
        val failed = mutableListOf<Outcome.Failed>()
        for ((dir, plan) in plans) {
            val outcome = uploader.upload(base, dir, plan) { done, total -> onProgress(plan.sessionId, done, total) }
            when (outcome) {
                is Outcome.Sent -> sent += outcome
                is Outcome.Failed -> failed += outcome
            }
            // The next session is not tried after a failure: the usual cause is the Wi-Fi going
            // away, and hammering it costs battery for a queue the next run picks up whole anyway.
            if (outcome is Outcome.Failed) break
        }
        return SyncReport(base, sent, failed)
    }

    /** A typed address first, then the one that answered last, then the sweep. */
    private suspend fun resolve(
        prefs: SyncPrefs,
        client: IngestClient,
    ): String? {
        val manual = baseUrl(prefs.host, prefs.port)
        if (manual.isNotEmpty()) return manual.takeIf { client.hello(it)?.paired == true }
        val remembered = baseUrl(prefs.lastHost, prefs.port).takeIf { it.isNotEmpty() && client.hello(it)?.paired == true }
        return remembered ?: sweep(prefs, client)
    }

    private suspend fun sweep(
        prefs: SyncPrefs,
        client: IngestClient,
    ): String? {
        val own = ownAddress() ?: return null
        return discover(candidateAddresses(own.address, own.prefixLength).map { baseUrl(it, prefs.port) }) { client.hello(it) }
    }

    private fun unreachable(
        prefs: SyncPrefs,
        client: IngestClient,
    ): String {
        val why = client.lastFailure()?.let { " ($it)" } ?: ""
        return when {
            prefs.host.isNotBlank() -> "${baseUrl(prefs.host, prefs.port)} does not answer, or the token does not match$why"
            ownAddress() == null -> "no Wi-Fi"
            else -> "no chesslab server on this Wi-Fi — enter the address in Settings$why"
        }
    }
}
