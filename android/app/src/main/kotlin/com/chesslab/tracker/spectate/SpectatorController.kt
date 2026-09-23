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

/** Outside the Compose tree: a server that stops because somebody pressed Back leaves a rotten URL. */
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
        // Written, never read back at launch: the app can NEVER come back up serving.
        persist(on = false)
        scope.launch { followTracker() }
        watchWifi()
        registerStopAction()
    }

    fun setEnabled(on: Boolean) {
        enabledFlow.value = on
        persist(on)
        server.refresh(on)
        notify(if (on) (server.state.value as? SpectatorState.Running)?.url else null)
    }

    private fun persist(on: Boolean) {
        val repository = SettingsHost.repository.value ?: return
        repository.updateApp(repository.appSettings.value.copy(spectatorEnabled = on))
    }

    private suspend fun followTracker() = followTrackerSessions(TrackerSessionHost.session, ::onStatus)

    /** The service's ONE live game, never a second accumulator: the old one raced on an `ArrayList` across the
     *  IO pool, missed every undo and cleared on any return to the start position. */
    private fun onStatus(status: TrackerStatus?) {
        val game =
            GameSessionHost.controller.value
                ?.state
                ?.value
                ?.game ?: GameView.NONE
        snapshot.value = gameSnapshot(status, game, System.currentTimeMillis())
    }

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

    /** A running server is an ongoing notification: the user must never forget the board is on the LAN. */
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

/** The teardown is a `null` emission and must REACH [collectLatest]: filtering it kept the dead
 *  service's binder attached for the life of the process. */
internal suspend fun followTrackerSessions(
    sessions: Flow<TrackerSession?>,
    onStatus: (TrackerStatus?) -> Unit,
) = sessions.collectLatest { session -> session?.status?.collect(onStatus) }

private const val ACTION_STOP = "com.chesslab.tracker.SPECTATOR_STOP"

/** Never disposed: the server outlives the screen, and a second controller would listen on port 8420 twice. */
object SpectatorHost {
    private var controller: SpectatorController? = null

    fun get(context: Context): SpectatorController =
        controller ?: SpectatorController(
            context,
            CoroutineScope(Dispatchers.IO + SupervisorJob()),
        ).also { controller = it }
}
