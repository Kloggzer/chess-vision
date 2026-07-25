package com.chesslab.tracker.analysis

import java.io.InputStream
import java.io.OutputStream

/**
 * A fake Stockfish: responses are produced synchronously while the command is written, so the whole
 * UCI exchange stays on one thread and every test is deterministic.
 *
 * The real binary cannot run on the host JVM, so this is the only way to exercise the protocol.
 */
class ScriptedEngineProcess(
    private val respond: (String) -> List<String>,
) : Process() {
    val commands = mutableListOf<String>()

    private val pending = ArrayDeque<Byte>()
    private var alive = true

    /** Kills the process the moment this command is written — the mid-analysis crash case. */
    var dieOn: String? = null

    private val input =
        object : InputStream() {
            override fun read(): Int = if (pending.isEmpty()) -1 else pending.removeFirst().toInt() and BYTE_MASK

            // Reading only what is available is essential: the default implementation would block
            // on read() past the end of the pending bytes.
            override fun read(
                bytes: ByteArray,
                off: Int,
                len: Int,
            ): Int {
                if (pending.isEmpty()) return -1
                val n = minOf(len, pending.size)
                repeat(n) { bytes[off + it] = pending.removeFirst() }
                return n
            }

            override fun available(): Int = pending.size
        }

    private val output =
        object : OutputStream() {
            private val line = StringBuilder()

            override fun write(b: Int) {
                if (b.toChar() == '\n') {
                    onCommand(line.toString())
                    line.setLength(0)
                } else {
                    line.append(b.toChar())
                }
            }
        }

    private fun onCommand(command: String) {
        commands += command
        if (command == dieOn) {
            alive = false
            return
        }
        if (!alive) return
        respond(command).forEach { reply -> "$reply\n".forEach { pending.addLast(it.code.toByte()) } }
    }

    override fun getOutputStream(): OutputStream = output

    override fun getInputStream(): InputStream = input

    override fun getErrorStream(): InputStream = InputStream.nullInputStream()

    override fun waitFor(): Int = 0

    override fun exitValue(): Int = 0

    override fun destroy() {
        alive = false
    }

    override fun isAlive(): Boolean = alive

    private companion object {
        const val BYTE_MASK = 0xFF
    }
}

/** The handshake plus one `go` answer; [infoLines] is what the search reports. */
fun engineScript(
    infoLines: List<String>,
    bestMove: String = "bestmove e2e4",
): (String) -> List<String> =
    { command ->
        when {
            command == "uci" -> listOf("id name Fake", "uciok")
            command == "isready" -> listOf("readyok")
            command.startsWith("go") -> infoLines + bestMove
            else -> emptyList()
        }
    }
