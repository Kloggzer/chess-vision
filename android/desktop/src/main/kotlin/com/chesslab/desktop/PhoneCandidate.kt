package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.geometry.cornersToFlat
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.games.StoredMove
import com.chesslab.tracker.games.decodeStoredGame
import com.chesslab.tracker.games.segmentsOrOne
import com.chesslab.tracker.geometry.GeometryScan
import com.chesslab.tracker.geometry.ScannedGeometry
import com.chesslab.tracker.geometry.withCropOf
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
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
import java.io.File
import kotlin.math.abs
import kotlin.system.exitProcess

// `phone-candidate`: the record's plies on the video's clock, without replaying anything.
//
// A replay of a transferred bundle labels it from the game record anyway (`PhoneLog.gameMarks`,
// decider `phone_log`) and spends minutes running the tracker and the CNN to get there. All that
// is actually missing is the geometry scan and a frame index per ply — this verb keeps those two.

/** Measured by plan/02-phone-candidate Phase 00 (STATUS.md → Notes); frames, may be negative. */
internal const val PHONE_FRAME_OFFSET: Int = 0

/** The default the platform never passes — the same one `labelArgs` uses. */
internal const val PHONE_DEFAULT_MODEL = DEFAULT_MODEL

/** One `frame` row, reduced to what the rules read: when it was, and which position it showed. */
internal data class FrameRow(
    val elapsedNs: Long,
    val wallTsMs: Long,
    val fen: String?,
)

/** One ACCEPTED `decision` row: the ply it committed, when, and the move itself. */
internal data class DecisionRow(
    val ply: Int,
    val elapsedNs: Long,
    val san: String? = null,
    val uci: String? = null,
    val fenBefore: String? = null,
    val fenAfter: String? = null,
)

