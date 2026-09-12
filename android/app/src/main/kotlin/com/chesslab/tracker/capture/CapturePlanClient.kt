package com.chesslab.tracker.capture

import com.chesslab.tracker.sync.SyncPrefs
import com.chesslab.tracker.sync.baseUrl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URI

/**
 * One GET, in this package on purpose: `IngestClient` is the upload protocol (hello/declare/chunk/
 * complete) and `HttpIngestClient.call` is private, so a plan fetch there would widen a seam that
 * exists for transfers. Host and token are the SAME pairing the upload uses (`SyncSettings`).
 */
suspend fun fetchCapturePlan(prefs: SyncPrefs): PlanAnswer =
    withContext(Dispatchers.IO) {
        val base = baseUrl(prefs.host.ifBlank { prefs.lastHost }, prefs.port)
        if (base.isEmpty()) return@withContext PlanAnswer.Refused(NO_HOST)
        runCatching { get("$base/api/capture/plan", prefs.token) }
            .getOrElse { PlanAnswer.Refused(it.message ?: it.javaClass.simpleName) }
    }

private fun get(
    url: String,
    token: String,
): PlanAnswer {
    val connection = URI(url).toURL().openConnection() as HttpURLConnection
    try {
        connection.requestMethod = "GET"
        connection.connectTimeout = CONNECT_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        connection.setRequestProperty("Authorization", "Bearer $token")
        val status = connection.responseCode
        val stream = if (status == HTTP_OK) connection.inputStream else connection.errorStream
        return planAnswer(status, stream?.bufferedReader()?.use { it.readText() }.orEmpty())
    } finally {
        connection.disconnect()
    }
}

/** The seam the test drives: every refusal the screen can show is decided here, off one string. */
internal fun planAnswer(
    status: Int,
    body: String,
): PlanAnswer =
    when (status) {
        HTTP_UNAUTHORIZED -> PlanAnswer.Refused(UNPAIRED)
        HTTP_OK ->
            runCatching { CAPTURE_JSON.decodeFromString(CapturePlan.serializer(), body) }
                .fold({ PlanAnswer.Loaded(it) }, { PlanAnswer.Refused("$NOT_A_PLAN ${body.take(EXCERPT)}") })
        else -> PlanAnswer.Refused("HTTP $status ${body.take(EXCERPT)}".trim())
    }

private const val NO_HOST = "Not paired with a PC yet — pair under Settings › Transfer."
private const val UNPAIRED = "The PC refused the token — pair again under Settings › Transfer."
private const val NOT_A_PLAN = "The answer is not a capture plan:"
private const val EXCERPT = 120
private const val CONNECT_TIMEOUT_MS = 1500
private const val READ_TIMEOUT_MS = 15_000
