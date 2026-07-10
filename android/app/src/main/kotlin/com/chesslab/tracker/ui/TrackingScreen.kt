package com.chesslab.tracker.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.R
import com.chesslab.tracker.service.OverlayView

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod")
@Composable
fun TrackingScreen(
    state: UiState,
    board: android.graphics.Bitmap?,
    rawPreview: android.graphics.Bitmap?,
    calibrated: Boolean,
    showDebug: Boolean,
    overlayView: OverlayView,
    onUndo: () -> Unit,
    onReset: () -> Unit,
    onPromote: (String) -> Unit,
    onCalibrate: () -> Unit,
    onRecalibrate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Auto-select CAMERA when no board frame yet, so user immediately sees the camera feed.
    val effectiveView =
        if (board == null && state.trackerState == com.chesslab.engine.api.TrackerState.WAITING_BOARD) {
            OverlayView.CAMERA
        } else {
            overlayView
        }

    var confirmReset by remember { mutableStateOf(false) }
    var confirmRecalibrate by remember { mutableStateOf(false) }

    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TrackingHeader(state.trackerState, state.lastMoveSan)

        // Accessibility live region: announces each committed move once.
        Text(
            text = state.announcement?.text.orEmpty(),
            style = MaterialTheme.typography.bodySmall,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .semantics {
                        liveRegion = LiveRegionMode.Assertive
                        contentDescription = state.announcement?.text.orEmpty()
                    },
        )

        if (!calibrated) CalibratePrompt(onCalibrate)

        if (state.trackerState == com.chesslab.engine.api.TrackerState.STUCK || state.alarm != null) {
            RecoveryCard(onTakeBack = onUndo, onRecalibrate = { confirmRecalibrate = true })
        }

        // Show the real cropped/warped camera board whenever tracking has produced
        // one (or the live camera while still searching for the board). The synthetic
        // FEN board is only a fallback before the first warped frame.
        if (board != null || effectiveView == OverlayView.CAMERA) {
            OverlayBoard(
                view = effectiveView,
                bitmap = board,
                rawPreview = rawPreview,
                debug = state.debug,
                fen = state.fen,
                modifier = Modifier.fillMaxWidth().heightIn(max = 360.dp),
                showGrid = showDebug,
            )
        } else {
            ChessBoard(fen = state.fen, modifier = Modifier.fillMaxWidth().heightIn(max = 360.dp))
        }

        if (state.note.isNotBlank() && state.trackerState != com.chesslab.engine.api.TrackerState.STUCK) {
            Text(
                text = state.note,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        MoveList(state.san)

        // Row 1 — move corrections (frequent, low-risk).
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = onUndo,
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.action_undo)) }
        }

        // Row 2 — session / geometry (infrequent, confirm before firing).
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TextButton(
                onClick = { confirmReset = true },
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.action_reset_game)) }
            OutlinedButton(
                onClick = { confirmRecalibrate = true },
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.action_recalibrate)) }
        }

        if (showDebug) DebugCard(state.debug)
    }

    if (confirmReset) {
        ConfirmDialog(
            title = stringResource(R.string.confirm_reset_title),
            message = stringResource(R.string.confirm_reset_message),
            onConfirm = {
                confirmReset = false
                onReset()
            },
            onDismiss = { confirmReset = false },
        )
    }
    if (confirmRecalibrate) {
        ConfirmDialog(
            title = stringResource(R.string.confirm_recalibrate_title),
            message = stringResource(R.string.confirm_recalibrate_message),
            onConfirm = {
                confirmRecalibrate = false
                onRecalibrate()
            },
            onDismiss = { confirmRecalibrate = false },
        )
    }

    val promotion = state.promotion
    if (promotion != null) {
        AlertDialog(
            onDismissRequest = {},
            title = { Text(stringResource(R.string.promotion_title)) },
            text = { Text(stringResource(R.string.promotion_message, promotion.from, promotion.to)) },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (piece in listOf("Q", "R", "B", "N")) {
                        TextButton(onClick = { onPromote(piece) }) { Text(piece) }
                    }
                }
            },
        )
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun TrackingHeader(
    trackerState: com.chesslab.engine.api.TrackerState,
    lastMove: String?,
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.tracking_title), style = MaterialTheme.typography.headlineSmall)
            StatusChip(state = trackerState)
        }
        if (lastMove != null) {
            Text(
                text = stringResource(R.string.tracking_last_move, lastMove),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun RecoveryCard(
    onTakeBack: () -> Unit,
    onRecalibrate: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(R.string.recovery_title),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onErrorContainer,
            )
            Text(
                stringResource(R.string.recovery_message),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onErrorContainer,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = onTakeBack, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(stringResource(R.string.alarm_take_back))
                }
                OutlinedButton(onClick = onRecalibrate, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(stringResource(R.string.action_recalibrate))
                }
            }
        }
    }
}

