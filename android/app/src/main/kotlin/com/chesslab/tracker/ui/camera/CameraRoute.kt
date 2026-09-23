package com.chesslab.tracker.ui.camera

import android.graphics.Bitmap
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.camera.CameraAbilities
import com.chesslab.tracker.camera.CameraLook
import com.chesslab.tracker.camera.FocusState
import com.chesslab.tracker.camera.FocusTuner
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationStoreHost
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.SourceFramedPreview
import com.chesslab.tracker.ui.calibration.CalibrationHost
import com.chesslab.tracker.ui.calibration.LocalCalibrationHost
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.tracking.TrackerSessionHost

/**
 * The camera screen: a viewfinder with the camera's own controls ON it.
 *
 * A camera app, not a settings page — the PICTURE is the screen. Everything else floats over it in
 * the letterbox the frame leaves, one control opens at a time, and a tap on the image clears the
 * lot. The version this replaces stacked five sliders and three full-width buttons under a 288 dp
 * preview: three quarters of the screen was the form, and the thing every one of those controls is
 * judged by was the quarter left over.
 *
 * The board's GEOMETRY is the screen's other MODE (`CameraMode.BOARD`), not another screen: it is
 * judged through the same viewfinder, so it shares the picture and swaps only the overlay and the
 * deck. Nothing in look mode changes where the squares are, except zoom, which says so.
 *
 * **No camera is bound here.** The viewfinder is the analyzer's own frames, the same ones the
 * calibration screen renders (`TrackerSession.rawPreview`). `TrackerCamera` is the app's single
 * camera owner and a second `Preview` use case fighting for the stream is the bug class that once
 * froze the analyzer feed dead on every tab switch (MEMORY `android-single-camera-owner`).
 *
 * **Nothing here edits pixels.** Every control configures the SENSOR through CameraX or, where
 * CameraX has no API, a capture-request key. A brightness or white balance faked in software would
 * change the frames the tracker diffs against its own reference, which is a different bug wearing
 * this feature's clothes.
 */
@Composable
fun CameraRoute(onBack: () -> Unit) {
    // The aiming screen calibrates from the same host the wizard uses, so the two cannot drift.
    val host = LocalCalibrationHost.current
    val port by CameraLookHost.port.collectAsStateWithLifecycle()
    val repository by SettingsHost.repository.collectAsStateWithLifecycle()
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val optics = port
    val settings = repository
    val bound = session
    if (optics == null || settings == null || bound == null) {
        CameraUnbound(onBack)
        return
    }
    val viewModel = remember(optics, settings) { CameraViewModel(optics, settings) }
    val look by viewModel.live.collectAsStateWithLifecycle()
    val abilities by viewModel.abilities.collectAsStateWithLifecycle()
    val saved by viewModel.saved.collectAsStateWithLifecycle(initialValue = look)
    val preview by bound.rawPreview.collectAsStateWithLifecycle()
    val torchOn by bound.torchOn.collectAsStateWithLifecycle()
    CameraScreen(
        preview = preview,
        profile = savedProfile(),
        look = look,
        abilities = abilities,
        saved = saved,
        torchOn = torchOn,
        hasTorch = bound.hasTorch,
        onTorch = bound::setTorchOn,
        focus = bound.focus,
        viewModel = viewModel,
        onBack = onBack,
        host = host ?: return,
    )
}

/**
 * The board quad the tracker is currently working to, for the aiming overlay.
 *
 * Read-only, and read here rather than taken off the session: the profile is geometry the
 * calibration screen owns, and this screen only ever draws it. Nothing on this screen can write it.
 */
@Composable
private fun savedProfile(): CalibrationProfile? {
    val context = LocalContext.current
    val store = remember(context) { CalibrationStoreHost.of(context) }
    val load by store.profile.collectAsStateWithLifecycle(initialValue = ProfileLoad.Absent)
    return (load as? ProfileLoad.Ok)?.profile
}

/** No service, so no picture and no controls — the one state that keeps the ordinary app frame. */
@Composable
private fun CameraUnbound(onBack: () -> Unit) {
    ChesslabScaffold("Camera", onBack) { bars ->
        Column(Modifier.fillMaxSize().padding(bars).padding(Space.md)) {
            Text("No camera is running. Start tracking on the Board tab.", color = OnSurfaceMuted)
        }
    }
}

