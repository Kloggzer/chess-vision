package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cornersToFlat
import com.chesslab.tracker.geometry.GeometryScan
import com.chesslab.tracker.geometry.ScannedGeometry
import com.chesslab.tracker.geometry.ffmpegCfrHint
import com.chesslab.tracker.geometry.geometryRefusals
import com.chesslab.tracker.geometry.geometryReport
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
) {
    /** The quad the run is pinned to, when the plan carries one — measured or the label's own. */
    fun quad(): FloatArray? = labelRun?.quad ?: scoreCandidate?.let(::quadFromCandidate)

    fun session(
        quad: FloatArray,
        boardSize: Int,
        fps: Double,
        status: () -> TrackerStatus?,
    ): LabelSession = LabelSession(labelRun, scoreCandidate, framesDir, quad, boardSize, fps, status)
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
            File(File(REALGAMES_DIR, name), "frames-decisive")
        } else {
            null
        }
    return ReplayPlan(labelRun, scoreCandidate, framesDir)
}

/** What a `label` run measured before it replayed: the name, the directory, the quad, the scan. */
internal class LabelRun(
    val name: String,
    val dir: File,
    val quad: FloatArray,
    val scan: ScannedGeometry,
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
    val scan =
        VideoFileSource(video).use { src ->
            val scan = GeometryScan(src.fps) { println("  $it") }
            while (true) {
                val frame = src.next() ?: break
                scan.offer(frame, src.timestampMs)
            }
            scan.result()
        } ?: run {
            println("no sampled frame aligned to the board's grid — is the board in shot?")
            exitProcess(1)
        }
    println(geometryReport(scan))
    val refusals = geometryRefusals(scan)
    if (refusals.isNotEmpty()) {
        println("this footage cannot become a candidate:")
        refusals.forEach { println("  - $it") }
        println("  to re-encode:")
        println("    ${ffmpegCfrHint(video.path, scan.fps)}")
        exitProcess(1)
    }
    return LabelRun(name, File(REALGAMES_DIR, name), cornersToFlat(scan.corners), scan)
}

internal fun candidateFileFor(
    video: File,
    options: ReplayOptions,
): File = File(File(REALGAMES_DIR, options.name ?: video.nameWithoutExtension), "candidate.json")

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
 * Both writers emit the NORMALISED picture: the rectified board the engine reasons about, with
 * its verdict tints and the position it believes — never the raw camera frame. The review writer
 * triggers on COMMITS (what a human confirms); the decisive writer triggers on every decision
 * row, rejections included, because a refusal is exactly the moment worth looking at.
 */
internal class LabelSession(
    private val labelRun: LabelRun?,
    private val scoreCandidate: File?,
    framesDir: File?,
    quad: FloatArray,
    boardSize: Int,
    fps: Double,
    private val status: () -> TrackerStatus?,
) {
    val collector = DecisionCollector(fps) { status()?.alarm?.kind }
    private val review = labelRun?.let { AnnotatedFrames(File(it.dir, "frames"), quad, boardSize) }
    private val decisive = framesDir?.let { AnnotatedFrames(it, quad, boardSize) }
    private var pliesSeen = 0
    private var rowsSeen = 0

    /** Index and picture in ONE call — the frame writers' whole correctness rests on that. */
    val frameHook: ((Int, Mat) -> Unit)? =
        if (review == null && decisive == null) {
            null
        } else {
            { index, frame ->
                val st = status()
                val plies = collector.plies.size
                val rows = collector.rows
                review?.onFrame(index, frame, st, decisive = plies > pliesSeen)
                decisive?.onFrame(index, frame, st, decisive = rows > rowsSeen)
                pliesSeen = plies
                rowsSeen = rows
            }
        }

    fun finish(
        video: File?,
        options: ReplayOptions,
        config: TrackerConfig,
        geometry: BoardGeometry,
        note: String?,
        observations: Int,
        frames: Int,
    ) {
        if (labelRun != null && review != null) {
            val outcome = LabelOutcome(collector.plies, note, observations, frames, review.count)
            writeLabel(labelRun, options, requireNotNull(video) { "label needs a video file" }, config, geometry, outcome)
            review.close()
        }
        decisive?.let {
            println("decisive frames written: ${it.count} (annotated rectified board, not raw camera frames)")
            it.close()
        }
        if (scoreCandidate != null) {
            printScore(scoreCandidate, labelPlies(scoreCandidate), collector.plies.map { ScoredPly(it.san, it.frame, it.decider) })
        }
    }
}

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
private const val REALGAMES_DIR = "../../data/realgames"

private const val DATA_DIR = "../../data"

private const val SQUARES_PER_SIDE = 8.0
