package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cornersToFlat
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.games.StoredMove
import com.chesslab.tracker.games.decodeStoredGame
import com.chesslab.tracker.games.segmentsOrOne
import com.chesslab.tracker.geometry.GeometryScan
import com.chesslab.tracker.geometry.ScannedGeometry
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.io.Jsonl
import com.chesslab.tracker.settings.ConfigCodec
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
import org.opencv.core.Mat
import java.io.File
import java.util.Locale
import kotlin.math.abs
import kotlin.system.exitProcess

// `phone-candidate`: the record's plies on the video's clock, without replaying anything — only the geometry
// scan and a frame index per ply.

/** `docs/phone-transfer.md`; frames, may be negative. */
internal const val PHONE_FRAME_OFFSET: Int = 0

/** The default the platform never passes — the same one `labelArgs` uses. */
internal const val PHONE_DEFAULT_MODEL = DEFAULT_MODEL

internal data class FrameRow(
    val elapsedNs: Long,
    val wallTsMs: Long,
    val fen: String?,
    val corners: FloatArray? = null,
)

internal data class DecisionRow(
    val ply: Int,
    val elapsedNs: Long,
    val san: String? = null,
    val uci: String? = null,
    val fenBefore: String? = null,
    val fenAfter: String? = null,
)

internal data class TimelineRows(
    val syncs: List<Pair<Long, Long>>,
    val frames: List<FrameRow>,
    val decisions: List<DecisionRow>,
    /** An `event` row carries no FEN but both clocks. */
    val events: List<Pair<Long, Long>>,
) {
    /** The phone's quad at [elapsedNs]: the first frame row from there that carries one, else the last before. */
    fun cornersAt(elapsedNs: Long): FloatArray? =
        frames.firstOrNull { it.elapsedNs >= elapsedNs && it.corners != null }?.corners
            ?: frames.lastOrNull { it.elapsedNs < elapsedNs && it.corners != null }?.corners

    companion object {
        fun read(timeline: File): TimelineRows {
            val syncs = ArrayList<Pair<Long, Long>>()
            val frames = ArrayList<FrameRow>()
            val decisions = ArrayList<DecisionRow>()
            val events = ArrayList<Pair<Long, Long>>()
            Jsonl.rows(timeline).forEach { row ->
                val elapsed = row.long("elapsedNs") ?: return@forEach
                when (row["kind"]?.jsonPrimitive?.contentOrNull) {
                    "video_sync" -> row.long("durationNs")?.let { syncs += elapsed to it }
                    "frame" -> frames += FrameRow(elapsed, row.long("wallTsMs") ?: 0L, row.text("fen"), cornersOf(row["corners"]))
                    "event" -> row.long("wallTsMs")?.let { events += elapsed to it }
                    "decision" ->
                        row.acceptedPly()?.let {
                            decisions +=
                                DecisionRow(it, elapsed, row.text("san"), row.text("uci"), row.text("fenBefore"), row.text("fenAfter"))
                        }
                    else -> Unit
                }
            }
            return TimelineRows(
                syncs.sortedBy { it.first },
                frames.sortedBy { it.elapsedNs },
                decisions.sortedBy { it.elapsedNs },
                events.sortedBy { it.first },
            )
        }
    }
}

internal enum class TimeRule {
    FRAME,
    DECISION,
    WALL,
}

