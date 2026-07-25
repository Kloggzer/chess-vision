package com.chesslab.tracker.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.chesslab.tracker.MainActivity
import com.chesslab.tracker.R

/** Created by `ChesslabApp`; the service only posts into it. */
const val NOTIFICATION_CHANNEL_ID = "chesslab-tracking"

const val NOTIFICATION_ID = 1

/**
 * The ongoing foreground notification.
 *
 * Android 14 requires `startForeground` with type `camera` BEFORE the camera binds, so this must
 * be buildable without any tracker state — hence the plain state string and move count rather
 * than a `TrackerStatus`.
 */
class TrackerNotification(
    private val context: Context,
) {
    private val openApp: PendingIntent =
        PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

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
            .build()
}
