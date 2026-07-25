package com.chesslab.tracker.spectate

import io.ktor.http.ContentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.EmbeddedServer
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
import java.net.InetSocketAddress
import java.net.ServerSocket

/** Fixed, so the URL and the QR the user photographed stay valid for the whole session. */
const val SPECTATOR_PORT = 8420

private const val STOP_GRACE_MS = 200L
private const val STOP_TIMEOUT_MS = 1000L

sealed interface SpectatorState {
    data object Off : SpectatorState

    data class Running(
        val url: String,
        val port: Int,
    ) : SpectatorState

    data object NoWifi : SpectatorState

    data class Error(
        val reason: String,
    ) : SpectatorState
}

private val wireJson = Json { encodeDefaults = true }

/**
 * The complete routing table. Two GETs, and nothing that can reach the tracker: [snapshots] hands
 * back an already-built immutable value, so a request cannot call the engine, the game store or
 * settings even by accident. There is no write endpoint to secure because there is none to write.
 */
internal fun Application.spectatorModule(snapshots: () -> GameSnapshot) {
    install(ContentNegotiation) { json(wireJson) }
    routing {
        get("/") { call.respondText(spectatorPageHtml(snapshots()), ContentType.Text.Html) }
        get("/api/status") { call.respond(snapshots()) }
    }
}

/**
 * The LAN spectator, off until asked.
 *
 * Threading: Ktor CIO owns its own event-loop and worker threads, entirely separate from the
 * analyzer thread that drives the engine. Handlers do exactly one volatile-free `StateFlow.value`
 * read and never block, so a connected spectator cannot enter the frame budget — the 15 fps
 * tracking loop outranks this feature absolutely.
 */
class SpectatorServer(
    private val wifi: WifiAddress = SystemWifiAddress,
    private val snapshots: () -> GameSnapshot,
) {
    private val stateFlow = MutableStateFlow<SpectatorState>(SpectatorState.Off)
    val state: StateFlow<SpectatorState> = stateFlow.asStateFlow()

    private var engine: EmbeddedServer<*, *>? = null
    private var boundHost: String? = null

    fun start() = refresh(enabled = true)

    fun stop() = refresh(enabled = false)

    /**
     * The single reconciliation point: desired state in, actual state out.
     *
     * Wi-Fi loss and Wi-Fi return are the same call, because a server bound to an address that no
     * longer exists is worse than no server — it advertises a URL nobody can reach.
     */
    fun refresh(enabled: Boolean) {
        val host = wifi.current()
        when {
            !enabled -> shutdown(SpectatorState.Off)
            host == null -> shutdown(SpectatorState.NoWifi)
            host == boundHost -> Unit
            else -> {
                shutdown(SpectatorState.Off)
                startOn(host)
            }
        }
    }

    private fun startOn(host: String) {
        if (!portIsFree(host)) {
            stateFlow.value = SpectatorState.Error("port $SPECTATOR_PORT in use")
            return
        }
        runCatching {
            embeddedServer(CIO, host = host, port = SPECTATOR_PORT) { spectatorModule(snapshots) }.start(wait = false)
        }.onSuccess {
            engine = it
            boundHost = host
            stateFlow.value = SpectatorState.Running("http://$host:$SPECTATOR_PORT", SPECTATOR_PORT)
        }.onFailure {
            stateFlow.value = SpectatorState.Error(it.message ?: "spectator server failed to start")
        }
    }

    private fun shutdown(next: SpectatorState) {
        engine?.stop(STOP_GRACE_MS, STOP_TIMEOUT_MS)
        engine = null
        boundHost = null
        stateFlow.value = next
    }

    /**
     * Probed before binding so a taken port fails loudly. The legacy code drifted to a free
     * ephemeral port instead, which left the displayed URL and the scanned QR pointing at nothing.
     */
    private fun portIsFree(host: String): Boolean =
        runCatching {
            ServerSocket().use { it.bind(InetSocketAddress(host, SPECTATOR_PORT)) }
        }.isSuccess
}