/** Tried in [order]. The bound is NON-STRICT: a batch commit puts several plies on one instant (8 on 4). */
internal class PhoneClock(
    private val rows: TimelineRows,
    private val order: List<TimeRule> = listOf(TimeRule.FRAME, TimeRule.DECISION, TimeRule.WALL),
) {
    fun cornersAt(elapsedNs: Long): FloatArray? = rows.cornersAt(elapsedNs)

    fun elapsedNs(
        ply: Int,
        fenAfter: String,
        tsEpochMs: Long,
        afterNs: Long,
    ): Pair<Long, TimeRule>? =
        order.firstNotNullOfOrNull { rule ->
            ruleAt(rule, ply, fenAfter, tsEpochMs, afterNs)?.let { it to rule }
        }

    fun videoMs(elapsedNs: Long): Double = RecordedFrames.videoNsAt(elapsedNs, rows.syncs) / NS_PER_MS

    private fun ruleAt(
        rule: TimeRule,
        ply: Int,
        fenAfter: String,
        tsEpochMs: Long,
        afterNs: Long,
    ): Long? =
        when (rule) {
            TimeRule.FRAME ->
                rows.frames
                    .firstOrNull { it.elapsedNs >= afterNs && it.fen != null && placementAndSide(it.fen) == placementAndSide(fenAfter) }
                    ?.elapsedNs
            TimeRule.DECISION -> rows.decisions.firstOrNull { it.elapsedNs >= afterNs && it.ply == ply }?.elapsedNs
            // A move synthesised from the timeline carries no wall clock (0).
            TimeRule.WALL -> if (tsEpochMs == 0L) null else wallAt(tsEpochMs, afterNs)
        }

    /** Both clocks are `System.currentTimeMillis()`, so only the offset is read. */
    private fun wallAt(
        tsEpochMs: Long,
        afterNs: Long,
    ): Long? {
        val walls = rows.frames.map { it.elapsedNs to it.wallTsMs } + rows.events
        val near = walls.filter { it.first >= afterNs }.minByOrNull { abs(it.second - tsEpochMs) } ?: return null
        return near.first + (tsEpochMs - near.second) * NS_PER_MS.toLong()
    }
}

internal class PhoneFrameClock(
    private val timestampsMs: List<Double>,
) {
    val size: Int get() = timestampsMs.size

    /** The last index within one frame interval past the end still counts (a mate 0.3 s before the recorder stopped). */
    fun indexAt(videoMs: Double): Int? {
        val hit = timestampsMs.indexOfFirst { it >= videoMs }
        if (hit >= 0) return hit
        val last = timestampsMs.lastOrNull() ?: return null
        val interval = if (timestampsMs.size > 1) last - timestampsMs[timestampsMs.size - 2] else 0.0
        return if (videoMs <= last + interval) timestampsMs.size - 1 else null
    }
}

/** A pair commit writes one row for the second ply only: a missing ply is the one legal move onto the next row's
 *  `fenBefore`, at the next row's time. */
internal fun decisionMoves(
    rows: TimelineRows,
    startFen: String,
): List<Pair<StoredMove, Long>>? {
    val byPly = rows.decisions.groupBy { it.ply }.mapValues { (_, v) -> v.minBy { it.elapsedNs } }
    if (byPly.isEmpty()) return null
    val board = Board().apply { loadFromFen(startFen) }
    val out = ArrayList<Pair<StoredMove, Long>>()
    for (ply in 1..byPly.keys.max()) {
        val own = byPly[ply]
        val next =
            byPly.keys
                .filter { it > ply }
                .minOrNull()
                ?.let { byPly.getValue(it) }
        val uci =
            when {
                !own?.uci.isNullOrBlank() -> own.uci
                next?.fenBefore != null ->
                    runCatching {
                        board
                            .moveTo(
                                next.fenBefore.substringBefore(' '),
                            ).also { board.undoMove() }
                    }.getOrNull()
                else -> null
            } ?: return null
        val move = Move(uci, board.sideToMove)
        if (MoveGenerator.generateLegalMoves(board).none { it.toString() == move.toString() }) return null
        val san = own?.san ?: MoveList(board.fen).apply { add(move) }.toSanArray().first()
        board.doMove(move)
        out += StoredMove(ply, san, uci, tsEpochMs = 0L) to (own?.elapsedNs ?: next!!.elapsedNs)
    }
    return out
}

