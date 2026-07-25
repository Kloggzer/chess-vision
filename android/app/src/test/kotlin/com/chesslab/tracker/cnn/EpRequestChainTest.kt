package com.chesslab.tracker.cnn

import com.chesslab.tracker.settings.EpRequest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** A staged model that names files without needing them to exist — the chain never opens them. */
internal fun stagedModel(
    dir: File,
    fp32: String = MODEL_FP32_FILE,
    qnn: String? = MODEL_QNN_FILE,
): StagedModel = StagedModel(dir, "{}", File(dir, fp32), qnn?.let { File(dir, it) })

/**
 * 07a's `AppSettings.epRequest`, which was persisted and read by nobody (STATUS D07a-11).
 *
 * The point of an explicit request is diagnosis: MEMORY `android-live-bringup-2607` cost a whole
 * session to a CNN that was attached but wrong, and "run it on the CPU and see" is the cheapest
 * way to rule the NPU in or out. A request that silently kept trying the NPU first would answer
 * nothing.
 */
class EpRequestChainTest {
    @Test
    fun autoKeepsTheWholeAutomaticChain() {
        assertEquals(listOf(Ep.QNN, Ep.NNAPI, Ep.CPU), epChain(hasQnnModel = true, request = EpRequest.AUTO))
        assertEquals(listOf(Ep.NNAPI, Ep.CPU), epChain(hasQnnModel = false, request = EpRequest.AUTO))
    }

    @Test
    fun explicitCpuTriesNothingAboveIt() {
        assertEquals(listOf(Ep.CPU), epChain(hasQnnModel = true, request = EpRequest.CPU))
        assertEquals(listOf(Ep.CPU), epChain(hasQnnModel = false, request = EpRequest.CPU))
    }

    @Test
    fun explicitNnapiSkipsQnnButKeepsCpuAsTheLastResort() {
        assertEquals(listOf(Ep.NNAPI, Ep.CPU), epChain(hasQnnModel = true, request = EpRequest.NNAPI))
    }

    @Test
    fun requestedQnnMayStillFallBack(
        @TempDir tmp: File,
    ) {
        val chain = epChain(hasQnnModel = true, request = EpRequest.QNN)
        assertEquals(listOf(Ep.QNN, Ep.NNAPI, Ep.CPU), chain)
        // The head is what is REPORTED as requested; that it is not what will be selected is the
        // whole reason 07b renders both ends.
        assertEquals("QNN-HTP(NPU)", requestedBackend(stagedModel(tmp), EpRequest.QNN))
    }

    @Test
    fun requestedQnnWithoutTheQuantizedGraphFallsBackToTheAutomaticChain(
        @TempDir tmp: File,
    ) {
        // The HTP backend rejects float32, so there is nothing to honour here — and the reported
        // request must then be NNAPI, not a QNN the app never even attempted.
        assertEquals(listOf(Ep.NNAPI, Ep.CPU), epChain(hasQnnModel = false, request = EpRequest.QNN))
        assertEquals("NNAPI", requestedBackend(stagedModel(tmp, qnn = null), EpRequest.QNN))
    }

    /**
     * End to end on the real bundled asset: requested CPU, got CPU, and nothing above it was even
     * tried — the automatic chain warns twice here (05c's own contract test asserts that).
     */
    @Test
    fun requestedCpuGetsCpuWithoutTouchingTheOtherProviders(
        @TempDir tmp: File,
    ) {
        val log = RecordingLog()
        val staged = CnnModelAssets({ name -> File(assetDir(), name).takeIf { it.isFile }?.inputStream() }, tmp).stage()
        OnnxSquareClassifier.open(staged, log, EpRequest.CPU).use { classifier ->
            assertEquals("CPU", classifier.backend)
            assertEquals(MODEL_FP32_FILE, classifier.model)
        }
        assertTrue(log.warnings.isEmpty(), "an honoured CPU request must not probe QNN or NNAPI first")
        assertNotEquals("CPU", requestedBackend(staged, EpRequest.AUTO), "AUTO must not silently mean CPU")
    }

    /** 07a's `modelAsset`: the graph NNAPI and CPU are given, and the one they report loading. */
    @Test
    fun theSelectedGraphIsWhatIsStagedAndReported(
        @TempDir tmp: File,
    ) {
        val open = { name: String -> File(assetDir(), name).takeIf { it.isFile }?.inputStream() }
        val staged = CnnModelAssets(open, tmp, graph = MODEL_QNN_FILE).stage()
        assertEquals(MODEL_QNN_FILE, staged.fp32.name)
        assertEquals(MODEL_QNN_FILE, modelFor(staged, Ep.CPU).name)

        val missing = runCatching { CnnModelAssets(open, tmp, graph = "nope.onnx").stage() }.exceptionOrNull()
        assertTrue(missing?.message.orEmpty().contains("nope.onnx"), "a missing graph must name itself: $missing")
    }
}
