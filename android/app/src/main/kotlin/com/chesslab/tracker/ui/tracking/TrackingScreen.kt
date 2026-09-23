package com.chesslab.tracker.ui.tracking

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.AnalysisSettingsHost
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.UNKNOWN
import com.chesslab.tracker.games.resultFromFen
import com.chesslab.tracker.hints.HintHost
import com.chesslab.tracker.hints.HintPlan
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.ConfirmDialog
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SourceFramedPreview
import com.chesslab.tracker.ui.analysis.AnalysisHost
import com.chesslab.tracker.ui.analysis.EvalBarSlot
import com.chesslab.tracker.ui.analysis.rememberRunningAnalysis
import com.chesslab.tracker.ui.calibration.CalibrationState
import com.chesslab.tracker.ui.calibration.LocalCalibrationHost
import com.chesslab.tracker.ui.camera.rememberBoardModel
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.ResultChips
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.review.SpectatorShareCard
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.withContext

@Composable
fun TrackingRoute(
    onBack: () -> Unit,
    onCamera: () -> Unit,
    onGameSaved: (String) -> Unit,
    onGameDiscarded: () -> Unit,
    viewModel: TrackingViewModel = viewModel(),
) {
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    // The run switch, not the session: between the tap and the first callback tracking is on without one.
    val running by TrackerRun.running.collectAsStateWithLifecycle()
    LaunchedEffect(session) { viewModel.attach(session ?: NoTrackerSession) }
    LaunchedEffect(running) { viewModel.tracking = running }
    LaunchedEffect(viewModel) { viewModel.recalibrateRequests.collect { onCamera() } }
    ScreenBlackout { TrackingScreen(viewModel, running, onBack, onGameSaved, onGameDiscarded) }
}

/** One state, not five booleans: at most one is up, and five flags made that an unenforced invariant. */
private enum class TrackerModal {
    NONE,
    ENDING,
    RECALIBRATING,
    SHARE,
    HINT_SETUP,
}

