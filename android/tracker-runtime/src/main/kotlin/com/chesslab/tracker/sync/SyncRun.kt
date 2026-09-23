package com.chesslab.tracker.sync

import java.io.File

data class LanAddress(
    val address: String,
    val prefixLength: Int,
)

/** In the words the Settings screen shows. Never "something went wrong". */
data class SyncReport(
    val base: String? = null,
    val sent: List<Outcome.Sent> = emptyList(),
    val failed: List<Outcome.Failed> = emptyList(),
    val note: String? = null,
) {
    val bytes: Long get() = sent.sumOf { it.bytes }
}

/** Platform-free: the Android side is a WorkManager shell. The pending list is built BEFORE the network is touched:
 *  a phone with nothing to send must not sweep a subnet on every Wi-Fi join. */
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

    /** A session still settling is not "nothing to transfer" — the two are named apart. */
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
            // Not continued after a failure: usually the Wi-Fi went away, and the next run picks up the queue.
            if (outcome is Outcome.Failed) break
        }
        return SyncReport(base, sent, failed)
    }

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
