package com.chesslab.tracker.service

import android.app.Application
import com.chesslab.cnn.calibratedConfThr
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.cnn.modelConfigJson
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
        val spec = ModelSpec.parse(modelConfigJson(coverageGate = null))

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
        val spec = ModelSpec.parse(modelConfigJson(coverageGate = 0.15))

        val warnings = mutableListOf<String>()
        val result = config.withCoverageGateOf(spec) { warnings.add(it) }

        assertTrue("no warning expected when coverageGate is declared", warnings.isEmpty())
        assertEquals("pOccludedThr should be set to declared gate", 0.15, result.pOccludedThr, 0.01)
    }

    @Test
    fun withCoverageGateOfDoesNotWarnWhenCoverageOutputFalse() {
        val config = TrackerConfig()
        val spec = ModelSpec.parse(modelConfigJson(coverageOutput = false, coverageGate = null))

        val warnings = mutableListOf<String>()
        val result = config.withCoverageGateOf(spec) { warnings.add(it) }

        assertTrue("no warning expected when coverageOutput=false", warnings.isEmpty())
        assertEquals("pOccludedThr should remain at default 0.5", 0.5, result.pOccludedThr, 0.01)
    }

    /** Alle sieben Modelle sind ueberkonfident: `cnnConfThr = 0.85` forderte real 48 bis 70 %. */
    @Test
    fun withCoverageGateOfTranslatesTheConfidenceHurdleThroughTheTemperature() {
        val spec = ModelSpec.parse(modelConfigJson(coverageGate = 0.25, extra = TEMPERED))
        val config = TrackerConfig(cnnConfThr = 0.85)

        val result = config.withCoverageGateOf(spec) { }

        assertEquals(calibratedConfThr(0.85, spec.temperature, spec.classes.size), result.cnnConfThr, 1e-12)
        assertTrue("eine ueberkonfidente Temperatur senkt die Huerde", result.cnnConfThr < 0.85)
    }

    /** Ohne die Spalte ist `pOccluded` immer 0,0 — die Schwelle schaltete still den modellfreien Arm scharf. */
    @Test
    fun withCoverageGateOfIgnoresAGateWithoutTheColumn() {
        val spec = ModelSpec.parse(modelConfigJson(coverageOutput = false, coverageGate = 0.25))

        val result = TrackerConfig().withCoverageGateOf(spec) { }

        assertEquals("a gate without coverage_output gattert gegen 0,0", 0.5, result.pOccludedThr, 0.01)
    }
}

/** Gemessen 1,26-1,76 ueber die sieben ausgelieferten Modelle. */
private const val TEMPERED = ""","temperature": 1.5"""
