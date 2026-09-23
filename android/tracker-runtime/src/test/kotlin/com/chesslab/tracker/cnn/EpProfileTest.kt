package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * A real ORT trace, trimmed: preamble, a provider-less fence event, and kernels split between QNN
 * and CPU — the partial-assignment shape a working NPU session has.
 */
private val MIXED_TRACE =
    """
    [
    {"cat":"Session","pid":9,"tid":9,"dur":41000,"ts":1,"ph":"X","name":"model_loading_uri","args":{}},
    {"cat":"Session","pid":9,"tid":9,"dur":900,"ts":42000,"ph":"X","name":"session_initialization","args":{}},
    {"cat":"Node","pid":9,"tid":9,"dur":3,"ts":50000,"ph":"X","name":"conv1_fence_before","args":{"op_name":"Conv"}},
    {"cat":"Node","pid":9,"tid":9,"dur":8000,"ts":50010,"ph":"X","name":"conv1_kernel_time",
     "args":{"op_name":"Conv","provider":"QNNExecutionProvider","graph_index":"0"}},
    {"cat":"Node","pid":9,"tid":9,"dur":1500,"ts":58010,"ph":"X","name":"gemm_kernel_time",
     "args":{"op_name":"Gemm","provider":"QNNExecutionProvider","graph_index":"1"}},
    {"cat":"Node","pid":9,"tid":9,"dur":400,"ts":59510,"ph":"X","name":"cast_kernel_time",
     "args":{"op_name":"Cast","provider":"CPUExecutionProvider","graph_index":"2"}}
    ]
    """.trimIndent()

/** The bug this whole file exists for: QNN was appended, QNN ran nothing, every kernel is CPU. */
private val ALL_CPU_TRACE =
    """
    [
    {"cat":"Session","pid":9,"tid":9,"dur":41000,"ts":1,"ph":"X","name":"model_loading_uri","args":{}},
    {"cat":"Node","pid":9,"tid":9,"dur":6000,"ts":50010,"ph":"X","name":"conv1_kernel_time",
     "args":{"op_name":"Conv","provider":"CPUExecutionProvider"}},
    {"cat":"Node","pid":9,"tid":9,"dur":900,"ts":56010,"ph":"X","name":"gemm_kernel_time",
     "args":{"op_name":"Gemm","provider":"CPUExecutionProvider"}}
    ]
    """.trimIndent()

class EpProfileTest {
    @Test
    fun theProviderWithTheMostKernelTimeWins() {
        assertEquals("QNNExecutionProvider", dominantProvider(MIXED_TRACE))
        assertEquals("CPUExecutionProvider", dominantProvider(ALL_CPU_TRACE))
    }

    @Test
    fun onlyNodeKernelEventsCount() {
        // Both traces contain Session events and MIXED_TRACE a provider-less fence event; if either
        // were counted the sums would be wrong, and `model_loading_uri` alone dwarfs every kernel.
        val sessionOnly =
            """
            [{"cat":"Session","pid":9,"tid":9,"dur":99999,"ts":1,"ph":"X","name":"model_loading_uri","args":{}}]
            """.trimIndent()
        assertNull(dominantProvider(sessionOnly))
    }

    @Test
    fun anUnreadableProfileIsUnknownNotAGuess() {
        // Truncated, empty and non-array payloads must all say "no answer" rather than default to
        // anything — a default here is exactly how an unverified EP would sneak back in.
        assertNull(dominantProvider(""))
        assertNull(dominantProvider("""[{"cat":"Node","name":"conv1_kernel_time","""))
        assertNull(dominantProvider("""{"cat":"Node"}"""))
        assertNull(dominantProvider("[]"))
    }

    @Test
    fun ortProviderNamesMapOntoTheChain() {
        assertEquals(Ep.QNN, epForProvider("QNNExecutionProvider"))
        assertEquals(Ep.NNAPI, epForProvider("NnapiExecutionProvider"))
        assertEquals(Ep.XNNPACK, epForProvider("XnnpackExecutionProvider"))
        assertEquals(Ep.CPU, epForProvider("CPUExecutionProvider"))
        assertNull(epForProvider("CoreMLExecutionProvider"))
    }

    @Test
    fun aConfirmedRequestReportsItselfPlainly() {
        val verdict = EpVerdict(Ep.QNN, dominantProvider(MIXED_TRACE))
        assertTrue(verdict.matches)
        assertFalse(verdict.contradicted)
        assertEquals("QNN-HTP(NPU)", verdict.label)
    }

    @Test
    fun aContradictedRequestReportsWhatRan() {
        // The measured bug: ORT accepted the QNN EP, QNN's device creation failed inside
        // GetCapability, and every kernel ran on the CPU while the app said NPU.
        val verdict = EpVerdict(Ep.QNN, dominantProvider(ALL_CPU_TRACE))
        assertFalse(verdict.matches)
        assertTrue(verdict.contradicted)
        assertEquals("CPU", verdict.label)
    }

    @Test
    fun anUnverifiableRequestSaysSoInsteadOfClaiming() {
        val verdict = EpVerdict(Ep.QNN, null)
        assertFalse(verdict.matches, "unverified is not a match")
        assertFalse(verdict.contradicted, "unverified is not a contradiction either — nothing is known")
        assertEquals("QNN-HTP(NPU) (unverified)", verdict.label)
        assertNull(verdict.ranEp)
    }

    @Test
    fun aStrangeProviderIsReportedVerbatim() {
        val verdict = EpVerdict(Ep.CPU, "CoreMLExecutionProvider")
        assertTrue(verdict.contradicted)
        assertEquals("CoreMLExecutionProvider", verdict.label)
    }

    /** XNNPACK runs on the same cores and hands the graph's 46 InstanceNormalization blocks back to the CPU EP. */
    @Test
    fun xnnpackHandingOperatorsBackToTheCpuIsNotAContradiction() {
        val verdict = EpVerdict(Ep.XNNPACK, dominantProvider(ALL_CPU_TRACE))
        assertFalse(verdict.matches)
        assertFalse(verdict.contradicted)
        assertEquals("CPU", verdict.label, "the label still states what actually dominated")
        // The escape hatch is XNNPACK's alone — an NPU that never ran is still a contradiction.
        assertTrue(EpVerdict(Ep.NNAPI, dominantProvider(ALL_CPU_TRACE)).contradicted)
    }
}
