package com.chesslab.tracker.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext

/** How many addresses are probed at once. A /24 is 254 hosts; 32 in flight sweeps one in ~2 s. */
private const val PROBE_WIDTH = 32
private const val FULL_SUBNET = 24
private const val LAST_OCTET_MAX = 254

/** An IPv4 address has four octets; the first three are the /24 the sweep stays inside. */
private const val OCTETS = 4
private const val SUBNET_OCTETS = 3

/**
 * Finding the PC without mDNS.
 *
 * A multicast responder would mean a second dependency on the server (Next has no daemon of its
 * own) AND a discovery stack on the phone — and it is the one mechanism a home router is free to
 * drop: client isolation and guest VLANs both filter mDNS while unicast keeps working. Sweeping the
 * subnet needs neither side to grow a service: the ingest endpoint already answers, so the probe is
 * the ordinary request every transfer starts with.
 *
 * It is a /24 at most. A wider prefix is not swept — 65 000 probes is not discovery, it is a
 * portscan — and the manual address in Settings is the answer for a network that shape.
 */
fun candidateAddresses(
    own: String,
    prefixLength: Int,
): List<String> {
    val octets = own.split(".")
    if (octets.size != OCTETS || prefixLength < FULL_SUBNET) return emptyList()
    val prefix = octets.take(SUBNET_OCTETS).joinToString(".")
    val mine = octets.last().toIntOrNull() ?: return emptyList()
    // The user's own machine is usually a low static or DHCP-reserved address; starting next to the
    // phone's own address finds it in a fraction of the sweep more often than starting at 1.
    return (1..LAST_OCTET_MAX).sortedBy { kotlin.math.abs(it - mine) }.filter { it != mine }.map { "$prefix.$it" }
}

/**
 * The first address that answers as a PAIRED chesslab platform.
 *
 * Pairing is part of the identity: an unpaired answer means the token is wrong, and treating that
 * host as "found" would end every scan at a server the phone may not upload to.
 */
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

/** `192.168.178.20` + port 3000 -> `http://192.168.178.20:3000`, and a typed host is left alone. */
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
