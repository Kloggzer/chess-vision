package com.chesslab.tracker.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.R
import com.chesslab.tracker.service.OverlayView
import com.chesslab.tracker.ui.theme.BoardPalette

/** The primary board view mode: the digital rendered board, or the live/warped video feed. */
enum class BoardMode { RENDERED, VIDEO }

/** Video sub-views in picker order; the list index maps to the underlying [OverlayView]. */
val VIDEO_SUBVIEWS: List<OverlayView> =
    listOf(OverlayView.CAMERA, OverlayView.BOARD, OverlayView.DIFF, OverlayView.SHADOW, OverlayView.OCCLUSION)

/** What [OverlayBoard] should draw once the two-level switch and waiting-fallback are resolved. */
data class BoardRender(
    val rendered: Boolean,
    val view: OverlayView,
)

/**
 * Resolve the two-level board switch to a concrete [OverlayBoard] instruction. When no board
 * frame exists yet and the tracker is still searching, the live camera is forced regardless of
 * [mode] so the empty state shows the feed; otherwise Rendered draws the synthetic board and
 * Video draws the selected [subView].
 */
fun resolveBoardRender(
    mode: BoardMode,
    subView: OverlayView,
    hasBoard: Boolean,
    state: TrackerState,
): BoardRender =
    when {
        !hasBoard && state == TrackerState.WAITING_BOARD -> BoardRender(rendered = false, view = OverlayView.CAMERA)
        mode == BoardMode.RENDERED -> BoardRender(rendered = true, view = OverlayView.BOARD)
        else -> BoardRender(rendered = false, view = subView)
    }

