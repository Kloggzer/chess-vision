package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.longOrNull

/** ORT tags one trace event per executed kernel, named `<node>_kernel_time`, category `Node`. */
private const val KERNEL_SUFFIX = "_kernel_time"
private const val NODE_CATEGORY = "Node"

private val PROFILE_JSON = Json { ignoreUnknownKeys = true }

/**
 * The execution provider that actually RAN the graph, read out of an ORT profile.
 *
 * ORT appends an EP to the session even when that EP goes on to claim no node at all: the QNN HTP
 * backend does exactly that when `QnnDevice_create` fails (`QNN_DEVICE_ERROR_INVALID_CONFIG`), and
 * the whole graph lands on the CPU while `createSession` still succeeds. Nothing in the Java API
 * reports the assignment — except the profile, where every `*_kernel_time` event carries
 * `args.provider`. Claiming the requested EP instead is the silent degradation 05c exists to
 * prevent (MEMORY `android-live-bringup-2607`, one rung softer: same fps, ten times the latency).
 *
 * The provider with the most kernel time wins. A partial assignment is normal — NNAPI leaves the
 * odd node to the CPU — so "ran on" is a majority of the work, not unanimity.
 *
 * @return ORT's own provider name (e.g. `CPUExecutionProvider`), or null when the profile named
 *   none. Null means *unknown*, and an unknown provider is never dressed up as a known one.
 */
internal fun dominantProvider(profileJson: String): String? {
    val events = runCatching { PROFILE_JSON.parseToJsonElement(profileJson) as? JsonArray }.getOrNull() ?: return null
    val kernelTime = mutableMapOf<String, Long>()
    for (event in events) {
        val provider = (event as? JsonObject)?.takeIf(::isKernelEvent)?.provider() ?: continue
        kernelTime[provider] = (kernelTime[provider] ?: 0L) + event.duration()
    }
    return kernelTime.maxByOrNull { it.value }?.key
}

private fun isKernelEvent(event: JsonObject): Boolean =
    event.text("cat") == NODE_CATEGORY && event.text("name").orEmpty().endsWith(KERNEL_SUFFIX)

private fun JsonObject.provider(): String? = (this["args"] as? JsonObject)?.text("provider")

private fun JsonObject.duration(): Long = (this["dur"] as? JsonPrimitive)?.longOrNull ?: 0L

private fun JsonObject.text(key: String): String? = (this[key] as? JsonPrimitive)?.contentOrNullIfNumeric()

private fun JsonPrimitive.contentOrNullIfNumeric(): String? = if (isString) content else null

/**
 * What the app asked ORT for, next to what the profiler saw run.
 *
 * The invariant, and the whole point of the type: [label] can never state an execution provider
 * that was not observed. When verification produced no answer it says so out loud rather than
 * repeating the request as if it were a result.
 */
internal data class EpVerdict(
    val requested: Ep,
    /** ORT's provider name for the profiled batch; null when profiling gave no answer. */
    val ranProvider: String?,
) {
    /** The provider mapped onto the chain's own vocabulary, or null when ORT named a stranger. */
    val ranEp: Ep? = ranProvider?.let(::epForProvider)

    /** True only when the profile confirmed the request — an unverified verdict is not a match. */
    val matches: Boolean = ranEp == requested

    /**
     * True when the profile positively contradicted the request (as opposed to saying nothing).
     *
     * XNNPACK is the one exception, and it is not a loophole: it is a kernel library on the SAME
     * cores, and it hands every operator it does not implement — all 46 InstanceNormalization
     * blocks in this graph — straight back to the CPU EP. A CPU-dominant profile there is that
     * partition, not a session that ran somewhere other than where it said.
     */
    val contradicted: Boolean = ranProvider != null && !matches && !(requested == Ep.XNNPACK && ranEp == Ep.CPU)

    val label: String =
        when {
            ranProvider == null -> "${requested.backend} (unverified)"
            ranEp != null -> ranEp.backend
            // A provider the chain does not know is still the truth; report it verbatim.
            else -> ranProvider
        }
}

/** ORT's provider names are stable strings; only the three this app can request are mapped. */
internal fun epForProvider(provider: String): Ep? =
    when {
        provider.startsWith("QNN") -> Ep.QNN
        provider.startsWith("Nnapi") -> Ep.NNAPI
        provider.startsWith("Xnnpack") -> Ep.XNNPACK
        provider.startsWith("CPU") -> Ep.CPU
        else -> null
    }
