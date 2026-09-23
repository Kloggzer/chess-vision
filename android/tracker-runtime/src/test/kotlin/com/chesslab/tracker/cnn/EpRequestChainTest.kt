package com.chesslab.tracker.cnn

import com.chesslab.tracker.log.RecordingLog
import com.chesslab.tracker.settings.EpRequest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
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
 * 07a's `AppSettings.epRequest` (STATUS D07a-11): an explicit request exists for diagnosis
 * (MEMORY `android-live-bringup-2607`), so it must not silently keep trying the NPU first.
 */
class EpRequestChainTest {
    @Test
    fun autoKeepsTheWholeAutomaticChain() {
        // NNAPI is deliberately NOT here: measured 470 ms per 64 crops on an SM8650 against the
        // CPU's 97, and a floor below the always-present CPU provider is unreachable anyway.
        assertEquals(listOf(Ep.QNN, Ep.XNNPACK, Ep.CPU), epChain(hasQnnModel = true, request = EpRequest.AUTO))
        assertEquals(listOf(Ep.XNNPACK, Ep.CPU), epChain(hasQnnModel = false, request = EpRequest.AUTO))
    }

    /** The shipped AAR no longer contains QNN, so `addQnn` throws on every device. */
    @Test
    fun epChainDegradesWhenQnnIsAbsent(
        @TempDir tmp: File,
    ) {
        val log = RecordingLog()
        val staged =
            StagedModel(
                dir = tmp,
                configJson = File(assetDir(), MODEL_CONFIG_FILE).readText(),
                fp32 = File(assetDir(), MODEL_FP32_FILE),
                qnn = null,
            )
        assertEquals(listOf(Ep.XNNPACK, Ep.CPU), epChain(hasQnnModel = false))
        OnnxSquareClassifier.open(staged, log).use { classifier ->
            assertEquals(assetClasses().size, classifier.classes.size)
            assertTrue(classifier.lastRunMs > 0.0, "the fallback session must have really run a batch")
        }
    }

    @Test
    fun explicitCpuTriesNothingAboveIt() {
        assertEquals(listOf(Ep.CPU), epChain(hasQnnModel = true, request = EpRequest.CPU))
        assertEquals(listOf(Ep.CPU), epChain(hasQnnModel = false, request = EpRequest.CPU))
    }

    /** The one way to reach NNAPI at all — it is not in the automatic chain. */
    @Test
    fun explicitNnapiSkipsQnnButKeepsCpuAsTheLastResort() {
        assertEquals(listOf(Ep.NNAPI, Ep.XNNPACK, Ep.CPU), epChain(hasQnnModel = true, request = EpRequest.NNAPI))
    }

    @Test
    fun requestedQnnMayStillFallBack(
        @TempDir tmp: File,
    ) {
        val chain = epChain(hasQnnModel = true, request = EpRequest.QNN)
        assertEquals(listOf(Ep.QNN, Ep.NNAPI, Ep.XNNPACK, Ep.CPU), chain)
        // The head is what is REPORTED as requested; that it is not what will be selected is the
        // whole reason 07b renders both ends.
        assertEquals("QNN-HTP(NPU)", requestedBackend(stagedModel(tmp), EpRequest.QNN))
    }

    @Test
    fun requestedQnnWithoutTheQuantizedGraphFallsBackToTheAutomaticChain(
        @TempDir tmp: File,
    ) {
        // The HTP backend rejects float32: the reported request is the AUTOMATIC chain's head.
        assertEquals(listOf(Ep.XNNPACK, Ep.CPU), epChain(hasQnnModel = false, request = EpRequest.QNN))
        assertEquals("XNNPACK", requestedBackend(stagedModel(tmp, qnn = null), EpRequest.QNN))
    }

    /** On the real asset: the automatic chain warns twice here (05c's contract test asserts that). */
    @Test
    fun requestedCpuGetsCpuWithoutTouchingTheOtherProviders(
        @TempDir tmp: File,
    ) {
        val log = RecordingLog()
        val staged = stageAssets(tmp)
        OnnxSquareClassifier.open(staged, log, EpRequest.CPU).use { classifier ->
            assertEquals("CPU", classifier.backend)
            assertEquals(MODEL_FP32_FILE, classifier.model)
        }
        assertTrue(log.warnings.isEmpty(), "an honoured CPU request must not probe QNN or NNAPI first")
        assertNotEquals("CPU", requestedBackend(staged, EpRequest.AUTO), "AUTO must not silently mean CPU")
    }

    /** 07a's `modelAsset`. The alternate name is served from the FP32 bytes: no quantized graph ships. */
    @Test
    fun theSelectedGraphIsWhatIsStagedAndReported(
        @TempDir tmp: File,
    ) {
        val open = { name: String ->
            val source = if (name == MODEL_QNN_FILE) MODEL_FP32_FILE else name
            File(assetDir(), source).takeIf { it.isFile }?.inputStream()
        }
        val staged = CnnModelAssets(open, tmp, graph = MODEL_QNN_FILE).stage()
        assertEquals(MODEL_QNN_FILE, staged.fp32.name)
        assertEquals(MODEL_QNN_FILE, modelFor(staged, Ep.CPU).name)

        val missing = runCatching { CnnModelAssets(open, tmp, graph = "nope.onnx").stage() }.exceptionOrNull()
        assertTrue(missing?.message.orEmpty().contains("nope.onnx"), "a missing graph must name itself: $missing")
    }

    /** `AppSettingsSection` renders the label verbatim; NNAPI left the automatic path at 470 ms vs 97 on SM8650. */
    @Test
    fun theAutoLabelMayNotPromiseAProviderTheAutomaticChainSkips() {
        val automatic = epChain(hasQnnModel = true, request = EpRequest.AUTO)
        assertEquals(listOf(Ep.QNN, Ep.XNNPACK, Ep.CPU), automatic, "the automatic chain under test")
        assertFalse(
            EpRequest.AUTO.label.contains(Ep.NNAPI.name),
            "the settings screen offers \"${EpRequest.AUTO.label}\", but AUTO runs ${automatic.map { it.name }}",
        )
    }
}
