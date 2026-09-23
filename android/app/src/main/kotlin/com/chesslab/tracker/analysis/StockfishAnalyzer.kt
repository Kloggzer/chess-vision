package com.chesslab.tracker.analysis

import android.os.Process
import android.util.Log
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import kotlin.math.round

/** Idle poll between FEN checks — `analysis.py`'s `time.sleep(0.2)`. */
private const val POLL_MS = 200L

/** Cool-off after a failed analysis, before the engine is relaunched — `time.sleep(0.5)`. */
private const val RETRY_MS = 500L

private const val WIN_MATING = 100.0
private const val WIN_MATED = 0.0
private const val WIN_ROUNDING = 10.0

private const val TAG = "chesslab.analysis"

/** The analysis thread's name — asserted by the test that it is not the analyzer/observer thread. */
const val ANALYSIS_THREAD_NAME = "chesslab-analysis"

/** Verbatim from `analysis.py`'s `StockfishAnalyzer.__init__` — and the ceiling, whatever the SoC has. */
data class AnalysisOptions(
    val multiPv: Int = 3,
    val movetimeMs: Long = 400,
    val threads: Int = 2,
    val hashMb: Int = 64,
)

data class AnalysisLine(
    val uci: String?,
    val san: String?,
    val cp: Int?,
    val mate: Int?,
)

/** [cp], [mate] and every line's score are WHITE's point of view; [winWhite] is 0..100. */
data class AnalysisResult(
    val fen: String,
    val gameOver: Boolean,
    val cp: Int?,
    val mate: Int?,
    val winWhite: Double?,
    val lines: List<AnalysisLine>,
    val depth: Int,
)

sealed interface AnalysisState {
    /** Not analysing: the setting is off or the gate suspended it. The last result stays, greyed. */
    data object Stopped : AnalysisState

    data object Running : AnalysisState

    /** No engine binary for this ABI. The feature disappears and is never retried this process. */
    data object Unavailable : AnalysisState
}

/**
 * A single persistent engine on one background coroutine that polls [fenProvider] and re-analyses
 * whenever the position changes — the shape of `analysis.py`, not a request/response call per move.
 *
 * It is deliberately subordinate to tracking: its own single thread at
 * [Process.THREAD_PRIORITY_LOWEST], two engine threads, a hard `movetime` cap, and no path that
 * touches game state. If the binary is missing the whole feature self-disables instead of erroring.
 */
class StockfishAnalyzer(
    private val fenProvider: () -> String?,
    private val engines: EngineService,
    private val options: () -> AnalysisOptions = { AnalysisOptions() },
    private val dispatcher: CoroutineDispatcher = analysisDispatcher(),
    private val lowerPriority: () -> Unit = { Process.setThreadPriority(Process.THREAD_PRIORITY_LOWEST) },
    private val warn: (String) -> Unit = { Log.w(TAG, it) },
) {
    private val stateFlow = MutableStateFlow<AnalysisState>(AnalysisState.Stopped)
    val state: StateFlow<AnalysisState> = stateFlow.asStateFlow()

    private val resultFlow = MutableStateFlow<AnalysisResult?>(null)
    val result: StateFlow<AnalysisResult?> = resultFlow.asStateFlow()

    private var job: Job? = null

    fun start(scope: CoroutineScope) {
        if (job != null || stateFlow.value == AnalysisState.Unavailable) return
        stateFlow.value = AnalysisState.Running
        job = scope.launch(dispatcher) { loop() }
    }

    /** Cancels the loop; its lease is returned by the loop's own `use`, on its thread. */
    fun stop() {
        job?.cancel()
        job = null
        if (stateFlow.value == AnalysisState.Running) stateFlow.value = AnalysisState.Stopped
    }

    private suspend fun loop() {
        lowerPriority()
        var lastFen: String? = null
        val profile = options().let { EngineProfile(it.threads, it.hashMb) }
        engines.lease(EngineLane.LIVE, profile).use { lease ->
            while (currentCoroutineContext().isActive) {
                val fen = runCatching { fenProvider() }.getOrNull()
                if (fen.isNullOrBlank() || fen == lastFen) {
                    delay(POLL_MS)
                    continue
                }
                val analysed = runCatching { analyse(lease, fen) }
                analysed.getOrNull()?.let {
                    resultFlow.value = it
                    lastFen = fen
                }
                analysed.exceptionOrNull()?.let { recover(it) }
                if (stateFlow.value == AnalysisState.Unavailable) return
                if (analysed.isSuccess && analysed.getOrNull() == null) delay(POLL_MS)
            }
        }
    }

    /** One bad analysis must not kill the loop; the service already dropped the wedged process. */
    private suspend fun recover(cause: Throwable) {
        warn("stockfish analysis failed: $cause")
        delay(RETRY_MS)
    }

    /** `null` when the gate refused the search or no binary shipped — never a fake score. */
    private fun analyse(
        lease: EngineLease,
        fen: String,
    ): AnalysisResult? {
        // A fresh board per FEN — never a shared mutable one (`analysis.py`: "no shared mutation").
        val board = Board().apply { loadFromFen(fen) }
        val whiteToMove = board.sideToMove == Side.WHITE
        if (board.isMated || board.isStaleMate || board.isDraw) return gameOverResult(fen)
        val settings = options()
        val raw =
            when (val search = lease.search(fen, settings.movetimeMs, settings.multiPv)) {
                is EngineSearch.Found -> search.lines
                EngineSearch.Blocked -> return null
                EngineSearch.Unavailable -> {
                    stateFlow.value = AnalysisState.Unavailable
                    warn("stockfish unavailable: no binary for this ABI")
                    return null
                }
            }
        val lines =
            raw
                .map { it.toWhitePov(whiteToMove) }
                .map { AnalysisLine(uci = it.uci, san = it.uci?.let { uci -> sanOf(fen, uci) }, cp = it.cp, mate = it.mate) }
        val best = lines.firstOrNull()
        return AnalysisResult(
            fen = fen,
            gameOver = false,
            cp = best?.cp,
            mate = best?.mate,
            winWhite = winWhite(best),
            lines = lines,
            depth = raw.firstOrNull()?.depth ?: 0,
        )
    }
}

/** A finished game has no score at all — the bar clears rather than freezing on the last eval. */
private fun gameOverResult(fen: String) =
    AnalysisResult(fen, gameOver = true, cp = null, mate = null, winWhite = null, lines = emptyList(), depth = 0)

/** `null` heisst NICHT gemessen: eine Suche ohne `info`-Zeile hat nichts gesagt, und `lastFen`
 *  wiederholt die Stellung nie — 50,0 stuende dann bis zum naechsten Zug als Messwert da. */
private fun winWhite(best: AnalysisLine?): Double? {
    val mate = best?.mate
    val cp = best?.cp
    val win =
        when {
            mate != null -> if (mate > 0) WIN_MATING else WIN_MATED
            cp != null -> winChanceWhite(cp)
            else -> return null
        }
    return round(win * WIN_ROUNDING) / WIN_ROUNDING
}

/**
 * Analysis' OWN single thread, distinct from the camera analyzer executor, the frame pipeline and
 * the ONNX observer: the 15 fps tracking budget outranks the eval bar entirely.
 */
fun analysisDispatcher(): CoroutineDispatcher =
    Executors
        .newSingleThreadExecutor { runnable -> Thread(runnable, ANALYSIS_THREAD_NAME).apply { isDaemon = true } }
        .asCoroutineDispatcher()
