package com.chesslab.tracker.sync

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI

private const val OK = 200
private const val CONFLICT = 409
private const val PROBE_TIMEOUT_MS = 1500
private const val CALL_TIMEOUT_MS = 15_000
private const val CHUNK_TIMEOUT_MS = 120_000

/** A connect attempt gets a tenth of the call's budget: a host that is not there says so at once. */
private const val CONNECT_SHARE = 10

/** Enough of a non-JSON answer to recognise what answered (a router's login page, usually). */
private const val ERROR_EXCERPT = 120

/**
 * `HttpURLConnection`, not a client library.
 *
 * The whole protocol is three verbs and a byte range, and the app already carries a Ktor SERVER for
 * the spectator page — adding a client stack for this would be a second HTTP implementation in the
 * APK for no behaviour. `setFixedLengthStreamingMode` is the load-bearing call: without it the JDK
 * buffers the whole body, which for a QHD recording means the chunk size decides the heap.
 */
class HttpIngestClient(
    private val token: String,
) : IngestClient {
    @Volatile
    private var probeFailure: String? = null

    override fun lastFailure(): String? = probeFailure

    override fun hello(base: String): Hello? =
        runCatching {
            val json = call("$base/api/ingest/hello", "GET", PROBE_TIMEOUT_MS)
            if (json["app"]?.jsonPrimitive?.content != "chesslab-platform") return null
            Hello(
                paired = json["paired"]?.jsonPrimitive?.content == "true",
                chunk = json["chunk"]?.jsonPrimitive?.content?.toIntOrNull() ?: DEFAULT_CHUNK,
            )
        }.onFailure { probeFailure = it.message ?: it.javaClass.simpleName }.getOrNull()

    override fun declare(
        base: String,
        plan: UploadPlan,
        device: String,
    ): Declared {
        val body =
            buildJsonObject {
                put("sessionId", plan.sessionId)
                put("device", device)
                put(
                    "files",
                    buildJsonArray {
                        plan.files.forEach { file ->
                            add(
                                buildJsonObject {
                                    put("path", file.path)
                                    put("bytes", file.bytes)
                                },
                            )
                        }
                    },
                )
            }
        val json = call("$base/api/ingest/session", "POST", CALL_TIMEOUT_MS, body.toString().toByteArray())
        val have =
            json["have"]?.jsonObject?.entries?.associate { (key, value) ->
                key to (value.jsonPrimitive.content.toLongOrNull() ?: 0L)
            } ?: emptyMap()
        return Declared(
            name = json["name"]?.jsonPrimitive?.content ?: error("no name in declare answer"),
            have = have,
            chunk = json["chunk"]?.jsonPrimitive?.content?.toIntOrNull() ?: DEFAULT_CHUNK,
        )
    }

    override fun putChunk(
        base: String,
        name: String,
        file: UploadFile,
        offset: Long,
        length: Int,
    ): Long {
        val url = "$base/api/ingest/session/$name/chunk?path=${file.path}&offset=$offset"
        val json = call(url, "PUT", CHUNK_TIMEOUT_MS, file.slice(offset, length))
        return json["have"]?.jsonPrimitive?.content?.toLongOrNull() ?: error("no have in chunk answer")
    }

    override fun complete(
        base: String,
        name: String,
    ): String {
        val json = call("$base/api/ingest/session/$name/complete", "POST", CALL_TIMEOUT_MS, ByteArray(0))
        // Wie `declare` und `putChunk`: wer den Status nicht nennt, hat ihn nicht gesagt. Erfunden
        // wurde hier ausgerechnet `landed`, und darauf loescht `sweepSentRecordings` die einzige
        // Kopie vom Telefon — eine 200 ohne Feld (Proxy, alter Server, `{}`) kostete eine Aufnahme.
        return json["status"]?.jsonPrimitive?.content ?: error("no status in complete answer")
    }

    @Suppress("ThrowsCount")
    private fun call(
        url: String,
        method: String,
        timeoutMs: Int,
        body: ByteArray? = null,
    ): JsonObject {
        val connection = URI(url).toURL().openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = PROBE_TIMEOUT_MS.coerceAtLeast(timeoutMs / CONNECT_SHARE)
            connection.readTimeout = timeoutMs
            connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", if (method == "PUT") "application/octet-stream" else "application/json")
                connection.setFixedLengthStreamingMode(body.size)
                connection.outputStream.use { it.write(body) }
            }
            val status = connection.responseCode
            val text = (if (status == OK) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
            val json = runCatching { Json.parseToJsonElement(text).jsonObject }.getOrNull()
            if (status != OK) {
                throw IngestException(
                    json?.get("error")?.jsonPrimitive?.content ?: "HTTP $status",
                    status,
                    if (status == CONFLICT) {
                        json
                            ?.get("have")
                            ?.jsonPrimitive
                            ?.content
                            ?.toLongOrNull()
                    } else {
                        null
                    },
                )
            }
            return json ?: throw IngestException("answer is not JSON: ${text.take(ERROR_EXCERPT)}")
        } catch (error: IOException) {
            throw IngestException(error.message ?: error.javaClass.simpleName, cause = error)
        } finally {
            connection.disconnect()
        }
    }
}
