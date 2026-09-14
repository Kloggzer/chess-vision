package com.chesslab.tracker.capture

import android.graphics.Bitmap
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.CaptureObserved
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.sync.SyncHost
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.DisclosureRow
import com.chesslab.tracker.ui.EmptyState
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.SourceFramedPreview
import com.chesslab.tracker.ui.debug.DebugSessionHost
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import com.chesslab.tracker.ui.tracking.cellRect
import com.chesslab.tracker.ui.tracking.fittedRect
import kotlinx.coroutines.delay
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
                    subtitle = shot.reason,
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

/** Where every piece goes, drawn ON the live board — the one screen where both are needed. */
@Composable
fun CaptureSetupRoute(
    index: Int,
    onBack: () -> Unit,
    onStart: (Int) -> Unit,
) {
    val ui by CaptureHost.state.collectAsStateWithLifecycle()
    val recorder by CaptureRecorderHost.recorder.collectAsStateWithLifecycle()
    val shot = CaptureHost.shotAt(index)
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val whitePov = boardIsWhitePov()
    var measured by remember { mutableStateOf(emptyMap<String, Int>()) }
    // Der Plan schlaegt Felder nach dem Korpus-Median vor, das Band macht aber die Lampe. Also
    // wird das rektifizierte Brett laufend gemessen und die Belegung daraus neu gelegt.
    LaunchedEffect(session, whitePov) {
        val frames = session?.boardPreview ?: return@LaunchedEffect
        while (true) {
            measured = measureSquares(frames.value, whitePov)
            delay(MEASURE_MS)
        }
    }
    // Festgehalten wird nur neu BEURTEILT, nie neu verteilt: eine hingestellte Figur verschiebt
    // ihr Feld um bis zu 61 Grauwerte und wuerfelte die Belegung sonst neu.
    val frozen = ui.frozen
    val targets =
        remember(shot, measured, frozen) {
            if (frozen != null) refit(frozen, measured) else assign(shot?.place.orEmpty(), measured)
        }
    // Der Lauf labelt gegen DIESE Belegung, nicht gegen den Vorschlag des Plans.
    LaunchedEffect(targets) { CaptureHost.place(targets) }
    // Der Debug-Payload traegt die Reads (`entry.md` verbietet einen UI-Seitenkanal). Er kostet
    // 64 Felder je Bild, also nur solange hier aufgebaut wird — die Aufnahme laeuft ohne ihn.
    val debug by DebugSessionHost.session.collectAsStateWithLifecycle()
    val status by (debug?.status ?: NO_STATUS).collectAsStateWithLifecycle()
    DisposableEffect(debug, ui.recording) {
        debug?.setDebugEnabled(!ui.recording)
        onDispose { debug?.setDebugEnabled(false) }
    }
    val reads = if (ui.recording) emptyList() else status?.debug?.cnnReads.orEmpty()
    val checks = remember(targets, reads) { checkPlacement(targets, reads) }
    val stray = remember(targets, reads) { strayPieces(targets, reads) }
    // The profile goes on here and the device is asked again while the human builds: a rebind to
    // 4K and the encoder's re-arm both take frames, not instants.
    LaunchedEffect(recorder) { CaptureHost.prepare(recorder) }
    DisposableEffect(recorder) { onDispose { CaptureHost.releaseIfIdle(recorder) } }
    LaunchedEffect(recorder, ui.observed) {
        delay(PROFILE_POLL_MS)
        CaptureHost.refresh(recorder)
    }

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
                Text(
                    if (frozen == null) "Erst das Licht stellen — die Felder wandern noch" else lightAdvice(targets),
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (frozen != null && targets.all { it.fit == Fit.OK }) Accent else Danger,
                )
                // Kontrolle, kein Veto: das Modell ist auf genau diesen Feldern am schwaechsten.
                if (frozen != null) {
                    Text(
                        checkSummary(checks, stray),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (stray.isEmpty() && checks.none { it.value == Check.EMPTY }) OnSurfaceMuted else Danger,
                    )
                }
            }
            TargetBoard(targets, frozen != null, checks, stray, Modifier.fillMaxWidth().aspectRatio(1f))
            ProfileLine(ui.observed)
            ui.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
            if (frozen == null) {
                FilledAction(
                    "Felder festhalten",
                    onClick = { CaptureHost.freeze(targets) },
                    modifier =
                        Modifier.fillMaxWidth().semantics {
                            contentDescription = "Die Felder festhalten und mit dem Aufbau beginnen"
                        },
                )
                return@Column
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                OutlineAction("Nochmal verteilen", onClick = CaptureHost::thaw, modifier = Modifier.weight(1f))
                FilledAction(
                    "Aufbau steht",
                    onClick = {
                        CaptureHost.begin(index, recorder)
                        onStart(index)
                    },
                    modifier = Modifier.weight(1f).semantics { contentDescription = "The position is built, start recording" },
                )
            }
        }
    }
}

