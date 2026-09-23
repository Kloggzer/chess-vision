package com.chesslab.tracker.capture

import com.chesslab.tracker.sync.SyncPrefs
import com.chesslab.tracker.sync.baseUrl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URI

/** Here, not in `IngestClient`: its `call` is private to the upload protocol. Same pairing as the upload. */
suspend fun fetchCapturePlan(prefs: SyncPrefs): PlanAnswer =
    withContext(Dispatchers.IO) {
        val base = baseUrl(prefs.host.ifBlank { prefs.lastHost }, prefs.port)
        if (base.isEmpty()) return@withContext PlanAnswer.Refused(NO_HOST)
        runCatching { call("$base/api/capture/plan", prefs.token) }
            .fold({ planAnswer(it.first, it.second) }, { PlanAnswer.Refused(it.message ?: it.javaClass.simpleName) })
    }

/** Null on every failure: the coverage is a garnish, and the plan fetch already names the refusal. */
suspend fun fetchCaptureCoverage(prefs: SyncPrefs): CaptureCoverage? =
    withContext(Dispatchers.IO) {
        val base = baseUrl(prefs.host.ifBlank { prefs.lastHost }, prefs.port)
        if (base.isEmpty()) return@withContext null
        runCatching {
            val (status, body) = call("$base/api/capture/coverage", prefs.token)
            if (status != HTTP_OK) return@runCatching null
            CAPTURE_JSON.decodeFromString(CaptureCoverage.serializer(), body).takeIf { it.generatedAt.isNotBlank() }
        }.getOrNull()
    }

private fun call(
    url: String,
    token: String,
): Pair<Int, String> {
    val connection = URI(url).toURL().openConnection() as HttpURLConnection
    try {
        connection.requestMethod = "GET"
        connection.connectTimeout = CONNECT_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        connection.setRequestProperty("Authorization", "Bearer $token")
        val status = connection.responseCode
        val stream = if (status == HTTP_OK) connection.inputStream else connection.errorStream
        return status to stream?.bufferedReader()?.use { it.readText() }.orEmpty()
    } finally {
        connection.disconnect()
    }
}

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
