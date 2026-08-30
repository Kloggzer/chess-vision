package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.LensModel
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.cornersToFlat
import com.chesslab.tracker.geometry.GeometryScan
import com.chesslab.tracker.geometry.ScannedGeometry
import com.chesslab.tracker.geometry.geometryRefusals
import com.chesslab.tracker.geometry.geometryReport
import com.chesslab.tracker.geometry.geometryWarnings
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.opencv.core.Mat
import java.io.File
import kotlin.system.exitProcess

private const val MS_PER_SECOND = 1000.0

// The `label` and `score` verbs' machinery, kept beside the replay rather than inside it.
//
// `label`: measure the geometry with the shipping stack, refuse footage that cannot carry a
// label, replay through the measured MEDIAN quad, and write the tracker's proposal where the
// Python labeler wrote its own. `score`: replay through the LABEL's stored quad and print
// found / missed / invented — never one merged accuracy.

/** What this replay does besides tracking: label, score, decisive frames, or any mix. */
internal class ReplayPlan(
    private val labelRun: LabelRun?,
    private val scoreCandidate: File?,
    private val framesDir: File?,
    private val timeline: PlyTimeline?,
) {
    /** The quad the run is pinned to, when the plan carries one — measured or the label's own. */
    fun quad(): FloatArray? = labelRun?.quad ?: scoreCandidate?.let(::quadFromCandidate)

    /** The exact per-recording fit used to measure a label's quad; replay must use the same pixels. */
    fun lens(): LensModel? = labelRun?.lens

    fun session(
        quad: FloatArray,
        boardSize: Int,
        fps: Double,
        status: () -> TrackerStatus?,
    ): LabelSession = LabelSession(labelRun, scoreCandidate, framesDir, quad, boardSize, fps, status, timeline)
}

internal fun replayPlanFor(
    options: ReplayOptions,
    video: File?,
): ReplayPlan? {
    if (!options.label && !options.score && !options.frames) return null
    val labelRun = if (options.label) prepareLabel(requireNotNull(video) { "label needs a video file" }, options) else null
    val scoreCandidate =
        if (options.score) {
            candidateFileFor(requireNotNull(video) { "score needs a video file" }, options).also {
                check(it.isFile) { "no candidate to score against: ${it.path} — run 'label' first" }
            }
        } else {
            null
        }
    val framesDir =
        if (options.frames) {
            // Beside the candidate (or where one would live), not under tmp/: the decisive frames
            // are review material, and review material lives with the game it reviews.
            val name = options.name ?: requireNotNull(video) { "frames needs a video file" }.nameWithoutExtension
            File(File(RECORDINGS_DIR, name), "frames-decisive")
        } else {
            null
        }
    return ReplayPlan(labelRun, scoreCandidate, framesDir, video?.let { sessionTimeline(it, emptyList()) })
}

/** What a `label` run measured before it replayed: the name, the directory, the quad, the scan. */
internal class LabelRun(
    val name: String,
    val dir: File,
    val quad: FloatArray,
    val scan: ScannedGeometry,
    val lens: LensModel?,
)

/**
 * Measure the footage with the shipping geometry stack, refuse footage that cannot carry a label.
 *
 * The quad the replay then runs through is the per-corner MEDIAN over every sampled frame that
 * passed the absolute alignment gate — not the first frame's quad, because one frame's quad is a
 * sample and the label should stand on the whole video's evidence.
 */
internal fun prepareLabel(
    video: File,
    options: ReplayOptions,
): LabelRun {
    val name = options.name ?: video.nameWithoutExtension
    println("measuring ${video.name} with the shipping geometry stack (markers -> grid refit -> alignmentOf)")
    val lens =
        if (options.lens) {
            openRecording(video).use { fitLensFrom(it) }
                ?: error("no accepted lens fit for ${video.name} — refusing an uncorrected label preview")
        } else {
            null
        }
    val scan =
        openRecording(video).use { src -> src.scanGeometry(lens) }
            ?: run {
                println("no sampled frame aligned to the board's grid — is the board in shot?")
                exitProcess(1)
            }
    reportGeometry(scan)
    return LabelRun(name, File(RECORDINGS_DIR, name), cornersToFlat(scan.corners), scan, lens)
}

