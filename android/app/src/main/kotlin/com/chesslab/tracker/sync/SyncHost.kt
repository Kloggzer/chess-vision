package com.chesslab.tracker.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.LinkAddress
import android.net.NetworkCapabilities
import com.chesslab.tracker.settings.DataStoreConfigStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File
import java.net.Inet4Address

/**
 * One [SyncSettings] per process, for the same reason recording has one: the worker and the screen
 * would otherwise each cache their own copy and the toggle would write the one the worker cannot see.
 */
object SyncHost {
    private var settings: SyncSettings? = null
    private val last = MutableStateFlow<SyncReport?>(null)
    private val busy = MutableStateFlow<String?>(null)

    /** The last run's own words. Null until one has run in this process. */
    val report: StateFlow<SyncReport?> = last

    /** What is being sent right now, for the row that would otherwise just say "working". */
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

fun sessionsDirOf(context: Context): File = File(context.filesDir, "sessions")

fun gamesDirOf(context: Context): File = File(context.filesDir, "games")

/**
 * The phone's own address on the Wi-Fi, and how wide that network is.
 *
 * Read from the ACTIVE network rather than from `WifiManager`: the deprecated API answers with the
 * Wi-Fi address even while the traffic is on mobile data, which would send the scan into a subnet
 * the phone cannot reach. `null` means "not on a local network", and the run says so instead of
 * sweeping anything.
 */
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

/** Wi-Fi or Ethernet. Mobile data has no subnet the PC could be on, and a gigabyte on it is a bill. */
private fun local(capabilities: NetworkCapabilities?): Boolean =
    capabilities != null &&
        (
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        )
