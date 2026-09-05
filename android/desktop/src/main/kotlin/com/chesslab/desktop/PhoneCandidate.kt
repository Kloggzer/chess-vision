package com.chesslab.desktop

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import java.io.File
import kotlin.math.abs

// `phone-candidate`: the record's plies on the video's clock, without replaying anything.
//
// A replay of a transferred bundle labels it from the game record anyway (`PhoneLog.gameMarks`,
// decider `phone_log`) and spends minutes running the tracker and the CNN to get there. All that
// is actually missing is the geometry scan and a frame index per ply — this verb keeps those two.

/** Measured by plan/02-phone-candidate Phase 00 (STATUS.md → Notes); frames, may be negative. */
internal const val PHONE_FRAME_OFFSET: Int = 0

/** One `frame` row, reduced to what the rules read: when it was, and which position it showed. */
internal data class FrameRow(
    val elapsedNs: Long,
    val wallTsMs: Long,
    val fen: String?,
)

/** One ACCEPTED `decision` row: the ply it committed and when. */
internal data class DecisionRow(
    val ply: Int,
    val elapsedNs: Long,
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
                    "decision" -> row.acceptedPly()?.let { decisions += DecisionRow(it, elapsed) }
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
            TimeRule.WALL -> wallAt(tsEpochMs, afterNs)
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

/** Placement and side to move — the first two FEN fields, the only ones a frame row can witness. */
private fun placementAndSide(fen: String): String = fen.split(' ').take(2).joinToString(" ")

private fun JsonObject.long(key: String): Long? = this[key]?.jsonPrimitive?.longOrNull

private fun JsonObject.text(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull

private fun JsonObject.acceptedPly(): Int? =
    takeIf { it["accepted"]?.jsonPrimitive?.booleanOrNull == true }?.get("ply")?.jsonPrimitive?.intOrNull

private const val NS_PER_MS = 1_000_000.0