@Composable
private fun CameraScreen(
    preview: Bitmap?,
    profile: CalibrationProfile?,
    look: CameraLook,
    abilities: CameraAbilities?,
    saved: CameraLook,
    torchOn: Boolean,
    hasTorch: Boolean,
    onTorch: (Boolean) -> Unit,
    focus: FocusTuner,
    viewModel: CameraViewModel,
    onBack: () -> Unit,
    host: CalibrationHost,
) {
    var open by remember { mutableStateOf<CameraAxis?>(null) }
    var chrome by remember { mutableStateOf(true) }
    var fill by remember { mutableStateOf(false) }
    val focusPreview = open == CameraAxis.FOCUS
    val scope = rememberCoroutineScope()
    val board = rememberBoardModel(host, scope)
    board.onAdopted = { p -> host.onCalibrated(p.geometry(), p.corners, p.name) }
    val boardState by board.state.collectAsStateWithLifecycle()
    // Off the host rather than through the parameter list: it is a property of the frames, and the
    // host is already this screen's handle on them.
    val rotation by host.previewRotation.collectAsStateWithLifecycle()
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clipToBounds()
            // The camera-app gesture, and the only way back from an empty screen. An open panel is
            // closed first: one tap should never both put a control away AND blank the screen.
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {
                if (open != null) open = null else chrome = !chrome
            },
    ) {
        // Focusing is judged from detail, not from whether the whole board fits. Give it the same
        // magnified view as the explicit Fill mode while the focus panel is open.
        Viewfinder(preview, rotation, fill = fill || focusPreview, magnification = if (focusPreview) FOCUS_PREVIEW_ZOOM else 1f) {
            // The live outline is the aiming instrument; the saved quad answers a different question
            // ("has it drifted since last time") and only shows with the rest of the chrome.
            BoardOutline(boardState)
            if (chrome) FramingOverlay(profile, preview?.width ?: 0, preview?.height ?: 0, Modifier.fillMaxSize())
        }
        AnimatedVisibility(chrome, Modifier.align(Alignment.TopCenter), enter = fadeIn(), exit = fadeOut()) {
            CameraTopBar(
                unsaved = look != saved,
                canReset = !look.isAuto || !saved.isAuto,
                fill = fill,
                onBack = onBack,
                onSave = viewModel::save,
                onUndo = viewModel::revert,
                onAuto = viewModel::backToAuto,
                onFill = { fill = !fill },
                onHide = { chrome = false },
            )
        }
        AnimatedVisibility(chrome, Modifier.align(Alignment.BottomCenter), enter = fadeIn(), exit = fadeOut()) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                BoardDeck(boardState)
                LookDeck(look, abilities, saved, fill || focusPreview, open, { open = it }, torchOn, hasTorch, onTorch, focus, viewModel)
            }
        }
    }
}

/** Look mode's own deck, split out so [CameraScreen] stays a layout and not a parameter list. */
@Composable
private fun LookDeck(
    look: CameraLook,
    abilities: CameraAbilities?,
    saved: CameraLook,
    fill: Boolean,
    open: CameraAxis?,
    onOpen: (CameraAxis?) -> Unit,
    torchOn: Boolean,
    hasTorch: Boolean,
    onTorch: (Boolean) -> Unit,
    focus: FocusTuner,
    viewModel: CameraViewModel,
) {
    CameraDeck(
        look = look,
        abilities = abilities,
        unsaved = look != saved,
        cropped = fill,
        open = open,
        onOpen = onOpen,
        torchOn = torchOn,
        hasTorch = hasTorch,
        onTorch = onTorch,
        focus = focus,
        onLook = viewModel::set,
    )
}

/**
 * The analyzer's frames, as large as the frame's own shape allows, centred in the black.
 *
 * `FillBounds` inside a box carrying the source's exact aspect ratio, the same contract the
 * calibration screen's preview keeps: the overlay maps source pixels onto the whole box, so any
 * letterboxing INSIDE the box would put every drawn line off the board.
 *
 * The letterboxing therefore happens outside, and it is not waste — it is where the chrome lives.
 * A 16:9 frame on a 20:9 phone leaves a band at each end deep enough for the whole deck, so the
 * controls cost the picture nothing at all.
 *
 * [fill] trades the bands for magnification: the same box, sized by HEIGHT instead of width, so it
 * runs off both sides and the parent clips it. Deliberately the same box — the image and the
 * overlay scale together, and the quad stays on the board in both modes. It is not the default,
 * because the judgement this screen exists for is whether the board fits the FRAME, and a picture
 * whose edges are off-screen cannot answer that.
 */
@Composable
private fun BoxScope.Viewfinder(
    preview: Bitmap?,
    rotationDegrees: Int,
    fill: Boolean,
    magnification: Float,
    overlay: @Composable BoxScope.() -> Unit,
) {
    SourceFramedPreview(
        preview = preview,
        rotationDegrees = rotationDegrees,
        sourceWidth = preview?.width ?: 0,
        sourceHeight = preview?.height ?: 0,
        modifier = Modifier.matchParentSize(),
        fill = fill,
        magnification = magnification,
        empty = { Text("no camera frame yet", color = Chrome.onSurfaceMuted) },
        overlay = overlay,
    )
}