@Composable
private fun TrackingScreen(
    viewModel: TrackingViewModel,
    running: Boolean,
    onBack: () -> Unit,
    onGameSaved: (String) -> Unit,
    onGameDiscarded: () -> Unit,
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val preview by viewModel.preview.collectAsStateWithLifecycle()
    val cameraOn by viewModel.cameraOn.collectAsStateWithLifecycle()
    // The live game lives in the service: that is what lets a game be SAVED where it is played.
    val games by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (games?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    var modal by remember { mutableStateOf(TrackerModal.NONE) }
    var showPreview by remember { mutableStateOf(false) }
    val torchOn by viewModel.torchOn.collectAsStateWithLifecycle()
    val automaticCalibration = rememberAutomaticCalibration()
    var hintAsked by remember { mutableStateOf(false) }

    // Gewaehlt beim PARTIESTART, gilt bis zum Ende: gefragt wird, sobald ein Brett da ist und kein Zug steht.
    LaunchedEffect(running, ui.ready, live.moveCount) {
        if (!running) hintAsked = false
        if (running && ui.ready && live.moveCount == 0 && !hintAsked) {
            hintAsked = true
            modal = TrackerModal.HINT_SETUP
        }
    }

    // No way back to the old quad; with no moves committed there is nothing to lose (specs/48 rule 6).
    val onRecalibrate = {
        if (live.moveCount > 0) modal = TrackerModal.RECALIBRATING else viewModel.onRecalibrate()
    }

    ChesslabScaffold(
        title = if (ui.ready) "Game" else "Set up the board",
        onBack = onBack,
        actions = {
            // Their TEXT twins stay in the overflow: `android-ui.ps1 tap-text "Camera view"` drives those.
            if (viewModel.hasTorch) {
                BarToggle(R.drawable.ic_camera_light, R.string.tracking_light, torchOn, viewModel::onToggleTorch)
            }
            // In the not-ready layout the raw camera IS the picture: nothing to toggle.
            if (ui.ready) {
                BarToggle(R.drawable.ic_camera_view, R.string.tracking_camera_view, showPreview) { showPreview = !showPreview }
            }
            TrackerMenu(
                viewModel = viewModel,
                cameraOn = cameraOn,
                showPreview = showPreview,
                onTogglePreview = { showPreview = !showPreview },
                onShare = { modal = TrackerModal.SHARE },
                onRecalibrate = onRecalibrate,
            )
        },
    ) { bars ->
        TrackingBody(
            viewModel = viewModel,
            ui = ui,
            game = live.game,
            games = games,
            camera = preview.takeIf { showPreview },
            running = running,
            calibration = automaticCalibration,
            modifier = Modifier.padding(bars),
            onEndGame = { modal = TrackerModal.ENDING },
        )
    }

    TrackingModals(
        viewModel = viewModel,
        games = games,
        moves = live.moveCount,
        modal = modal,
        onGameSaved = onGameSaved,
        onGameDiscarded = onGameDiscarded,
        onModal = { modal = it },
    )
}

@Composable
private fun rememberAutomaticCalibration(): CalibrationState? {
    val scope = rememberCoroutineScope()
    val host = LocalCalibrationHost.current ?: return null
    val model = rememberBoardModel(host, scope, stopAfterSaved = true)
    model.onAdopted = { profile -> host.onCalibrated(profile.geometry(), profile.corners, profile.name) }
    return model.state.collectAsStateWithLifecycle().value
}

/** Undo, Stop tracking and End game need no confirmation: Undo IS the reversal, the others save the game. */
@Composable
private fun TrackingModals(
    viewModel: TrackingViewModel,
    games: GameSessionController?,
    moves: Int,
    modal: TrackerModal,
    onGameSaved: (String) -> Unit,
    onGameDiscarded: () -> Unit,
    onModal: (TrackerModal) -> Unit,
) {
    val context = LocalContext.current
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val promotion by viewModel.promotion.collectAsStateWithLifecycle()
    val acceptCnn by viewModel.acceptCnn.collectAsStateWithLifecycle()
    val close = { onModal(TrackerModal.NONE) }
    // The record goes with the engine reset: resetting only the engine left the discarded game in the service,
    // and its next ply opened a seam inside a game the user had thrown away.
    when (modal) {
        TrackerModal.SHARE -> ShareDialog(close)
        TrackerModal.ENDING ->
            EndGameDialog(
                moves = moves,
                fen = ui.fen,
                onSave = { white, black, result ->
                    // Das Kontingent haengt an der Partiegrenze im Record, nicht an der Reihenfolge zweier Aufrufe.
                    val saved = games?.endAndSave(white, black, result)
                    close()
                    TrackerRun.stop(context)
                    if (saved != null) onGameSaved(saved.id) else onGameDiscarded()
                },
                onReseed = {
                    games?.discard()
                    close()
                    TrackerRun.stop(context)
                    onGameDiscarded()
                },
                onDismiss = close,
            )
        TrackerModal.RECALIBRATING ->
            ConfirmDialog(
                title = "Recalibrate mid-game?",
                body =
                    "$moves moves have been tracked against the current board geometry. Fitting a " +
                        "new grid replaces it, and the old one is not kept.",
                verb = "Recalibrate",
                onConfirm = {
                    close()
                    viewModel.onRecalibrate()
                },
                onDismiss = close,
            )
        TrackerModal.HINT_SETUP ->
            HintSetupDialog(
                onStart = {
                    HintHost.controller.startGame(it)
                    close()
                },
                // Kein Plan ist ein gueltiger Plan: ohne Seite erscheint kein Knopf.
                onDismiss = {
                    HintHost.controller.startGame(HintPlan())
                    close()
                },
            )
        TrackerModal.NONE -> Unit
    }
    acceptCnn?.let {
        AcceptCnnDialog(
            preview = it,
            onConfirm = viewModel::onAcceptCnnConfirmed,
            onCancel = viewModel::onAcceptCnnCancelled,
        )
    }
    promotion?.let { PromotionDialog(prompt = it, fen = ui.fen, onChoose = viewModel::onPromotionChosen) }
}

/** `contentDescription` is not decoration: `android-ui.ps1 tap-description` reads Compose semantics. The
 *  tint is the state and the description one word either way — a changing label cannot be tapped. */
@Composable
private fun BarToggle(
    @DrawableRes icon: Int,
    @StringRes label: Int,
    on: Boolean,
    onClick: () -> Unit,
) {
    IconButton(onClick = onClick) {
        Icon(
            painter = painterResource(icon),
            contentDescription = stringResource(label),
            tint = if (on) Accent else OnSurfaceMuted,
        )
    }
}

/** FIXED labels with the state in a second `Text`, so `tap-text "Camera view"` works either way. */
@Composable
private fun RowScope.TrackerMenu(
    viewModel: TrackingViewModel,
    cameraOn: Boolean,
    showPreview: Boolean,
    onTogglePreview: () -> Unit,
    onShare: () -> Unit,
    onRecalibrate: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    val torchOn by viewModel.torchOn.collectAsStateWithLifecycle()
    IconButton(onClick = { open = true }) {
        Icon(Icons.Filled.MoreVert, contentDescription = "More")
    }
    DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
        // A repair, not one of a running game's acts; it keeps its confirmation.
        DropdownMenuItem(text = { Text("Recalibrate") }, onClick = {
            onRecalibrate()
            open = false
        })
        MenuToggle("Camera view", showPreview) {
            onTogglePreview()
            open = false
        }
        // Says what the camera IS: the service holds the device as long as it runs, backgrounded or not.
        MenuToggle("Tracking camera", cameraOn) {
            viewModel.onToggleCamera()
            open = false
        }
        if (viewModel.hasTorch) {
            MenuToggle("Light", torchOn) {
                viewModel.onToggleTorch()
                open = false
            }
        }
        DropdownMenuItem(text = { Text("Share on Wi-Fi") }, onClick = {
            onShare()
            open = false
        })
    }
}

