package com.chesslab.tracker.ui.debug

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.DebugPayload
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.service.DebugPayloadAssembler
import com.chesslab.tracker.ui.tracking.idleTrackerStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** What `geometry.cropLine` produces for a model that declares its crop (specs/45). */
private const val CROP = "side=0.050"

private fun payload(
    tainted: Set<String> = emptySet(),
    reads: List<DebugCnnRead> = emptyList(),
    decisions: List<DebugDecision> = emptyList(),
) = DebugPayload(
    decisions = decisions,
    cnnReads = reads,
    tainted = tainted,
    cnnSeq = 7,
    cnnAgeMs = 40,
    cnnInferMs = 12.0,
    gridCoverage = 1.0,
    motion = 0.0,
    maxChanged = 6,
    zThr = 3.0,
    cnnConfThr = 0.85,
    minConfidentBoard = 32,
    minConfidentRecovery = 8,
)

private fun read(
    square: String,
    label: String,
    conf: Double,
    occupied: Boolean,
    believed: Char?,
    confident: Boolean = true,
) = DebugCnnRead(square, label, conf, 0.01, occupied, confident, believed)

private fun status(
    z: Map<String, Double> = emptyMap(),
    census: Map<String, Double> = emptyMap(),
    changed: Set<String> = emptySet(),
    shadow: Set<String> = emptySet(),
    occlusion: Set<String> = emptySet(),
    debug: DebugPayload? = null,
    timings: Map<String, Double> = emptyMap(),
): TrackerStatus =
    idleTrackerStatus().copy(
        z = z,
        census = census,
        changed = changed,
        shadowVetoed = shadow,
        occlusionVetoed = occlusion,
        stageTimingsMs = timings,
        fps = 20.0,
        cameraFps = 30.0,
        debug = debug,
    )

class DebugStateTest {
    @Test
    fun assemblerAllocatesNothingWhenDisabled() {
        val assembler = DebugPayloadAssembler()
        repeat(1000) { assertNull(assembler.assemble(status(timings = mapOf("total" to 20.0)))) }
        assertNotNull(assembler.assemble(status(debug = payload())))
    }

    @Test
    fun stageStatsCarryLastMedianAndP95OverTheRollingWindow() {
        val assembler = DebugPayloadAssembler()
        var state = assembler.assemble(status(debug = payload()))
        (1..100).forEach { ms ->
            state = assembler.assemble(status(debug = payload(), timings = mapOf("total" to ms.toDouble())))
        }
        val total = state!!.stages.single { it.stage == "total" }
        assertEquals(100.0, total.last)
        assertEquals(50.0, total.median)
        assertEquals(95.0, total.p95)
    }

    /** Diagnosing a slow pipeline needs BOTH rates: delivered, and actually analysed. */
    @Test
    fun theTimingsPanelSeesTheCameraRateAsWellAsTheEngineRate() {
        val assembler = DebugPayloadAssembler()
        val delivering = status(debug = payload())
        var state = assembler.assemble(delivering)
        repeat(9) { state = assembler.assemble(delivering.copy(fps = 10.0)) }
        assertEquals(10.0, state!!.fps)
        assertEquals(30.0, state!!.cameraFps)
        assertEquals(10.0, state!!.fpsMedian)
        assertEquals(30.0, state!!.cameraFpsMedian, "a steady camera rate must not follow the engine's dip")
        // The window is dropped with the gate, so a reopened screen shows no stale rate.
        assembler.reset()
        state = assembler.assemble(delivering.copy(fps = 1.0, cameraFps = 2.0))
        assertEquals(2.0, state!!.cameraFpsMedian)
    }

    @Test
    fun heatmapSeparatesShadowFromOcclusion() {
        // entry.md invariant 2: the shadow veto PRESERVES z, the occlusion veto ZEROES it.
        val cells =
            evidenceCells(
                status(z = mapOf("d4" to 5.0, "e5" to 6.0), shadow = setOf("d4"), occlusion = setOf("e5")),
                payload(),
                EvidenceChannel.FUSED_Z,
            )
        val shadow = cells.single { it.square == "d4" }
        val occluded = cells.single { it.square == "e5" }
        assertEquals(EvidenceRole.SHADOW, shadow.role)
        assertEquals(5.0, shadow.value)
        assertEquals(EvidenceRole.OCCLUSION, occluded.role)
        assertEquals(0.0, occluded.value)
    }

