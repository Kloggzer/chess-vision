@file:Suppress("MagicNumber", "TooManyFunctions")

package com.chesslab.desktop

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.expectedLabels
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cropBorderPx
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.gridOccludedSquares
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.opencv.core.Mat
import java.io.BufferedWriter
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets.UTF_8
import java.security.MessageDigest

private const val DEFAULT_SAMPLE_EVERY = 8
private const val DEFAULT_STABLE_SAMPLES = 3
private const val MAX_OCCUPANCY_MISMATCHES = 1
private const val PACK_SIDE = 80
private const val PACK_BYTES = PACK_SIDE * PACK_SIDE * 3
private const val UNREVIEWED_LABEL = "unreviewed"

/** Result of matching one visually stable board against the known positions of the played game. */
internal data class VideoPositionMatch(
    val ply: Int?,
    val mismatches: Int,
    val reason: String,
)

internal data class TrainingFrameRisk(
    val reasons: List<String>,
    val squares: Set<String>,
)

/** A frame with any independent warning is review material, never automatic training truth. */
internal fun trainingFrameRisk(
    cnnOccluded: Set<String>,
    cnnConflicts: Set<String>,
    engineOccluded: Set<String>,
): TrainingFrameRisk {
    val reasons =
        buildList {
            if (cnnOccluded.isNotEmpty()) add("cnn_occluded")
            if (cnnConflicts.isNotEmpty()) add("cnn_conflict")
            if (engineOccluded.isNotEmpty()) add("engine_occluded")
        }
    return TrainingFrameRisk(reasons, cnnOccluded + cnnConflicts + engineOccluded)
}

/**
 * Keeps extraction monotonic. A physical take-back is useful evidence, but it is not part of the
 * mapped game and must not silently label an old position as if play had continued normally.
 */
internal class VideoPositionGate {
    private var furthestPly = 0

    @Suppress("ReturnCount")
    fun accept(
        mismatches: List<Int>,
        maxMismatches: Int = MAX_OCCUPANCY_MISMATCHES,
    ): VideoPositionMatch {
        val best = mismatches.minOrNull() ?: return VideoPositionMatch(null, Int.MAX_VALUE, "no_positions")
        val candidates = mismatches.indices.filter { mismatches[it] == best }
        if (best > maxMismatches) return VideoPositionMatch(null, best, "not_in_game")
        if (candidates.size != 1) return VideoPositionMatch(null, best, "ambiguous_position")
        val ply = candidates.single()
        if (ply < furthestPly) return VideoPositionMatch(null, best, "takeback")
        furthestPly = maxOf(furthestPly, ply)
        return VideoPositionMatch(ply, best, "clean")
    }
}

/**
 * `training-video-pack <video> <game.json> <outDir> [every=N] [stable=N] [fps=N] [model=name] [visualcache=file]`.
 *
 * The Windows Kotlin tracker makes every admission decision. The game contributes only its trusted
 * sequence of FENs, while labels are generated from the matching FEN. Motion, tracker alarms,
 * unknown positions and take-backs are excluded. A clustered grid-groove loss is packed separately
 * as `occluded`, square by square.
 */
fun packTrainingVideo(args: List<String>) {
    require(args.size >= 3) { trainingVideoUsage() }
    val video = File(args[0].replace('~', ' '))
    val gameFile = File(args[1].replace('~', ' '))
    val outDir = File(args[2].replace('~', ' '))
    val options = args.drop(3)
    val every = options.intOption("every", DEFAULT_SAMPLE_EVERY)
    val stableNeeded = options.intOption("stable", DEFAULT_STABLE_SAMPLES)
    val trackerFps = options.doubleOption("fps")
    val model = options.stringOption("model") ?: DEFAULT_MODEL
    val visualCache = options.stringOption("visualcache")
    // The pack's rows are keyed by this, and `corrections.jsonl` dedups on
    // `(session_id, frame, square)` with LAST LINE WINNING — so an id that is not unique per
    // recording makes one human's verdict apply to another recording's crop. The video's own stem
    // was unique while videos came off a camera roll; every LAN-transferred phone recording is
    // `files/sessions/<id>/video.mp4`, so the stem is now the constant "video" for all of them.
    val id = options.stringOption("id") ?: video.nameWithoutExtension
    require(video.isFile && gameFile.isFile) { "video and game.json must exist" }
    require(every >= 1 && stableNeeded >= 2) { "every must be >= 1 and stable must be >= 2" }
    require(!outDir.exists()) { "refusing to overwrite ${outDir.absolutePath}" }

    val timeline = sessionTimeline(video, options)
    val capture = TrainingVideoCapture(video, gameFile, outDir, every, stableNeeded, trackerFps, model, id, timeline)
    replay(
        openRecording(video),
        video.name,
        ReplayOptions(watch = false, model = model, fps = trackerFps, visualCache = visualCache),
        video = video,
        training = capture,
    )
}

