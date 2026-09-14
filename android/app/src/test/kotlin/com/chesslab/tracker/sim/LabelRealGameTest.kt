package com.chesslab.tracker.sim

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.geometry.CropParams
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import org.opencv.core.Core
import org.opencv.core.Mat
import java.io.File

/**
 * **The real-game harness, invoked the way the clip harness already is: system properties.**
 *
 * `scripts/label_real_game.py` turned filmed footage into a reviewable move list by driving the
 * PYTHON tracker. The phone runs `:core-engine`, so the one artefact whose whole purpose is "what
 * does the tracker do on real footage" had never been produced by the tracker that ships. This
 * class is where that changed.
 *
 * ```
 * gradlew.bat :app:testDebugUnitTest --tests "*LabelRealGameTest*" \
 *   -Dchesslab.realgame.video=data/testclip-raw/VID_20260802_222741.mp4
 * ```
 *
 * Without `chesslab.realgame.video` the run is SKIPPED, not failed, so a normal
 * `:app:testDebugUnitTest` is unaffected. There is deliberately no `JavaExec` task: the Android
 * unit-test classpath is what carries the AARs, and a second invocation path is a second thing to
 * keep working.
 *
 * **The geometry is MEASURED, not typed** (specs/52 phase 01): the quad comes from the shipping
 * stack — `rawQuadOf` → `refinedQuad` per sampled frame, judged absolutely by `alignmentOf`, the
 * per-corner median over passing frames — and footage that cannot come under the limit is REFUSED
 * rather than labeled, because a label on crooked geometry is worse than none. `fps` is read from
 * the container, and the crop comes from the shipped model's own declaration (`withCropOf`'s
 * source), never from a default a harness invented — that is how the CNN desynced three seconds
 * into the 2026-08-02 game (specs/41). The corner/margin/boardSize/fps/pad properties phase 00
 * took as scaffolding are gone with it.
 */
class LabelRealGameTest {
    @Test
    fun withoutAVideoPropertyTheHarnessIsSkipped() {
        val given = System.getProperty(VIDEO_PROPERTY).orEmpty().trim()
        if (given.isEmpty()) {
            assertNull(realGameVideo(), "no property must mean no run — never a failing test")
        } else {
            assertEquals(File(given), realGameVideo(), "the property names the video and nothing else does")
        }
    }

    @Test
    fun aBatchCommitIsExpandedPerPlyWithItsOwnFen() {
        val bridge = listOf("e2e4", "e7e5", "g1f3")
        val fens = fensAfterEachOf(bridge)
        val batch =
            SimBatch(
                frame = BRIDGE_FRAME,
                ucis = bridge,
                sans = listOf("e4", "e5", "Nf3"),
                decider = "cnn_recovery",
                alarm = true,
                fenAfter = fens.last(),
            )

        val plies = realGamePlies(listOf(batch), STARTPOS, FPS)

        assertEquals(bridge.size, plies.size, "a batch of three plies is three rows, not one")
        assertEquals(fens, plies.map { it.fenAfter }, "each ply must carry the position after ITSELF")
        assertEquals(plies.size, plies.map { it.fenAfter }.toSet().size, "three plies, three different boards")
        assertEquals(batch.fenAfter, plies.last().fenAfter, "the engine stays the authority on where the game is")
        assertEquals(listOf(1, 2, 3), plies.map { it.ply })
        assertEquals(listOf("e4", "e5", "Nf3"), plies.map { it.san })
        assertEquals(bridge, plies.map { it.uci })
        // The batch's decider, frame and alarm belong to all of its plies: the engine wrote one
        // decision row for the lot, and pretending otherwise would invent provenance.
        assertTrue(plies.all { it.decider == "cnn_recovery" && it.alarm && it.frame == BRIDGE_FRAME })
        assertTrue(plies.all { it.t == (BRIDGE_FRAME + 1) / FPS })

        // A later commit continues from where the bridge left off, on the same replay board.
        val next = fensAfterEachOf(bridge + "b8c6").last()
        val both = realGamePlies(listOf(batch, single(next)), STARTPOS, FPS)
        assertEquals(4, both.size)
        assertEquals(listOf(1, 2, 3, 4), both.map { it.ply })
        assertEquals(next, both.last().fenAfter)
    }

    @Test
    fun theFrameIndexTravelsWithItsPicture() {
        Loader.load(opencv_java::class.java)
        val source = restingClip()
        val handed = mutableListOf<Pair<Int, Double>>()

        val result = runRealGame(source, null) { index, mat -> handed += index to checksum(mat) }

        val decoded = mutableListOf<Double>()
        forEachFrame(source.video) { _, mat -> decoded += checksum(mat) }
        assertEquals(decoded.size, handed.size, "every decoded frame must be offered exactly once")
        assertEquals(result.frames, handed.size, "the run and the callback must agree on how many frames there were")
        assertEquals(handed.indices.toList(), handed.map { it.first }, "the index is the decode order")
        // The invariant with teeth: not merely that the indices count up, but that frame i IS the
        // picture index i decoded. The Python writer paired current frames with stale indices and
        // wrote five duplicated review frames into the 2026-08-02 candidate; nothing about its
        // index sequence looked wrong.
        assertEquals(decoded, handed.map { it.second }, "each frame must be the one its index decoded")
    }

