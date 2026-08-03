package com.chesslab.tracker.analysis

import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.Closeable
import java.io.IOException
import java.util.concurrent.TimeUnit

/** How long the `uci`/`isready` handshake may take before the engine counts as wedged. */
private const val HANDSHAKE_TIMEOUT_MS = 5_000L

/** Slack on top of `movetime` before a search counts as wedged. */
private const val ANALYSE_GRACE_MS = 5_000L

private const val QUIT_GRACE_MS = 500L

private const val READ_POLL_MS = 10L

private const val NS_PER_MS = 1_000_000L

/**
 * A Stockfish process speaking UCI over stdin/stdout.
 *
 * Pure JVM (`java.lang.Process`), Android-free and fakeable through [processFactory] — the one
 * part of the legacy engine that was the right shape. Every call blocks: the analyzer runs it on
 * its own lowest-priority thread and nothing else may share this object.
 */
class UciEngine(
    private val enginePath: String,
    private val processFactory: (String) -> Process = { ProcessBuilder(it).redirectErrorStream(true).start() },
) : Closeable {
    private var process: Process? = null
    private var writer: BufferedWriter? = null
    private var reader: BufferedReader? = null

    /** Spawns the process and performs the handshake. Throws if the binary is missing or mute. */
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

    /**
     * One `go` cycle. Returns the last `info` seen per multipv slot, slot 1 first.
     *
     * [nodes] adds a node limit alongside the movetime, and UCI stops at whichever comes first. The
     * live eval bar wants the time bound and nothing else (it must never cost the tracker a frame);
     * the review pass wants the NODE bound, with time only as a safety valve, so that the same game
     * grades the same on any device and at any temperature. See `ReviewBudget`.
     */
    fun analyse(
        fen: String,
        movetimeMs: Long,
        multiPv: Int,
        nodes: Long? = null,
    ): List<PvLine> {
        send("setoption name MultiPV value $multiPv")
        send("position fen $fen")
        send("go movetime $movetimeMs" + (nodes?.let { " nodes $it" } ?: ""))
        val best = sortedMapOf<Int, PvLine>()
        val deadlineNs = System.nanoTime() + (movetimeMs + ANALYSE_GRACE_MS) * NS_PER_MS
        while (true) {
            val line = readLine(deadlineNs)
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

    /**
     * Polls instead of blocking on `readLine`: a wedged engine must surface as an exception the
     * analyzer can recover from, not as a thread parked forever holding the process.
     */
    private fun readLine(deadlineNs: Long): String {
        while (System.nanoTime() < deadlineNs) {
            val input = reader ?: fail("UCI engine not started")
            if (input.ready()) return input.readLine() ?: fail("UCI engine closed its output")
            if (process?.isAlive != true) fail("UCI engine terminated")
            Thread.sleep(READ_POLL_MS)
        }
        fail("UCI engine did not answer in time")
    }
}

private fun fail(message: String): Nothing = throw IOException(message)
