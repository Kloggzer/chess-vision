package com.chesslab.tracker.service

import com.chesslab.engine.STARTPOS
import com.chesslab.engine.TrackerEngine
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.Decision
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.OccupancySafeguard
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.ui.DebugSnapshot
import com.chesslab.tracker.ui.MoveAnnouncement
import com.chesslab.tracker.ui.MoveEntry
import com.chesslab.tracker.ui.PromotionRequest
import com.chesslab.tracker.ui.UiState
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Device-independent bridge between the pure [TrackerEngine] and the Compose
 * [UiState]. Owns the engine, feeds it pre-warped/pre-CLAHE frames via [onFrame],
 * reduces the emitted [TrackerEvent]s + [TrackerStatus] into [uiState], derives the
 * [uncertain] boolean (discrepancy #3: `lowMargin || stuck || pendingVerify` from
 * the real `TrackerEngine.uncertainty`), and re-emits engine events (feedback for
 * phase 07). No Android/OpenCV dependency — unit-testable with synthetic frames.
 */
class TrackerCoordinator(
    initialConfig: TrackerConfig = TrackerConfig(),
    private val engineFactory: (TrackerConfig) -> TrackerEngine = { TrackerEngine(it) },
) {
    private var engine = engineFactory(initialConfig)
    private var config = initialConfig

    private val decisions = mutableListOf<Decision?>()
    private var announcementId = 0L
    private var lastTsNs = 0L
    private var fpsEma = 0.0

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _uncertain = MutableStateFlow(false)

    /** Discrepancy #3 adapter: engine uncertainty collapsed to the camera's boolean seam. */
    val uncertain: StateFlow<Boolean> = _uncertain.asStateFlow()

    private val _events = MutableSharedFlow<TrackerEvent>(extraBufferCapacity = 16)

    /** Raw engine events (consumed by phase 07 recorder wiring). */
    val events: SharedFlow<TrackerEvent> = _events.asSharedFlow()

    /** Phase 05 plugs a CNN safeguard here; forwarded straight to the engine. */
    var safeguard: OccupancySafeguard?
        get() = engine.safeguard
        set(value) {
            engine.safeguard = value
        }

    /** Feed one warped, white-POV, CLAHE-processed board frame. */
    fun onFrame(
        gray: GrayImage,
        bgr: BgrImage,
        timestampNs: Long,
    ) {
        updateFps(timestampNs)
        val frameEvents = engine.onFrame(gray, bgr, timestampNs)
        var announcement: MoveAnnouncement? = _uiState.value.announcement
        for (event in frameEvents) {
            _events.tryEmit(event)
            if (event is TrackerEvent.MoveCommitted) {
                decisions.add(event.decision)
                announcement = announce(event.san)
            }
        }
        publish(announcement)
    }

    /** Undo the last committed move (queues a hard-negative feedback record). */
    fun undo(): Boolean {
        val ok = engine.undo()
        if (ok && decisions.isNotEmpty()) decisions.removeAt(decisions.lastIndex)
        publish(_uiState.value.announcement)
        return ok
    }

    /** Reset the position (default: start position) and re-arm reference capture. */
    fun reset(fen: String = STARTPOS) {
        engine.reset(fen)
        decisions.clear()
        publish(null)
    }

    /** Resolve a pending promotion with the chosen piece ("Q"/"R"/"B"/"N"). */
    fun forcePromote(piece: String): Boolean {
        val ok = engine.forcePromote(piece)
        publish(_uiState.value.announcement)
        return ok
    }

    /**
     * Rebuild the engine for a **constructor-param** change (`app.py:50` split);
     * live-tunable-only changes should use [applyConfig] instead. Re-arms the
     * reference (brief re-anchor) — see STATUS.md discrepancy resolution.
     */
    fun reconfigure(newConfig: TrackerConfig) {
        val hadSafeguard = engine.safeguard
        engine = engineFactory(newConfig)
        engine.safeguard = hadSafeguard
        config = newConfig
        decisions.clear()
        publish(null)
    }

    /**
     * Apply a live-tunable [newConfig]. The pure engine holds an immutable config,
     * so this rebuilds it too but preserves the game via FEN + SAN replay so slider
     * tweaks never drop the running game (STATUS.md discrepancy resolution).
     */
    fun applyConfig(newConfig: TrackerConfig) {
        val fen = engine.status.fen
        val hadSafeguard = engine.safeguard
        engine = engineFactory(newConfig)
        engine.safeguard = hadSafeguard
        engine.reset(fen)
        config = newConfig
        // History/provenance are kept; the board FEN is carried across the swap.
        publish(_uiState.value.announcement)
    }

    private fun announce(san: String): MoveAnnouncement = MoveAnnouncement(MoveSpeech.describe(san, decisions.size), ++announcementId)

    private fun updateFps(timestampNs: Long) {
        val prev = lastTsNs
        lastTsNs = timestampNs
        if (prev == 0L || timestampNs <= prev) return
        val instant = NS_PER_S / (timestampNs - prev)
        fpsEma = if (fpsEma == 0.0) instant else FPS_ALPHA * instant + (1 - FPS_ALPHA) * fpsEma
    }

    private fun publish(announcement: MoveAnnouncement?) {
        val status = engine.status
        _uncertain.value = engine.uncertainty.value.let { it.lowMargin || it.stuck || it.pendingVerify }
        _uiState.value =
            UiState(
                fen = status.fen,
                trackerState = status.state,
                moves = status.history.mapIndexed { i, san -> MoveEntry(san, decisions.getOrNull(i)) },
                lastMoveSan = status.history.lastOrNull(),
                note = status.note,
                inCheck = status.inCheck,
                gameOver = status.gameOver,
                promotion = status.promotionPending?.let { PromotionRequest(it.first, it.second) },
                announcement = announcement,
                debug = debugOf(status),
            )
    }

    private fun debugOf(status: TrackerStatus): DebugSnapshot =
        DebugSnapshot(
            fps = fpsEma,
            motion = status.motion,
            motionThr = config.motionThr,
            changed = status.changed,
            changedVals = status.changedVals,
            shadowVetoed = status.shadowVetoed,
            occludedVetoed = status.occludedVetoed,
            bestScore = status.bestScore,
            secondScore = status.secondScore,
            margin = status.margin,
            candidate = status.candidate,
            decider = status.lastMove,
            stuckReason = status.stuckReason,
            confirmCount = status.confirmCount,
        )

    private companion object {
        const val NS_PER_S = 1e9
        const val FPS_ALPHA = 0.2
    }
}