    /**
     * `TrackerStatus.census` is an EMPTY map whenever the channel never produced values — weight 0,
     * or its own hot-square guard dropped the frame. A 0.0 there is a measurement nobody made.
     */
    @Test
    fun theCensusChannelSaysNothingRatherThanZeroWhenItNeverRan() {
        val dropped = evidenceCells(status(z = mapOf("d4" to 5.0)), payload(), EvidenceChannel.CENSUS)
        assertTrue(dropped.all { it.value == null }, "a dropped census channel must not read as a quiet board")
        val measured = evidenceCells(status(census = mapOf("d4" to 2.0)), payload(), EvidenceChannel.CENSUS)
        assertEquals(2.0, measured.single { it.square == "d4" }.value)
    }

    /** A DISABLED or FAILED attach has timed nothing; 0.0 ms there reads as a free inference. */
    @Test
    fun theInferTimeIsADashUntilSomethingHasBeenTimed() {
        val idle = CnnRuntimeInfo(null, null, null, null, null, null, 0.0, 0)
        assertEquals("-", inferLine(CnnState.Off, idle))
        assertEquals("-", inferLine(CnnState.Failed("no execution provider"), idle))
        assertEquals("9.0", inferLine(CnnState.Ready("CPU", "model.onnx"), idle.copy(lastRunMs = 9.0)))
    }

    @Test
    fun heatmapMarksChangedAndTaintedSeparately() {
        val cells = evidenceCells(status(changed = setOf("c3")), payload(tainted = setOf("f6")), EvidenceChannel.FUSED_Z)
        assertEquals(EvidenceRole.CHANGED, cells.single { it.square == "c3" }.role)
        assertTrue(cells.single { it.square == "f6" }.tainted)
        assertFalse(cells.single { it.square == "c3" }.tainted)
    }

    @Test
    fun heatmapUsesA8TopLeft() {
        // Corner order [a8, h8, h1, a1] (invariant 11) — NOT the crop grid's all_squares() order.
        val squares = evidenceCells(status(), payload(), EvidenceChannel.FUSED_Z).map { it.square }
        assertEquals(64, squares.size)
        assertEquals("a8", squares[0])
        assertEquals("h8", squares[7])
        assertEquals("a1", squares[56])
        assertEquals("h1", squares[63])
    }

    @Test
    fun cropGridUsesAllSquaresOrder() {
        // `labeling.all_squares()` = a1,b1,…,h1,a2,…,h8. `cropTiles` indexes straight into this.
        assertEquals(64, ALL_SQUARES.size)
        assertEquals("a1", ALL_SQUARES[0])
        assertEquals("h1", ALL_SQUARES[7])
        assertEquals("h8", ALL_SQUARES[63])
    }

    @Test
    fun theTwoGridOrdersAreNotTheSame() {
        // Rendering either grid in the other's order is invariant 11's failure mode.
        val heatmap = evidenceCells(status(), payload(), EvidenceChannel.FUSED_Z).map { it.square }
        assertFalse(heatmap == ALL_SQUARES)
    }

    @Test
    fun cnnReadsHighlightFenConflicts() {
        val view =
            cnnReadRows(
                payload(
                    reads =
                        listOf(
                            read("e2", "empty", 0.97, occupied = false, believed = 'P'),
                            read("e4", "wP", 0.91, occupied = true, believed = null),
                            read("a1", "wR", 0.99, occupied = true, believed = 'R'),
                        ),
                ),
            )
        assertEquals(listOf("e2", "e4"), view.conflicts.map { it.square }.sorted())
        assertEquals(listOf("a1"), view.rest.map { it.square })
        assertEquals(3, view.nConfident)
        assertEquals(32, view.minConfidentBoard)
    }

    @Test
    fun cnnReadsSortByConfidenceInBothDirections() {
        val reads =
            listOf(
                read("a1", "wR", 0.4, occupied = true, believed = 'R'),
                read("b1", "wN", 0.9, occupied = true, believed = 'N'),
            )
        assertEquals(listOf("b1", "a1"), cnnReadRows(payload(reads = reads)).rest.map { it.square })
        assertEquals(listOf("a1", "b1"), cnnReadRows(payload(reads = reads), ascending = true).rest.map { it.square })
    }

