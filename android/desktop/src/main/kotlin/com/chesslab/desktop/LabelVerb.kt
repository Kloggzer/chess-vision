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
import kotlinx.serialization.json.JsonObject
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

// `label`: replay through the measured MEDIAN quad and write the tracker's proposal where Python wrote its own.
// `score`: replay through the LABEL's stored quad — found / missed / invented, never one merged accuracy.

internal class ReplayPlan(
    private val labelRun: LabelRun?,
    private val scoreCandidate: File?,
    private val framesDir: File?,
    private val timeline: PlyTimeline?,
) {
    fun quad(): FloatArray? = labelRun?.quad ?: scoreCandidate?.let(::quadFromCandidate)

    /** The exact fit used to measure a label's quad; replay must use the same pixels. */
    fun lens(): LensModel? = labelRun?.lens

    fun session(
        quad: FloatArray,
        boardSize: Int,
        fps: Double,
        indexNow: () -> Int,
        status: () -> TrackerStatus?,
    ): LabelSession = LabelSession(labelRun, scoreCandidate, framesDir, quad, boardSize, fps, status, timeline, indexNow)
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
            // Review material lives with the game it reviews, not under tmp/.
            File(requireNotNull(recordingDirOf(options, video)) { "frames needs a video file" }, "frames-decisive")
        } else {
            null
        }
    return ReplayPlan(labelRun, scoreCandidate, framesDir, video?.let { sessionTimeline(it, emptyList()) })
}

internal class LabelRun(
    val name: String,
    val dir: File,
    val quad: FloatArray,
    val scan: ScannedGeometry,
    val lens: LensModel?,
)

/** Refuses footage that cannot carry a label. The quad is the per-corner MEDIAN over every sample that passed
 *  the absolute alignment gate: one frame's quad is a sample. */
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

/** A WARNING names the next step, a REFUSAL ends the run. The spread measures movement, never correctness:
 *  read as a gate it refused a recording that aligns on 97.2 % of its samples. */
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
): File = File(requireNotNull(recordingDirOf(options, video)), "candidate.json")

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

/** Both writers emit the rectified board. The review writer triggers on COMMITS and paints nothing; the
 *  decisive writer triggers on every row, rejections included, and keeps the verdicts on the picture. */
internal class LabelSession(
    private val labelRun: LabelRun?,
    private val scoreCandidate: File?,
    framesDir: File?,
    quad: FloatArray,
    boardSize: Int,
    fps: Double,
    private val status: () -> TrackerStatus?,
    private val timeline: PlyTimeline?,
    indexNow: () -> Int = { -1 },
) {
    val collector = DecisionCollector(fps, { status()?.alarm?.kind }, { status()?.corners }, indexNow)

    // No verdict tints: the engine's opinion must not steer the human's judgement.
    private val review =
        labelRun?.let { AnnotatedFrames(File(it.dir, "frames"), quad, boardSize, annotate = false) { status()?.corners } }
    private val decisive = framesDir?.let { AnnotatedFrames(it, quad, boardSize) }
    private val phonePlies = mutableListOf<CommittedPly>()
    private var lastMs = -1.0
    private var pliesSeen = 0
    private var rowsSeen = 0

    /** The phone's own commits when the recording carries them: a replay that lost the position proposed
     *  NOTHING on four transferred sessions while the phone had written every move down. */
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
            review.trouble()?.let { println("WARNING: $it") }
        }
        decisive?.let {
            println("decisive frames written: ${it.count} (annotated rectified board, not raw camera frames)")
            it.close()
        }
        if (scoreCandidate != null) {
            // `collector.plies`, never [plies]: on a transferred session the phone's list IS the label, and
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

internal fun PlyMark.committed(
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
        corners = corners,
    )

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

/** The `source` block: what produced this candidate, crop included — record it or lose it. */
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
    put("crop", cropJson(geometry))
}

/** `realgames/` and the labeling UI read this out of every candidate. */
internal fun cropJson(geometry: BoardGeometry): JsonObject =
    buildJsonObject {
        put("cell", geometry.boardSize / SQUARES_PER_SIDE)
        put("pad_side", geometry.padSide)
        put(
            "out_size",
            buildJsonArray {
                add(JsonPrimitive(geometry.outW))
                add(JsonPrimitive(geometry.outH))
            },
        )
    }

internal const val RECORDINGS_DIR = "../../data/recordings"

/** Null only when neither `name=` nor a video stem is known (a live camera). */
internal fun recordingDirOf(
    options: ReplayOptions,
    video: File?,
): File? = (options.name ?: video?.nameWithoutExtension)?.let { File(RECORDINGS_DIR, it) }

internal const val DATA_DIR = "../../data"

private const val SQUARES_PER_SIDE = 8.0