/** Every frame, undistorted when [lens] is given, offered to one scan over the whole video. */
private fun FrameSource.scanGeometry(lens: LensModel?): ScannedGeometry? {
    val scan = GeometryScan(fps) { println("  $it") }
    val optics = lens?.let { Undistorter(it, delivered.width, delivered.height) }
    try {
        while (true) {
            val frame = next() ?: break
            scan.offer(optics?.apply(frame) ?: frame, timestampMs)
        }
    } finally {
        optics?.close()
    }
    return scan.result()
}

/**
 * What the scan found: the report, then what it costs, then what it forbids.
 *
 * A WARNING names the next step (a moving board needs a per-frame re-fit after export); a REFUSAL
 * ends the run. Keeping the two apart is the point — the spread measures movement, never
 * correctness, and reading it as a gate refused a recording that aligns on 97.2 % of its samples.
 */
private fun reportGeometry(scan: ScannedGeometry) {
    println(geometryReport(scan))
    geometryWarnings(scan).forEach { println("  ! $it") }
    val refusals = geometryRefusals(scan)
    if (refusals.isEmpty()) return
    println("this footage cannot become a candidate:")
    refusals.forEach { println("  - $it") }
    exitProcess(1)
}

internal fun candidateFileFor(
    video: File,
    options: ReplayOptions,
): File = File(File(RECORDINGS_DIR, options.name ?: video.nameWithoutExtension), "candidate.json")

/** The LABEL's stored quad, so a score run replays through the same geometry as the label did. */
internal fun quadFromCandidate(candidate: File): FloatArray {
    val geometry =
        Json
            .parseToJsonElement(candidate.readText())
            .jsonObject
            .getValue("geometry")
            .jsonObject
    val corners =
        geometry.getValue("corners").jsonArray.map { point ->
            val xy = point.jsonArray
            doubleArrayOf(xy[0].jsonPrimitive.double, xy[1].jsonPrimitive.double)
        }
    return cornersToFlat(corners)
}

/**
 * Everything a label/score/frames run collects WHILE the replay drives, and what it does
 * afterwards. Owns the decision collector, the annotated-frame writers, and the epilogue.
 *
 * Both writers emit the NORMALISED picture — the rectified board, never the raw camera frame.
 * The review writer triggers on COMMITS (what a human confirms) and paints nothing on it; the
 * decisive writer triggers on every decision row, rejections included, and keeps the engine's
 * verdicts on the picture, because a refusal is exactly the moment worth looking at.
 */
internal class LabelSession(
    private val labelRun: LabelRun?,
    private val scoreCandidate: File?,
    framesDir: File?,
    quad: FloatArray,
    boardSize: Int,
    fps: Double,
    private val status: () -> TrackerStatus?,
    private val timeline: PlyTimeline?,
) {
    val collector = DecisionCollector(fps) { status()?.alarm?.kind }

    // Plain board, no verdict tints: these are what a human judges the move on, and the engine's
    // opinion painted over the picture is the one thing that must not steer that judgement.
    private val review = labelRun?.let { AnnotatedFrames(File(it.dir, "frames"), quad, boardSize, annotate = false) }
    private val decisive = framesDir?.let { AnnotatedFrames(it, quad, boardSize) }
    private val phonePlies = mutableListOf<CommittedPly>()
    private var lastMs = -1.0
    private var pliesSeen = 0
    private var rowsSeen = 0

    /**
     * What the candidate proposes: the phone's own commits when the recording carries them, and
     * the replay's otherwise. A replay that lost the position proposed NOTHING on four transferred
     * sessions (2026-08-15, "0 Halbzüge"), while the phone had written every move down.
     */
    private val plies: List<CommittedPly> get() = if (timeline == null) collector.plies else phonePlies

    /** Index, picture and video time in ONE call — the frame writers' correctness rests on that. */
    val frameHook: ((Int, Mat, Double) -> Unit)? =
        if (review == null && decisive == null) {
            null
        } else {
            { index, frame, timeMs ->
                val st = status()
                timeline?.crossed(lastMs, timeMs)?.forEach { mark -> phonePlies += mark.committed(index, timeMs) }
                lastMs = timeMs
                val rows = collector.rows
                review?.onFrame(index, frame, st, decisive = plies.size > pliesSeen)
                decisive?.onFrame(index, frame, st, decisive = rows > rowsSeen)
                pliesSeen = plies.size
                rowsSeen = rows
            }
        }

    fun finish(
        video: File?,
        options: ReplayOptions,
        config: TrackerConfig,
        geometry: BoardGeometry,
        totals: RunTotals,
    ) {
        if (labelRun != null && review != null) {
            val outcome =
                LabelOutcome(
                    plies,
                    totals.note,
                    totals.observations,
                    totals.frames,
                    review.count,
                    totals.drops,
                )
            writeLabel(labelRun, options, requireNotNull(video) { "label needs a video file" }, config, geometry, outcome)
            review.close()
        }
        decisive?.let {
            println("decisive frames written: ${it.count} (annotated rectified board, not raw camera frames)")
            it.close()
        }
        if (scoreCandidate != null) {
            // `collector.plies`, never [plies]: score measures THIS replay against a stored label,
            // and on a transferred session the phone's list is what the label already holds —
            // scoring it against itself is a perfect score that says nothing.
            printScore(
                scoreCandidate,
                labelPlies(scoreCandidate),
                collector.plies.map { ScoredPly(it.san, it.frame, it.decider) },
                options.model,
            )
        }
    }
}

