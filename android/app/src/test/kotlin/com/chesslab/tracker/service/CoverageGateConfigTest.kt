package com.chesslab.tracker.service

import android.app.Application
import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class CoverageGateConfigTest {
    @Test
    fun withCoverageGateOfLogsWarningWhenCoverageOutputButNoGate() {
        val config = TrackerConfig()
        val spec = ModelSpec.parse(configJson(coverageOutput = true))

        val warnings = mutableListOf<String>()
        val result = config.withCoverageGateOf(spec) { warnings.add(it) }

        assertTrue("expected warning when coverageOutput=true but coverageGate=null", warnings.isNotEmpty())
        val warning = warnings.first()
        assertTrue("warning should mention coverage_output", warning.contains("coverage_output"))
        assertTrue("warning should mention coverage_gate", warning.contains("coverage_gate"))
        assertTrue("warning should mention 0.5 fallback", warning.contains("0.5"))
        assertEquals("pOccludedThr should remain at default 0.5", 0.5, result.pOccludedThr, 0.01)
    }

    @Test
    fun withCoverageGateOfDoesNotWarnWhenCoverageGateDeclared() {
        val config = TrackerConfig()
        val spec = ModelSpec.parse(configJson(coverageOutput = true, coverageGate = 0.15))

        val warnings = mutableListOf<String>()
        val result = config.withCoverageGateOf(spec) { warnings.add(it) }

        assertTrue("no warning expected when coverageGate is declared", warnings.isEmpty())
        assertEquals("pOccludedThr should be set to declared gate", 0.15, result.pOccludedThr, 0.01)
    }

    @Test
    fun withCoverageGateOfDoesNotWarnWhenCoverageOutputFalse() {
        val config = TrackerConfig()
        val spec = ModelSpec.parse(configJson(coverageOutput = false))

        val warnings = mutableListOf<String>()
        val result = config.withCoverageGateOf(spec) { warnings.add(it) }

        assertTrue("no warning expected when coverageOutput=false", warnings.isEmpty())
        assertEquals("pOccludedThr should remain at default 0.5", 0.5, result.pOccludedThr, 0.01)
    }

    private fun configJson(
        coverageOutput: Boolean = false,
        coverageGate: Double? = null,
    ): String {
        val coverage = if (coverageOutput) ", \"coverage_output\": true" else ""
        val gate = coverageGate?.let { ", \"coverage_gate\": $it" }.orEmpty()
        return """{"backbone": "x", "classes": ${PIECES13_CLASSES.joinToString(",", "[", "]") { "\"$it\"" }},""" +
            """ "out_size": [128, 128]$coverage$gate}"""
    }
}