/** The `timeline.jsonl` rows the three time rules stand on, read in one pass. */
internal data class TimelineRows(
    /** (elapsedNs, durationNs) — the shape [RecordedFrames.videoNsAt] takes. */
    val syncs: List<Pair<Long, Long>>,
    val frames: List<FrameRow>,
    val decisions: List<DecisionRow>,
    /** (elapsedNs, wallTsMs) — an `event` row carries no FEN but does carry both clocks. */
    val events: List<Pair<Long, Long>>,
) {
    companion object {
        fun read(timeline: File): TimelineRows {
            val syncs = ArrayList<Pair<Long, Long>>()
            val frames = ArrayList<FrameRow>()
            val decisions = ArrayList<DecisionRow>()
            val events = ArrayList<Pair<Long, Long>>()
            timeline.forEachLine { line ->
                if (line.isBlank()) return@forEachLine
                val row = runCatching { Json.parseToJsonElement(line).jsonObject }.getOrNull() ?: return@forEachLine
                val elapsed = row.long("elapsedNs") ?: return@forEachLine
                when (row["kind"]?.jsonPrimitive?.contentOrNull) {
                    "video_sync" -> row.long("durationNs")?.let { syncs += elapsed to it }
                    "frame" -> frames += FrameRow(elapsed, row.long("wallTsMs") ?: 0L, row.text("fen"))
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

/** Which rule placed a ply — goes into `source.rule` and the log line. */
internal enum class TimeRule {
    FRAME,
    DECISION,
    WALL,
}

/**
 * The pack's time rule, tried in [order]; Phase 00 measured `frame`, `decision`, `wall` by coverage.
 *
 * The bound is NON-STRICT: a batch commit puts several plies on one instant (8 on 4, 124 on 102),
 * so demanding a strictly later row would refuse the very bundles the verb exists for.
 */
internal class PhoneClock(
    private val rows: TimelineRows,
    private val order: List<TimeRule> = listOf(TimeRule.FRAME, TimeRule.DECISION, TimeRule.WALL),
) {
    /** Only rows with `elapsedNs >= afterNs` count; null when every rule fails. */
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
            // A move synthesised from the timeline carries no wall clock (0): the rule cannot apply.
            TimeRule.WALL -> if (tsEpochMs == 0L) null else wallAt(tsEpochMs, afterNs)
        }

    /** Both clocks are `System.currentTimeMillis()`, so the slope is 1 and only the offset is read. */
    private fun wallAt(
        tsEpochMs: Long,
        afterNs: Long,
    ): Long? {
        val walls = rows.frames.map { it.elapsedNs to it.wallTsMs } + rows.events
        val near = walls.filter { it.first >= afterNs }.minByOrNull { abs(it.second - tsEpochMs) } ?: return null
        return near.first + (tsEpochMs - near.second) * NS_PER_MS.toLong()
    }
}

/** Decoded frame index per video time, collected during the scan's own decode pass. */
internal class PhoneFrameClock(
    private val timestampsMs: List<Double>,
) {
    val size: Int get() = timestampsMs.size

    /** First index at or after [videoMs]; null past the end. */
    fun indexAt(videoMs: Double): Int? = timestampsMs.indexOfFirst { it >= videoMs }.takeIf { it >= 0 }
}

/**
 * The move list the phone's accepted `decision` rows describe — the record when the game was never
 * saved. A pair commit writes one row for the second ply only, so a missing ply is the one legal
 * move onto the next row's `fenBefore`; the time is then the next row's. Null without decisions.
 */
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

/** Ply 1's own `fenBefore` — the frame rows may begin after the first move (a short pre-roll). */
private fun decisionStartFen(rows: TimelineRows): String? = rows.decisions.firstOrNull { it.ply == 1 }?.fenBefore

/** [PlyMark]s from the decisions, on the video clock — the replay's second source before `log.jsonl`. */
internal fun decisionMarks(timeline: File): List<PlyMark>? {
    if (!timeline.isFile) return null
    val rows = TimelineRows.read(timeline)
    if (rows.syncs.isEmpty()) return null
    val startFen = decisionStartFen(rows) ?: RecordedFrames.startFen(timeline) ?: STARTPOS
    val moves = decisionMoves(rows, startFen) ?: return null
    val board = Board().apply { loadFromFen(startFen) }
    return moves.map { (move, elapsedNs) ->
        board.doMove(Move(move.uci, board.sideToMove))
        PlyMark(move.ply, move.san, move.uci, board.fen, RecordedFrames.videoNsAt(elapsedNs, rows.syncs) / NS_PER_MS)
    }
}

/** What this verb refuses, in the words entry.md fixes — one stdout line, exit 1. */
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

/** Resolves the video and the model, then scans the geometry in ONE decode pass over the recording. */
internal fun buildPhoneCandidate(
    recordingDir: File,
    force: Boolean,
    model: String,
): File {
    val sessionDir = sessionDirIn(recordingDir)
    val video = bundleFile(sessionDir, recordingDir, "video.mp4") ?: throw PhoneRefusal("no video.mp4")
    val stamps = ArrayList<Double>()
    val scan =
        openRecording(video).use { src ->
            val scan = GeometryScan(src.fps) { println("  $it") }
            while (true) {
                // Owned and reused by the source (`FrameSource.next`) — releasing it kills the run.
                val mat = src.next() ?: break
                scan.offer(mat, src.timestampMs)
                stamps += src.timestampMs
            }
            scan.result() ?: throw PhoneRefusal("no sampled frame aligned to the board's grid")
        }
    return buildPhoneCandidate(recordingDir, force, desktopModelSpec(model), scan, PhoneFrameClock(stamps)) { plies ->
        writeReviewFrames(video, recordingDir, scan, plies)
    }
}

/**
 * A second decode pass for what `/confirm` shows: the rectified board at every ply's frame and
 * REVIEW_CONTEXT around it. The scan pass cannot write them — its quad is a median it does not have
 * until the end — and without them the confirm page showed "Kein Bild" for every phone candidate.
 */
private fun writeReviewFrames(
    video: File,
    recordingDir: File,
    scan: ScannedGeometry,
    plies: List<CommittedPly>,
): Int {
    val wanted = plies.mapTo(HashSet()) { it.frame }
    val last = (wanted.maxOrNull() ?: return 0) + REVIEW_CONTEXT
    val review = AnnotatedFrames(File(recordingDir, "frames"), cornersToFlat(scan.corners), scan.boardSize, annotate = false)
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
    return review.count
}

/** The record's first segment on the video's clock, written where a replay would have written it. */
internal fun buildPhoneCandidate(
    recordingDir: File,
    force: Boolean,
    spec: ModelSpec?,
    scan: ScannedGeometry,
    frames: PhoneFrameClock,
    reviewFrames: (List<CommittedPly>) -> Int = { 0 },
): File {
    val sessionDir = sessionDirIn(recordingDir)
    val sid = sessionDir.name
    val timeline = bundleFile(sessionDir, recordingDir, "timeline.jsonl") ?: throw PhoneRefusal("no timeline.jsonl")
    val rows = TimelineRows.read(timeline)
    if (rows.syncs.isEmpty()) throw PhoneRefusal("timeline carries no video_sync rows")
    val record = gameRecordFor(sessionDir, emptyList())
    val game = record?.let { decodeStoredGame(it.readText()) }
    val segments = game?.segmentsOrOne().orEmpty()
    val startFen = segments.firstOrNull()?.startFen ?: decisionStartFen(rows) ?: RecordedFrames.startFen(timeline) ?: STARTPOS
    // No saved game: the accepted decisions ARE the record (2026-08-24-22-43-46 has 79 of them and
    // a photo log that skips six plies).
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
    val candidate = File(recordingDir, "candidate.json")
    if (candidate.isFile && !force) throw PhoneRefusal("candidate.json exists — pass force=1 to replace")
    val framesWritten = reviewFrames(plies)

    val geometry = replayBoardGeometry(cornersToFlat(scan.corners), recordingDir, null).withCropOf(spec)
    val rule = rulesUsed.joinToString("|") { it.name.lowercase() }
    val source =
        buildJsonObject {
            put("kind", "phone")
            if (game == null) put("game", JsonNull) else put("game", game.id)
            put("record", if (game == null) "timeline" else "game")
            put("session", sid)
            put("rule", rule)
            put("offset_frames", PHONE_FRAME_OFFSET)
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
            startFen = startFen,
            outcome = LabelOutcome(plies, note, observations = 0, frames = frames.size, framesWritten = framesWritten, drops = ""),
        )
    val path = writeCandidate(recordingDir, json)
    println("wrote ${path.path}: ${plies.size} plies (rules $rule), offset $PHONE_FRAME_OFFSET, $framesWritten review frames")
    return path
}

/**
 * The segment walked on a chesslib board exactly as `gameMarks` walks it: `doMove` is no legality
 * check at any validation level, so the generator has to be asked.
 */
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
        val frame = frames.indexAt(videoMs)?.plus(PHONE_FRAME_OFFSET)
        if (frame == null || frame < 0) throw PhoneRefusal("ply ${row.ply} lands outside the video")
        plies += PlyMark(row.ply, row.san, row.uci, fenAfter, videoMs).committed(frame, videoMs)
    }
    return plies
}

/** An unbounded search that WOULD have matched says the timeline has the ply, just not after here. */
private fun refusalFor(
    ply: Int,
    earlierExists: Boolean,
): String = if (earlierExists) "ply $ply is out of order" else "ply $ply has no time in the timeline"

/** Exactly one session per bundle — several would leave the record's `sessionId` ambiguous. */
private fun sessionDirIn(recordingDir: File): File {
    val dirs = File(recordingDir, "files/sessions").listFiles { f: File -> f.isDirectory }?.sortedBy { it.name }.orEmpty()
    if (dirs.isEmpty()) throw PhoneRefusal("no session directory")
    if (dirs.size > 1) throw PhoneRefusal("${dirs.size} session directories")
    return dirs.first()
}

/** The session dir FIRST, then the mirrored top level — the order `videoOf` and `videoInput` read. */
private fun bundleFile(
    sessionDir: File,
    recordingDir: File,
    name: String,
): File? = listOf(File(sessionDir, name), File(recordingDir, name)).firstOrNull { it.isFile }

/**
 * The phone's own knobs in the REPLAY's shape, not the settings file verbatim.
 *
 * `settings.json` is the ConfigCodec envelope the device wrote, and it spells an unset override
 * `NaN` — which `writeCandidate` cannot encode (Phase 03: every measured bundle carries one).
 * `effectiveConfigJson` writes those as null, exactly as a replayed candidate does.
 */
private fun settingsJson(
    sessionDir: File,
    recordingDir: File,
): JsonObject {
    val file = bundleFile(sessionDir, recordingDir, "settings.json") ?: return JsonObject(emptyMap())
    val json = Json { allowSpecialFloatingPointValues = true }
    val root = runCatching { json.parseToJsonElement(file.readText()).jsonObject }.getOrNull() ?: return JsonObject(emptyMap())
    val envelope = root["config"] as? JsonObject ?: root
    val decoded = ConfigCodec.decode(json.encodeToString(JsonObject.serializer(), envelope))
    decoded.note?.let { println("  settings.json: $it") }
    return effectiveConfigJson(decoded.config, cnnOn = true)
}

/** Placement and side to move — the first two FEN fields, the only ones a frame row can witness. */
private fun placementAndSide(fen: String): String = fen.split(' ').take(2).joinToString(" ")

private fun JsonObject.long(key: String): Long? = this[key]?.jsonPrimitive?.longOrNull

private fun JsonObject.text(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull

private fun JsonObject.acceptedPly(): Int? =
    takeIf { it["accepted"]?.jsonPrimitive?.booleanOrNull == true }?.get("ply")?.jsonPrimitive?.intOrNull

private const val NS_PER_MS = 1_000_000.0
