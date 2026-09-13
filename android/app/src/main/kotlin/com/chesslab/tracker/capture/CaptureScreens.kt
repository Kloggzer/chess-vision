package com.chesslab.tracker.capture

import android.graphics.Bitmap
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.sync.SyncHost
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.DisclosureRow
import com.chesslab.tracker.ui.EmptyState
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.SourceFramedPreview
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Targeted capture, in three screens: pick a shot, build it, turn the piece.
 *
 * The whole flow is one [CaptureHost] across three back-stack entries — a shot survives the walk
 * from the list to the turning screen, and the run belongs to the service either way.
 */
@Composable
fun CapturePlanRoute(
    onBack: () -> Unit,
    onOpenShot: (Int) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val settings = remember(context) { SyncHost.get(context) }
    val ui by CaptureHost.state.collectAsStateWithLifecycle()
    LaunchedEffect(settings) {
        settings.load()
        CaptureHost.load(scope) { settings.prefs.value }
    }

    ChesslabScaffold("Targeted capture", onBack) { bars ->
        LazyColumn(
            Modifier.fillMaxSize().padding(bars),
            verticalArrangement = Arrangement.spacedBy(Space.sm),
        ) {
            item(key = "coverage") { CoverageCard(ui) }
            val shots = ui.plan?.shots.orEmpty()
            if (shots.isEmpty()) {
                item(key = "empty") { NoShots(ui) }
                return@LazyColumn
            }
            item(key = "heading") { SectionHeading("Shots") }
            itemsIndexed(shots, key = { _, shot -> shot.id }) { index, shot ->
                DisclosureRow(
                    title = "${index + 1} of ${shots.size} · ${shot.id}",
                    subtitle = "${shot.fix} — ${shot.reason}",
                    onOpen = {
                        CaptureHost.open(index)
                        onOpenShot(index)
                    },
                )
            }
        }
    }
}

