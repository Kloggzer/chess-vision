package com.chesslab.tracker.service

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import com.chesslab.tracker.MainActivity
import com.chesslab.tracker.R

const val NOTIFICATION_CHANNEL_ID = "chesslab-tracking"

const val NOTIFICATION_ID = 1

const val ACTION_STOP_TRACKING = "com.chesslab.tracker.STOP_TRACKING"

private const val REQUEST_STOP = 1

/** The start destination is Home, so without this the notification did not open the game. */
const val EXTRA_OPEN_TRACKER = "com.chesslab.tracker.OPEN_TRACKER"

/** Android 14 requires `startForeground` BEFORE the camera binds, so this builds without tracker state.
 *  It carries the only off switch outside the app — without it force-stop would be the user's option. */
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

    // `getForegroundService`, not `getService`: the shade delivers this in the background, where a plain
    // service start is refused. The service is already foreground, so the 5 s obligation is met.
    private val stopTracking: PendingIntent =
        PendingIntent.getForegroundService(
            context,
            REQUEST_STOP,
            Intent(context, TrackerService::class.java).setAction(ACTION_STOP_TRACKING),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    /** The shade must say whether the camera is live: a frozen "waiting" over a released camera implies watching. */
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