/** The frame rows may begin after the first move (a short pre-roll). */
private fun decisionStartFen(rows: TimelineRows): String? = rows.decisions.firstOrNull { it.ply == 1 }?.fenBefore

internal fun decisionMarks(timeline: File): List<PlyMark>? {
    if (!timeline.isFile) return null
    val rows = TimelineRows.read(timeline)
    if (rows.syncs.isEmpty()) return null
    val startFen = decisionStartFen(rows) ?: RecordedFrames.startFen(timeline) ?: STARTPOS
    val moves = decisionMoves(rows, startFen) ?: return null
    val board = Board().apply { loadFromFen(startFen) }
    return moves.map { (move, elapsedNs) ->
        board.doMove(Move(move.uci, board.sideToMove))
        PlyMark(
            move.ply,
            move.san,
            move.uci,
            board.fen,
            RecordedFrames.videoNsAt(elapsedNs, rows.syncs) / NS_PER_MS,
            rows.cornersAt(elapsedNs),
        )
    }
}

internal class PhoneRefusal(
    message: String,
) : RuntimeException(message)

internal fun phoneCandidate(args: List<String>) {
    val dir = requireNotNull(args.firstOrNull()) { "phone-candidate needs a recording directory" }
    val options = args.drop(1)
    try {
        buildPhoneCandidate(File(dir), options.stringOption("force") == "1", options.stringOption("model") ?: PHONE_DEFAULT_MODEL)
    } catch (refusal: PhoneRefusal) {
        println("refused: ${refusal.message}")
        exitProcess(1)
    }
}

/** Scans the geometry in ONE decode pass over the recording. */
internal fun buildPhoneCandidate(
    recordingDir: File,
    force: Boolean,
    model: String,
): File {
    val sessionDir = sessionDirIn(recordingDir)
    val video = bundleFile(sessionDir, recordingDir, "video.mp4") ?: throw PhoneRefusal("no video.mp4")
    val stamps = ArrayList<Double>()
    val samples = QuadSamples()
    val scan =
        openRecording(video).use { src ->
            val scan = GeometryScan(src.fps) { println("  $it") }
            while (true) {
                // Owned and reused by the source — releasing it kills the run.
                val mat = src.next() ?: break
                scan.offer(mat, src.timestampMs)
                samples.offer(mat, stamps.size)
                stamps += src.timestampMs
            }
            scan
        }
    val clock = PhoneFrameClock(stamps)
    // Only the FIRST segment's frames measure its quad: the board may move at the seam after it
    // (2026-08-30-16-20-19, the whole-video median stood on the moved board).
    val last = phonePlan(recordingDir, clock).plies.maxOf { it.frame } + REVIEW_CONTEXT
    val scanned = scan.result(upToFrame = last) ?: throw PhoneRefusal("no sampled frame up to $last aligned to the board's grid")
    println("geometry measured on frames 0..$last of ${stamps.size}: the candidate's segment, not the whole recording")
    val (chosen, quadNote) = chooseQuad(scanned, loggedQuad(sessionDir), samples.upTo(last))
    samples.release()
    return buildPhoneCandidate(recordingDir, force, desktopModelSpec(model), chosen, clock, quadNote) { plies ->
        writeReviewFrames(video, recordingDir, chosen, plies)
    }
}

private class QuadSamples(
    private val keep: Int = QUAD_SAMPLES,
) {
    private val frames = ArrayList<Pair<Int, Mat>>()
    private var stride = QUAD_SAMPLE_STRIDE

    fun offer(
        frame: Mat,
        index: Int,
    ) {
        if (index % stride != 0) return
        frames += index to frame.clone()
        if (frames.size > keep) {
            frames.filterIndexed { i, _ -> i % 2 == 1 }.forEach { it.second.release() }
            val kept = frames.filterIndexed { i, _ -> i % 2 == 0 }
            frames.clear()
            frames += kept
            stride *= 2
        }
    }

    fun upTo(lastFrame: Int): List<Mat> = frames.filter { it.first <= lastFrame }.map { it.second }

    fun release() = frames.forEach { it.second.release() }
}

