package com.chesslab.tracker.spectate

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SpectatorPageTest {
    private val page = spectatorPageHtml(gameSnapshot(status(fen = KNOWN_FEN), listOf(PlayedMove("e4", "e2e4")), 1L))

    @Test
    fun pageHasNoExternalReferences() {
        // A CDN reference on a LAN with no internet renders a blank board rather than degrading.
        listOf("http://", "https://", "//cdn", "<script src", "<link href").forEach {
            assertFalse(page.contains(it), "page references $it")
        }
    }

    @Test
    fun pagePollsStatusEndpoint() {
        assertTrue(page.contains("/api/status"))
        assertTrue(page.contains("setInterval"))
    }

    @Test
    fun pageRendersAKnownPositionWithoutARoundTrip() {
        assertTrue(page.contains(KNOWN_FEN), "the first paint must not need a request")
        assertTrue(page.contains("\"e4\""))
        assertTrue(page.contains("\"e2e4\""))
    }

    @Test
    fun theEmbeddedSnapshotCannotCloseTheScriptBlock() {
        val hostile = spectatorPageHtml(GameSnapshot(sanHistory = listOf("</script><b>")))
        assertFalse(hostile.contains("</script><b>"))
        assertTrue(hostile.contains("<\\/script>"))
    }

    private companion object {
        const val KNOWN_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    }
}
