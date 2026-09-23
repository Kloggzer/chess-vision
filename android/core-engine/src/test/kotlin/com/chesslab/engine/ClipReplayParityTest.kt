package com.chesslab.engine

import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.parity.ParityClip
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityFrame
import com.chesslab.engine.parity.ParityTierB
import com.chesslab.engine.parity.parityClose
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.fail
import org.junit.jupiter.api.Test
import com.chesslab.engine.api.STARTPOS as API_STARTPOS

/**
 * The phase-03d integration gate: every clip through [TrackerEngine.onFrame] must equal Python's Tier B
 * frame for frame. The fixture IS the input stream, so a divergence is a port bug, never a tolerance.
 */
class ClipReplayParityTest {
    @Test
    fun everyClipReplaysPythonsDecisionsFrameForFrame() {
        val index = ParityFixtures.index()
        assertTrue(index.clips.isNotEmpty(), "no clips in parity/index.json")
        assertEquals(emptyList<String>(), index.tierBDegraded, "a degraded clip must never count as passing")
        val divergences = mutableListOf<Divergence>()
        val runs = mutableListOf<Pair<ParityClip, ReplayResult>>()
        var framesAsserted = 0
        var clipsPassed = 0
        for (name in index.clips) {
            val clip = ParityFixtures.load(name)
            // A degraded clip reproduces a DIFFERENT move list; excluded loudly, never silently.
            assertTrue(clip.meta.tierBComplete, "$name: meta.tierBComplete is false — excluded from the strict gate")
            assertTrue(name in index.tierBComplete, "$name: index.json disagrees with meta.tierBComplete")
            val run = replay(clip)
            runs += clip to run
            framesAsserted += run.frames
            divergences += run.divergences
            if (run.divergences.isEmpty()) clipsPassed += 1
        }
        val summary = "$clipsPassed/${index.clips.size} clips, $framesAsserted frames asserted"
        if (divergences.isNotEmpty()) {
            fail<Unit>("clip replay diverged ($summary); FIRST divergence: ${divergences.first()}")
        }
        assertEquals(index.clips.size, clipsPassed, "every clip must replay with zero diverging frames ($summary)")
        assertTrue(framesAsserted > 0, "no frame was asserted")
        // `test_single_move_detected` at clip scale: the whole move list, in order.
        for ((clip, run) in runs) {
            assertEquals(clip.meta.replayedSans, run.sans, "${clip.name}: committed SAN sequence")
            assertEquals(clip.meta.replayedFen, run.fen, "${clip.name}: final FEN")
        }
    }
}

/** One diverging field of one frame — the only thing worth printing. */
private data class Divergence(
    val clip: String,
    val frame: Int,
    val field: String,
    val expected: Any?,
    val actual: Any?,
) {
    override fun toString(): String = "clip=$clip frame=$frame field=$field expected=$expected actual=$actual"
}

private class ReplayResult(
    val frames: Int,
    val sans: List<String>,
    val fen: String,
    val divergences: List<Divergence>,
)

/** `_VirtualClock`'s epoch (`scripts/emit_parity_fixtures.py`). */
private const val VCLOCK_START = 1_700_000_000.0

private const val MS_PER_S = 1000.0

/** The clips replay with `live_align=False`, so the warp corners are frozen for the whole run. */
private val FROZEN_CORNERS = FloatArray(8) { it.toFloat() }

private fun replay(clip: ParityClip): ReplayResult {
    val meta = clip.meta
    assertTrue(meta.whitePov, "${meta.clip}: the engine assumes whitePov (EngineState has no override)")
    // Never Kotlin defaults: `occlusionColorThr` is 1.5 here and 3.0 in TRACK_DEFAULTS (D00b-3).
    // Parity with the Python tracker, which had no commit hold.
    val engine = TrackerEngine(meta.effectiveConfig.toTrackerConfig().copy(commitHoldS = null), meta.startFen ?: API_STARTPOS)
    // The emitter calls `reset_to_start(start_fen)` after construction: "Reference set" on frame 0.
    engine.setFen(meta.startFen ?: API_STARTPOS)
    val promotionPiece = meta.movesUci.firstOrNull { it.length == PROMO_UCI_LENGTH }?.get(PROMO_UCI_LENGTH - 1) ?: 'q'
    val divergences = mutableListOf<Divergence>()
    val sans = mutableListOf<String>()
    var clock = VCLOCK_START
    var previous = meta.frames.first()
    var asserted = 0
    for ((position, index) in meta.frames.withIndex()) {
        // Video time like the emitter (`realtime=True`): 1/fps for the first frame, the real gap after.
        clock += if (position == 0) 1.0 / meta.fps else (index - previous) / meta.fps
        previous = index
        val frame = clip.frame(index)
        val events = engine.onFrame(frameInput(clip, frame, clock))
        val promotion = engine.state.promoPending
        val all = events + if (promotion != null) engine.choosePromotion(promotionPiece) else emptyList()
        for (event in all) {
            if (event is TrackerEvent.MoveCommitted) sans.add(event.san)
            if (event is TrackerEvent.SequenceCommitted) sans.addAll(event.sans)
        }
        asserted += 1
        if (divergences.isEmpty()) {
            divergences += compareFrame(clip, frame, engine, all)
        }
    }
    return ReplayResult(asserted, sans, engine.state.board.fen(), divergences)
}