    @Test
    fun cnnStateShowsActualEpNotRequested() {
        val fellBack = CnnRuntimeInfo("QNN-HTP(NPU)", "NNAPI", "real14-80", "model.onnx", "64x3x80x80", CROP, 9.0, 3)
        assertEquals("QNN-HTP(NPU) (requested) → NNAPI (actual)", epLine(fellBack))
        // The tone itself is now a palette lookup (light/dark), so the testable part is the
        // decision behind it: a fall-back must be flagged, a granted request must not.
        assertTrue(epFellBack(fellBack))
        val asked = fellBack.copy(actualEp = "QNN-HTP(NPU)")
        assertEquals("QNN-HTP(NPU)", epLine(asked))
        assertFalse(epFellBack(asked))
    }

    /**
     * Two models ship side by side and the user switches between them mid-comparison, so the panel
     * has to say which one produced what is on screen — and at which input size, since a model may
     * change it. Both halves are MEASURED: the staged directory and the tensor built from that
     * model's own config.
     */
    @Test
    fun cnnStateNamesTheAttachedModelAndItsInputSize() {
        val live = CnnRuntimeInfo("CPU", "CPU", "real14-80", "model.onnx", "64x3x80x80", CROP, 9.0, 3)
        assertEquals("real14-80 @ 80x80 · crop $CROP", modelLine(live))
        assertEquals("id35-80 @ 96x96 · crop $CROP", modelLine(live.copy(modelDir = "id35-80", inputShape = "64x3x96x96")))
        // Nothing attached yet: a dash, never a guess at what the settings asked for.
        assertEquals("-", modelLine(live.copy(modelDir = null, inputShape = null, crop = null)))
        // A model that declared no crop is served the profile's pads, and the panel says so — the
        // silent version of this is the whole of specs/45.
        assertTrue(modelLine(live.copy(crop = "side=0.100 (LEGACY: the model declares no crop)")).contains("LEGACY"))
    }

    @Test
    fun cnnAttachFailureIsNotDismissible() {
        // The banner is a pure function of the state — there is no "dismissed" input to pass.
        val failed = CnnState.Failed("no execution provider")
        repeat(5) { assertNotNull(attachBannerText(failed)) }
        assertEquals("FAILED(no execution provider)", attachLabel(failed))
        assertNull(attachBannerText(CnnState.Ready("CPU", "model.onnx")))
    }

    @Test
    fun decisionExportContainsConfigHeader() {
        val text =
            exportDecisionLog(
                listOf(decision("e2e4", accepted = true), decision("d2d4", accepted = false)),
                TrackerConfig(),
                CnnRuntimeInfo("QNN-HTP(NPU)", "CPU", "real14-80", "model.onnx", "64x3x80x80", CROP, 8.0, 2),
                "1.0-test",
            )
        assertTrue(text.contains("# app: 1.0-test"))
        assertTrue(text.contains("#   zThr = 3.0"), "the full config block is part of the header")
        assertTrue(text.contains("ep: CPU (requested QNN-HTP(NPU))"))
        // Which bundled model produced these decisions, and at what size — a log that says only
        // "model.onnx" names every one of them.
        assertTrue(text.contains("# model: real14-80/model.onnx @ 64x3x80x80"), text.lines()[2])
        val rows = text.lines().filterNot { it.startsWith("#") }.filter { it.isNotBlank() }
        assertEquals(3, rows.size, "one column header plus one line per record")
        assertTrue(rows[1].startsWith("1.0\t2\te2e4"))
        assertTrue(rows[2].endsWith("\tfalse"), "the rejected row exports accepted = false")
    }
}

private fun decision(
    uci: String,
    accepted: Boolean,
) = DebugDecision(
    tsS = 1.0,
    ply = 2,
    uci = uci,
    san = "x",
    fenBefore = null,
    fenAfter = "f",
    decider = if (accepted) "diff" else "rejected",
    reason = "r",
    priorUsed = false,
    bestScore = 1.0,
    secondScore = 0.0,
    margin = 1.0,
    changed = listOf("e2", "e4"),
    changedVals = emptyList(),
    shadowVetoed = emptyList(),
    occludedVetoed = emptyList(),
    gridCoverage = 1.0,
    zThr = 3.0,
    motion = 0.0,
    cnnRun = false,
    cnnAgreement = 0.0,
    cnnBestMove = null,
    stuckReason = null,
    verifyOutcome = null,
    accepted = accepted,
)