private data class KnownPosition(
    val fen: String,
    val labels: Map<String, String>,
)

private fun gamePositions(file: File): List<KnownPosition> {
    val root = Json.parseToJsonElement(file.readText()) as JsonObject
    val board = Board().apply { loadFromFen(root.getValue("startFen").jsonPrimitive.content) }
    val out = mutableListOf(KnownPosition(board.getFen(true, true), expectedLabels(board)))
    for ((index, row) in root.getValue("moves").jsonArray.withIndex()) {
        val uci = (row as JsonObject).getValue("uci").jsonPrimitive.content
        // `doMove(Move)` is `doMove(move, false)`, and even `fullValidation` never checks move
        // GEOMETRY — only king safety and castling rights. A garbage uci would be applied and
        // silently label every later position. Only the generator knows what a piece can do.
        val move = Move(uci, board.sideToMove)
        val fen = board.getFen(true, true)
        require(MoveGenerator.generateLegalMoves(board).any { it.toString() == move.toString() }) {
            "illegal mapped move $uci at ply ${index + 1} in $fen"
        }
        board.doMove(move)
        out += KnownPosition(board.getFen(true, true), expectedLabels(board))
    }
    return out
}

private fun bitSquares(bits: Long): List<String> = ALL_SQUARES.filterIndexed { index, _ -> bits and (1L shl index) != 0L }

internal interface ReplayTrainingSink {
    fun configure(
        geometry: BoardGeometry,
        corners: FloatArray,
        fps: Double,
    )

    fun frame(
        frameNo: Int,
        frame: Mat,
        status: TrackerStatus?,
        timeMs: Double,
    )

    fun finish()
}

