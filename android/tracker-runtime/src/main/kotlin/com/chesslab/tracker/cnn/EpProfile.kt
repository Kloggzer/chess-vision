package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.longOrNull

private const val KERNEL_SUFFIX = "_kernel_time"
private const val NODE_CATEGORY = "Node"

private val PROFILE_JSON = Json { ignoreUnknownKeys = true }

/** ORT appends an EP even when it claims no node: QNN HTP does so when `QnnDevice_create` fails, the graph lands
 *  on the CPU and `createSession` still succeeds. Only the profile's `args.provider` tells. Majority of kernel
 *  time wins; null means *unknown* and is never dressed up as a known provider. */
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

/** [label] can never state an execution provider that was not observed. */
internal data class EpVerdict(
    val requested: Ep,
    val ranProvider: String?,
) {
    val ranEp: Ep? = ranProvider?.let(::epForProvider)

    /** An unverified verdict is not a match. */
    val matches: Boolean = ranEp == requested

    /** XNNPACK is the one exception: a kernel library on the SAME cores that hands every operator it lacks (all
     *  46 InstanceNormalization blocks) back to the CPU EP, so a CPU-dominant profile is that partition. */
    val contradicted: Boolean = ranProvider != null && !matches && !(requested == Ep.XNNPACK && ranEp == Ep.CPU)

    val label: String =
        when {
            ranProvider == null -> "${requested.backend} (unverified)"
            ranEp != null -> ranEp.backend
            // A provider the chain does not know is still the truth.
            else -> ranProvider
        }
}

internal fun epForProvider(provider: String): Ep? =
    when {
        provider.startsWith("QNN") -> Ep.QNN
        provider.startsWith("Nnapi") -> Ep.NNAPI
        provider.startsWith("Xnnpack") -> Ep.XNNPACK
        provider.startsWith("CPU") -> Ep.CPU
        else -> null
    }