    @Test
    @EnabledIfSystemProperty(named = VIDEO_PROPERTY, matches = ".+")
    fun labelsTheGivenGame() {
        Loader.load(opencv_java::class.java)
        val source = realGameSource()
        val result = runRealGame(source, null)
        println("\n=== ${property("name") ?: source.video.name} ===")
        println("${result.frames} frames, ${result.observations} observations, note: ${result.finalNote ?: "—"}")
        println("ply  san       uci    frame        t  decider          alarm")
        for (ply in result.plies) {
            println(
                "%3d  %-8s  %-5s  %5d  %7.2f  %-15s  %s".format(
                    ply.ply,
                    ply.san,
                    ply.uci,
                    ply.frame,
                    ply.t,
                    ply.decider,
                    if (ply.alarm) "ALARM" else "",
                ),
            )
        }
        println("committed: ${result.plies.joinToString(" ") { it.san }.ifEmpty { "—" }}")
    }
}

private const val VIDEO_PROPERTY = "chesslab.realgame.video"

/** The clip the frame-index test runs on: 60 frames at 640x640, the cheapest committed fixture. */
private const val RESTING_CLIP = "blender-resting"

private const val BRIDGE_FRAME = 119

private const val FPS = 30.0

private fun property(name: String): String? =
    System
        .getProperty("chesslab.realgame.$name")
        .orEmpty()
        .trim()
        .ifEmpty { null }

private fun realGameVideo(): File? = property("video")?.let { File(it) }

private fun realGameSource(): RealGameSource {
    val video = requireNotNull(realGameVideo()) { "-D$VIDEO_PROPERTY=<mp4> is what starts a run" }
    val scan = measuredGeometryOf(video)
    val spec = shippedModelSpec()
    return RealGameSource(
        video = video,
        // The app's shipping defaults, which is what the phone runs. Whether a recorded
        // `effective_config` should win instead is an open question of this pack's, not a decision
        // to make silently here.
        config = TrackerConfig(),
        startFen = property("startFen") ?: STARTPOS,
        corners = scan.corners,
        margin = scan.margin,
        boardSize = scan.boardSize,
        fps = scan.fps,
        // The MODEL's declaration, the same source `withCropOf` serves the live tracker from —
        // never a harness default (specs/41). A model that declares no crop cannot be labeled
        // against filmed footage, because the pixels it would be served are pixels nobody chose.
        cropParams =
            CropParams(
                padSide = requireNotNull(spec.padSide) { "model '$DEFAULT_MODEL' declares no crop — label with one that does" },
            ),
    )
}

/** The shipped default model's own `config.json`, read from the committed app assets. */
private fun shippedModelSpec(): ModelSpec {
    val config = File(repoRoot(), "android/app/src/main/assets/cnn_model/$DEFAULT_MODEL/config.json")
    return ModelSpec.parse(config.readText())
}

/** A committed clip, driven as if nobody knew its moves. */
private fun restingClip(): RealGameSource {
    val clip = simClips().first { it.name == RESTING_CLIP }
    return RealGameSource(
        video = clip.video,
        config = clip.config,
        startFen = clip.truth.startFen,
        corners = clip.corners,
        // A Blender render's corners ARE the field corners; no marker sits outside anything.
        margin = 0.0,
        boardSize = clip.geometry.boardSize,
        fps = clip.fps,
        // No model is attached, so no crop is ever cut. Stated anyway, because the type refuses to
        // let a caller leave it unsaid — which is the whole point of it having no default.
        cropParams = CropParams(padSide = clip.geometry.padSide),
    )
}

/** One single-ply batch, the shape a `MoveCommitted` takes. */
private fun single(fenAfter: String): SimBatch =
    SimBatch(
        frame = BRIDGE_FRAME + 1,
        ucis = listOf("b8c6"),
        sans = listOf("Nc6"),
        decider = "occupancy",
        alarm = false,
        fenAfter = fenAfter,
    )

/** The truth this test measures against, built the way a reviewer's board would be. */
private fun fensAfterEachOf(ucis: List<String>): List<String> {
    val board = Board().apply { loadFromFen(STARTPOS) }
    return ucis.map { uci ->
        board.doMove(Move(uci, board.sideToMove))
        board.getFen(true, true)
    }
}

private fun checksum(mat: Mat): Double = Core.sumElems(mat).`val`[0]
