package com.chesslab.tracker.record

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.util.concurrent.atomic.AtomicLong
import kotlin.coroutines.CoroutineContext

private const val TIMELINE_QUEUE = 512
private val TIMELINE_JSON = Json { encodeDefaults = true }

private sealed interface TimelineEntry {
    val seq: Long
}

data class TimelineFrame(
    val sensorTsNs: Long,
    val elapsedNs: Long,
    val wallTsMs: Long,
    val width: Int,
    val height: Int,
    val rotation: Int,
    val fen: String?,
    val status: TrackerStatus?,
    val corners: FloatArray?,
)

@Serializable
private data class FrameRow(
    override val seq: Long,
    val sensorTsNs: Long,
    val elapsedNs: Long,
    val wallTsMs: Long,
    val width: Int,
    val height: Int,
    val rotation: Int,
    val fen: String?,
    val state: String?,
    val corners: List<Double>?,
    val kind: String = "frame",
) : TimelineEntry

@Serializable
private data class EventRow(
    override val seq: Long,
    val elapsedNs: Long,
    val wallTsMs: Long,
    val event: String,
    val fen: String?,
    val uci: String? = null,
    val san: String? = null,
    val reason: String? = null,
    val kind: String = "event",
) : TimelineEntry

@Serializable
private data class VideoRow(
    override val seq: Long,
    val elapsedNs: Long,
    val durationNs: Long,
    val bytes: Long,
    val final: Boolean,
    val error: String?,
    val kind: String = "video_sync",
) : TimelineEntry

@Serializable
private data class DecisionRow(
    override val seq: Long,
    val elapsedNs: Long,
    val engineTsS: Double,
    val ply: Int,
    val uci: String?,
    val san: String?,
    val fenBefore: String?,
    val fenAfter: String,
    val decider: String,
    val reason: String,
    val accepted: Boolean,
    val bestScore: Double,
    val secondScore: Double,
    val changed: List<String>,
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val kind: String = "decision",
) : TimelineEntry

@Serializable
private data class StateRow(
    override val seq: Long,
    val elapsedNs: Long,
    val engineTsS: Double,
    val from: String,
    val to: String,
    val kind: String = "state",
) : TimelineEntry

/**
 * Session-local, loss-visible timeline. Producers only allocate a small immutable row and perform
 * a non-blocking send; JSON and disk I/O stay off the analyzer thread.
 */
class SessionTimeline(
    dir: File,
    scope: CoroutineScope,
    context: CoroutineContext = Dispatchers.IO,
) : AutoCloseable {
    private val file = File(dir, "timeline.jsonl").also { it.writeText("") }
    private val seq = AtomicLong()
    private val queue = Channel<TimelineEntry>(TIMELINE_QUEUE, BufferOverflow.DROP_OLDEST)

    init {
        scope.launch(context) {
            for (entry in queue) {
                val text =
                    when (entry) {
                        is FrameRow -> TIMELINE_JSON.encodeToString(FrameRow.serializer(), entry)
                        is EventRow -> TIMELINE_JSON.encodeToString(EventRow.serializer(), entry)
                        is VideoRow -> TIMELINE_JSON.encodeToString(VideoRow.serializer(), entry)
                        is DecisionRow -> TIMELINE_JSON.encodeToString(DecisionRow.serializer(), entry)
                        is StateRow -> TIMELINE_JSON.encodeToString(StateRow.serializer(), entry)
                    }
                WorkProfiler.span(WorkOperation.TIMELINE_WRITE, entry.seq) {
                    file.appendText(text + "\n")
                }
            }
        }
    }

    fun frame(frame: TimelineFrame) {
        queue.trySend(
            FrameRow(
                seq.getAndIncrement(),
                frame.sensorTsNs,
                frame.elapsedNs,
                frame.wallTsMs,
                frame.width,
                frame.height,
                frame.rotation,
                frame.fen,
                frame.status?.state,
                frame.corners?.map(Float::toDouble),
            ),
        )
    }

    fun event(
        event: TrackerEvent,
        elapsedNs: Long,
        wallTsMs: Long,
    ) {
        val row = eventRow(seq.getAndIncrement(), elapsedNs, wallTsMs, event)
        queue.trySend(row)
    }

    fun video(
        elapsedNs: Long,
        durationNs: Long,
        bytes: Long,
        final: Boolean,
        error: String?,
    ) {
        WorkProfiler.span(WorkOperation.VIDEO_PROGRESS, durationNs) {
            queue.trySend(VideoRow(seq.getAndIncrement(), elapsedNs, durationNs, bytes, final, error))
        }
    }

    fun decision(
        decision: DebugDecision,
        elapsedNs: Long,
    ) {
        queue.trySend(
            DecisionRow(
                seq.getAndIncrement(),
                elapsedNs,
                decision.tsS,
                decision.ply,
                decision.uci,
                decision.san,
                decision.fenBefore,
                decision.fenAfter,
                decision.decider,
                decision.reason,
                decision.accepted,
                decision.bestScore,
                decision.secondScore,
                decision.changed,
                decision.shadowVetoed,
                decision.occludedVetoed,
            ),
        )
    }

    fun state(
        from: String,
        to: String,
        engineTsS: Double,
        elapsedNs: Long,
    ) {
        queue.trySend(StateRow(seq.getAndIncrement(), elapsedNs, engineTsS, from, to))
    }

    override fun close() {
        queue.close()
    }
}

private fun eventRow(
    seq: Long,
    elapsedNs: Long,
    wallTsMs: Long,
    event: TrackerEvent,
): EventRow =
    when (event) {
        is TrackerEvent.MoveCommitted -> EventRow(seq, elapsedNs, wallTsMs, "move", event.fenAfter, event.uci, event.san)
        is TrackerEvent.SequenceCommitted ->
            EventRow(seq, elapsedNs, wallTsMs, "sequence", event.fenAfter, event.ucis.joinToString(" "), event.sans.joinToString(" "))
        is TrackerEvent.Stuck -> EventRow(seq, elapsedNs, wallTsMs, "stuck", null, reason = event.reason)
        is TrackerEvent.Alarm -> EventRow(seq, elapsedNs, wallTsMs, "alarm", null, reason = event.kind)
        is TrackerEvent.AlarmCleared -> EventRow(seq, elapsedNs, wallTsMs, "alarm_cleared", null, reason = event.reason)
        TrackerEvent.ReAnchored -> EventRow(seq, elapsedNs, wallTsMs, "reanchored", null)
        is TrackerEvent.Note -> EventRow(seq, elapsedNs, wallTsMs, "note", null, reason = event.text)
        is TrackerEvent.PromotionPending -> EventRow(seq, elapsedNs, wallTsMs, "promotion", null, uci = event.from + event.to)
    }