@Suppress("LongParameterList")
private class TrainingVideoCapture(
    private val video: File,
    gameFile: File,
    private val outDir: File,
    private val every: Int,
    private val stableNeeded: Int,
    private val trackerFps: Double?,
    private val model: String,
    private val id: String,
    private val timeline: PlyTimeline?,
) : ReplayTrainingSink {
    private val positions = gamePositions(gameFile)
    private val gate = VideoPositionGate()
    private lateinit var geometry: BoardGeometry
    private lateinit var initialCorners: FloatArray
    private lateinit var accepted: VideoPackSink
    private lateinit var quarantine: VideoPackSink
    private lateinit var occludedProposals: VideoPackSink
    private lateinit var audit: BufferedWriter
    private var sampled = 0
    private var stable = 0
    private var lastFen: String? = null
    private var lastPly: Int? = null

    // A log from a different run would label every crop with someone else's game — the one way
    // this can go wrong silently, so it is checked before a single frame is read.
    init {
        timeline?.marks?.forEach { mark ->
            val known = positions.getOrNull(mark.ply)?.fen?.substringBefore(' ')
            require(known == mark.placement) { "log.jsonl ply ${mark.ply} does not match the game record" }
        }
    }

    override fun configure(
        geometry: BoardGeometry,
        corners: FloatArray,
        fps: Double,
    ) {
        this.geometry = geometry
        initialCorners = corners
        outDir.mkdirs()
        accepted = VideoPackSink(File(outDir, "accepted"), "$id-accepted")
        quarantine = VideoPackSink(File(outDir, "quarantine"), "$id-quarantine")
        occludedProposals =
            VideoPackSink(File(outDir, "occluded-proposals"), "$id-occluded-proposals")
        audit = File(outDir, "audit.jsonl").bufferedWriter()
    }

    @Suppress("ReturnCount")
    override fun frame(
        frameNo: Int,
        frame: Mat,
        status: TrackerStatus?,
        timeMs: Double,
    ) {
        if (frameNo % every != 0) return
        sampled++
        if (status == null) {
            reject(frameNo, timeMs, "no_status")
            return
        }
        val corners = status.corners ?: initialCorners
        val warped = warpBoardForCrops(frame, geometry, cornersFromFlat(corners))
        try {
            val handBits = gridOccludedSquares(warped, geometry, cropBorderPx(geometry))
            if (isHandShape(handBits)) {
                stable = 0
                val squares = bitSquares(handBits)
                occludedProposals.writeProposals(frameNo, warped, geometry, squares, "occluded", "grid_hand")
                audit.row(frameNo, timeMs, "quarantine_occluded", extras = ",\"squares\":${jsonArray(squares)}")
                return
            }
            // `state` is the lifecycle gate, not `verifyState`: after a commit the verdict stays
            // "confirmed" while the engine is already waiting again. A latched ALARM disqualifies
            // the frame only while the tracker IS the ply source — on the time axis it describes a
            // replay that lost the game, not the picture.
            val alarm = status.alarm?.takeIf { timeline == null }
            if (status.state != "waiting" || alarm != null) {
                reject(frameNo, timeMs, alarm?.let { "alarm_${it.kind}" } ?: status.state)
                return
            }
            val ply = (if (timeline != null) timedPly(frameNo, timeMs) else matchedPly(frameNo, timeMs, status)) ?: return
            // A CNN conflict is measured against the ENGINE's board, which is the thing the time
            // axis exists to stop trusting — a desynced replay would conflict on every frame and
            // quarantine the whole recording. Occlusion warnings stay: they are about the picture.
            val conflicts = if (timeline == null) status.cnnConflicts else emptySet()
            val risk = trainingFrameRisk(status.cnnOccluded, conflicts, status.occlusionVetoed)
            if (risk.reasons.isNotEmpty()) {
                quarantine.writeReviewBoard(frameNo, warped, geometry, positions[ply].labels, risk.reasons.joinToString("+"))
                audit.row(
                    frameNo,
                    timeMs,
                    "quarantine",
                    extras =
                        ",\"ply\":$ply,\"reasons\":${jsonArray(risk.reasons)}," +
                            "\"squares\":${jsonArray(risk.squares.sorted())}",
                )
                stable = 0
                lastFen = null
                lastPly = null
                return
            }
            accepted.writeBoard(frameNo, warped, geometry, positions[ply].labels)
            audit.row(frameNo, timeMs, "accepted", extras = ",\"ply\":$ply")
        } finally {
            warped.release()
        }
    }

    override fun finish() {
        audit.close()
        accepted.close(video, sampled)
        quarantine.close(video, sampled)
        occludedProposals.close(video, sampled)
        val recordedTrackerFps = trackerFps?.toString() ?: "\"full\""
        File(outDir, "summary.json").writeText(
            "{\"source\":\"${escape(video.absolutePath)}\",\"sampled_frames\":$sampled," +
                "\"accepted_frames\":${accepted.frames},\"accepted_crops\":${accepted.crops}," +
                "\"quarantine_frames\":${quarantine.frames},\"quarantine_crops\":${quarantine.crops}," +
                "\"occluded_proposal_frames\":${occludedProposals.frames}," +
                "\"occluded_proposal_crops\":${occludedProposals.crops}," +
                "\"tracker_fps\":$recordedTrackerFps,\"every\":$every,\"stable\":$stableNeeded," +
                "\"ply_source\":\"${if (timeline != null) "log_timestamps" else "fen_match"}\"," +
                "\"model\":\"${escape(model)}\",\"decision_source\":\"windows_kotlin_tracker\"}\n",
        )
        println(
            "tracker extraction: ${accepted.frames} accepted boards + ${quarantine.frames} quarantined boards + " +
                "${occludedProposals.crops} occluded proposals -> ${outDir.absolutePath}",
        )
    }

    /** The ply the phone's clock puts on the board, once it has held still for [stableNeeded]. */
    private fun timedPly(
        frameNo: Int,
        timeMs: Double,
    ): Int? {
        val ply = timeline?.plyAt(timeMs)
        if (ply == null) {
            reject(frameNo, timeMs, "move")
            return null
        }
        stable = if (ply == lastPly) stable + 1 else 1
        lastPly = ply
        if (stable < stableNeeded) {
            audit.row(frameNo, timeMs, "settling")
            return null
        }
        return ply
    }

    /** The tracker's own FEN, matched against the game — the only source a camera-roll video has. */
    private fun matchedPly(
        frameNo: Int,
        timeMs: Double,
        status: TrackerStatus,
    ): Int? {
        stable = if (status.fen == lastFen) stable + 1 else 1
        lastFen = status.fen
        if (stable < stableNeeded) {
            audit.row(frameNo, timeMs, "settling")
            return null
        }
        val mismatches = positions.map { if (it.fen == status.fen) 0 else MAX_OCCUPANCY_MISMATCHES + 1 }
        val match = gate.accept(mismatches)
        if (match.ply == null) {
            audit.row(frameNo, timeMs, match.reason)
            return null
        }
        return match.ply
    }

    private fun reject(
        frameNo: Int,
        timeMs: Double,
        reason: String,
    ) {
        stable = 0
        lastFen = null
        lastPly = null
        audit.row(frameNo, timeMs, reason)
    }
}

