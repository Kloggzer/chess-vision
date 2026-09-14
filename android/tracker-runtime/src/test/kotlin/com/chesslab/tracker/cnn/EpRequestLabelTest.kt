package com.chesslab.tracker.cnn

import com.chesslab.tracker.settings.EpRequest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test

/**
 * The dropdown text against the chain it names.
 *
 * `AppSettingsSection` renders `EpRequest.label` verbatim, and this knob exists for diagnosis:
 * MEMORY `android-live-bringup-2607` cost a session to a CNN that attached and ran somewhere else.
 * A label that names a provider AUTO never tries answers the diagnostic question wrongly.
 */
class EpRequestLabelTest {
    @Test
    fun theAutoLabelMayNotPromiseAProviderTheAutomaticChainSkips() {
        val automatic = epChain(hasQnnModel = true, request = EpRequest.AUTO)
        assertEquals(listOf(Ep.QNN, Ep.XNNPACK, Ep.CPU), automatic, "the automatic chain under test")
        assertFalse(
            EpRequest.AUTO.label.contains(Ep.NNAPI.name),
            "the settings screen offers \"${EpRequest.AUTO.label}\", but AUTO runs " +
                "${automatic.map { it.name }}: NNAPI was taken off the automatic path after it measured " +
                "470 ms per 64 crops on an SM8650 against the CPU's 97 (OnnxSquareClassifier.kt:78). " +
                "The label still promises it and never names XNNPACK, which is what actually runs.",
        )
    }
}
