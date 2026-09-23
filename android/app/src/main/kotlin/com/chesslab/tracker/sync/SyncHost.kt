package com.chesslab.tracker.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.LinkAddress
import android.net.NetworkCapabilities
import com.chesslab.tracker.settings.DataStoreConfigStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.net.Inet4Address

/** One per process: otherwise the toggle writes the copy the worker cannot see. */
object SyncHost {
    private var settings: SyncSettings? = null
    private val last = MutableStateFlow<SyncReport?>(null)
    private val busy = MutableStateFlow<String?>(null)

    val report: StateFlow<SyncReport?> = last

    val progress: StateFlow<String?> = busy

    @Synchronized
    fun get(context: Context): SyncSettings =
        settings ?: SyncSettings(DataStoreConfigStore(context.applicationContext)).also { settings = it }

    fun publish(report: SyncReport) {
        last.value = report
        busy.value = null
    }

    fun publishProgress(text: String?) {
        busy.value = text
    }
}

/** From the ACTIVE network, not `WifiManager`: the deprecated API answers with the Wi-Fi address even on
 *  mobile data, sending the scan into an unreachable subnet. `null`: not on a local network. */
fun lanAddressOf(context: Context): LanAddress? {
    val manager = context.getSystemService(ConnectivityManager::class.java) ?: return null
    val link: LinkAddress? =
        manager.activeNetwork
            ?.takeIf { local(manager.getNetworkCapabilities(it)) }
            ?.let { manager.getLinkProperties(it) }
            ?.linkAddresses
            ?.firstOrNull { it.address is Inet4Address }
    return link?.address?.hostAddress?.let { LanAddress(it, link.prefixLength) }
}

/** Mobile data has no subnet the PC could be on, and a gigabyte on it is a bill. */
private fun local(capabilities: NetworkCapabilities?): Boolean =
    capabilities != null &&
        (
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        )
