package com.chesslab.tracker.spectate

import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.ui.MoveEntry
import com.chesslab.tracker.ui.UiState
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URI
import java.util.stream.Collectors
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class SpectatorServerTest {
    private lateinit var server: SpectatorServer
    private var port = 0

    @BeforeEach
    fun setUp() {
        port = ServerSocket(0).use { it.localPort }
        server = SpectatorServer(port = port)
        server.start()
    }

    @AfterEach
    fun tearDown() {
        server.stop()
    }

    @Test
    fun `root route returns HTML page`() {
        val response = httpGet("http://127.0.0.1:$port/")
        assertEquals(200, response.statusCode)
        assertTrue(
            response.contentType.contains("text/html", ignoreCase = true),
            "Expected text/html content-type, got: ${response.contentType}",
        )
        assertContains(response.body, "Chesslab Spectator")
        assertContains(response.body, "<svg")
        assertContains(response.body, "/api/status")
        assertDoesNotContainExternalUrls(response.body)
    }

    @Test
    fun `status endpoint returns JSON with default FEN`() {
        val response = httpGet("http://127.0.0.1:$port/api/status")
        assertEquals(200, response.statusCode)
        assertTrue(response.contentType.contains("json", ignoreCase = true), "Expected json content-type, got: ${response.contentType}")

        val snapshot = Json.decodeFromString<GameSnapshot>(response.body)
        assertEquals("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", snapshot.fen)
        assertTrue(snapshot.sanHistory.isEmpty())
        assertEquals("waiting", snapshot.status)
    }

    @Test
    fun `status reflects published UiState`() {
        val state =
            UiState(
                fen = "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
                trackerState = TrackerState.TRACKING,
                moves = listOf(MoveEntry("e4", null)),
                lastMoveSan = "e4",
            )
        server.onState(state)

        val response = httpGet("http://127.0.0.1:$port/api/status")
        assertEquals(200, response.statusCode)
        val snapshot = Json.decodeFromString<GameSnapshot>(response.body)
        assertEquals("4k3/8/8/8/8/8/8/4K3 w - - 0 1", snapshot.fen)
        assertContains(snapshot.sanHistory, "e4")
    }

    @Test
    fun `game over status reflected in snapshot`() {
        val state =
            UiState(
                fen = "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
                trackerState = TrackerState.TRACKING,
                gameOver = true,
                note = "1-0",
                moves = listOf(),
            )
        server.onState(state)

        val response = httpGet("http://127.0.0.1:$port/api/status")
        assertEquals(200, response.statusCode)
        val snapshot = Json.decodeFromString<GameSnapshot>(response.body)
        assertEquals("over", snapshot.status)
        assertNotNull(snapshot.result)
    }

    @Test
    fun `only GET routes, POST PUT DELETE return 405`() {
        // POST
        var conn = methodRequest("http://127.0.0.1:$port/api/status", "POST")
        assertEquals(405, conn.responseCode)

        // PUT
        conn = methodRequest("http://127.0.0.1:$port/api/status", "PUT")
        assertEquals(405, conn.responseCode)

        // DELETE
        conn = methodRequest("http://127.0.0.1:$port/api/status", "DELETE")
        assertEquals(405, conn.responseCode)
    }

    @Test
    fun `url StateFlow populated after start`() {
        val url = server.url.value
        assertNotNull(url)
        assertContains(url!!, "http://")
        assertContains(url, port.toString())
    }

    // -- HTTP helpers -------------------------------------------------------

    private data class HttpResponse(
        val statusCode: Int,
        val headers: Map<String, String>,
        val body: String,
    ) {
        /** Case-insensitive content-type from headers. */
        val contentType: String
            get() = headers.entries.firstOrNull { (k, _) -> k.equals("Content-Type", ignoreCase = true) }?.value ?: ""
    }

    private fun httpGet(url: String): HttpResponse {
        val conn = URI(url).toURL().openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 5000
        conn.readTimeout = 5000
        return readResponse(conn)
    }

    private fun methodRequest(
        url: String,
        method: String,
    ): HttpURLConnection {
        val conn = URI(url).toURL().openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = 5000
        conn.readTimeout = 5000
        conn.doOutput = false
        conn.connect()
        return conn
    }

    private fun readResponse(conn: HttpURLConnection): HttpResponse {
        val statusCode = conn.responseCode
        val headers =
            conn.headerFields
                .filterKeys { it != null }
                .mapValues { (_, v) -> v.joinToString(", ") }
        val stream =
            if (statusCode in 200..299) {
                conn.inputStream
            } else {
                conn.errorStream
            }
        val body =
            when (stream) {
                null -> ""
                else -> BufferedReader(InputStreamReader(stream)).lines().collect(Collectors.joining("\n"))
            }
        conn.disconnect()
        return HttpResponse(statusCode, headers, body)
    }

    private fun assertDoesNotContainExternalUrls(html: String) {
        // Allow namespace URIs (w3.org), localhost, and loopback; ban CDN/asset URLs
        val externalUrl = Regex("""https?://(?!127\.0\.0\.1|localhost|0\.0\.0\.0|www\.w3\.org)""")
        val matches = externalUrl.findAll(html).toList()
        assertTrue(matches.isEmpty(), "Found external URLs: ${matches.joinToString(", ") { it.value }}")
    }
}