@Composable
private fun MenuToggle(
    label: String,
    on: Boolean,
    onClick: () -> Unit,
) {
    DropdownMenuItem(
        text = {
            Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                Text(label)
                Text(if (on) "on" else "off", color = if (on) Accent else OnSurfaceMuted)
            }
        },
        onClick = onClick,
    )
}

@Composable
private fun ShareDialog(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done", color = Accent) } },
        title = { Text("Share on Wi-Fi", color = OnSurface) },
        text = { SpectatorShareCard() },
    )
}

/** **Two jobs, two layouts** (specs/49): making the camera work and watching a game. [TrackingSwitch] sits
 *  outside the branch: both states share it, at the bottom. */
@Composable
private fun TrackingBody(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    game: GameView,
    games: GameSessionController?,
    camera: android.graphics.Bitmap?,
    running: Boolean,
    calibration: CalibrationState?,
    modifier: Modifier = Modifier,
    onEndGame: () -> Unit,
) {
    Column(
        modifier.fillMaxSize().padding(vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        if (ui.ready) {
            StatusLine(ui)
            Watching(viewModel, ui, game, games, camera, running, onEndGame)
        } else {
            NotReady(viewModel, ui, calibration)
            if (running) OutlineAction("End game", onEndGame, Modifier.fillMaxWidth())
        }
        TrackingSwitch(running)
    }
}

/** **B — tracking.** Nothing filled while nominal; the alarm card is the exception. */
@Composable
private fun ColumnScope.Watching(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    game: GameView,
    games: GameSessionController?,
    camera: android.graphics.Bitmap?,
    running: Boolean,
    onEndGame: () -> Unit,
) {
    val lastCommit = viewModel.lastCommit.collectAsStateWithLifecycle().value
    // EIN Analyse-Host je Schirm; die Hilfe haelt ihn am Leben, ohne `gateBlock` aufzuheben.
    val analysis = rememberRunningAnalysis { HintHost.controller.state.value.plan.side != null }
    val hint by HintHost.controller.state.collectAsStateWithLifecycle()
    val onHint = rememberHintRequest(viewModel, games, analysis, ui.fen)
    // ONE reserved line: the most volatile string, and reflowing it shifts every button under the thumb.
    // Blank while alarmed: the note is also the notification text ("Open the app to fix it").
    Text(
        text = if (ui.alarm != null) " " else ui.infoLine ?: " ",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
        minLines = 1,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
    // The camera takes the BOARD's slot: turned on, you are diagnosing square by square from the lens.
    BoardRow(ui, game.plies.lastOrNull()?.uci, analysis, camera)
    hint.outcome?.let { HintCard(it, speechLanguage(), HintHost.controller::dismiss) }
    ui.alarm?.let {
        AlarmCard(
            alarm = it,
            onAcceptCnn = viewModel::onAcceptCnnRequested,
            onUndo = viewModel::onUndo,
            onNewBaseline = viewModel::onNewBaseline,
            lastCommit = lastCommit,
        )
    }
    if (game.plies.isNotEmpty()) {
        LastMoves(game = game, modifier = Modifier.weight(1f, fill = false))
    }
    // Keeps the controls at a predictable thumb position instead of floating up on tall screens.
    Spacer(Modifier.weight(1f))
    // Nie von selbst. Waehrend des Alarms IST die Karte der Job des Schirms (Regel 3).
    HintSlot(HintHost.controller, ui.fen, ui.alarm != null, running, onHint)
    if (running) {
        ActionBar(
            onUndo = viewModel::onUndo,
            undoLabel = pluralStringResource(R.plurals.tracking_take_back, undoCount(lastCommit), undoCount(lastCommit)),
            onEndGame = onEndGame,
        )
    }
}

/** **A — not ready.** The picture takes the space: the board would be the position the app BELIEVES,
 *  an unrelated picture here. */
@Composable
private fun ColumnScope.NotReady(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    calibration: CalibrationState?,
) {
    val preview by viewModel.rawPreview.collectAsStateWithLifecycle()
    val rotation by viewModel.previewRotation.collectAsStateWithLifecycle()
    // No service, no camera: a box saying "No camera frame yet" is the empty container this layout removes.
    if (ui.task == TrackerTask.START) {
        Spacer(Modifier.weight(1f))
    } else {
        // A sibling, not the overlay: the overlay slot sits INSIDE the rotated image and inherits its quarter turn.
        Box(Modifier.fillMaxWidth().weight(1f)) {
            SourceFramedPreview(
                preview = preview,
                rotationDegrees = rotation,
                sourceWidth = preview?.width ?: 0,
                sourceHeight = preview?.height ?: 0,
                modifier =
                    Modifier
                        .fillMaxSize()
                        .border(Stroke.hairline, Outline, RoundedCornerShape(Radius.md))
                        .clip(RoundedCornerShape(Radius.md)),
                empty = { Text("No camera frame yet", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted) },
            )
            AimGuide()
            Text(
                calibration?.note ?: ui.infoLine ?: stringResource(R.string.tracking_aim),
                style = MaterialTheme.typography.bodyMedium,
                color = SETUP_HINT_TEXT,
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(Space.md)
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = SETUP_HINT_ALPHA), RoundedCornerShape(Radius.md))
                        .padding(Space.md),
            )
        }
    }
    // The ONE filled button is whatever the screen needs NOW; `START` has `TrackingSwitch` already.
    when (ui.task) {
        TrackerTask.CALIBRATE -> Unit
        TrackerTask.RESUME_CAMERA -> FilledAction("Resume camera", viewModel::onToggleCamera, Modifier.fillMaxWidth())
        TrackerTask.START, TrackerTask.WATCH -> Unit
    }
}

