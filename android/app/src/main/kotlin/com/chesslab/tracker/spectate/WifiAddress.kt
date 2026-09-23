package com.chesslab.tracker.spectate

import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

fun interface WifiAddress {
    fun current(): String?
}

private const val WIFI_PREFIX = "wlan"

/** Wi-Fi only, by interface name AND address scope: "first non-loopback" would publish the board over a
 *  cellular or USB-tether interface without the user noticing. */
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