/** The scan's median against the phone's quad at game start, both measured against the grooves; the scan gates
 *  every sample and never its median. */
internal fun chooseQuad(
    scan: ScannedGeometry,
    logged: FloatArray?,
    samples: List<Mat>,
): Pair<ScannedGeometry, JsonObject> {
    val scanQuad = cornersToFlat(scan.corners)
    val offsets = LinkedHashMap<String, Double>()
    if (samples.isNotEmpty()) {
        offsets["scan"] = medianOffset(samples.map { grooveOffset(it, scanQuad, scan.boardSize) })
        if (logged != null) offsets["phone-log"] = medianOffset(samples.map { grooveOffset(it, logged, scan.boardSize) })
    }
    val chosen = offsets.minByOrNull { it.value }?.key ?: "scan"
    println(
        "quad check on ${samples.size} frames: " +
            offsets.entries.joinToString(", ") { "${it.key} ${"%.3f".format(Locale.ROOT, it.value)} cells" } + " -> $chosen",
    )
    val note =
        buildJsonObject {
            put("chosen", chosen)
            offsets.forEach { (k, v) -> put("offset_cells_$k", v) }
        }
    val corners = if (chosen == "phone-log" && logged != null) cornersFromFlat(logged) else scan.corners
    return scan.copy(corners = corners) to note
}

/** The replay's third quad source: measured 6 to 25 plies from the scan's. */
internal fun loggedQuad(sessionDir: File): FloatArray? {
    val log = File(sessionDir, "log.jsonl").takeIf { it.isFile } ?: return null
    val first = Jsonl.rows(log).firstOrNull() ?: return null
    return runCatching {
        first
            .getValue("corners")
            .jsonArray
            .flatMap { point -> point.jsonArray.map { it.jsonPrimitive.content.toFloat() } }
            .toFloatArray()
    }.getOrNull()?.takeIf { it.size == 8 }
}

private const val QUAD_SAMPLES = 24
private const val QUAD_SAMPLE_STRIDE = 400

/** The scan pass cannot write them — its median quad arrives only at the end; without them the confirm page
 *  showed "Kein Bild" for every phone candidate. */
private fun writeReviewFrames(
    video: File,
    recordingDir: File,
    scan: ScannedGeometry,
    plies: List<CommittedPly>,
): Int {
    val wanted = plies.mapTo(HashSet()) { it.frame }
    val last = (wanted.maxOrNull() ?: return 0) + REVIEW_CONTEXT
    val review =
        AnnotatedFrames(File(recordingDir, "frames"), cornersToFlat(scan.corners), scan.boardSize, annotate = false) { index ->
            plies.lastOrNull { it.frame <= index }?.corners
        }
    openRecording(video).use { src ->
        var index = 0
        while (index <= last) {
            val mat = src.next() ?: break
            review.onFrame(index, mat, status = null, decisive = index in wanted)
            index += 1
        }
    }
    review.close()
    println("review frames written: ${review.count} (rectified board, second decode pass)")
    review.trouble()?.let { println("WARNING: $it") }
    return review.count
}

internal class PhonePlan(
    val sid: String,
    val gameId: String?,
    val startFen: String,
    val note: String?,
    val rule: String,
    val plies: List<CommittedPly>,
)

