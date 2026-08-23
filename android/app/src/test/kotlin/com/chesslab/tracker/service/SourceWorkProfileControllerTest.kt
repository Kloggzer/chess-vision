package com.chesslab.tracker.service

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SourceWorkProfileControllerTest {
    @Test
    fun unavailableBuildCannotArmCollector() {
        val controller = SourceWorkProfileController(available = false, header = { "unused" })

        controller.setEnabled(true)

        assertFalse(controller.enabled.value)
        assertNull(controller.report())
    }

    @Test
    fun stoppedProfileRemainsExportable() {
        var now = 0L
        val controller =
            SourceWorkProfileController(
                available = true,
                header = { "test Android device" },
                nanoTime = { ++now },
            )

        controller.setEnabled(true)
        WorkProfiler.span(WorkOperation.FRAME, input = 7L) { Unit }
        controller.setEnabled(false)
        val report = requireNotNull(controller.report())

        assertFalse(controller.enabled.value)
        assertTrue(report.contains("test Android device"))
        assertTrue(report.contains("frame"))
        assertTrue(report.contains("      1"))
        assertTrue(report.contains("elapsed ms:"))
        controller.close()
    }
}