@Composable
private fun CoverageCard(ui: CaptureUi) {
    Card {
        val coverage = ui.coverage
        Text("Coverage", style = MaterialTheme.typography.titleMedium, color = OnSurface)
        Text(
            when {
                ui.loading -> "Asking the PC…"
                coverage != null -> "${coverage.gaps.size} cells under ${coverage.thinBelow} · ${coverage.dataset}"
                else -> "not read"
            },
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceMuted,
        )
        // The report comes from a BUILT dataset: an upload does not move it, so it dates itself.
        Text(dateLine(coverage, ui.plan), style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        ui.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
    }
}

/** The coverage report's own date, else the plan's — never today's, which nothing measured. */
private fun dateLine(
    coverage: CaptureCoverage?,
    plan: CapturePlan?,
): String {
    val measured = coverage?.generatedAt
    if (measured != null) return "measured $measured"
    val computed = plan?.generatedAt
    return if (computed.isNullOrBlank()) "" else "plan computed $computed"
}

@Composable
private fun NoShots(ui: CaptureUi) {
    val why = ui.plan?.why
    val message = ui.message
    when {
        ui.loading -> EmptyState("Asking the PC…", "The plan is a report on the PC, not a live count.")
        why != null -> EmptyState("No plan computed yet", "Run this on the PC: $why")
        message != null -> EmptyState("No plan", message)
        else -> EmptyState("Nothing to capture", "Every cell the planner looked at is covered.")
    }
}

/** The order in plain words, over the live viewfinder — the one screen where both are needed. */
@Composable
fun CaptureSetupRoute(
    index: Int,
    onBack: () -> Unit,
    onStart: (Int) -> Unit,
) {
    val ui by CaptureHost.state.collectAsStateWithLifecycle()
    val recorder by CaptureRecorderHost.recorder.collectAsStateWithLifecycle()
    val shot = CaptureHost.shotAt(index)

    ChesslabScaffold("Build it", onBack) { bars ->
        if (shot == null) {
            EmptyState("This shot is gone", "Go back and pick one from the plan.")
            return@ChesslabScaffold
        }
        Column(
            Modifier.fillMaxSize().padding(bars),
            verticalArrangement = Arrangement.spacedBy(Space.sm),
        ) {
            Card {
                Text(shot.id, style = MaterialTheme.typography.titleMedium, color = OnSurface)
                Text(orderText(shot), style = MaterialTheme.typography.bodyMedium, color = OnSurface)
                Text(shot.reason, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            }
            Viewfinder(Modifier.fillMaxWidth().aspectRatio(VIEWFINDER_RATIO))
            ui.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
            FilledAction(
                "It is built",
                onClick = {
                    CaptureHost.begin(index, recorder)
                    onStart(index)
                },
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = "The position is built, start recording" },
            )
        }
    }
}

@Composable
private fun Viewfinder(modifier: Modifier) {
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val preview by (session?.rawPreview ?: NO_PREVIEW).collectAsStateWithLifecycle()
    val rotation by (session?.previewRotation ?: NO_ROTATION).collectAsStateWithLifecycle()
    Box(modifier) {
        SourceFramedPreview(
            preview = preview,
            rotationDegrees = rotation,
            sourceWidth = preview?.width ?: 0,
            sourceHeight = preview?.height ?: 0,
            modifier = Modifier.fillMaxSize(),
            empty = { Text("no camera frame yet", color = OnSurfaceMuted) },
        )
    }
}

/** One turn per tap, acknowledged BY HAND — nothing here decides that the piece has stopped moving. */
@Composable
fun CaptureTurnRoute(
    index: Int,
    onBack: () -> Unit,
    onDone: () -> Unit,
) {
    val ui by CaptureHost.state.collectAsStateWithLifecycle()
    val shot = CaptureHost.shotAt(index)
    // Both ways out close the bundle: a run left open writes no `capture.json` at all, and system
    // back does not travel through [onBack].
    val leave: () -> Unit = {
        CaptureHost.finish()
        onBack()
    }
    BackHandler(onBack = leave)

    ChesslabScaffold("Turn it", leave) { bars ->
        if (shot == null) {
            EmptyState("This shot is gone", "Go back and pick one from the plan.")
            return@ChesslabScaffold
        }
        val total = shot.stepCount
        val done = ui.ply >= total
        Column(
            Modifier.fillMaxSize().padding(bars),
            verticalArrangement = Arrangement.spacedBy(Space.sm),
        ) {
            Card(accented = true) {
                Text(
                    if (done) "All $total turns done" else "Turn ${ui.ply + 1} of $total — ${shot.orientationDeg(ui.ply)} degrees",
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                )
                Text(
                    if (ui.recording) "recording ${shot.id}" else "not recording",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (ui.recording) Accent else Danger,
                )
            }
            Viewfinder(Modifier.fillMaxWidth().aspectRatio(VIEWFINDER_RATIO))
            ui.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                if (!done) {
                    FilledAction(
                        "Taken",
                        onClick = { CaptureHost.record(index) },
                        modifier =
                            Modifier.weight(1f).semantics {
                                contentDescription = "The piece stands at ${shot.orientationDeg(ui.ply)} degrees, take the frame"
                            },
                    )
                }
                OutlineAction(
                    if (done) "Finish" else "Stop here",
                    onClick = {
                        CaptureHost.finish()
                        onDone()
                    },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

private fun orderText(shot: Shot): String {
    val place = shot.place.joinToString(", ") { "${it.piece} on ${it.square}" }.ifBlank { "leave the board as it is" }
    val light = shot.light?.let { ", light $it on ${shot.referenceSquare}" }.orEmpty()
    return "$place, camera ${shot.height}$light — ${shot.stepCount} turns"
}

private const val VIEWFINDER_RATIO = 4f / 3f

/** The screens render before the service is bound; an unbound camera is simply no frame. */
private val NO_PREVIEW = MutableStateFlow<Bitmap?>(null)
private val NO_ROTATION = MutableStateFlow(0)