private class VideoPackSink(
    private val dir: File,
    private val id: String,
) : AutoCloseable {
    private val partial: File
    private val bytes: FileOutputStream
    private val manifest: BufferedWriter
    private val digest = MessageDigest.getInstance("SHA-256")
    var frames: Int = 0
        private set
    var crops: Int = 0
        private set

    init {
        dir.mkdirs()
        partial = File(dir, "packed_images.u8.partial")
        bytes = FileOutputStream(partial)
        manifest = File(dir, "manifest.jsonl").bufferedWriter()
    }

    fun writeBoard(
        frameNo: Int,
        warped: Mat,
        geometry: BoardGeometry,
        labels: Map<String, String>,
    ) {
        writeSquares(frameNo, warped, geometry, ALL_SQUARES) { labels.getValue(it) }
    }

    fun writeReviewBoard(
        frameNo: Int,
        warped: Mat,
        geometry: BoardGeometry,
        labels: Map<String, String>,
        reason: String,
    ) {
        writeSquares(frameNo, warped, geometry, ALL_SQUARES, reason) { labels.getValue(it) }
    }

    fun writeProposals(
        frameNo: Int,
        warped: Mat,
        geometry: BoardGeometry,
        squares: List<String>,
        proposedLabel: String,
        reason: String,
    ) = writeSquares(frameNo, warped, geometry, squares, reason) { proposedLabel }

    private fun writeSquares(
        frameNo: Int,
        warped: Mat,
        geometry: BoardGeometry,
        squares: List<String>,
        reviewReason: String? = null,
        labelOf: (String) -> String,
    ) {
        val stem = frameNo.toString().padStart(8, '0')
        for (square in squares) {
            val crop = cropSquare(warped, square, geometry)
            val packed =
                try {
                    resizeForPacking(crop)
                } finally {
                    crop.release()
                }
            val data = ByteArray(PACK_BYTES)
            try {
                packed.get(0, 0, data)
            } finally {
                packed.release()
            }
            bgrToRgbInPlace(data)
            bytes.write(data)
            val proposedLabel = labelOf(square)
            val label = if (reviewReason == null) proposedLabel else UNREVIEWED_LABEL
            val path = "mm://$id/$stem/$square"
            val reviewFields =
                reviewReason
                    ?.let {
                        ",\"proposed_label\":\"${escape(proposedLabel)}\",\"review_status\":\"quarantine\"," +
                            "\"review_reason\":\"${escape(it)}\""
                    }.orEmpty()
            manifest.append(
                "{\"path\":\"${escape(path)}\",\"session_id\":\"${escape(id)}\"," +
                    "\"frame\":\"$stem\",\"square\":\"$square\",\"label\":\"$label\"," +
                    "\"out_size\":[$PACK_SIDE,$PACK_SIDE],\"pad_side\":0.05$reviewFields}\n",
            )
            digest.update(path.toByteArray(UTF_8))
            digest.update(0)
            digest.update(label.toByteArray(UTF_8))
            digest.update('\n'.code.toByte())
            crops++
        }
        if (squares.isNotEmpty()) frames++
    }

    fun close(
        source: File,
        sampled: Int,
    ) {
        close()
        val image = File(dir, "packed_images.u8")
        check(partial.renameTo(image)) { "could not finalize ${image.absolutePath}" }
        val digestHex = digest.digest().joinToString("") { "%02x".format(it) }
        File(dir, "packed_meta.json").writeText(
            "{\"n\":$crops,\"h\":$PACK_SIDE,\"w\":$PACK_SIDE,\"source\":\"${escape(source.absolutePath)}\"," +
                "\"session_id\":\"${escape(id)}\",\"sampled_frames\":$sampled,\"accepted_frames\":$frames," +
                "\"digest\":\"$digestHex\"}\n",
        )
    }

    override fun close() {
        manifest.close()
        bytes.close()
    }
}

private fun BufferedWriter.row(
    frame: Int,
    timeMs: Double,
    outcome: String,
    motion: Double? = null,
    extras: String = "",
) {
    val motionField = motion?.takeIf(Double::isFinite)?.let { ",\"motion\":${"%.4f".format(java.util.Locale.ROOT, it)}" }.orEmpty()
    append("{\"frame\":$frame,\"time_ms\":${"%.3f".format(java.util.Locale.ROOT, timeMs)},\"outcome\":\"$outcome\"$motionField$extras}\n")
}

private fun jsonArray(values: List<String>): String = values.joinToString(",", "[", "]") { "\"${escape(it)}\"" }

private fun escape(value: String): String = value.replace("\\", "\\\\").replace("\"", "\\\"")

internal fun List<String>.stringOption(name: String): String? = firstOrNull { it.startsWith("$name=") }?.substringAfter('=')

private fun List<String>.intOption(
    name: String,
    fallback: Int,
): Int = stringOption(name)?.toIntOrNull() ?: fallback

internal fun List<String>.doubleOption(name: String): Double? = stringOption(name)?.toDoubleOrNull()?.takeIf { it > 0.0 }

private fun trainingVideoUsage(): Nothing =
    error(
        "usage: training-video-pack <video> <game.json> <outDir> " +
            "[every=N] [stable=N] [fps=N] [model=name] [visualcache=file] [id=name] " +
            "[log=file] [preroll=ms] [after=ms] [before=ms]",
    )