internal fun phonePlan(
    recordingDir: File,
    frames: PhoneFrameClock,
): PhonePlan {
    val sessionDir = sessionDirIn(recordingDir)
    val sid = sessionDir.name
    val timeline = bundleFile(sessionDir, recordingDir, "timeline.jsonl") ?: throw PhoneRefusal("no timeline.jsonl")
    val rows = TimelineRows.read(timeline)
    if (rows.syncs.isEmpty()) throw PhoneRefusal("timeline carries no video_sync rows")
    val record = gameRecordFor(sessionDir, emptyList())
    val game = record?.let { decodeStoredGame(it.readText()) }
    val segments = game?.segmentsOrOne().orEmpty()
    val startFen = segments.firstOrNull()?.startFen ?: decisionStartFen(rows) ?: RecordedFrames.startFen(timeline) ?: STARTPOS
    // No saved game: the accepted decisions ARE the record (the photo log skips plies).
    val moves =
        segments.firstOrNull()?.moves
            ?: decisionMoves(rows, startFen)?.map { it.first }
            ?: throw PhoneRefusal("no game record names session $sid and the timeline has no accepted decisions")
    if (moves.isEmpty()) throw PhoneRefusal("first segment has no moves")
    val note =
        segments
            .drop(1)
            .sumOf { it.moves.size }
            .takeIf { it > 0 }
            ?.let { "$it plies after a seam omitted" }

    val rulesUsed = LinkedHashSet<TimeRule>()
    val plies = placeSegment(startFen, moves, PhoneClock(rows), frames, rulesUsed)
    val afterEnd = moves.size - plies.size
    val notes = listOfNotNull(note, afterEnd.takeIf { it > 0 }?.let { "$it plies after the video's end omitted" })
    return PhonePlan(
        sid = sid,
        gameId = game?.id,
        startFen = startFen,
        note = notes.joinToString("; ").ifEmpty { null },
        rule = rulesUsed.joinToString("|") { it.name.lowercase() },
        plies = plies,
    )
}

internal fun buildPhoneCandidate(
    recordingDir: File,
    force: Boolean,
    spec: ModelSpec?,
    scan: ScannedGeometry,
    frames: PhoneFrameClock,
    quadNote: JsonObject? = null,
    reviewFrames: (List<CommittedPly>) -> Int = { 0 },
): File {
    val sessionDir = sessionDirIn(recordingDir)
    val plan = phonePlan(recordingDir, frames)
    val candidate = File(recordingDir, "candidate.json")
    if (candidate.isFile && !force) throw PhoneRefusal("candidate.json exists — pass force=1 to replace")
    val framesWritten = reviewFrames(plan.plies)

    val geometry = replayBoardGeometry(cornersToFlat(scan.corners), recordingDir, null).withCropOf(spec)
    val source =
        buildJsonObject {
            put("kind", "phone")
            if (plan.gameId == null) put("game", JsonNull) else put("game", plan.gameId)
            put("record", if (plan.gameId == null) "timeline" else "game")
            put("session", plan.sid)
            put("rule", plan.rule)
            put("offset_frames", PHONE_FRAME_OFFSET)
            if (quadNote != null) put("quad", quadNote)
            put("crop", cropJson(geometry))
        }
    val json =
        candidateJson(
            name = recordingDir.name,
            videoRelative =
                relativeVideo(
                    bundleFile(sessionDir, recordingDir, "video.mp4") ?: throw PhoneRefusal("no video.mp4"),
                    File(DATA_DIR),
                ),
            scan = scan,
            source = source,
            effectiveConfig = settingsJson(sessionDir, recordingDir),
            startFen = plan.startFen,
            outcome =
                LabelOutcome(
                    plan.plies,
                    plan.note,
                    observations = 0,
                    frames = frames.size,
                    framesWritten = framesWritten,
                    drops = "",
                ),
        )
    val path = writeCandidate(recordingDir, json)
    println("wrote ${path.path}: ${plan.plies.size} plies (rules ${plan.rule}), offset $PHONE_FRAME_OFFSET, $framesWritten review frames")
    return path
}

