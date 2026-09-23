package com.chesslab.tracker.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext

/** 32 in flight sweeps a /24 in ~2 s. */
private const val PROBE_WIDTH = 32
private const val FULL_SUBNET = 24
private const val LAST_OCTET_MAX = 254

private const val OCTETS = 4
private const val SUBNET_OCTETS = 3

/** Without mDNS: routers drop multicast under client isolation while unicast works, and the probe is the request
 *  every transfer starts with. A /24 at most — 65 000 probes is a portscan. */
fun candidateAddresses(
    own: String,
    prefixLength: Int,
): List<String> {
    val octets = own.split(".")
    if (octets.size != OCTETS || prefixLength < FULL_SUBNET) return emptyList()
    val prefix = octets.take(SUBNET_OCTETS).joinToString(".")
    val mine = octets.last().toIntOrNull() ?: return emptyList()
    // Starting next to the phone's own address finds a low static address sooner than starting at 1.
    return (1..LAST_OCTET_MAX).sortedBy { kotlin.math.abs(it - mine) }.filter { it != mine }.map { "$prefix.$it" }
}

/** An unpaired answer means a wrong token; treating it as found ends every scan at a server we may not use. */
suspend fun discover(
    bases: List<String>,
    probe: (String) -> Hello?,
): String? =
    withContext(Dispatchers.IO) {
        for (batch in bases.chunked(PROBE_WIDTH)) {
            val found =
                coroutineScope {
                    batch.map { base -> async { base.takeIf { probe(base)?.paired == true } } }.awaitAll()
                }.firstNotNullOfOrNull { it }
            if (found != null) return@withContext found
        }
        null
    }

fun baseUrl(
    host: String,
    port: Int,
): String {
    val trimmed = host.trim().trimEnd('/')
    return when {
        trimmed.isEmpty() -> ""
        trimmed.startsWith("http://") || trimmed.startsWith("https://") -> trimmed
        trimmed.contains(':') -> "http://$trimmed"
        else -> "http://$trimmed:$port"
    }
}
