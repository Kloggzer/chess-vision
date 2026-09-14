package com.chesslab.tracker.spectate

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.service.NOTIFICATION_CHANNEL_ID
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.tracking.TrackerSession
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

private const val SPECTATOR_NOTIFICATION_ID = 2

/**
 * Owns the server, the wire snapshot and the "it is running" indicator.
 *
 * It lives outside the Compose tree on purpose: a ViewModel dies when the user navigates away, and
 * a spectator server that stops because somebody pressed Back is a server whose URL silently rots.
 */
class SpectatorController(
    context: Context,
    private val scope: CoroutineScope,
    wifi: WifiAddress = SystemWifiAddress,
) {
    private val app = context.applicationContext

    private val snapshot = MutableStateFlow(GameSnapshot())

    private val server = SpectatorServer(wifi) { snapshot.value }
    val state: StateFlow<SpectatorState> = server.state

    private val enabledFlow = MutableStateFlow(false)
    val enabled: StateFlow<Boolean> = enabledFlow.asStateFlow()

    init {
        // The persisted flag is written, never read back at launch: the app can NEVER come back up
        // serving. Persisting it only keeps the settings export honest about what is running.
        persist(on = false)
        scope.launch { followTracker() }
        watchWifi()
        registerStopAction()
    }

    /** The only way the server ever starts. Persists through the shared repository — no second store. */
    fun setEnabled(on: Boolean) {
        enabledFlow.value = on
        persist(on)
        server.refresh(on)
        notify(if (on) (server.state.value as? SpectatorState.Running)?.url else null)
    }

    /** The shared repository, never a second store — the settings export must not disagree with reality. */
    private fun persist(on: Boolean) {
        val repository = SettingsHost.repository.value ?: return
        repository.updateApp(repository.appSettings.value.copy(spectatorEnabled = on))
    }

    private suspend fun followTracker() = followTrackerSessions(TrackerSessionHost.session, ::onStatus)

    /**
     * The score sheet is the service's ONE live game, never a second accumulator.
     *
     * This class used to build its own list off the event stream, under a lock, because [scope] is
     * `Dispatchers.IO` — a thread POOL — and the event and status collectors genuinely ran
     * concurrently on an `ArrayList`. It also never handled an undo (the engine emits no undo
     * event), so a taken-back move stayed on the spectator's sheet for the rest of the game, and it
     * cleared the whole sheet on any return to the start position. `LiveGame` answers all three,
     * and there is nothing left here to get wrong.
     */
    private fun onStatus(status: TrackerStatus?) {
        val game =
            GameSessionHost.controller.value
                ?.state
                ?.value
                ?.game ?: GameView.NONE
        snapshot.value = gameSnapshot(status, game, System.currentTimeMillis())
    }

    /** Wi-Fi came or went: reconcile against the toggle rather than guess. */
    private fun watchWifi() {
        val manager = app.getSystemService(ConnectivityManager::class.java) ?: return
        val request = NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()
        val callback =
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) = reconcile()

                override fun onLost(network: Network) = reconcile()
            }
        runCatching { manager.registerNetworkCallback(request, callback) }
    }

    private fun reconcile() {
        server.refresh(enabledFlow.value)
        notify((server.state.value as? SpectatorState.Running)?.url)
    }

    /**
     * The user must never be able to forget the board is on the LAN, so a running server is an
     * ongoing notification. [url] `null` takes it down.
     */
    private fun notify(url: String?) {
        val manager = app.getSystemService(NotificationManager::class.java) ?: return
        if (url == null) {
            manager.cancel(SPECTATOR_NOTIFICATION_ID)
            return
        }
        val notification =
            Notification
                .Builder(app, NOTIFICATION_CHANNEL_ID)
                .setContentTitle("LAN spectator on")
                .setContentText(url)
                .setSmallIcon(android.R.drawable.ic_menu_share)
                .setOngoing(true)
                .addAction(Notification.Action.Builder(null, "Stop", stopIntent()).build())
                .build()
        manager.notify(SPECTATOR_NOTIFICATION_ID, notification)
    }

    private fun stopIntent(): PendingIntent =
        PendingIntent.getBroadcast(
            app,
            0,
            Intent(ACTION_STOP).setPackage(app.packageName),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    /** Registered at runtime, not in the manifest — the manifest belongs to phase 06c. */
    private fun registerStopAction() {
        val receiver =
            object : BroadcastReceiver() {
                override fun onReceive(
                    context: Context?,
                    intent: Intent?,
                ) = setEnabled(false)
            }
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                app.registerReceiver(receiver, IntentFilter(ACTION_STOP), Context.RECEIVER_NOT_EXPORTED)
            } else {
                app.registerReceiver(receiver, IntentFilter(ACTION_STOP))
            }
        }
    }
}

/**
 * Follow whatever session is current, and let go of the one that died.
 *
 * The teardown is a `null` emission, so it has to REACH [collectLatest]: filtering it away left the
 * inner collector — and the dead service's binder with it — attached for the life of the process.
 */
internal suspend fun followTrackerSessions(
    sessions: Flow<TrackerSession?>,
    onStatus: (TrackerStatus?) -> Unit,
) = sessions.collectLatest { session -> session?.status?.collect(onStatus) }

private const val ACTION_STOP = "com.chesslab.tracker.SPECTATOR_STOP"

/**
 * The one controller in the process.
 *
 * Created on the main thread by the spectator screen and never disposed: the server outlives the
 * screen by design, and a second controller would be a second listener on port 8420.
 */
object SpectatorHost {
    private var controller: SpectatorController? = null

    fun get(context: Context): SpectatorController =
        controller ?: SpectatorController(
            context,
            CoroutineScope(Dispatchers.IO + SupervisorJob()),
        ).also { controller = it }
}
