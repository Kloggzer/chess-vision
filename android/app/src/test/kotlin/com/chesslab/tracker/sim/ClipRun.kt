package com.chesslab.tracker.sim

import com.chesslab.cnn.SquareClassifier
import com.chesslab.cnn.observationFromProbs
import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.ModelSpec
import org.opencv.core.Mat
import java.io.File

// Driven through the engine's PUBLIC seam only; nothing here reaches into `EngineState`.

private const val VCLOCK_START = 1_700_000_000.0

private const val MS_PER_S = 1000.0

internal interface SimSource {
    val video: File
    val fps: Double
    val config: TrackerConfig

    val corners: List<DoubleArray>
    val geometry: BoardGeometry
    val startFen: String

    val promotionPiece: Char get() = 'q'

    /** Empty keeps [ObsAudit] silent on unlabelled footage. */
    val truthFens: List<String?> get() = emptyList()
}

internal class SimCnn(
    val classifier: SquareClassifier,
    val evaluator: CnnEvaluator,
    val spec: ModelSpec? = null,
)

internal class SimTrace(
    val alarms: List<String>,
    val stuck: List<String>,
    val notes: List<String>,
    val finalNote: String?,
)

internal data class SimCommit(
    val frame: Int,
    val san: String,
    val decider: String,
)

internal class SimResult(
    val clip: String,
    val cnnOn: Boolean,
    val expected: List<String>,
    val commits: List<SimCommit>,
    val trace: SimTrace,
    val timings: SimTimings,
    val audit: ObsAudit,
) {
    val sans: List<String> get() = commits.map { it.san }
    val ok: Boolean get() = sans == expected

    fun firstDivergence(): String? {
        val n = maxOf(sans.size, expected.size)
        for (i in 0 until n) {
            val want = expected.getOrNull(i)
            val got = sans.getOrNull(i)
            if (want != got) {
                val where = commits.getOrNull(i)?.let { "frame ${it.frame}, decider=${it.decider}" } ?: "never committed"
                return "ply ${i + 1}: expected ${want ?: "—"}, got ${got ?: "—"} ($where)"
            }
        }
        return null
    }
}

internal class SimReplay(
    val log: SimEventLog,
    val timings: SimTimings,
    val audit: ObsAudit,
    val finalNote: String?,
)

/** [onFrame] gets each frame WITH its index, in hand: h.264 seeking by index hands over a NEARBY frame. */
internal fun replayVideo(
    source: SimSource,
    cnn: SimCnn?,
    onFrame: (Int, Mat) -> Unit,
): SimReplay {
    val engine = TrackerEngine(source.config, source.startFen)
    engine.setFen(source.startFen)
    engine.attachCnn(cnn?.evaluator)
    val timings = SimTimings()
    val audit = ObsAudit()
    val pipeline = ClipPipeline(source, timings, cnn?.spec)
    val observer = cnn?.let { SimObserver(it, pipeline, timings, source, audit) }
    val log = SimEventLog(engine, source.promotionPiece)
    try {
        forEachFrame(source.video) { index, frame ->
            val nowS = VCLOCK_START + (index + 1) / source.fps
            observer?.deliver(nowS)?.let { log.record(index, engine.onCnnSnapshot(it)) }
            log.pollStatus(index)
            // Ask BEFORE the frame, as `CnnObserver` does; afterwards would hand over the NEXT frame's pixels.
            if (observer?.idle() == true) pipeline.requestCrops()
            val input = pipeline.input(frame, Math.round(nowS * MS_PER_S))
            val mark = System.nanoTime()
            val events = engine.onFrame(input)
            timings.engineMs += elapsed(mark)
            timings.frames += 1
            log.record(index, events)
            val status = log.pollStatus(index)
            observer?.spawn(index, input.seq, input.timestampMs, nowS, status.fen)
            onFrame(index, frame)
        }
    } finally {
        pipeline.close()
    }
    return SimReplay(log, timings, audit, engine.status().note)
}