/**
 * The strip along the bottom: one row of tiles, and above it the ONE control that is open.
 *
 * Bottom, because that is where a thumb is and because the hand that adjusts a phone on an overhead
 * mount comes in at the sides and the top. Nothing here is taller than it has to be — a closed deck
 * is a single row of tiles.
 */
@Composable
private fun CameraDeck(
    look: CameraLook,
    abilities: CameraAbilities?,
    unsaved: Boolean,
    cropped: Boolean,
    open: CameraAxis?,
    onOpen: (CameraAxis?) -> Unit,
    torchOn: Boolean,
    hasTorch: Boolean,
    onTorch: (Boolean) -> Unit,
    focus: FocusTuner,
    onLook: (CameraLook) -> Unit,
) {
    Column(
        Modifier.fillMaxWidth().background(BottomFade).padding(horizontal = Space.sm, vertical = Space.md),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        if (unsaved) UnsavedHint()
        // A magnified picture cannot be aimed by, and there is nothing on screen to notice that
        // from — both edges simply run off. So it says so, for exactly as long as it is true.
        if (cropped) ChromeBanner("Magnified — the frame reaches past both edges. Tap Fit to aim.")
        if (abilities == null) {
            // Not "this camera has nothing": nothing has answered yet. The tiles appear as the
            // device reports them, and none of them is rendered dead in the meantime.
            CameraNote("Waiting for the camera…")
        } else {
            open?.let { AxisPanel(it, look, abilities, focus, onLook) }
            TileRow(look, abilities, open, onOpen, torchOn, hasTorch, onTorch)
        }
    }
}

@Composable
private fun TileRow(
    look: CameraLook,
    abilities: CameraAbilities,
    open: CameraAxis?,
    onOpen: (CameraAxis?) -> Unit,
    torchOn: Boolean,
    hasTorch: Boolean,
    onTorch: (Boolean) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        CameraAxis.entries.filter { it.availableOn(abilities) }.forEach { axis ->
            CameraTile(
                label = axis.label,
                value = axis.reading(look, abilities),
                active = axis.isSet(look),
                open = open == axis,
                onClick = { onOpen(axis.takeIf { open != axis }) },
                modifier = Modifier.weight(1f),
            )
        }
        if (hasTorch) {
            // The lamp is not just a lamp: the service re-baselines the tracker around it, because
            // the reference was taken under the old light. See `TorchControl`. No panel, no value.
            CameraTile(
                label = "Light",
                value = if (torchOn) "On" else "Off",
                active = torchOn,
                open = false,
                onClick = { onTorch(!torchOn) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

/** The open control, on its own scrim so it reads wherever the picture happens to reach. */
@Composable
private fun AxisPanel(
    axis: CameraAxis,
    look: CameraLook,
    abilities: CameraAbilities,
    focus: FocusTuner,
    onLook: (CameraLook) -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(PANEL_CORNER.dp))
            .background(ChromeScrim)
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.xs),
    ) {
        when (axis) {
            CameraAxis.FOCUS -> FocusPanel(look, abilities, focus, onLook)
            CameraAxis.ZOOM -> ZoomPanel(look, abilities, onLook)
            CameraAxis.EXPOSURE -> ExposurePanel(look, abilities, onLook)
            CameraAxis.WHITE_BALANCE -> WhiteBalancePanel(look, abilities, onLook)
        }
    }
}

/**
 * "Auto" oder eine feste Distanz, und die Distanz selbst.
 *
 * **Auto ist seit 2026-09-09 nicht mehr die Automatik des Geraets.** Die lief mitten in der
 * Aufnahme los und hat Bretter unbrauchbar gemacht; ein Schalter, der sie anbietet, ist eine Falle.
 * Auto misst jetzt einmal und HAELT: Geraete-AF als Startpunkt, Gegenprobe, sonst voller Sweep.
 * Die Prozentzahl statt Dioptrien, weil danach niemand zielt.
 */
@Composable
private fun FocusPanel(
    look: CameraLook,
    abilities: CameraAbilities,
    focus: FocusTuner,
    onLook: (CameraLook) -> Unit,
) {
    val state by focus.state.collectAsStateWithLifecycle()
    // Wer den Fokus fuehrt, sagt der Zustand — nicht `look.focus`: nach dem Messen steht dort eine
    // feste Distanz, und die Auswahl waere sonst auf "Manual" gesprungen.
    val measured = state !is FocusState.Idle && state !is FocusState.Failed
    CameraChoice(
        options = listOf("Auto" to false, "Manual" to true),
        selected = !measured && look.focus != null,
        onSelect = { manual ->
            if (manual) {
                focus.cancel()
                onLook(look.copy(focus = look.focus ?: DEFAULT_FOCUS))
            } else {
                focus.start()
            }
        },
    )
    look.focus?.let { distance ->
        FocusRuler(
            caption = "Near ← → Far",
            reading = CameraAxis.FOCUS.reading(look, abilities),
            value = 1f - distance,
            range = 0f..1f,
            step = 0.001f,
            onValue = { onLook(look.copy(focus = 1f - it)) },
        )
    }
    FocusSweepRow(focus, state)
    FocusReadingRow(focus)
}

/**
 * Was das Brett gerade an Schaerfe hergibt — die Zahl, an der ein Mensch den Regler ausrichten kann.
 *
 * Nur solange dieser Schirm offen ist: die Messung kostet einen 1024er Warp, und ohne Zuschauer
 * misst sie niemand.
 */
@Composable
private fun FocusReadingRow(tuner: FocusTuner) {
    DisposableEffect(tuner) {
        tuner.watch(true)
        onDispose { tuner.watch(false) }
    }
    val sharp by tuner.sharpness.collectAsStateWithLifecycle()
    Text(
        sharp?.let { "Sharpness %.0f".format(it) } ?: "Sharpness —",
        style = MaterialTheme.typography.bodySmall,
        color = Chrome.onSurfaceMuted,
    )
}

/**
 * Was die Messung gerade tut, und der Abbruch dazu.
 *
 * Ausgeloest wird sie ueber "Auto" — auf Tastendruck und nie von selbst: die automatische
 * Konvergenz flog 2026-08-02, weil sie sich auf ein Brett einstellte, das noch nicht stand.
 */
@Composable
private fun FocusSweepRow(
    tuner: FocusTuner,
    state: FocusState,
) {
    val running = state is FocusState.Sweeping || state is FocusState.Seeking
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // "Auto" ist der schnelle Weg; dieser Knopf ist die Zweifelsfrage — jede Stufe messen.
        FilledTonalButton(onClick = { if (running) tuner.cancel() else tuner.sweep() }) {
            Text(if (running) "Stop" else "Sweep")
        }
        Text(
            focusStatus(state),
            style = MaterialTheme.typography.bodySmall,
            color = Chrome.onSurfaceMuted,
        )
    }
}

