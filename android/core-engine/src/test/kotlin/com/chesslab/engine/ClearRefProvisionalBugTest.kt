package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Die vierte Tuer, die `refGray`/`refFen` fallen laesst — drei prueft [RefProvisionalResetTest].
 * Hier ueberlebt der Merker und zieht den naechsten ruhigen Frame in `setRef(fromCommit = true)`.
 */
class ClearRefProvisionalBugTest {
    @Test
    fun clearRefDropsTheProvisionalMark() {
        val state = detectState()
        state.nowS = 10.0
        state.refProvisionalUntil = 10.2

        state.clearRef()

        assertEquals(0.0, state.refProvisionalUntil, "der Merker beschreibt die Epoche, die gerade fiel")
    }
}
