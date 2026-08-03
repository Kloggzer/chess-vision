package com.chesslab.tracker.service

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import com.chesslab.tracker.MainActivity
import com.chesslab.tracker.R

/** Created by `ChesslabApp`; the service only posts into it. */
const val NOTIFICATION_CHANNEL_ID = "chesslab-tracking"

const val NOTIFICATION_ID = 1

/** Handled by [TrackerService.onStartCommand]: end the service and release the camera. */
const val ACTION_STOP_TRACKING = "com.chesslab.tracker.STOP_TRACKING"

private const val REQUEST_STOP = 1

/**
 * Tells [MainActivity] to open the TRACKER rather than Home.
 *
 * The app's start destination is the dashboard, so without this the notification landed a user who
 * tapped "chesslab is tracking" on a screen that is not the game. specs/47 §3.1a: a running game is
 * never more than one deliberate tap away, from anywhere — and from outside the app the
 * notification is that tap.
 */
const val EXTRA_OPEN_TRACKER = "com.chesslab.tracker.OPEN_TRACKER"

/**
 * The ongoing foreground notification.
 *
 * Android 14 requires `startForeground` with type `camera` BEFORE the camera binds, so this must
 * be buildable without any tracker state — hence the plain state string and move count rather
 * than a `TrackerStatus`.
 *
 * It carries the app's only off switch that is reachable without opening the app. A camera-type
 * foreground service with no way to end it from the shade leaves force-stop as the user's only
 * option, which is not an off switch, it is a workaround.
 */
class TrackerNotification(
    private val context: Context,
) {
    private val openApp: PendingIntent =
        PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_OPEN_TRACKER, true),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    // `getForegroundService`, not `getService`: the shade delivers this while the app is in the
    // background, where starting a plain service is not allowed. The service is already foreground,
    // so the 5-second `startForeground` obligation is met the moment the intent lands.
    private val stopTracking: PendingIntent =
        PendingIntent.getForegroundService(
            context,
            REQUEST_STOP,
            Intent(context, TrackerService::class.java).setAction(ACTION_STOP_TRACKING),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    /**
     * Re-post with the current state. The shade must say whether the camera is live — a frozen
     * "waiting" over a released camera implies the device is still being watched.
     */
    fun post(
        state: String?,
        moves: Int,
        cameraOn: Boolean,
    ) {
        val text = if (cameraOn) state ?: "tracking" else "stopped · camera off"
        context.getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, build(text, moves))
    }

    fun build(
        state: String,
        moves: Int,
    ): Notification =
        Notification
            .Builder(context, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(context.getString(R.string.notif_title))
            .setContentText("$state · $moves moves")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentIntent(openApp)
            .setOngoing(true)
            .addAction(
                Notification.Action
                    .Builder(
                        Icon.createWithResource(context, android.R.drawable.ic_menu_close_clear_cancel),
                        "Stop tracking",
                        stopTracking,
                    ).build(),
            ).build()
}
