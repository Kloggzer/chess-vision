package com.chesslab.tracker.spectate

import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

/** The one address the spectator server is allowed to bind. Behind an interface so it can be faked. */
fun interface WifiAddress {
    /** Site-local IPv4 of an up `wlan*` interface, or `null` when the phone is not on Wi-Fi. */
    fun current(): String?
}

private const val WIFI_PREFIX = "wlan"

/**
 * Wi-Fi only — filtered by interface name AND by address scope.
 *
 * "The first non-loopback address" (what the legacy code did, via `0.0.0.0`) would happily publish
 * the board over a cellular or USB-tether interface. A carrier-visible listener is not what a
 * club-room LAN toggle promises, and the user has no way to notice the difference.
 */
object SystemWifiAddress : WifiAddress {
    override fun current(): String? = runCatching { scan() }.getOrNull()

    // Enumeration#asIterator is API 33; minSdk is 29, hence Collections.list.
    private fun scan(): String? =
        Collections
            .list(NetworkInterface.getNetworkInterfaces())
            .filter { it.name.startsWith(WIFI_PREFIX) && it.isUp && !it.isLoopback }
            .flatMap { Collections.list(it.inetAddresses) }
            .filterIsInstance<Inet4Address>()
            .firstOrNull { it.isSiteLocalAddress }
            ?.hostAddress
}
