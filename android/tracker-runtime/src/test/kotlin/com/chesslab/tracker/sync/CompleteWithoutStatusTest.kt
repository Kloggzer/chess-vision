package com.chesslab.tracker.sync

import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress

/**
 * `complete` is the one call in [HttpIngestClient] that invents a field instead of throwing — and
 * `landed` is the status `sweepSentRecordings` deletes the phone's only copy on.
 */
class CompleteWithoutStatusTest {
    @Test
    fun `a seal answer without a status is refused, not read as landed`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            val body = """{"ok":true}""".toByteArray()
            exchange.sendResponseHeaders(200, body.size.toLong())
            exchange.responseBody.use { it.write(body) }
        }
        server.start()
        try {
            val base = "http://127.0.0.1:${server.address.port}"
            // Wirft wie `declare` und `putChunk`: wer den Status nicht nennt, hat ihn nicht
            // gesagt — und `landed` ist der eine, auf den der Aufraeumer loescht.
            assertThrows(IllegalStateException::class.java) {
                HttpIngestClient("token").complete(base, "20260916-120000")
            }
        } finally {
            server.stop(0)
        }
    }
}
