package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Die Drossel vor dem Notiz-Log — [TrackerCoordinator] schreibt sonst eine Zeile je Frame. */
class NoteThrottleTest {
    private var now = 10_000L

    private val throttle = NoteThrottle { now }

    private fun note(text: String) = throttle.accept(TrackerEvent.Note(text))

    private fun stuck(reason: String) = throttle.accept(TrackerEvent.Stuck(reason))

    @Test
    fun theSameTextIsNeverRepeated() {
        assertTrue(note("holding reference for 3s"))
        now += 10_000
        assertFalse(note("holding reference for 3s"), "identical text says nothing new")
    }

    @Test
    fun aDifferentTextWithinTheGapIsDropped() {
        assertTrue(note("Change on 7 squares"))
        now += MIN_NOTE_GAP_MS - 1
        assertFalse(note("Change on 8 squares"), "the count changes on nearly every frame")
        now += 1
        assertTrue(note("Change on 9 squares"), "after the gap the next text is logged")
    }

    /** Stuck ist ein Zustandswechsel, kein Zaehlerstand — er geht immer durch. */
    @Test
    fun stuckLinesAreNeverDropped() {
        assertTrue(stuck("too_many_changed"))
        assertTrue(stuck("too_many_changed"))
        assertTrue(note("Change on 7 squares"), "a stuck line does not consume the note budget")
    }
}