/** A phone-logged move as a candidate row: the tracker never decided it, the recorder did. */
private fun PlyMark.committed(
    frame: Int,
    timeMs: Double,
): CommittedPly =
    CommittedPly(
        ply = ply,
        san = san,
        uci = uci,
        frame = frame,
        t = timeMs / MS_PER_SECOND,
        decider = "phone_log",
        alarm = null,
        fenAfter = fen,
    )

/** What one finished run measured about itself — the four values travel together into the label. */
internal class RunTotals(
    val note: String?,
    val observations: Int,
    val frames: Int,
    val drops: String,
)

private fun writeLabel(
    run: LabelRun,
    options: ReplayOptions,
    video: File,
    config: TrackerConfig,
    geometry: BoardGeometry,
    outcome: LabelOutcome,
) {
    val candidate =
        candidateJson(
            name = run.name,
            videoRelative = relativeVideo(video, File(DATA_DIR)),
            scan = run.scan,
            source = sourceJson(options, config, geometry),
            effectiveConfig = effectiveConfigJson(config, options.cnn),
            startFen = STARTPOS,
            outcome = outcome,
        )
    val path = writeCandidate(run.dir, candidate)
    println(
        "candidate written: ${path.path} " +
            "(${outcome.plies.size} plies, ${outcome.framesWritten} review frames, confirmed: false)",
    )
}

/** The `source` block: what produced this candidate, crop included (specs/41 — record it or lose it). */
private fun sourceJson(
    options: ReplayOptions,
    config: TrackerConfig,
    geometry: BoardGeometry,
) = buildJsonObject {
    val cnnOn = options.cnn
    if (cnnOn) put("cnn_run", options.model) else put("cnn_run", JsonNull)
    put("lens", options.lens)
    put("obs_s", config.observerIntervalS)
    put("profile", "desktop")
    put(
        "tracker",
        buildJsonObject {
            put("settle_frames", config.settleFrames(cnnOn))
            put("avg_frames", config.avgFrames(cnnOn))
            put("confirm_frames", config.confirmFrames(cnnOn))
        },
    )
    put("context", REVIEW_CONTEXT)
    put("start_frame", 0)
    put(
        "crop",
        buildJsonObject {
            put("cell", geometry.boardSize / SQUARES_PER_SIDE)
            put("pad_up", geometry.padUp)
            put("pad_side", geometry.padSide)
            put(
                "out_size",
                buildJsonArray {
                    add(JsonPrimitive(geometry.outW))
                    add(JsonPrimitive(geometry.outH))
                },
            )
        },
    )
}

/** Candidates live under `data/` (gitignored), where the Python labeler put them. */
private const val RECORDINGS_DIR = "../../data/recordings"

private const val DATA_DIR = "../../data"

private const val SQUARES_PER_SIDE = 8.0
