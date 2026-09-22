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

/** The tracking route: binds the screen to the service's session and to navigation. */
@Composable
fun TrackingRoute(
    onBack: () -> Unit,
    onCamera: () -> Unit,
    onGameSaved: (String) -> Unit,
    onGameDiscarded: () -> Unit,
    viewModel: TrackingViewModel = viewModel(),
) {
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    // The run switch, not the session: between the tap and the service's first callback there is
    // no session and tracking is nevertheless on.
    val running by TrackerRun.running.collectAsStateWithLifecycle()
    LaunchedEffect(session) { viewModel.attach(session ?: NoTrackerSession) }
    LaunchedEffect(running) { viewModel.tracking = running }
    // Recalibrating IS the camera screen in board mode. There used to be a second route for it with
    // byte-identical arguments; an alias is not an intent.
    LaunchedEffect(viewModel) { viewModel.recalibrateRequests.collect { onCamera() } }
    ScreenBlackout { TrackingScreen(viewModel, running, onBack, onGameSaved, onGameDiscarded) }
}

/**
 * What is open on top of the board. One state rather than five booleans: at most one of these can be
 * up at a time, and five independent flags made that an invariant nothing enforced.
 */
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
    // The live game lives in the service, not in this screen's view model — the same handle Home and
    // the Games screen use. Reaching for it here is what lets a game be SAVED where it is played.
    val games by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (games?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    var modal by remember { mutableStateOf(TrackerModal.NONE) }
    var showPreview by remember { mutableStateOf(false) }
    val torchOn by viewModel.torchOn.collectAsStateWithLifecycle()
    val automaticCalibration = rememberAutomaticCalibration()
    var hintAsked by remember { mutableStateOf(false) }

    // Die Hilfe wird beim PARTIESTART gewaehlt und gilt bis zum Ende der Partie — das Kontingent
    // ist der Ausgleichsregler. Gefragt wird, sobald ein Brett da ist und noch kein Zug steht.
    LaunchedEffect(running, ui.ready, live.moveCount) {
        if (!running) hintAsked = false
        if (running && ui.ready && live.moveCount == 0 && !hintAsked) {
            hintAsked = true
            modal = TrackerModal.HINT_SETUP
        }
    }

    // Recalibrating replaces the geometry the running game has been tracked against, and there is no
    // way back to the old quad. With no moves committed there is nothing to lose (specs/48 rule 6),
    // and moving the control into the overflow does not change that.
    val onRecalibrate = {
        if (live.moveCount > 0) modal = TrackerModal.RECALIBRATING else viewModel.onRecalibrate()
    }

    ChesslabScaffold(
        title = if (ui.ready) "Game" else "Set up the board",
        onBack = onBack,
        actions = {
            // The two controls a failing board needs most, one tap from the board itself. Their
            // TEXT twins stay in the overflow: `scripts/android-ui.ps1 tap-text "Camera view"`
            // drives those, and a screen reader announces the state with them.
            if (viewModel.hasTorch) {
                BarToggle(R.drawable.ic_camera_light, R.string.tracking_light, torchOn, viewModel::onToggleTorch)
            }
            // In the not-ready layout the raw camera IS the picture, so a toggle for it would have
            // no state to change.
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

/** Detect and adopt a stable board directly in setup; the separate camera screen is optional. */
@Composable
private fun rememberAutomaticCalibration(): CalibrationState? {
    val scope = rememberCoroutineScope()
    val host = LocalCalibrationHost.current ?: return null
    val model = rememberBoardModel(host, scope, stopAfterSaved = true)
    model.onAdopted = { profile -> host.onCalibrated(profile.geometry(), profile.corners, profile.name) }
    return model.state.collectAsStateWithLifecycle().value
}

/**
 * Everything modal on this screen, kept out of the layout so the screen reads as a layout.
 *
 * Two of these are the acts that cannot be undone (specs/48 rule 6). Undo, Stop tracking and End
 * game are deliberately NOT among them: Undo IS the reversal, and the other two save the game on
 * the way out.
 */
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
    // The record must go with the engine reset. Resetting only the ENGINE left the discarded game
    // standing in the service, so the next ply was illegal from it and opened a seam inside a game
    // the user had just thrown away.
    when (modal) {
        TrackerModal.SHARE -> ShareDialog(close)
        TrackerModal.ENDING ->
            EndGameDialog(
                moves = moves,
                fen = ui.fen,
                onSave = { white, black, result ->
                    // Kein `HintHost.controller.endGame()` mehr: das Kontingent haengt an der
                    // Partiegrenze im Record, nicht an der Reihenfolge zweier Aufrufe hier.
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

/**
 * An icon in the app bar that is ON or OFF, and says which to a screen reader.
 *
 * `contentDescription` is not decoration here: `scripts/android-ui.ps1 tap-description` reads
 * Compose semantics, so an icon without one is a control no agent and no smoke test can reach
 * (`CLAUDE.md`). The tint is the state — `Accent` when on — and the description stays the same
 * word either way, because a label that changes wording is the same problem again.
 */
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

/**
 * Everything the action bar used to spend two rows of chips on — and, since specs/49, Recalibrate.
 *
 * The labels are FIXED words with the state beside them in a second `Text`, so `tap-text "Camera
 * view"` keeps working whichever way the toggle stands — a label that changes wording is a control
 * no agent and no smoke test can reach (`CLAUDE.md`).
 */
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
        // Recalibrating a board that is already tracking is a repair, not one of the three things a
        // running game is for. It kept its confirmation — a menu is not a licence.
        DropdownMenuItem(text = { Text("Recalibrate") }, onClick = {
            onRecalibrate()
            open = false
        })
        MenuToggle("Camera view", showPreview) {
            onTogglePreview()
            open = false
        }
        // The off switch says what the camera IS, not what the tap does: the service holds the
        // device for as long as it runs, backgrounded or not.
        MenuToggle("Tracking camera", cameraOn) {
            viewModel.onToggleCamera()
            open = false
        }
        if (viewModel.hasTorch) {
            // It re-measures the optics and re-takes the baseline; see `TorchControl`.
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

/**
 * Putting the board on the Wi-Fi, from the screen that IS the board.
 *
 * This card used to be the whole unique content of a top-level "Spectator" destination whose board
 * and move list were this screen's, from the same `GameView`.
 */
@Composable
private fun ShareDialog(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done", color = Accent) } },
        title = { Text("Share on Wi-Fi", color = OnSurface) },
        text = { SpectatorShareCard() },
    )
}

/**
 * **Two jobs, two layouts** (specs/49). Getting the camera working and watching a game need
 * different content, and one arrangement for both left roughly half the screen inert in either
 * state: an eval bar with nothing to evaluate, a ~500 px box holding "No moves yet", and — on the
 * screen that OWNS the camera — no camera, so a failing calibration could not be seen at all.
 *
 * [TrackingSwitch] is outside the branch because starting and stopping is the one control both
 * states share, and it is the bottom of the screen in both.
 */
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

/**
 * **B — tracking.** The job is to watch a game, so the game is what is on screen.
 *
 * Nothing here is filled while tracking is nominal: watching is not an act. The one exception is the
 * alarm card, which when the latch is up IS the screen's current job and carries its own resolution.
 */
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
    // EIN Analyse-Host je Schirm. Die Hilfe haelt ihn am Leben, wenn die Leiste aus ist — sie
    // hebt nur `enabled` auf, Hitze, Akku und Bildrate sperren weiter (`gateBlock`).
    val analysis = rememberRunningAnalysis { HintHost.controller.state.value.plan.side != null }
    val hint by HintHost.controller.state.collectAsStateWithLifecycle()
    val onHint = rememberHintRequest(viewModel, games, analysis, ui.fen)
    // ONE reserved line, and it is the most volatile string on the screen — reflowing it above the
    // board shifts every button under the user's thumb. It reserved TWO, for a not-calibrated
    // sentence that belongs to the other layout now and is printed there at full size. Blank while
    // alarmed: the note doubles as the NOTIFICATION text, so it then reads "Open the app to fix it"
    // directly above the card that carries the buttons.
    Text(
        text = if (ui.alarm != null) " " else ui.infoLine ?: " ",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
        minLines = 1,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
    // The camera board takes the BOARD's slot, not the leftover space under it. Both show the
    // same 8x8; when you turn the camera on you are diagnosing, and the picture you need to
    // read square by square is the one from the lens.
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
    // The last three pairs, and absent while there are none. The scrolling score sheet that used to
    // sit here is a REVIEW component: it took the height the board wanted for rows nobody reads
    // while playing. What a player checks mid-game is whether the last move arrived.
    if (game.plies.isNotEmpty()) {
        LastMoves(game = game, modifier = Modifier.weight(1f, fill = false))
    }
    // Keep the primary game controls in a predictable thumb position. The board and the optional
    // move list size themselves to their content; without a flexible spacer the action row followed
    // them immediately and floated halfway up taller screens.
    Spacer(Modifier.weight(1f))
    // Nie von selbst: das Telefon bietet keinen Tipp an, der Nutzer fragt. Waehrend der Alarm
    // steht, IST die Karte der Job des Schirms, und zwei gefuellte Knoepfe sind Regel 3 gebrochen.
    HintSlot(HintHost.controller, ui.fen, ui.alarm != null, running, onHint)
    // Not tracking is a legitimate state of this screen, not an error: the board keeps the
    // position it last had and the only control left is the one that would change that.
    if (running) {
        ActionBar(
            onUndo = viewModel::onUndo,
            undoLabel = pluralStringResource(R.plurals.tracking_take_back, undoCount(lastCommit), undoCount(lastCommit)),
            // Ending a game that has moves USED to throw it away without a word.
            onEndGame = onEndGame,
        )
    }
}

/**
 * **A — not ready.** No camera, no frames or no geometry. The job is to make it work.
 *
 * The picture takes the space, because seeing what the phone sees is the only way to know why it is
 * failing — and the board this screen would otherwise draw is the position the app BELIEVES, which
 * here is an unrelated picture. No board, no eval bar, no move list: none of them can say anything
 * yet. The reason is stated once, at normal size, in the body colour.
 */
@Composable
private fun ColumnScope.NotReady(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    calibration: CalibrationState?,
) {
    val preview by viewModel.rawPreview.collectAsStateWithLifecycle()
    val rotation by viewModel.previewRotation.collectAsStateWithLifecycle()
    // With no service there is no camera to look at, so there is no picture and no frame around
    // one — a box saying "No camera frame yet" over a tracker nobody has started is the reserved
    // empty container this pack exists to remove. The space keeps the switch at the bottom.
    if (ui.task == TrackerTask.START) {
        Spacer(Modifier.weight(1f))
    } else {
        // The guide is a sibling of the picture, not its overlay: `SourceFramedPreview` puts the
        // overlay slot INSIDE the rotated, letterboxed image container, so a guide drawn there
        // inherits the frame's quarter turn and lands off-centre (seen on the emulator
        // 2026-08-13). What it is about is the screen's frame, not the camera's pixels.
        Box(Modifier.fillMaxWidth().weight(1f)) {
            SourceFramedPreview(
                preview = preview,
                rotationDegrees = rotation,
                sourceWidth = preview?.width ?: 0,
                sourceHeight = preview?.height ?: 0,
                // The edge is what makes it read as a picture rather than as a hole in the screen:
                // the frame is letterboxed inside its box and the bands are the app's own ground.
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
    // The screen's ONE filled button, and it is whatever the screen needs NOW. `START` has none of
    // its own: `TrackingSwitch` below is already that button, and two filled buttons is rule 3
    // broken in the state the rule was written for.
    when (ui.task) {
        TrackerTask.CALIBRATE -> Unit
        TrackerTask.RESUME_CAMERA -> FilledAction("Resume camera", viewModel::onToggleCamera, Modifier.fillMaxWidth())
        TrackerTask.START, TrackerTask.WATCH -> Unit
    }
}

/**
 * Where the board goes, as a dashed square over the picture.
 *
 * A framing aid and nothing else: it is drawn at a CONSTANT inset and never from `ui.corners`. The
 * detected quad has a screen of its own (`ui/calibration/CalibrationOverlay.kt`), and a guide that
 * looked like a detection would claim the app had found something it has not.
 */
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

/**
 * The eval bar is optional, gated and self-contained (07c) — it reads the tracker's status itself
 * and renders nothing when no engine shipped for this ABI. It is skipped outright when analysis is
 * switched off: with nothing to evaluate it drew a static half-and-half split and the word "eval"
 * beside the board, for the whole length of every game. **Absent, not empty.**
 *
 * `IntrinsicSize.Min` is load-bearing: the bar fills the row's height, so without an intrinsic the
 * row claimed the whole column, the move list collapsed to zero and the action bar was pushed
 * off-screen entirely. The square board decides the height here.
 */
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

/**
 * One row: how the app is doing on the left, how the GAME is doing on the right.
 *
 * It used to carry the frame rate there — the largest number on the screen, and the one thing on it
 * a player could do nothing about. Both rates and their 5-second medians live on the debug Timings
 * panel, where they were always the more useful. What replaces them is what a person watching a
 * game actually wants and what this screen has never shown: whose move it is, and which move.
 *
 * The dot carries the state's colour so the label does not have to be loud to be seen; while the
 * alarm latch is up it is the alarm colour, because the loop runs and no move can commit.
 */
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
        // Absent, not empty: before the first frame there is no game to report on.
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

/**
 * "White to move · 14". The separator is layout, not language, and stays here; both halves are
 * dropped when the FEN could not be read rather than guessed at.
 */
@Composable
private fun moveLine(
    turn: Turn?,
    moveNumber: Int?,
): String =
    listOfNotNull(
        turn?.let { stringResource(if (it == Turn.WHITE) R.string.tracking_turn_white else R.string.tracking_turn_black) },
        moveNumber?.let { stringResource(R.string.tracking_move_number, it) },
    ).joinToString(" · ")

/** Small enough to read as punctuation, large enough to carry a colour. */
private val STATE_DOT = 10.dp

/** [TrackerLabel] -> the words for it. The only place those words exist outside `strings.xml`. */
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

/**
 * The two things a running game is FOR — taking a move back and finishing.
 *
 * Recalibrate was the third identical outline button here and is in the `⋯` overflow now: it is a
 * repair, not a move in the game, and having it beside Undo is what made the sentence "tap
 * Recalibrate" point at one of three things that all looked the same. It is still a DIFFERENT act
 * from Reset game and must never share a handler (MEMORY: `android-single-camera-owner`).
 */
@Composable
private fun ActionBar(
    onUndo: () -> Unit,
    undoLabel: String,
    onEndGame: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        // Not always "Undo": one press unwinds the last COMMIT, and a CNN recovery commits a
        // whole bridge (four plies on 2026-08-02). It gets NO confirmation — it IS the reversal.
        OutlineAction(undoLabel, onUndo, Modifier.weight(1f))
        // Nor does ending: the game is saved on the way out, and its dialog asks who played.
        OutlineAction("End game", onEndGame, Modifier.weight(1f))
    }
}

/**
 * Ending a game where it is PLAYED: the one place the app asks who played it and how it ended.
 *
 * **It always saves.** "Reset game" used to discard a played game without a word; then it asked,
 * with `Discard…` as the dismiss action — a destructive branch two taps from the board you are
 * playing on. Deleting belongs where you can see what you are deleting, and the Games screen has
 * had it all along, with the recorded frames as a second, explicit checkbox.
 *
 * **The result is asked for, not guessed.** `resultFromFen` can only see mate, stalemate and the
 * draw rules, so every game that ended because the players stopped — a resignation, an agreed
 * draw, a session cut short — was stored as `*` and read in the library as "Game in progress".
 * Where the board HAS the answer the question is not asked: it is stated, and there is one button.
 *
 * The default is [GameResult.UNFINISHED] rather than a guess. It is the honest reading of a game
 * nobody has said anything about, and it is correctable in the game's own editor — which is what
 * makes a default acceptable here at all.
 *
 * The two name fields are optional and pre-filled from the last saved game, because the same two
 * people normally play again. Nothing is asked before the first move: a dialog in front of
 * somebody who wants to press one button and play is the reason this was never captured.
 */
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
                // A question whose answer is on the board in front of the player is not a question.
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
        // Never destructive: closing changes nothing, and the game keeps running.
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.games_cancel), color = OnSurfaceMuted) }
        },
    )
}

/** What the board itself says, when it says anything. */
@StringRes
private fun terminalText(result: GameResult): Int =
    when (result) {
        GameResult.WHITE -> R.string.endgame_mate_white
        GameResult.BLACK -> R.string.endgame_mate_black
        GameResult.DRAW -> R.string.endgame_drawn
        GameResult.UNFINISHED -> R.string.endgame_question
    }

/** A blank field is not a player called "", it is the same "nobody said" the store already has. */
private fun named(value: String): String = value.trim().ifBlank { UNKNOWN }

private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())