/** `doMove` is no legality check at any validation level, so the generator has to be asked. */
private fun placeSegment(
    startFen: String,
    moves: List<StoredMove>,
    clock: PhoneClock,
    frames: PhoneFrameClock,
    rulesUsed: MutableSet<TimeRule>,
): List<CommittedPly> {
    val board = Board().apply { loadFromFen(startFen) }
    val plies = ArrayList<CommittedPly>()
    var afterNs = Long.MIN_VALUE
    for (row in moves) {
        val move = Move(row.uci, board.sideToMove)
        val before = board.fen
        if (MoveGenerator.generateLegalMoves(board).none { it.toString() == move.toString() }) {
            throw PhoneRefusal("ply ${row.ply} ${row.san} is not legal from $before")
        }
        board.doMove(move)
        val fenAfter = board.fen
        val hit =
            clock.elapsedNs(row.ply, fenAfter, row.tsEpochMs, afterNs)
                ?: throw PhoneRefusal(refusalFor(row.ply, clock.elapsedNs(row.ply, fenAfter, row.tsEpochMs, Long.MIN_VALUE) != null))
        afterNs = hit.first
        rulesUsed += hit.second
        val videoMs = clock.videoMs(hit.first)
        // Past the end the recorder stopped before the game did; earlier plies keep their frames.
        val frame = frames.indexAt(videoMs)?.plus(PHONE_FRAME_OFFSET) ?: break
        if (frame < 0) throw PhoneRefusal("ply ${row.ply} lands before the video")
        plies += PlyMark(row.ply, row.san, row.uci, fenAfter, videoMs, clock.cornersAt(hit.first)).committed(frame, videoMs)
    }
    if (plies.isEmpty()) throw PhoneRefusal("every ply lands outside the video")
    return plies
}

private fun refusalFor(
    ply: Int,
    earlierExists: Boolean,
): String = if (earlierExists) "ply $ply is out of order" else "ply $ply has no time in the timeline"

/** Several would leave the record's `sessionId` ambiguous. */
private fun sessionDirIn(recordingDir: File): File {
    val dirs = File(recordingDir, "files/sessions").listFiles { f: File -> f.isDirectory }?.sortedBy { it.name }.orEmpty()
    if (dirs.isEmpty()) throw PhoneRefusal("no session directory")
    if (dirs.size > 1) throw PhoneRefusal("${dirs.size} session directories")
    return dirs.first()
}

/** The session dir FIRST — the order `videoOf` and `videoInput` read. */
private fun bundleFile(
    sessionDir: File,
    recordingDir: File,
    name: String,
): File? = listOf(File(sessionDir, name), File(recordingDir, name)).firstOrNull { it.isFile }

/** The device spells an unset override `NaN`, which `writeCandidate` cannot encode; `effectiveConfigJson`
 *  writes it as null, like a replayed candidate. */
private fun settingsJson(
    sessionDir: File,
    recordingDir: File,
): JsonObject {
    val file = bundleFile(sessionDir, recordingDir, "settings.json") ?: return JsonObject(emptyMap())
    val json = Json { allowSpecialFloatingPointValues = true }
    val root = runCatching { json.parseToJsonElement(file.readText()).jsonObject }.getOrNull() ?: return JsonObject(emptyMap())
    val envelope = root["config"] as? JsonObject ?: root
    val decoded = ConfigCodec.decode(json.encodeToString(JsonObject.serializer(), envelope))
    // `config` sind VORGABEN, nicht das Geraet: neun Candidates trugen sie als Messung.
    decoded.note?.let {
        println("  settings.json: $it")
        return buildJsonObject { put("unknown", it) }
    }
    return effectiveConfigJson(decoded.config, cnnOn = true)
}

/** The only FEN fields a frame row can witness. */
private fun placementAndSide(fen: String): String = fen.split(' ').take(2).joinToString(" ")

private fun JsonObject.long(key: String): Long? = this[key]?.jsonPrimitive?.longOrNull

private fun JsonObject.text(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull

private fun JsonObject.acceptedPly(): Int? =
    takeIf { it["accepted"]?.jsonPrimitive?.booleanOrNull == true }?.get("ply")?.jsonPrimitive?.intOrNull

private const val NS_PER_MS = 1_000_000.0
