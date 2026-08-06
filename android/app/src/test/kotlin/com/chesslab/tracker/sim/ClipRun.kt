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

// One video, end to end: mp4 -> warp -> (crops -> real ONNX -> CnnRecovery) -> TrackerEngine.
//
// The engine is driven through its PUBLIC seam only (`onFrame`, `onCnnSnapshot`, `attachCnn`,
// `choosePromotion`, `status`); nothing here reaches into `EngineState`.

/** `_VirtualClock`'s epoch — same as `ClipReplayParityTest`, so timestamps read alike in logs. */
private const val VCLOCK_START = 1_700_000_000.0

private const val MS_PER_S = 1000.0

/**
 * What ONE replay needs: a video, the geometry to warp it with, and the config to run it under.
 *
 * The two callers differ only in what they know about the OUTCOME — a `SimClip` has a `labels.json`
 * of ground truth, a `RealGameSource` has none — so this is the whole of what [replayVideo] is
 * allowed to see, and neither caller can quietly grow a second replay around it.
 */
internal interface SimSource {
    val video: File
    val fps: Double
    val config: TrackerConfig

    /** `[a8, h8, h1, a1]` in FRAME pixels. */
    val corners: List<DoubleArray>
    val geometry: BoardGeometry
    val startFen: String

    /** The answer the promotion dialog would get; `q` when nothing is known to promote. */
    val promotionPiece: Char get() = 'q'

    /**
     * Per decoded frame, the true FEN where one is known.
     *
     * Empty for footage nobody has labelled, which is what keeps [ObsAudit] silent there: an audit
     * needs an answer to compare against, and inventing one is worse than reporting none.
     */
    val truthFens: List<String?> get() = emptyList()
}

/** The CNN half of a run: the classifier that produces observations and the evaluator the engine gets. */
internal class SimCnn(
    val classifier: SquareClassifier,
    val evaluator: CnnEvaluator,
    /**
     * The model's own `config.json`, parsed — the harness crops at the size it declares, exactly as
     * `TrackerService` does. Null keeps [BoardGeometry]'s 128 px default for callers that predate
     * specs/23; the CNN clip simulation passes the staged asset's spec.
     */
    val spec: ModelSpec? = null,
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

/** What one replay leaves behind, whatever its caller knows about the moves. */
internal class SimReplay(
    val log: SimEventLog,
    val timings: SimTimings,
    val audit: ObsAudit,
    val finalNote: String?,
)

/**
 * Replays [source] at FULL frame rate. [cnn] null = the diff-only baseline (what every committed
 * parity fixture exercises); non-null = the same run with the real model attached.
 *
 * [onFrame] fires once per decoded frame, after the engine has seen it, WITH the index that decoded
 * it. The two travel together and are never stored apart: the decode happens once, in order, so
 * anything that wants a picture of a moment has to take it while the frame is in hand. Seeking back
 * for it later is not equivalent — h.264 seeking by index is approximate, so a caller that seeks
 * hands its user a NEARBY frame while claiming it is the one, and a writer that pairs the current
 * frame with a stale index does the same thing without even seeking.
 */
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
            // Ask BEFORE the frame is processed, exactly as `CnnObserver` does on the phone: the
            // pipeline answers one request with one crop warp, cut from the frame it just warped.
            // Asking afterwards would hand the observer the NEXT frame's pixels.
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

/**
 * One clip against its ground truth.
 *
 * A thin caller of [replayVideo] and nothing else: the 18 committed parity clips are the only
 * evidence that this harness still runs what the phone runs, and a second copy of the loop would
 * turn them into evidence about a loop nobody drives.
 */
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
    private val source: SimSource,
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

    /** True when no inference is in flight, so this frame's crops are worth warping. */
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
                // Invariant 1: the anchor pair is the observed frame's warps at detSize.
                warped = pipeline.lastBgrDet,
                gray = pipeline.lastGrayDet,
                fen = fen,
            )
        readyAtS = nowS + inferMs / MS_PER_S
    }
}

/** Collects what the engine emitted, and answers the promotion dialog the way the UI would. */
internal class SimEventLog(
    private val engine: TrackerEngine,
    private val promotionPiece: Char,
) {
    val commits = mutableListOf<SimCommit>()

    /**
     * The same commits as [commits], un-flattened: one entry per COMMIT rather than per ply.
     *
     * A recovery bridge arrives as ONE `SequenceCommitted` and [commits] loses that grouping —
     * which is exactly what a per-ply FEN needs back (`realGamePlies`).
     */
    val batches = mutableListOf<SimBatch>()
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
        // Recursive by design: the promotion commit can itself emit events worth recording.
        if (promotion) record(frame, engine.choosePromotion(promotionPiece))
    }

    /**
     * The alarm is read from `status()` HERE, at the commit, because nothing else can tell it.
     *
     * `status()` is a pure function of the engine's state, so asking costs the run nothing — but
     * asking LATER is a different question: the latch clears, and a ply that committed under a
     * standing alarm would then read clean.
     */
    private fun batch(
        frame: Int,
        ucis: List<String>,
        sans: List<String>,
        decider: String,
        fenAfter: String,
    ): SimBatch = SimBatch(frame, ucis, sans, decider, engine.status().alarm != null, fenAfter)
}
