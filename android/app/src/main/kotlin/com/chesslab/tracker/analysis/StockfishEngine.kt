package com.chesslab.tracker.analysis

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.IOException

/**
 * [AnalysisEngine] backed by a Stockfish process speaking UCI over stdin/stdout.
 *
 * The Stockfish binary is built from source via the NDK (see
 * `app/src/main/cpp/CMakeLists.txt`) and packaged as `libstockfish.so` — an
 * executable in shared-library clothing so the APK carries it into
 * `ApplicationInfo.nativeLibraryDir`, the one location an app may exec from on
 * API 29+. Callers construct this with
 * `"${'$'}{context.applicationInfo.nativeLibraryDir}/libstockfish.so"`.
 *
 * The class itself is pure JVM (java.lang.Process + coroutines): Android-free and
 * fakeable via [processFactory]. All engine I/O is serialized by a [Mutex] — UCI
 * is a strictly sequential protocol.
 *
 * @param enginePath absolute path of the Stockfish executable.
 * @param processFactory creates the engine process; injectable for tests.
 */
class StockfishEngine(
    private val enginePath: String,
    private val processFactory: (String) -> Process = { path ->
        ProcessBuilder(path).redirectErrorStream(true).start()
    },
) : AnalysisEngine {
    private val mutex = Mutex()
    private var process: Process? = null
    private var writer: BufferedWriter? = null
    private var reader: BufferedReader? = null

    override suspend fun analyze(
        fen: String,
        depth: Int,
    ): PositionAnalysis =
        mutex.withLock {
            withContext(Dispatchers.IO) { analyzeLocked(fen, depth) }
        }

    override suspend fun analyzeGame(
        fens: List<String>,
        depth: Int,
    ): List<PositionAnalysis> =
        mutex.withLock {
            withContext(Dispatchers.IO) { fens.map { analyzeLocked(it, depth) } }
        }

    override fun close() {
        val p = process ?: return
        process = null
        runCatching {
            writer?.apply {
                write("quit")
                newLine()
                flush()
            }
        }
        runCatching { p.waitFor(QUIT_GRACE_MS, java.util.concurrent.TimeUnit.MILLISECONDS) }
        p.destroyForcibly()
        writer = null
        reader = null
    }

    /** Runs one `position fen …` / `go depth …` cycle. Caller holds [mutex]. */
    private fun analyzeLocked(
        fen: String,
        depth: Int,
    ): PositionAnalysis {
        ensureStarted()
        send("position fen $fen")
        send("go depth $depth")

        var lastScored: UciParser.Info? = null
        var bestUci: String? = null
        while (true) {
            val line = readLineOrThrow()
            val info = UciParser.parseInfo(line)
            if (info?.eval != null) lastScored = info
            if (UciParser.isBestMoveLine(line)) {
                bestUci = UciParser.parseBestMove(line)
                break
            }
        }
        return PositionAnalysis(
            fen = fen,
            eval = lastScored?.eval ?: Eval(cp = null, mateIn = null),
            bestUci = bestUci,
            pv = lastScored?.pv.orEmpty(),
            depth = lastScored?.depth ?: 0,
        )
    }

    /** Starts the process and performs the `uci` / `isready` handshake once. */
    private fun ensureStarted() {
        if (process?.isAlive == true) return
        val p = processFactory(enginePath)
        process = p
        writer = p.outputStream.bufferedWriter()
        reader = p.inputStream.bufferedReader()

        send("uci")
        readUntil("uciok")
        send("setoption name Threads value $ENGINE_THREADS")
        send("isready")
        readUntil("readyok")
    }

    private fun send(command: String) {
        val w = writer ?: throw IOException("Stockfish process not started")
        w.write(command)
        w.newLine()
        w.flush()
    }

    private fun readUntil(marker: String) {
        while (true) {
            if (readLineOrThrow().trim() == marker) return
        }
    }

    private fun readLineOrThrow(): String = reader?.readLine() ?: throw IOException("Stockfish process terminated unexpectedly")

    private companion object {
        /** Modest parallelism: analysis is a background task on a phone. */
        const val ENGINE_THREADS = 2

        /** How long to wait for a clean `quit` before force-killing. */
        const val QUIT_GRACE_MS = 500L
    }
}
