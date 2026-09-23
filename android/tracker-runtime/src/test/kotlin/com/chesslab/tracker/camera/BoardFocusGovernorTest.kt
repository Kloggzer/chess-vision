package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.abs

class BoardFocusGovernorTest {
    private val able = CameraAbilities(minFocusDiopters = 10f)

    private var seq = 0L

    private fun drive(
        governor: BoardFocusGovernor,
        port: FakeLookPort,
        frames: Int,
        quiet: Boolean = true,
        board: (Float?) -> BgrImage = { focusBoard(it) },
    ): Int {
        var moved = 0
        repeat(frames) {
            if (governor.onBoard(seq++, quiet, null) { board(port.look.value.focus) }) moved++
        }
        return moved
    }

    private fun governor(
        port: FakeLookPort,
        settle: Int = 0,
        onSoft: (FocusNotice) -> Unit = {},
    ) = BoardFocusGovernor(port, settleFrames = settle, everyFrames = 1, onSoft = onSoft)

    @Test
    fun `a fixed-focus lens is refused`() {
        val port = FakeLookPort(CameraAbilities(minFocusDiopters = 0f))
        val g = governor(port)
        g.start()
        assertEquals(0, port.sets)
        assertEquals(FocusState.Failed, g.state.value)
    }

    @Test
    fun `nothing happens until the sweep is asked for`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        assertEquals(0, drive(g, port, 50))
        assertEquals(0, port.sets)
        assertEquals(FocusState.Idle, g.state.value)
    }

    @Test
    fun `the sweep ends on the sharpest distance`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        g.start()
        assertEquals(1, drive(g, port, 100)) { "genau ein Frame meldet das Ende" }
        val locked = g.state.value
        assertTrue(locked is FocusState.Locked) { "Zustand $locked" }
        assertTrue(abs((locked as FocusState.Locked).focus - 0.3f) < 0.03f) { "gestellt auf ${locked.focus}" }
        assertEquals(locked.focus, port.look.value.focus)
    }

    @Test
    fun `the lens gets its settling frames before every reading`() {
        val port = FakeLookPort(able)
        val g = governor(port, settle = 2)
        g.start()
        val after = port.sets
        drive(g, port, 2)
        assertEquals(after, port.sets) { "waehrend die Linse faehrt wird nicht gemessen" }
        var frames = 2
        while (port.sets == after && frames < 40) {
            drive(g, port, 1)
            frames++
        }
        assertTrue(port.sets > after) { "danach geht es eine Stufe weiter" }
        assertTrue(frames > 5) { "ein weiter Weg braucht mehr als Wartezeit plus drei Messungen" }
    }

    @Test
    fun `a longer lens move waits longer than a short one`() {
        val port = FakeLookPort(able)
        val g = governor(port, settle = 2)

        fun framesForStepAfter(start: Float): Int {
            port.setLook(CameraLook(focus = start))
            val g2 = governor(port, settle = 2)
            g2.start()
            var n = 0
            val before = port.sets
            while (port.sets == before && n < 60) {
                drive(g2, port, 1)
                n++
            }
            return n
        }
        // start() faehrt immer auf 0: von 0.9 ist der Weg lang, von 0.05 kurz.
        assertTrue(framesForStepAfter(0.9f) > framesForStepAfter(0.05f)) {
            "die Wartezeit muss mit dem Weg wachsen"
        }
    }

    @Test
    fun `a flat scene leaves the optics where they were`() {
        val port = FakeLookPort(able)
        port.setLook(CameraLook(focus = 0.42f))
        val g = governor(port)
        g.start()
        drive(g, port, 100) { checkers(4f) }
        assertEquals(FocusState.Failed, g.state.value)
        assertEquals(0.42f, port.look.value.focus)
    }

    @Test
    fun `cancel puts the look back`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        g.start()
        drive(g, port, 5)
        g.cancel()
        assertEquals(null, port.look.value.focus) { "vorher stand der Fokus auf Auto" }
        assertEquals(FocusState.Idle, g.state.value)
    }

    @Test
    fun `a board that goes soft is reported once`() {
        val said = mutableListOf<FocusNotice>()
        val port = FakeLookPort(able)
        val g = governor(port, onSoft = { said += it })
        g.start()
        drive(g, port, 100)
        val reference = (g.state.value as FocusState.Locked).sharpness
        drive(g, port, 6) { checkers(8f) }
        assertEquals(1, said.size) { "eine Meldung je Episode" }
        assertTrue(said.first().sharpness < reference * 0.6f)
        assertTrue(g.state.value is FocusState.Soft)
    }

    @Test
    fun `the warning goes away when the board is sharp again`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        g.start()
        drive(g, port, 100)
        drive(g, port, 6) { checkers(8f) }
        assertTrue(g.state.value is FocusState.Soft)
        drive(g, port, 2)
        assertTrue(g.state.value is FocusState.Locked) { "Zustand ${g.state.value}" }
    }

    @Test
    fun `a busy frame is never judged soft`() {
        val port = FakeLookPort(able)
        val g = governor(port, onSoft = { error("ein unruhiger Frame darf nichts melden") })
        g.start()
        drive(g, port, 100)
        assertFalse(g.sweeping)
        drive(g, port, 20, quiet = false) { checkers(8f) }
        assertTrue(g.state.value is FocusState.Locked)
    }

    @Test
    fun `the final distance settles and is measured before the baseline is released`() {
        val port = FakeLookPort(able)
        val g = governor(port, settle = 2)
        g.start()
        var released = 0
        var frames = 0
        while (g.state.value !is FocusState.Locked && frames < 900) {
            released += drive(g, port, 1)
            frames++
        }
        assertTrue(g.state.value is FocusState.Locked) { "Zustand ${g.state.value}" }
        // Genau EIN Frame gibt die Referenz frei, und erst nachdem die Endstellung gemessen wurde.
        assertEquals(1, released)
        assertEquals((g.state.value as FocusState.Locked).focus, port.look.value.focus)
    }

    @Test
    fun `an unrepeatable winner restores the previous focus`() {
        val port = FakeLookPort(able)
        port.setLook(CameraLook(focus = 0.42f))
        val g = governor(port)
        g.start()
        assertEquals(0, drive(g, port, 66))
        assertEquals(0, drive(g, port, 3) { checkers(0f) })
        assertEquals(FocusState.Failed, g.state.value)
        assertEquals(0.42f, port.look.value.focus)
        assertEquals(1, drive(g, port, 1))
    }

    @Test
    fun `one outlier per distance cannot win the sweep`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        var reading = 0
        g.start()
        drive(g, port, 69) { focus ->
            if (reading++ % 3 == 0 && focus != null && focus > 0.7f) checkers(250f) else focusBoard(focus)
        }
        val held = g.state.value as FocusState.Locked
        assertTrue(abs(held.focus - 0.3f) < 0.03f)
    }

    @Test
    fun `manual editing cancels a sweep without restoring over the edit`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        g.start()
        drive(g, port, 6)
        g.setLook(CameraLook(focus = 0.75f))
        drive(g, port, 100)
        assertEquals(FocusState.Idle, g.state.value)
        assertEquals(0.75f, port.look.value.focus)
    }

    @Test
    fun `switching to auto immediately invalidates a confirmed lock`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        g.start()
        drive(g, port, 100)
        g.setLook(CameraLook())
        assertEquals(FocusState.Idle, g.state.value)
        drive(g, port, 10)
        assertEquals(FocusState.Idle, g.state.value)
        assertEquals(null, port.look.value.focus)
    }

    @Test
    fun `cancel cannot be overwritten by an in flight measurement`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        val measuring = CountDownLatch(1)
        val release = CountDownLatch(1)
        val cancelling = CountDownLatch(1)
        val workers = Executors.newFixedThreadPool(2)
        try {
            g.start()
            drive(g, port, 2)
            val frame =
                workers.submit {
                    g.onBoard(3, true, null) {
                        measuring.countDown()
                        check(release.await(5, TimeUnit.SECONDS))
                        focusBoard(port.look.value.focus)
                    }
                }
            assertTrue(measuring.await(5, TimeUnit.SECONDS))
            val cancel =
                workers.submit {
                    cancelling.countDown()
                    g.cancel()
                }
            assertTrue(cancelling.await(5, TimeUnit.SECONDS))
            release.countDown()
            frame.get(5, TimeUnit.SECONDS)
            cancel.get(5, TimeUnit.SECONDS)
            val sets = port.sets
            drive(g, port, 100)
            assertEquals(sets, port.sets)
            assertEquals(null, port.look.value.focus)
            assertEquals(FocusState.Idle, g.state.value)
        } finally {
            release.countDown()
            workers.shutdownNow()
        }
    }

    @Test
    fun `repeated start does not replace the original focus for cancellation`() {
        val port = FakeLookPort(able)
        port.setLook(CameraLook(focus = 0.42f))
        val g = governor(port)
        g.start()
        drive(g, port, 6)
        g.start()
        g.cancel()
        assertEquals(0.42f, port.look.value.focus)
    }

    @Test
    fun `monitoring resumes when the tracker sequence restarts`() {
        val port = FakeLookPort(able)
        val g = BoardFocusGovernor(port, settleFrames = 0, everyFrames = 30)
        g.start()
        drive(g, port, 100)
        assertTrue(g.state.value is FocusState.Locked)
        g.onBoard(0, true, null) { checkers(0f) }
        assertTrue(g.state.value is FocusState.Soft)
    }

    @Test
    fun `exposure regulation does not discard the lock but a raw focus change does`() {
        val port = FakeLookPort(able)
        val g = governor(port)
        g.start()
        drive(g, port, 100)
        port.setLook(port.look.value.copy(evIndex = 1))
        drive(g, port, 1)
        assertTrue(g.state.value is FocusState.Locked)
        port.setLook(port.look.value.copy(focus = null))
        drive(g, port, 1)
        assertEquals(FocusState.Idle, g.state.value)
    }

    @Test
    fun `queued sharp frames cannot be assigned to a lens that has not arrived`() {
        val port = FakeLookPort(able)
        val g = governor(port, settle = 2)
        g.start()
        port.lensReady = false
        repeat(10) {
            assertFalse(g.onBoard(seq++, true, null) { error("old capture must not be measured") })
        }
        assertEquals(0, (g.state.value as FocusState.Sweeping).done)
        port.lensReady = true
        repeat(2) {
            assertFalse(g.onBoard(seq++, true, null) { error("drain queued frames after arrival") })
        }
        drive(g, port, 3)
        assertEquals(1, (g.state.value as FocusState.Sweeping).done)
    }

    @Test
    fun `a lens that never acknowledges the request fails and restores focus`() {
        val port = FakeLookPort(able)
        port.setLook(CameraLook(focus = 0.24f))
        val g = governor(port)
        g.start()
        port.lensReady = false
        repeat(60) {
            assertFalse(g.onBoard(seq++, true, null) { error("unacknowledged focus") })
        }
        assertEquals(FocusState.Failed, g.state.value)
        assertEquals(0.24f, port.look.value.focus)
    }

    @Test
    fun `the device autofocus seeds the search and its point is checked against its neighbours`() {
        val port = FakeLookPort(able)
        val g = BoardFocusGovernor(port, settleFrames = 0)
        port.deviceFocus = 0.3f
        g.onBoard(0, true, FocusRegion(0.5f, 0.5f, 0.4f)) { focusBoard(0f) }
        g.start()
        var seq = 1L
        repeat(60) { g.onBoard(seq++, true, null) { focusBoard(port.look.value.focus) } }
        val state = g.state.value
        assertTrue(state is FocusState.Locked, "seeded run must lock, was $state")
        assertEquals(0.3f, (state as FocusState.Locked).focus, 1e-3f)
        assertEquals(0.4f, port.regionAsked?.size)
    }

    @Test
    fun `a device point one coarse step beside the peak is still corrected locally`() {
        val port = FakeLookPort(able)
        val g = BoardFocusGovernor(port, settleFrames = 0)
        // Neben dem Gipfel bei 0.3, aber innerhalb der Feinstufen um den AF-Punkt.
        port.deviceFocus = 0.37f
        g.onBoard(0, true, FocusRegion(0.5f, 0.5f, 0.4f)) { focusBoard(0f) }
        g.start()
        var seq = 1L
        repeat(120) { g.onBoard(seq++, true, null) { focusBoard(port.look.value.focus) } }
        val state = g.state.value
        assertTrue(state is FocusState.Locked, "was $state")
        assertEquals(0.3f, (state as FocusState.Locked).focus, 0.03f)
    }

    @Test
    fun `a device point far from the peak falls back to the full sweep`() {
        val port = FakeLookPort(able)
        val g = BoardFocusGovernor(port, settleFrames = 0)
        port.deviceFocus = 0.8f
        g.onBoard(0, true, FocusRegion(0.5f, 0.5f, 0.4f)) { focusBoard(0f) }
        g.start()
        var seq = 1L
        repeat(400) { g.onBoard(seq++, true, null) { focusBoard(port.look.value.focus) } }
        val state = g.state.value
        assertTrue(state is FocusState.Locked, "die volle Reihe muss uebernehmen, war $state")
        assertEquals(0.3f, (state as FocusState.Locked).focus, 0.05f)
    }

    /** Sagt die Kamera nein, kam der eine Vorgabe-Lock nie wieder. */
    @Test
    fun `a refused auto lock may be tried again once the camera answers`() {
        val port = FakeLookPort(able)
        val g = BoardFocusGovernor(port, settleFrames = 0)
        val region = FocusRegion(0.5f, 0.5f, 0.4f)
        port.deviceFocus = null
        g.onBoard(0, true, region) { focusBoard(0f) }
        assertEquals(FocusState.Idle, g.state.value)

        port.deviceFocus = 0.3f
        var seq = 1L
        repeat(60) { g.onBoard(seq++, true, region) { focusBoard(port.look.value.focus) } }

        assertTrue(g.state.value is FocusState.Locked, "der Vorgabe-Lock kam nie wieder, war ${g.state.value}")
    }

    @Test
    fun `without a region nothing is asked of the camera and the sweep runs straight away`() {
        val port = FakeLookPort(able)
        val g = BoardFocusGovernor(port, settleFrames = 0)
        port.deviceFocus = 0.3f
        g.start()
        assertEquals(null, port.regionAsked)
        assertTrue(g.state.value is FocusState.Sweeping, "was ${g.state.value}")
    }

    @Test
    fun `a watching screen gets a reading even without a lock`() {
        val port = FakeLookPort(able)
        val g = governor(port, settle = 0)
        assertEquals(null, g.sharpness.value)
        g.watch(true)
        drive(g, port, 3)
        assertTrue((g.sharpness.value ?: 0f) > 0f) { "ohne Messung bleibt der Anzeiger leer" }
    }

    @Test
    fun `nothing is measured while no screen is watching`() {
        val port = FakeLookPort(able)
        val g = governor(port, settle = 0)
        repeat(5) { g.onBoard(it.toLong(), true, null) { error("kein Zuschauer, keine Messung") } }
        assertEquals(null, g.sharpness.value)
    }

    @Test
    fun `cancel during the device seek restores the manual distance`() {
        val port = FakeLookPort(able)
        port.setLook(CameraLook(focus = 0.42f))
        val g = BoardFocusGovernor(port, settleFrames = 0)
        port.deviceFocus = 0.3f
        g.onBoard(0, true, FocusRegion(0.5f, 0.5f, 0.4f)) { focusBoard(0.42f) }
        g.start()
        assertEquals(FocusState.Seeking, g.state.value) { "Vorbedingung: der Geraete-Fokus laeuft" }

        g.cancel()

        assertEquals(FocusState.Idle, g.state.value) { "cancel muss den Lauf beenden" }
        assertEquals(0.42f, port.look.value.focus) { "cancel muss die manuelle Distanz zuruecklegen" }
    }

    @Test
    fun `cancel during the confirmation step stops the run`() {
        val port = FakeLookPort(able)
        port.setLook(CameraLook(focus = 0.42f))
        val g = BoardFocusGovernor(port, settleFrames = 0)
        g.onBoard(0, true, FocusRegion(0.5f, 0.5f, 0.4f)) { focusBoard(0.42f) }
        g.sweep()
        // Die Bestaetigung: alle Stufen gelaufen (done == total).
        var seq = 1L
        var confirming = false
        while (seq < 400 && !confirming) {
            g.onBoard(seq++, true, null) { focusBoard(port.look.value.focus) }
            val state = g.state.value
            confirming = state is FocusState.Sweeping && state.done == state.total - 1
        }
        assertEquals(true, confirming) { "Vorbedingung: die Bestaetigungsstufe wurde erreicht" }

        g.cancel()
        repeat(20) { g.onBoard(seq++, true, null) { focusBoard(port.look.value.focus) } }

        assertEquals(FocusState.Idle, g.state.value) { "cancel in der Bestaetigung muss den Lauf beenden" }
    }
}