internal fun runClip(
    clip: SimClip,
    cnn: SimCnn?,
): SimResult {
    val replay = replayVideo(clip, cnn) { _, _ -> }
    return SimResult(
        clip = clip.name,
        cnnOn = cnn != null,
        expected = clip.truth.sans,
        commits = replay.log.commits,
        trace = SimTrace(replay.log.alarms, replay.log.stuck, replay.log.notes, replay.finalNote),
        timings = replay.timings,
        audit = replay.audit,
    )
}

/** At most ONE observation in flight, held until the video clock passes the MEASURED inference time. */
private class SimObserver(
    private val cnn: SimCnn,
    private val pipeline: ClipPipeline,
    private val timings: SimTimings,
    private val source: SimSource,
    private val audit: ObsAudit,
) {
    private var pending: CnnSnapshot? = null
    private var readyAtS = 0.0

    fun deliver(nowS: Double): CnnSnapshot? {
        val snap = pending ?: return null
        if (nowS < readyAtS) return null
        pending = null
        return snap
    }

    fun idle(): Boolean = pending == null

    fun spawn(
        index: Int,
        seq: Long,
        timestampMs: Long,
        nowS: Double,
        fen: String,
    ) {
        if (pending != null) return
        val crops = pipeline.crops() ?: return
        val mark = System.nanoTime()
        val probs = cnn.classifier.classify(crops)
        val inferMs = elapsed(mark)
        timings.inferMs += inferMs
        timings.observations += 1
        val observation = observationFromProbs(probs, cnn.classifier.classes)
        source.truthFens
            .getOrNull(index)
            ?.let { audit.add(observation, it, source.config.cnnConfThr) }
        pending =
            CnnSnapshot(
                obs = observation,
                seq = seq,
                tsMs = timestampMs,
                inferMs = inferMs,
                warped = pipeline.lastBgrDet,
                gray = pipeline.lastGrayDet,
                fen = fen,
            )
        readyAtS = nowS + inferMs / MS_PER_S
    }
}

internal class SimEventLog(
    private val engine: TrackerEngine,
    private val promotionPiece: Char,
) {
    val commits = mutableListOf<SimCommit>()

    val batches = mutableListOf<SimBatch>()
    val alarms = mutableListOf<String>()
    val stuck = mutableListOf<String>()

    /** POLLED from `status()`: the snapshot path's notes never reach the bus. */
    val notes = mutableListOf<String>()
    private var lastNote: String? = null
    private var lastVerify: String? = null

    fun pollStatus(frame: Int): TrackerStatus {
        val status = engine.status()
        if (status.note != null && status.note != lastNote) notes += "f$frame ${status.note}"
        lastNote = status.note
        if (status.verifyState != lastVerify && status.verifyState != null) notes += "f$frame [verify=${status.verifyState}]"
        lastVerify = status.verifyState
        return status
    }

    fun record(
        frame: Int,
        events: List<TrackerEvent>,
    ) {
        var promotion = false
        for (event in events) {
            when (event) {
                is TrackerEvent.MoveCommitted -> {
                    commits += SimCommit(frame, event.san, event.decider)
                    batches += batch(frame, listOf(event.uci), listOf(event.san), event.decider, event.fenAfter)
                }
                is TrackerEvent.SequenceCommitted -> {
                    event.sans.forEach { commits += SimCommit(frame, it, event.decider) }
                    batches += batch(frame, event.ucis, event.sans, event.decider, event.fenAfter)
                }
                is TrackerEvent.Alarm -> alarms += "f$frame ${event.kind} conflicts=${event.conflicts} guess=${event.guessSan}"
                is TrackerEvent.Stuck -> stuck += "f$frame ${event.reason}"
                is TrackerEvent.PromotionPending -> promotion = true
                else -> Unit
            }
        }
        if (promotion) record(frame, engine.choosePromotion(promotionPiece))
    }

    /** Read HERE, at the commit: later the latch may have cleared and the ply reads clean. */
    private fun batch(
        frame: Int,
        ucis: List<String>,
        sans: List<String>,
        decider: String,
        fenAfter: String,
    ): SimBatch = SimBatch(frame, ucis, sans, decider, engine.status().alarm != null, fenAfter)
}
