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

private const val POLL_MS = 200L

private const val RETRY_MS = 500L

private const val WIN_MATING = 100.0
private const val WIN_MATED = 0.0
private const val WIN_ROUNDING = 10.0

private const val TAG = "chesslab.analysis"

const val ANALYSIS_THREAD_NAME = "chesslab-analysis"

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
    data object Stopped : AnalysisState

    data object Running : AnalysisState

    /** No engine binary for this ABI. The feature disappears and is never retried this process. */
    data object Unavailable : AnalysisState
}

/** Polls [fenProvider] and re-analyses on change. Subordinate to tracking: own thread at
 *  [Process.THREAD_PRIORITY_LOWEST], two engine threads, a hard `movetime`, no path into game state. */
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

/** Its OWN thread, apart from the camera analyzer and the ONNX observer: the 15 fps budget outranks the bar. */
fun analysisDispatcher(): CoroutineDispatcher =
    Executors
        .newSingleThreadExecutor { runnable -> Thread(runnable, ANALYSIS_THREAD_NAME).apply { isDaemon = true } }
        .asCoroutineDispatcher()
