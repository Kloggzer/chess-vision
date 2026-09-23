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

/** The PICTURE is the screen; controls float over the letterbox, one open at a time. No camera is bound
 *  here — the analyzer's own frames, since a second `Preview` froze the feed. Nothing edits pixels: a
 *  software brightness would change the frames the tracker diffs against its reference. */
@Composable
fun CameraRoute(onBack: () -> Unit) {
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

/** Read-only: the profile is the calibration screen's geometry, this one only draws it. */
@Composable
private fun savedProfile(): CalibrationProfile? {
    val context = LocalContext.current
    val store = remember(context) { CalibrationStoreHost.of(context) }
    val load by store.profile.collectAsStateWithLifecycle(initialValue = ProfileLoad.Absent)
    return (load as? ProfileLoad.Ok)?.profile
}

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
    val rotation by host.previewRotation.collectAsStateWithLifecycle()
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clipToBounds()
            // The only way back from an empty screen. An open panel closes first: one tap never does both.
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {
                if (open != null) open = null else chrome = !chrome
            },
    ) {
        // Focus is judged from detail: magnify while the focus panel is open.
        Viewfinder(preview, rotation, fill = fill || focusPreview, magnification = if (focusPreview) FOCUS_PREVIEW_ZOOM else 1f) {
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

/** `FillBounds` in a box of the source's exact ratio: the overlay maps source pixels onto the whole box,
 *  so letterboxing happens OUTSIDE — where the chrome lives. [fill] sizes the same box by HEIGHT, so
 *  image and overlay scale together; not default, because a clipped picture cannot show the fit. */
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
        // A magnified picture cannot be aimed by, and nothing else on screen says so.
        if (cropped) ChromeBanner("Magnified — the frame reaches past both edges. Tap Fit to aim.")
        if (abilities == null) {
            // Nothing has answered yet — not "this camera has nothing"; no tile is rendered dead meanwhile.
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
            // The service re-baselines the tracker around the lamp: the reference was taken under the old light.
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

/** Auto ist NICHT die Automatik des Geraets: die lief mitten in der Aufnahme los und machte Bretter
 *  unbrauchbar. Auto misst einmal und HAELT (Geraete-AF als Start, Gegenprobe, sonst voller Sweep). */
@Composable
private fun FocusPanel(
    look: CameraLook,
    abilities: CameraAbilities,
    focus: FocusTuner,
    onLook: (CameraLook) -> Unit,
) {
    val state by focus.state.collectAsStateWithLifecycle()
    // Der Zustand sagt, wer fuehrt, nicht `look.focus`: nach dem Messen steht dort eine feste Distanz.
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

/** Nur solange dieser Schirm offen ist: die Messung kostet einen 1024er Warp. */
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

/** Nur auf Tastendruck, nie von selbst: eine automatische Konvergenz stellte sich auf ein Brett ein, das noch nicht stand. */
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

private const val DEFAULT_FOCUS = 0f