/**
 * Empty-state prompt shown before a board is calibrated: guides the user to aim
 * the camera and start calibration.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun CalibratePrompt(onCalibrate: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.calib_prompt), style = MaterialTheme.typography.bodyMedium)
            Button(onClick = onCalibrate, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(stringResource(R.string.calib_start))
            }
        }
    }
}

/** Generic confirm dialog for destructive session/geometry actions. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun ConfirmDialog(
    title: String,
    message: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(message) },
        confirmButton = { TextButton(onClick = onConfirm) { Text(stringResource(R.string.action_confirm)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) } },
    )
}

/**
 * Referee alarm banner (ports the Python alarm banner, 455d066/f6960f8): red, a TalkBack
 * live region, with a one-shot alert tone at most once per 30 s. Offers the user a
 * take-back (whole-board match auto-clears the alarm) or recalibrate (geometry drift).
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming", "UnusedPrivateMember")
@Composable
private fun AlarmBanner(
    alarm: AlarmUi,
    note: String,
    onTakeBack: () -> Unit,
    onRecalibrate: () -> Unit,
) {
    val text = stringResource(R.string.alarm_banner, alarm.detail)
    Card(
        colors =
            androidx.compose.material3.CardDefaults
                .cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = text,
                color = MaterialTheme.colorScheme.onErrorContainer,
                style = MaterialTheme.typography.titleMedium,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .semantics {
                            liveRegion = LiveRegionMode.Assertive
                            contentDescription = text
                        },
            )
            if (note.isNotBlank()) {
                Text(
                    text = note,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TextButton(onClick = onTakeBack) { Text(stringResource(R.string.alarm_take_back)) }
                TextButton(onClick = onRecalibrate) { Text(stringResource(R.string.action_recalibrate)) }
            }
        }
    }
    androidx.compose.runtime.LaunchedEffect(Unit) { playAlarmTone() }
}

private var lastAlarmToneMs = 0L
private const val ALARM_TONE_COOLDOWN_MS = 30_000L
private const val ALARM_TONE_DURATION_MS = 400
private const val TONE_RELEASE_SLACK_MS = 200L

/** One-shot alert tone, at most once per 30 s (f6960f8 beep cooldown); no asset files. */
private fun playAlarmTone() {
    val now = android.os.SystemClock.elapsedRealtime()
    if (now - lastAlarmToneMs < ALARM_TONE_COOLDOWN_MS) return
    lastAlarmToneMs = now
    runCatching {
        val tone =
            android.media.ToneGenerator(
                android.media.AudioManager.STREAM_NOTIFICATION,
                android.media.ToneGenerator.MAX_VOLUME,
            )
        tone.startTone(android.media.ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, ALARM_TONE_DURATION_MS)
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(
            { tone.release() },
            ALARM_TONE_DURATION_MS + TONE_RELEASE_SLACK_MS,
        )
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun MoveList(san: List<String>) {
    val text =
        san
            .chunked(2)
            .mapIndexed { i, pair ->
                "${i + 1}. ${pair.joinToString(" ")}"
            }.joinToString("  ")
    Text(
        text = text.ifEmpty { stringResource(R.string.moves_empty) },
        style = MaterialTheme.typography.bodyLarge,
        fontFamily = FontFamily.Monospace,
        maxLines = 1,
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
    )
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun DebugCard(debug: DebugSnapshot) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(stringResource(R.string.debug_title), style = MaterialTheme.typography.titleSmall)
            DebugRow(stringResource(R.string.debug_fps), "%.1f".format(debug.fps))
            DebugRow(stringResource(R.string.debug_motion), "%.4f / %.4f".format(debug.motion, debug.motionThr))
            DebugRow(stringResource(R.string.debug_changed), debug.changed.joinToString(" ").ifEmpty { "-" })
            DebugRow(
                stringResource(R.string.debug_scores),
                "%.2f / %.2f (Δ%.2f)".format(debug.bestScore, debug.secondScore, debug.margin),
            )
            DebugRow(stringResource(R.string.debug_candidate), debug.candidate ?: "-")
            DebugRow(stringResource(R.string.debug_decider), debug.decider ?: "-")
            DebugRow(stringResource(R.string.debug_stuck), debug.stuckReason ?: "-")
            DebugRow(stringResource(R.string.debug_confirm), debug.confirmCount.toString())
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun DebugRow(
    label: String,
    value: String,
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall)
        Text(value, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
    }
}