private fun focusStatus(state: FocusState): String =
    when (state) {
        FocusState.Idle -> "Set the board up, then tap Auto."
        FocusState.Seeking -> "Letting the camera focus on the board…"
        is FocusState.Sweeping -> "Measuring ${state.done}/${state.total}…"
        is FocusState.Locked -> "Held at the sharpest reading (%.0f)".format(state.sharpness)
        is FocusState.Soft -> "Soft — %.0f%% of the reading it was set to".format(PERCENT * state.sharpness / state.reference)
        FocusState.Failed -> "Could not confirm a sharp focus — previous focus restored."
    }

/** Zoom, from the device's own advertised range. It moves the board, so it says so. */
@Composable
private fun ZoomPanel(
    look: CameraLook,
    abilities: CameraAbilities,
    onLook: (CameraLook) -> Unit,
) {
    val range = abilities.zoom ?: return
    CameraDial(
        caption = "Field of view",
        reading = CameraAxis.ZOOM.reading(look, abilities),
        value = look.zoomRatio,
        range = range,
        step = 0.1f,
        onValue = { onLook(look.copy(zoomRatio = it)) },
    )
    if (look.zoomRatio != 1f) {
        CameraNote("Zoom moves the board in the frame — recalibrate the board after changing it.")
    }
}

/** Exposure compensation, in the device's own EV steps. */
@Composable
private fun ExposurePanel(
    look: CameraLook,
    abilities: CameraAbilities,
    onLook: (CameraLook) -> Unit,
) {
    val exposure = abilities.exposure ?: return
    CameraDial(
        caption = "Darker ← → Brighter",
        reading = CameraAxis.EXPOSURE.reading(look, abilities),
        value = look.evIndex.toFloat(),
        range = exposure.indices.first.toFloat()..exposure.indices.last.toFloat(),
        step = 1f,
        onValue = { onLook(look.copy(evIndex = it.toInt())) },
    )
}

/** The illuminant, as the presets this device advertises — see `CameraLook` for why not kelvin. */
@Composable
private fun WhiteBalancePanel(
    look: CameraLook,
    abilities: CameraAbilities,
    onLook: (CameraLook) -> Unit,
) {
    CameraChoice(
        options = abilities.whiteBalance.map { preset -> preset.kelvinLabel() to preset },
        selected = look.whiteBalance,
        onSelect = { onLook(look.copy(whiteBalance = it)) },
    )
}

private const val PANEL_CORNER = 14

private const val FOCUS_PREVIEW_ZOOM = 2.5f

private const val PERCENT = 100f

/** Manual focus opens at the far end: a board is metres away, not centimetres. */
private const val DEFAULT_FOCUS = 0f
