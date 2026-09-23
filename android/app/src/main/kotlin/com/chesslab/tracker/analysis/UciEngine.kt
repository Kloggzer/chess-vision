package com.chesslab.tracker.analysis

import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.Closeable
import java.io.IOException
import java.util.concurrent.CancellationException
import java.util.concurrent.TimeUnit

private const val HANDSHAKE_TIMEOUT_MS = 5_000L

private const val ANALYSE_GRACE_MS = 5_000L

private const val QUIT_GRACE_MS = 500L

private const val READ_POLL_MS = 10L

private const val NS_PER_MS = 1_000_000L

/** Only [EngineService] holds one: it serialises every consumer under its lane lock. Every call blocks. */
class UciEngine(
    private val enginePath: String,
    private val processFactory: (String) -> Process = { ProcessBuilder(it).redirectErrorStream(true).start() },
) : Closeable {
    private var process: Process? = null
    private var writer: BufferedWriter? = null
    private var reader: BufferedReader? = null

    fun start(
        threads: Int,
        hashMb: Int,
    ) {
        val proc = processFactory(enginePath)
        process = proc
        writer = proc.outputStream.bufferedWriter()
        reader = proc.inputStream.bufferedReader()
        send("uci")
        readUntil("uciok")
        send("setoption name Threads value $threads")
        send("setoption name Hash value $hashMb")
        send("isready")
        readUntil("readyok")
    }

    /** [nodes] adds a node limit beside `movetime`; UCI stops at whichever comes first. The review wants the
     *  NODE bound, so a game grades the same on any device and temperature (`ReviewBudget`). */
    fun analyse(
        fen: String,
        movetimeMs: Long,
        multiPv: Int,
        nodes: Long? = null,
        cancelled: () -> Boolean = { false },
    ): List<PvLine> {
        send("setoption name MultiPV value $multiPv")
        send("position fen $fen")
        send("go movetime $movetimeMs" + (nodes?.let { " nodes $it" } ?: ""))
        val best = sortedMapOf<Int, PvLine>()
        val deadlineNs = System.nanoTime() + (movetimeMs + ANALYSE_GRACE_MS) * NS_PER_MS
        while (true) {
            val line = readLine(deadlineNs, cancelled)
            parseUciInfo(line)?.let { best[it.multiPv] = it.line }
            if (isBestMoveLine(line)) return best.values.toList()
        }
    }

    override fun close() {
        val proc = process ?: return
        process = null
        runCatching { send("quit") }
        runCatching { proc.waitFor(QUIT_GRACE_MS, TimeUnit.MILLISECONDS) }
        proc.destroyForcibly()
        writer = null
        reader = null
    }

    private fun send(command: String) {
        val out = writer ?: throw IOException("UCI engine not started")
        // Explicit "\n", never `newLine()`: UCI is line-based on LF and the platform separator
        // would send CRLF from a desktop JVM.
        out.write(command)
        out.write("\n")
        out.flush()
    }

    private fun readUntil(marker: String) {
        val deadlineNs = System.nanoTime() + HANDSHAKE_TIMEOUT_MS * NS_PER_MS
        while (readLine(deadlineNs).trim() != marker) Unit
    }

    /** Polls instead of blocking on `readLine`: a wedged engine must surface as an exception, not park the thread. */
    private fun readLine(
        deadlineNs: Long,
        cancelled: () -> Boolean = { false },
    ): String {
        while (System.nanoTime() < deadlineNs) {
            if (cancelled()) throw CancellationException("UCI search cancelled")
            val input = reader ?: fail("UCI engine not started")
            if (input.ready()) return input.readLine() ?: fail("UCI engine closed its output")
            if (process?.isAlive != true) fail("UCI engine terminated")
            Thread.sleep(READ_POLL_MS)
        }
        fail("UCI engine did not answer in time")
    }
}

private fun fail(message: String): Nothing = throw IOException(message)
