package com.chesslab.tracker.ui.debug

import androidx.compose.ui.graphics.ImageBitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.service.DebugPayloadAssembler
import com.chesslab.tracker.service.DebugState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** 2 Hz. The crops arrive at observer rate anyway; decoding 64 bitmaps faster buys nothing. */
private const val CROP_REFRESH_MS = 500L

enum class DebugTab { TIMINGS, EVIDENCE, CROPS, READS, DECISIONS, CNN }

/**
 * Drives the debug screen and — this is the part that matters — owns the debug **gate**.
 *
 * Arming happens in [attach] and disarming in [onCleared]: while this screen is not composed the
 * engine assembles no payload, the crop tap retains nothing, and the tracker's per-frame cost is
 * bit-for-bit what it was before this phase existed.
 */
class DebugViewModel : ViewModel() {
    private var session: DebugSession = NoDebugSession
    private val jobs = mutableListOf<Job>()
    private val assembler = DebugPayloadAssembler()

    private val stateFlow = MutableStateFlow<DebugState?>(null)
    val state: StateFlow<DebugState?> = stateFlow.asStateFlow()

    private val cnnFlow = MutableStateFlow<CnnState>(CnnState.Off)
    val cnn: StateFlow<CnnState> = cnnFlow.asStateFlow()

    private val runtimeFlow = MutableStateFlow(NO_RUNTIME)
    val runtime: StateFlow<CnnRuntimeInfo> = runtimeFlow.asStateFlow()

    private val cropsFlow = MutableStateFlow<List<CropTile>>(emptyList())
    val crops: StateFlow<List<CropTile>> = cropsFlow.asStateFlow()

    private val tabFlow = MutableStateFlow(DebugTab.TIMINGS)
    val tab: StateFlow<DebugTab> = tabFlow.asStateFlow()

    private val ascendingFlow = MutableStateFlow(false)
    val readsAscending: StateFlow<Boolean> = ascendingFlow.asStateFlow()

    private val workProfilingFlow = MutableStateFlow(false)
    val workProfiling: StateFlow<Boolean> = workProfilingFlow.asStateFlow()

    private val workProfilingAvailableFlow = MutableStateFlow(false)
    val workProfilingAvailable: StateFlow<Boolean> = workProfilingAvailableFlow.asStateFlow()

    /** 07a's persisted switch: keeps the payload armed after the screen closes. */
    private val pinned: Boolean get() = session.debugPinned.value

    val config: TrackerConfig get() = session.config.value

    private var decoded = NO_OBSERVATION

    fun attach(session: DebugSession) {
        if (this.session === session) return
        detach()
        this.session = session
        workProfilingAvailableFlow.value = session.workProfilingAvailable
        session.setDebugEnabled(true)
        jobs += session.status.onEach { stateFlow.value = assembler.assemble(it) }.launchIn(viewModelScope)
        jobs += session.cnnState.onEach { cnnFlow.value = it }.launchIn(viewModelScope)
        jobs += session.workProfilingEnabled.onEach { workProfilingFlow.value = it }.launchIn(viewModelScope)
        jobs += viewModelScope.launch { pollCrops() }
    }

    fun onTabSelected(selected: DebugTab) {
        tabFlow.value = selected
        if (selected != DebugTab.CROPS) dropCrops()
    }

    fun onToggleReadOrder() {
        ascendingFlow.value = !ascendingFlow.value
    }

    fun onRetryCnnAttach() = session.retryCnnAttach()

    fun onWorkProfilingEnabled(on: Boolean) = session.setWorkProfilingEnabled(on)

    fun workProfileReport(): String? = session.workProfileReport()

    override fun onCleared() = detach()

    private fun detach() {
        jobs.forEach { it.cancel() }
        jobs.clear()
        dropCrops()
        assembler.reset()
        if (!pinned) session.setDebugEnabled(false)
    }

    /**
     * Kacheln und ihre Kennung gehen zusammen: bleibt `decoded` stehen, haelt die Schleife die
     * geleerte Liste fuer aktuell und der Reiter bleibt leer (`CropTabReturnTest`).
     */
    private fun dropCrops() {
        cropsFlow.value = emptyList()
        decoded = NO_OBSERVATION
    }

    /**
     * The crop grid is built ONLY while its tab is open, and never on the analyzer thread: the
     * source is the immutable crop list of a finished observation, and the decode runs on
     * [Dispatchers.Default].
     */
    private suspend fun pollCrops() {
        while (true) {
            runtimeFlow.value = session.cnnRuntime()
            if (tabFlow.value == DebugTab.CROPS) {
                val latest = session.latestCrops()
                if (latest != null && latest.seq != decoded) {
                    decoded = latest.seq
                    cropsFlow.value = withContext(Dispatchers.Default) { cropTiles(latest) }
                }
            }
            delay(CROP_REFRESH_MS)
        }
    }
}

/** One tile of the 64-crop grid; [square] is its `all_squares()` name. */
class CropTile(
    val square: String,
    val image: ImageBitmap,
)

private val NO_RUNTIME = CnnRuntimeInfo(null, null, null, null, null, null, 0.0, 0)

private const val NO_OBSERVATION = -1L
