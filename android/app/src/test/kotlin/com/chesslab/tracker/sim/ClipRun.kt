package com.chesslab.tracker.sim

import com.chesslab.cnn.SquareClassifier
import com.chesslab.cnn.observationFromProbs
import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import org.opencv.core.Mat

// One clip, end to end: mp4 -> warp -> (crops -> real ONNX -> CnnRecovery) -> TrackerEngine.
//
// The engine is driven through its PUBLIC seam only (`onFrame`, `onCnnSnapshot`, `attachCnn`,
// `choosePromotion`, `status`); nothing here reaches into `EngineState`.

/** `_VirtualClock`'s epoch — same as `ClipReplayParityTest`, so timestamps read alike in logs. */
private const val VCLOCK_START = 1_700_000_000.0

private const val MS_PER_S = 1000.0

/** The CNN half of a run: the classifier that produces observations and the evaluator the engine gets. */
internal class SimCnn(
    val classifier: SquareClassifier,
    val evaluator: CnnEvaluator,
)

/** Everything a diverging run needs explained: what latched, what the engine said, and when. */
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

    /** The first ply where the committed list parts from ground truth, or null when identical. */
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

/**
 * Replays [clip] at FULL frame rate. [cnn] null = the diff-only baseline (what every committed
 * parity fixture exercises); non-null = the same run with the real model attached.
 */
internal fun runClip(
    clip: SimClip,
    cnn: SimCnn?,
): SimResult {
    val engine = TrackerEngine(clip.config, clip.truth.startFen)
    engine.setFen(clip.truth.startFen)
    engine.attachCnn(cnn?.evaluator)
    val timings = SimTimings()
    val audit = ObsAudit()
    val pipeline = ClipPipeline(clip, timings)
    val observer = cnn?.let { SimObserver(it, pipeline, timings, clip, audit) }
    val log = SimEventLog(engine, clip.truth.promotionPiece)
    try {
        forEachFrame(clip.video) { index, frame ->
            val nowS = VCLOCK_START + (index + 1) / clip.fps
            observer?.deliver(nowS)?.let { log.record(index, engine.onCnnSnapshot(it)) }
            log.pollStatus(index)
            val input = pipeline.input(frame, index + 1L, Math.round(nowS * MS_PER_S))
            val mark = System.nanoTime()
            val events = engine.onFrame(input)
            timings.engineMs += elapsed(mark)
            timings.frames += 1
            log.record(index, events)
            val status = log.pollStatus(index)
            observer?.spawn(frame, index, input.seq, input.timestampMs, nowS, status.fen)
        }
    } finally {
        pipeline.close()
    }
    return SimResult(
        clip = clip.name,
        cnnOn = cnn != null,
        expected = clip.truth.sans,
        commits = log.commits,
        trace = SimTrace(log.alarms, log.stuck, log.notes, engine.status().note),
        timings = timings,
        audit = audit,
    )
}

/**
 * The desktop stand-in for `CnnObserver`, with the device's pacing rather than a synchronous call
 * inside `onFrame`.
 *
 * The device runs at most ONE observation at a time on its own thread, and its result reaches the
 * engine some latency later — so a snapshot always describes a frame the engine has already
 * decided on. Reproduced here by spawning at most one observation and holding its snapshot until
 * the video clock has advanced past the MEASURED inference time. With `observerIntervalS = 0.0`
 * (the fixture value) that is "re-observe as soon as the previous one landed", which is exactly
 * what the free-running observer does.
 */
private class SimObserver(
    private val cnn: SimCnn,
    private val pipeline: ClipPipeline,
    private val timings: SimTimings,
    private val clip: SimClip,
    private val audit: ObsAudit,
) {
    private var pending: CnnSnapshot? = null
    private var readyAtS = 0.0

    /** The snapshot whose inference has finished by [nowS], if any. */
    fun deliver(nowS: Double): CnnSnapshot? {
        val snap = pending ?: return null
        if (nowS < readyAtS) return null
        pending = null
        return snap
    }

    fun spawn(
        frame: Mat,
        index: Int,
        seq: Long,
        timestampMs: Long,
        nowS: Double,
        fen: String,
    ) {
        if (pending != null) return
        val crops = pipeline.crops(frame)
        val mark = System.nanoTime()
        val probs = cnn.classifier.classify(crops)
        val inferMs = elapsed(mark)
        timings.inferMs += inferMs
        timings.observations += 1
        val observation = observationFromProbs(probs, cnn.classifier.classes)
        clip.truth.fenPerFrame
            .getOrNull(index)
            ?.let { audit.add(observation, it, clip.config.cnnConfThr) }
        pending =
            CnnSnapshot(
                obs = observation,
                seq = seq,
                tsMs = timestampMs,
                inferMs = inferMs,
                // Invariant 1: the anchor pair is the observed frame's warps at detSize.
                warped = pipeline.lastBgrDet,
                gray = pipeline.lastGrayDet,
                fen = fen,
            )
        readyAtS = nowS + inferMs / MS_PER_S
    }
}

/** Collects what the engine emitted, and answers the promotion dialog the way the UI would. */
private class SimEventLog(
    private val engine: TrackerEngine,
    private val promotionPiece: Char,
) {
    val commits = mutableListOf<SimCommit>()
    val alarms = mutableListOf<String>()
    val stuck = mutableListOf<String>()

    /**
     * Note and verify-state transitions, consecutive duplicates dropped.
     *
     * POLLED from `status()`, not collected from `TrackerEvent.Note`: only `onFrame` diffs the
     * note and emits the event, so everything the snapshot path writes — including
     * `"reference pulled forward"` — is invisible on the event bus.
     */
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
                is TrackerEvent.MoveCommitted -> commits += SimCommit(frame, event.san, event.decider)
                is TrackerEvent.SequenceCommitted -> event.sans.forEach { commits += SimCommit(frame, it, event.decider) }
                is TrackerEvent.Alarm -> alarms += "f$frame ${event.kind} conflicts=${event.conflicts} guess=${event.guessSan}"
                is TrackerEvent.Stuck -> stuck += "f$frame ${event.reason}"
                is TrackerEvent.PromotionPending -> promotion = true
                else -> Unit
            }
        }
        // Recursive by design: the promotion commit can itself emit events worth recording.
        if (promotion) record(frame, engine.choosePromotion(promotionPiece))
    }
}