private const val BOARD_MAX_DP = 360

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod", "LongParameterList")
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
    var boardMode by rememberSaveable { mutableStateOf(BoardMode.RENDERED) }
    var subView by rememberSaveable { mutableStateOf(OverlayView.BOARD) }
    var confirmReset by remember { mutableStateOf(false) }
    var confirmRecalibrate by remember { mutableStateOf(false) }
    var debugExpanded by rememberSaveable { mutableStateOf(false) }

    val render = resolveBoardRender(boardMode, subView, board != null, state.trackerState)

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TrackingAppBar(state.trackerState, state.lastMoveSan)

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

            if (state.trackerState == TrackerState.STUCK || state.alarm != null) {
                RecoveryCard(onTakeBack = onUndo, onRecalibrate = { confirmRecalibrate = true })
            }

            BoardFrame(video = boardMode == BoardMode.VIDEO, modifier = Modifier.fillMaxWidth()) {
                OverlayBoard(
                    view = render.view,
                    bitmap = board,
                    rawPreview = rawPreview,
                    debug = state.debug,
                    fen = state.fen,
                    modifier = Modifier.fillMaxWidth().heightIn(max = BOARD_MAX_DP.dp),
                    renderedMode = render.rendered,
                    showGrid = showDebug,
                )
            }

            ViewSwitch(
                boardMode = boardMode,
                subView = subView,
                onModeChange = { boardMode = it },
                onSubViewChange = { subView = it },
            )

            if (state.note.isNotBlank() && state.trackerState != TrackerState.STUCK) {
                Text(
                    text = state.note,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            MoveStrip(state.san)

            ActionRows(
                onUndo = onUndo,
                onReset = { confirmReset = true },
                onRecalibrate = { confirmRecalibrate = true },
            )

            if (showDebug) {
                DebugPanel(
                    debug = state.debug,
                    expanded = debugExpanded,
                    onToggle = { debugExpanded = !debugExpanded },
                )
            }
        }
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
private fun TrackingAppBar(
    trackerState: TrackerState,
    lastMove: String?,
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(stringResource(R.string.tracking_title), style = MaterialTheme.typography.headlineSmall)
            StatusPill(state = trackerState)
        }
        if (lastMove != null) {
            Text(
                text = stringResource(R.string.tracking_last_move, lastMove),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** Two-level board-view switch: `Rendered | Video`, with the five debug sub-views under Video. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun ViewSwitch(
    boardMode: BoardMode,
    subView: OverlayView,
    onModeChange: (BoardMode) -> Unit,
    onSubViewChange: (OverlayView) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SegmentedToggle(
            options =
                listOf(
                    stringResource(R.string.board_mode_rendered),
                    stringResource(R.string.board_mode_video),
                ),
            selectedIndex = if (boardMode == BoardMode.RENDERED) 0 else 1,
            onSelect = { onModeChange(if (it == 0) BoardMode.RENDERED else BoardMode.VIDEO) },
            modifier = Modifier.fillMaxWidth(),
        )
        if (boardMode == BoardMode.VIDEO) {
            SubTabRow(
                labels = subViewLabels(),
                selected = VIDEO_SUBVIEWS.indexOf(subView).coerceAtLeast(0),
                onSelect = { onSubViewChange(VIDEO_SUBVIEWS[it]) },
                accentFor = { subViewAccent(it) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun subViewLabels(): List<String> =
    listOf(
        stringResource(R.string.overlay_raw),
        stringResource(R.string.overlay_warped),
        stringResource(R.string.overlay_diff),
        stringResource(R.string.overlay_shadow),
        stringResource(R.string.overlay_occlusion),
    )

private const val SUBVIEW_DIFF = 2
private const val SUBVIEW_SHADOW = 3
private const val SUBVIEW_OCCLUSION = 4

@Composable
private fun subViewAccent(index: Int): Color =
    when (index) {
        SUBVIEW_DIFF -> BoardPalette.MarkChanged
        SUBVIEW_SHADOW -> BoardPalette.MarkShadow
        SUBVIEW_OCCLUSION -> BoardPalette.MarkOcclusion
        else -> MaterialTheme.colorScheme.primary
    }

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun ActionRows(
    onUndo: () -> Unit,
    onReset: () -> Unit,
    onRecalibrate: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            GhostButton(onClick = onUndo) { Text(stringResource(R.string.action_undo)) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            QuietButton(onClick = onReset) { Text(stringResource(R.string.action_reset_game)) }
            GhostButton(onClick = onRecalibrate) { Text(stringResource(R.string.action_recalibrate)) }
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
private fun MoveStrip(san: List<String>) {
    if (san.isEmpty()) {
        Text(
            text = stringResource(R.string.moves_empty),
            style = MaterialTheme.typography.bodyLarge,
            fontFamily = FontFamily.Monospace,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
        )
        return
    }
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        san.forEachIndexed { index, move ->
            val isLast = index == san.lastIndex
            if (index % 2 == 0) {
                Text(
                    text = "${index / 2 + 1}.",
                    style = MaterialTheme.typography.bodyLarge,
                    fontFamily = FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = move,
                style = MaterialTheme.typography.bodyLarge,
                fontFamily = FontFamily.Monospace,
                color = if (isLast) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun DebugPanel(
    debug: DebugSnapshot,
    expanded: Boolean,
    onToggle: () -> Unit,
) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium)
                .padding(horizontal = 12.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        val title = stringResource(R.string.debug_title)
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .clickable(onClick = onToggle)
                    .semantics { contentDescription = title },
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Icon(
                imageVector = if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = title,
            )
        }
        if (expanded) {
            KeyValueRow(stringResource(R.string.debug_fps), "%.1f".format(debug.fps))
            KeyValueRow(stringResource(R.string.debug_motion), "%.4f / %.4f".format(debug.motion, debug.motionThr))
            KeyValueRow(stringResource(R.string.debug_changed), debug.changed.joinToString(" ").ifEmpty { "-" })
            KeyValueRow(
                stringResource(R.string.debug_scores),
                "%.2f / %.2f (Δ%.2f)".format(debug.bestScore, debug.secondScore, debug.margin),
            )
            KeyValueRow(stringResource(R.string.debug_candidate), debug.candidate ?: "-")
            KeyValueRow(stringResource(R.string.debug_decider), debug.decider ?: "-")
            KeyValueRow(stringResource(R.string.debug_stuck), debug.stuckReason ?: "-")
            KeyValueRow(stringResource(R.string.debug_confirm), debug.confirmCount.toString())
        }
    }
}