private const val PROMO_UCI_LENGTH = 5

private fun frameInput(
    clip: ParityClip,
    frame: ParityFrame,
    clock: Double,
): FrameInput =
    FrameInput(
        seq = frame.seq.toLong(),
        grayDet = clip.gray(frame.frame),
        bgrDet = requireNotNull(clip.bgr(frame.frame)) { "frame ${frame.frame} has no BGR plane" },
        corners = FROZEN_CORNERS,
        motionRoiScore = frame.motionRoiScore,
        // `min_grid_line_coverage = 0.0` in the clips: never read.
        gridLineCoverage = 1.0,
        lumaPreClahe = frame.lumaPreClahe,
        timestampMs = Math.round(clock * MS_PER_S),
    )

/** Compares one frame's full Tier-B record; returns the divergences found (empty = identical). */
private fun compareFrame(
    clip: ParityClip,
    frame: ParityFrame,
    engine: TrackerEngine,
    events: List<TrackerEvent>,
): List<Divergence> {
    val expected = requireNotNull(frame.tierB) { "frame ${frame.frame} has no tierB block" }
    val state = engine.state
    val out = mutableListOf<Divergence>()

    fun check(
        field: String,
        want: Any?,
        got: Any?,
    ) {
        if (want != got) out.add(Divergence(clip.name, frame.frame, field, want, got))
    }
    check("state", expected.state, state.state)
    check("changed", expected.changed, state.changed.sortedSquareNames())
    check("shadowVeto", expected.shadowVeto, state.shadowVetoed.sortedSquareNames())
    check("occlusionVetoed", expected.occlusionVetoed, state.occludedVetoed.sortedSquareNames())
    check("tainted", expected.tainted, state.tainted.sortedSquareNames())
    if (!parityClose(expected.bestLl, state.bestScore)) {
        out.add(Divergence(clip.name, frame.frame, "bestLl", expected.bestLl, state.bestScore))
    }
    if (!parityClose(expected.secondLl, state.secondScore)) {
        out.add(Divergence(clip.name, frame.frame, "secondLl", expected.secondLl, state.secondScore))
    }
    if (!parityClose(expected.motionScore, state.motion)) {
        out.add(Divergence(clip.name, frame.frame, "motionScore", expected.motionScore, state.motion))
    }
    check("bestUci", expected.bestUci, state.candidateUci)
    check("candidateUci", expected.candidateUci, state.candidateUci)
    check("stuckReason", expected.stuckReason, state.stuckReason)
    check("confirmerKey", expected.confirmerKey, state.confirmer.key)
    check("confirmerCount", expected.confirmerCount, state.confirmer.count)
    check("note", expected.note, state.note)
    out += compareCommit(clip, frame, expected, events)
    return out
}

/** `tierB.commit`: `{uci, san, …}` for a single move, `{ucis, sans, …}` for a pair. */
private fun compareCommit(
    clip: ParityClip,
    frame: ParityFrame,
    expected: ParityTierB,
    events: List<TrackerEvent>,
): List<Divergence> {
    val single = events.filterIsInstance<TrackerEvent.MoveCommitted>().singleOrNull()
    val pair = events.filterIsInstance<TrackerEvent.SequenceCommitted>().singleOrNull()
    val commit = expected.commit
    val out = mutableListOf<Divergence>()
    val actual =
        when {
            single != null -> listOf(single.uci, single.san, single.fenAfter, single.decider)
            pair != null -> listOf(pair.ucis.last(), pair.sans.joinToString(" "), pair.fenAfter, pair.decider)
            else -> null
        }
    val want =
        when {
            commit == null -> null
            commit.uci != null -> listOf(commit.uci, commit.san, commit.fenAfter, commit.decider)
            else ->
                listOf(
                    commit.ucis.orEmpty().last(),
                    commit.sans.orEmpty().joinToString(" "),
                    commit.fenAfter,
                    commit.decider,
                )
        }
    if (want != actual) out.add(Divergence(clip.name, frame.frame, "commit", want, actual))
    return out
}
