package com.chesslab.tracker.spectate

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Bitmap.Config
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.chesslab.tracker.service.GameStateSink
import com.chesslab.tracker.ui.UiState
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import io.ktor.http.ContentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.ServerSocket

private const val STOP_GRACE_PERIOD_MS = 1000L
private const val STOP_TIMEOUT_MS = 2000L
private const val QR_MIN_SIZE = 64
private const val QR_MAX_SIZE = 2048
private const val DEFAULT_PORT = 8420

/**
 * LAN spectator server (Ktor CIO). Implements [GameStateSink] so [TrackerService]
 * forwards [UiState] frames here; serves a self-contained HTML page at `GET /`
 * and a JSON [GameSnapshot] at `GET /api/status`.
 *
 * NSD advertisement (`_chesslab._tcp`) and QR-code generation are supported when
 * an Android [context] is provided; the server itself works on plain JVM for
 * testing.
 *
 * Default OFF — start() must be called explicitly.
 */
class SpectatorServer(
    port: Int = DEFAULT_PORT,
    private val context: Context? = null,
) : GameStateSink {
    private var stopFn: (() -> Unit)? = null
    private var nsdHelper: NsdHelper? = null
    private var actualPort = port

    @Volatile
    private var snapshot: GameSnapshot = GameSnapshot.EMPTY

    private val _url = MutableStateFlow<String?>(null)
    val url: StateFlow<String?> = _url.asStateFlow()

    /** The actual bound port (differs from constructor arg if 0 was passed). */
    val boundPort: Int get() = actualPort

    override fun onState(state: UiState) {
        snapshot = GameSnapshot.from(state)
    }

    /** Start the HTTP server and register NSD if context is available. */
    fun start() {
        if (stopFn != null) return
        resolvePort()

        val json =
            Json {
                ignoreUnknownKeys = true
                encodeDefaults = true
            }

        val server =
            embeddedServer(CIO, port = actualPort, host = "0.0.0.0") {
                install(ContentNegotiation) { json(json) }
                routing {
                    get("/") {
                        call.respondText(SPECTATOR_PAGE, ContentType.Text.Html)
                    }
                    get("/api/status") {
                        call.respond(snapshot)
                    }
                }
            }.start(wait = false)

        stopFn = { server.stop(STOP_GRACE_PERIOD_MS, STOP_TIMEOUT_MS) }

        val ip = deviceIp()
        val serverUrl = "http://$ip:$actualPort"
        _url.value = serverUrl

        if (context != null) {
            nsdHelper = NsdHelper(context, actualPort, serverUrl)
            nsdHelper?.register()
        }
    }

    /** Stop the HTTP server and unregister NSD. */
    fun stop() {
        nsdHelper?.unregister()
        nsdHelper = null
        stopFn?.invoke()
        stopFn = null
        _url.value = null
    }

    /**
     * Generate a QR-code [Bitmap] from the current server URL using zxing-core.
     * Returns null if the server is not running or [size] is out of range.
     */
    fun generateQrBitmap(size: Int = 512): Bitmap? {
        val url = _url.value
        if (url == null || size !in QR_MIN_SIZE..QR_MAX_SIZE) return null
        val validSize = size
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(url, BarcodeFormat.QR_CODE, validSize, validSize)
        val bitmap = Bitmap.createBitmap(validSize, validSize, Config.ARGB_8888)
        for (x in 0 until validSize) {
            for (y in 0 until validSize) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) 0xFF000000.toInt() else 0xFFFFFFFF.toInt())
            }
        }
        return bitmap
    }

    /** Assign a free ephemeral port when the caller passed 0. */
    private fun resolvePort() {
        if (actualPort == 0) {
            actualPort = ServerSocket(0).use { it.localPort }
        }
    }

    /** Best-effort local (WiFi) IPv4 address. Falls back to 127.0.0.1. */
    private fun deviceIp(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces().asIterator()
            while (interfaces.hasNext()) {
                val iface = interfaces.next()
                val addr = if (!iface.isLoopback && iface.isUp) findV4Address(iface) else null
                if (addr != null) return addr
            }
        } catch (_: Exception) {
            // Fall through
        }
        return "127.0.0.1"
    }

    private fun findV4Address(iface: NetworkInterface): String? {
        for (addr in iface.inetAddresses.asIterator()) {
            if (addr is Inet4Address && !addr.isLoopbackAddress) {
                return addr.hostAddress
            }
        }
        return null
    }

    // -- NSD helper ---------------------------------------------------------

    /**
     * Android NSD service advertisement for `_chesslab._tcp`.
     */
    internal class NsdHelper(
        private val context: Context,
        private val port: Int,
        private val serverUrl: String,
    ) {
        private var nsdManager: NsdManager? = null
        private var registered = false

        fun register() {
            val mgr = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
            nsdManager = mgr

            val serviceInfo =
                NsdServiceInfo().apply {
                    serviceName = "Chesslab Tracker"
                    serviceType = "_chesslab._tcp"
                    this.port = port
                    setAttribute("url", serverUrl)
                }

            try {
                mgr.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
                registered = true
            } catch (_: Exception) {
                // NSD registration failed silently
            }
        }

        fun unregister() {
            if (registered) {
                try {
                    nsdManager?.unregisterService(registrationListener)
                } catch (_: Exception) {
                    // Best-effort
                }
                registered = false
            }
        }

        private val registrationListener =
            object : NsdManager.RegistrationListener {
                override fun onServiceRegistered(info: NsdServiceInfo?) = Unit

                override fun onRegistrationFailed(
                    serviceInfo: NsdServiceInfo?,
                    errorCode: Int,
                ) = Unit

                override fun onServiceUnregistered(info: NsdServiceInfo?) = Unit

                override fun onUnregistrationFailed(
                    serviceInfo: NsdServiceInfo?,
                    errorCode: Int,
                ) = Unit
            }
    }
}