/** A CONSTANT inset, never `ui.corners`: a guide that looked like a detection would claim a find. */
@Composable
private fun AimGuide() {
    val colour = Outline.copy(alpha = AIM_ALPHA)
    Canvas(Modifier.fillMaxSize()) {
        val inset = AIM_INSET.toPx()
        val side = minOf(size.width, size.height) - 2 * inset
        if (side <= 0f) return@Canvas
        drawRoundRect(
            color = colour,
            topLeft = Offset((size.width - side) / 2f, (size.height - side) / 2f),
            size = Size(side, side),
            cornerRadius = CornerRadius(inset),
            style =
                androidx.compose.ui.graphics.drawscope.Stroke(
                    width = Stroke.thick.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(AIM_DASH, AIM_DASH)),
                ),
        )
    }
}

private val AIM_INSET = 24.dp

private const val AIM_ALPHA = 0.6f

private const val AIM_DASH = 24f

private const val SETUP_HINT_ALPHA = 0.72f

private val SETUP_HINT_TEXT = Color(0xFFEDE3D2)

/** **Absent, not empty** when analysis is off. `IntrinsicSize.Min` is load-bearing: without it the bar
 *  claimed the whole column and pushed the action bar off-screen. */
@Composable
private fun BoardRow(
    ui: TrackingUiState,
    lastMoveUci: String?,
    host: AnalysisHost,
    camera: android.graphics.Bitmap? = null,
) {
    val settings by AnalysisSettingsHost.settings.collectAsStateWithLifecycle()
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        if (settings.enabled) EvalBarSlot(host)
        if (camera != null) {
            BoardPreview(bitmap = camera, overlay = ui.overlay, modifier = Modifier.weight(1f).aspectRatio(1f))
        } else {
            BoardCanvas(
                fen = ui.fen,
                modifier = Modifier.weight(1f),
                lastMoveUci = lastMoveUci,
                alarmed = ui.boardTinted,
            )
        }
    }
}