/**
 * Das rektifizierte Brett mit den Zielfeldern darauf — die Antwort auf „wo soll was hin".
 *
 * Auf dem gewarpten Brett und nicht auf dem Rohbild: dort liegt a8 per Konstruktion oben links,
 * Overlay und Messung koennen also nicht auseinanderlaufen (`BoardPreview`). Gefaerbt wird erst
 * nach dem Festhalten — vorher waere es ein Urteil ueber einen Vorschlag, der noch wandert.
 */
@Composable
private fun TargetBoard(
    targets: List<Target>,
    frozen: Boolean,
    checks: Map<String, Check>,
    stray: List<String>,
    modifier: Modifier,
) {
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val board by (session?.boardPreview ?: NO_PREVIEW).collectAsStateWithLifecycle()
    val measurer = rememberTextMeasurer()
    val bitmap = board
    Box(modifier) {
        if (bitmap == null) {
            EmptyState("Kein Brett im Bild", "Die Kamera sieht keine Marker — erst kalibrieren.")
            return@Box
        }
        Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = "Brett mit den Zielfeldern des Auftrags",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize(),
        )
        // Vor dem Draw-Lambda gelesen: das ist kein Composable-Scope (`BoardPreview`).
        val hit = Accent
        val miss = Danger
        val pending = OnSurfaceMuted
        val label = TextStyle(color = OnSurface, fontSize = TARGET_TEXT)
        Canvas(Modifier.fillMaxSize()) {
            val rect = fittedRect(size, bitmap.width, bitmap.height)
            targets.forEach { target ->
                val cell = cellRect(rect, target.square) ?: return@forEach
                val colour =
                    if (!frozen) {
                        pending
                    } else if (target.fit == Fit.OK) {
                        hit
                    } else {
                        miss
                    }
                drawRect(colour.copy(alpha = TARGET_FILL), cell.topLeft, cell.size)
                drawRect(colour, cell.topLeft, cell.size, style = Stroke(width = TARGET_STROKE))
                drawText(
                    measurer,
                    target.piece + checkMark(checks[target.square]),
                    topLeft = cell.topLeft + Offset(TARGET_STROKE, TARGET_STROKE),
                    style = label,
                )
            }
            // Eine Figur auf einem Feld, das die FEN als `empty` fuehrt, verdirbt jeden Frame.
            stray.forEach { square ->
                val cell = cellRect(rect, square) ?: return@forEach
                drawRect(miss, cell.topLeft, cell.size, style = Stroke(width = TARGET_STROKE))
                drawText(measurer, "!", topLeft = cell.topLeft + Offset(TARGET_STROKE, TARGET_STROKE), style = label)
            }
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

/**
 * What the camera is REALLY doing, in the accent colour only when it is all as asked. A capture that
 * quietly fell back to 1440p or to the game path's bit rate is the failure this line exists to
 * catch, and the same words go into `capture.json`.
 */
@Composable
private fun ProfileLine(observed: CaptureObserved?) {
    if (observed == null) {
        Text("camera profile not applied yet", style = MaterialTheme.typography.bodySmall, color = Danger)
        return
    }
    Text(
        profileText(observed),
        style = MaterialTheme.typography.bodySmall,
        color = if (observed.asAsked) Accent else Danger,
    )
}

private fun profileText(observed: CaptureObserved): String {
    val want = observed.requested
    val head =
        "asked ${want.width}x${want.height} · ${want.fps} fps · ${want.bitRate / MBIT} Mbit/s — " +
            "got ${observed.deliveredSize ?: NO_FRAME} · ${observed.aeFpsRange ?: NOT_PINNED} · " +
            "${observed.bitRate / MBIT} Mbit/s"
    return (listOf(head) + observed.notes).joinToString(System.lineSeparator())
}

/** One turn per tap, acknowledged BY HAND — nothing here decides that the piece has stopped moving. */
@Composable
fun CaptureTurnRoute(
    index: Int,
    onBack: () -> Unit,
    onDone: () -> Unit,
) {
    val ui by CaptureHost.state.collectAsStateWithLifecycle()
    val recorder by CaptureRecorderHost.recorder.collectAsStateWithLifecycle()
    val shot = CaptureHost.shotAt(index)
    // Auch waehrend der Drehungen weiter messen: das Licht kann ueber acht Schritte wandern, und
    // eine Aufnahme, die dabei aus dem Band laeuft, faellt sonst erst im Datensatz auf.
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val whitePov = boardIsWhitePov()
    var measured by remember { mutableStateOf(emptyMap<String, Int>()) }
    LaunchedEffect(session, whitePov) {
        val frames = session?.boardPreview ?: return@LaunchedEffect
        while (true) {
            measured = measureSquares(frames.value, whitePov)
            delay(MEASURE_MS)
        }
    }
    val live = remember(ui.frozen, measured) { refit(ui.frozen.orEmpty(), measured) }
    // Both ways out close the bundle: a run left open writes no `capture.json` at all, and system
    // back does not travel through [onBack].
    val leave: () -> Unit = {
        CaptureHost.finish(recorder)
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
                // Die Helligkeit DIESER Aufnahme, Schritt fuer Schritt — sie ist die Groesse, die
                // ueber jede Zelle im Datensatz entscheidet, und sie wandert ueber acht Drehungen.
                Text(
                    lightAdvice(live),
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (live.all { it.fit == Fit.OK }) Accent else Danger,
                )
                Text(driftLine(ui.frozen.orEmpty(), live), style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            }
            Viewfinder(Modifier.fillMaxWidth().aspectRatio(VIEWFINDER_RATIO))
            ProfileLine(ui.observed)
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
                        CaptureHost.finish(recorder)
                        onDone()
                    },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

/**
 * Die eingestellte Brettorientierung. Sie entscheidet, welches PIXEL zu welchem Feld gehoert:
 * der Warp kennt kein `whitePov`, die Feldzuordnung schon, und bei BLACK_BOTTOM liegt `a8` unten
 * rechts. Ohne sie misst und labelt die Erfassung jede Figur aufs gespiegelte Feld.
 */
@Composable
private fun boardIsWhitePov(): Boolean {
    val repository by SettingsHost.repository.collectAsStateWithLifecycle()
    val settings by (repository?.appSettings ?: NO_APP_SETTINGS).collectAsStateWithLifecycle()
    return settings.orientation.whitePov
}

/** Ein Zeichen hinter der Figur. Leer, wo das Modell nichts zu sagen hat — nicht „ungeprueft". */
private fun checkMark(check: Check?): String =
    when (check) {
        Check.AGREES -> " ✓"
        Check.EMPTY -> " leer"
        Check.OTHER_PIECE -> " ?"
        else -> ""
    }

private fun orderText(shot: Shot): String = "${shot.place.size} Figuren, Kamera ${shot.height} — ${shot.stepCount} Drehungen"

private const val VIEWFINDER_RATIO = 4f / 3f

/** Gemessen wird gedrosselt: 64 Crop-Boxen je Durchgang, und die Lampe bewegt sich langsam. */
private const val MEASURE_MS = 400L
private const val TARGET_FILL = 0.25f
private const val TARGET_STROKE = 4f
private val TARGET_TEXT = 13.sp
private const val MBIT = 1_000_000
private const val NO_FRAME = "no frame yet"
private const val NOT_PINNED = "fps NOT pinned"
private const val PROFILE_POLL_MS = 1500L

/** The screens render before the service is bound; an unbound camera is simply no frame. */
private val NO_PREVIEW = MutableStateFlow<Bitmap?>(null)
private val NO_STATUS = MutableStateFlow<TrackerStatus?>(null)
private val NO_APP_SETTINGS = MutableStateFlow(AppSettings())
private val NO_ROTATION = MutableStateFlow(0)