/** Whose move and which move, not the frame rate (debug Timings). The dot carries the state colour. */
@Composable
private fun StatusLine(ui: TrackingUiState) {
    val tone = toneColor(ui.tone)
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm), verticalAlignment = Alignment.CenterVertically) {
            Canvas(Modifier.size(STATE_DOT)) { drawCircle(tone) }
            Text(stringResource(labelText(ui.state)), style = MaterialTheme.typography.titleMedium, color = tone, maxLines = 1)
        }
        if (ui.ready) {
            Text(
                moveLine(ui.turn, ui.moveNumber),
                style = MaterialTheme.typography.labelLarge,
                color = OnSurfaceMuted,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun moveLine(
    turn: Turn?,
    moveNumber: Int?,
): String =
    listOfNotNull(
        turn?.let { stringResource(if (it == Turn.WHITE) R.string.tracking_turn_white else R.string.tracking_turn_black) },
        moveNumber?.let { stringResource(R.string.tracking_move_number, it) },
    ).joinToString(" · ")

private val STATE_DOT = 10.dp

@StringRes
private fun labelText(label: TrackerLabel): Int =
    when (label) {
        TrackerLabel.LIVE -> R.string.tracking_state_live
        TrackerLabel.HAND_OVER_BOARD -> R.string.tracking_state_hand
        TrackerLabel.NO_DETECTION -> R.string.tracking_state_no_detection
        TrackerLabel.POSITION_LOST -> R.string.tracking_state_lost
        TrackerLabel.CAMERA_OFF -> R.string.tracking_state_camera_off
        TrackerLabel.NOT_TRACKING -> R.string.tracking_state_off
    }

@Composable
private fun toneColor(tone: StateTone): Color =
    when (tone) {
        StateTone.Idle -> OnSurface
        StateTone.Busy -> Busy
        StateTone.Active -> Accent
        StateTone.Alarm -> Danger
    }

/** Recalibrate is in the overflow: a repair, not a move — and never sharing a handler with Reset game. */
@Composable
private fun ActionBar(
    onUndo: () -> Unit,
    undoLabel: String,
    onEndGame: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        // One press unwinds the last COMMIT, and a recovery commits a whole bridge. No confirmation: it IS the reversal.
        OutlineAction(undoLabel, onUndo, Modifier.weight(1f))
        OutlineAction("End game", onEndGame, Modifier.weight(1f))
    }
}

/** **It always saves**: deleting belongs on Games, where you see what you delete. **The result is asked
 *  for**: `resultFromFen` sees only mate and draw rules; where the board knows, it is stated. The default
 *  is UNFINISHED — honest and correctable. Names are pre-filled; nothing is asked before the first move. */
@Composable
private fun EndGameDialog(
    moves: Int,
    fen: String,
    onSave: (String, String, GameResult) -> Unit,
    onReseed: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    var white by remember { mutableStateOf("") }
    var black by remember { mutableStateOf("") }
    val onBoard = remember(fen) { runCatching { resultFromFen(fen) }.getOrDefault(GameResult.UNFINISHED) }
    var result by remember(onBoard) { mutableStateOf(onBoard) }
    LaunchedEffect(Unit) {
        val last = withContext(Dispatchers.IO) { GameStore(gamesDir(context)).list().firstOrNull() }
        white = last?.white?.takeUnless { it == UNKNOWN }.orEmpty()
        black = last?.black?.takeUnless { it == UNKNOWN }.orEmpty()
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(if (moves > 0) R.string.endgame_title else R.string.endgame_new_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                if (moves == 0) {
                    Text(stringResource(R.string.endgame_nothing))
                    return@Column
                }
                if (onBoard == GameResult.UNFINISHED) {
                    ResultChips(result, { result = it })
                } else {
                    Text(stringResource(terminalText(onBoard)))
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                    OutlinedTextField(
                        white,
                        { white = it },
                        placeholder = { Text("White (optional)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        black,
                        { black = it },
                        placeholder = { Text("Black (optional)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { if (moves > 0) onSave(named(white), named(black), result) else onReseed() },
            ) {
                Text(stringResource(if (moves > 0) R.string.endgame_save else R.string.endgame_new), color = Accent)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.games_cancel), color = OnSurfaceMuted) }
        },
    )
}

@StringRes
private fun terminalText(result: GameResult): Int =
    when (result) {
        GameResult.WHITE -> R.string.endgame_mate_white
        GameResult.BLACK -> R.string.endgame_mate_black
        GameResult.DRAW -> R.string.endgame_drawn
        GameResult.UNFINISHED -> R.string.endgame_question
    }

/** A blank field is the store's "nobody said", not a player called "". */
private fun named(value: String): String = value.trim().ifBlank { UNKNOWN }

private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())
