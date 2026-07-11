package com.chesslab.tracker.service

import com.chesslab.engine.Game
import com.chesslab.engine.STARTPOS
import com.chesslab.engine.TrackerEngine
import com.chesslab.engine.api.AlarmState
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.DebugImages
import com.chesslab.engine.api.Decision
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.OccupancySafeguard
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.engine.api.VerifyVerdict
import com.chesslab.tracker.ui.AlarmUi
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
        get() = synchronized(this) { engine.safeguard }
        set(value) {
            synchronized(this) { engine.safeguard = value }
        }

    /** Feed one warped, white-POV, CLAHE-processed board frame. */
    @Synchronized
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

    /**
     * Phase 05 wiring: feed a safeguard verdict back to the engine. Commit/reject
     * events queued by the engine surface on the next [onFrame].
     */
    @Synchronized
    fun onVerifyVerdict(verdict: VerifyVerdict) {
        engine.onVerifyVerdict(verdict)
        publish(_uiState.value.announcement)
    }

    /** Phase 05 wiring: commit a CNN-recovery move sequence anchored on the observed frame. */
    @Synchronized
    fun applyRecovery(
        ucis: List<String>,
        fenBefore: String,
        gray: GrayImage,
        bgr: BgrImage?,
        resolvesAlarm: Boolean = false,
    ): Boolean {
        val ok = engine.applyRecoveredMoves(ucis, fenBefore, gray, bgr, resolvesAlarm)
        if (ok) publish(_uiState.value.announcement)
        return ok
    }

    /** Frame seq of the newest processed frame — tags safeguard observations (Spec 11). */
    val frameSeq: Int get() = synchronized(this) { engine.frameSeq }

    /** Pixel-exact current/reference and frame-to-frame deltas for Android debug views. */
    val debugImages: DebugImages get() = synchronized(this) { engine.debugImages }

    /** Conflict squares of the active illegal-move alarm, or null when not alarmed. */
    val alarmConflicts: List<String>? get() = synchronized(this) { engine.status.alarm?.conflicts }

    /** Safeguard desync counting rang the referee alarm — block all commits in the engine. */
    @Synchronized
    fun raiseAlarm(
        conflicts: List<String>,
        guessUci: String?,
    ) {
        engine.raiseAlarm(AlarmState(conflicts, guessUci))
        publish(_uiState.value.announcement)
    }

    /** Whole-board match while alarmed = take-back detected — clear the alarm. */
    @Synchronized
    fun clearAlarm() {
        engine.clearAlarm()
        publish(_uiState.value.announcement)
    }

    /** Occluded-dominant squares of a fresh observation feed the engine's taint latch. */
    @Synchronized
    fun reportOccluded(
        squares: Set<String>,
        ageS: Double = 0.0,
    ) {
        engine.reportObservation(squares, ageS)
    }

    /** Phase 05 wiring: CNN found the stuck board unchanged — pull the reference forward. */
    @Synchronized
    fun pullReferenceForward(
        fenBefore: String,
        gray: GrayImage,
        bgr: BgrImage?,
    ): Boolean {
        val ok = engine.resyncReference(fenBefore, gray, bgr)
        if (ok) publish(_uiState.value.announcement)
        return ok
    }

    /** Undo the last committed move (queues a hard-negative feedback record). */
    @Synchronized
    fun undo(): Boolean {
        val ok = engine.undo()
        if (ok && decisions.isNotEmpty()) decisions.removeAt(decisions.lastIndex)
        publish(_uiState.value.announcement)
        return ok
    }

    /** Reset the position (default: start position) and re-arm reference capture. */
    @Synchronized
    fun reset(fen: String = STARTPOS) {
        engine.reset(fen)
        decisions.clear()
        publish(null)
    }

    /** Re-capture the reference from the current board WITHOUT changing the game/position. */
    @Synchronized
    fun renewBaseline() {
        engine.renewBaseline()
        publish(_uiState.value.announcement)
    }

    /** Resolve a pending promotion with the chosen piece ("Q"/"R"/"B"/"N"). */
    @Synchronized
    fun forcePromote(piece: String): Boolean {
        val ok = engine.forcePromote(piece)
        publish(_uiState.value.announcement)
        return ok
    }

    /** Apply former constructor parameters in place; the Android engine supports live updates. */
    @Synchronized
    fun reconfigure(newConfig: TrackerConfig) {
        engine.updateConfig(newConfig)
        config = newConfig
        publish(_uiState.value.announcement)
    }

    /**
     * Apply a live-tunable [newConfig] without replacing the engine. FEN, move stack,
     * history, reference, learned noise, pending state, and provenance stay intact.
     */
    @Synchronized
    fun applyConfig(newConfig: TrackerConfig) {
        engine.updateConfig(newConfig)
        config = newConfig
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
                alarm = status.alarm?.let { AlarmUi(alarmDetail(status.fen, it)) },
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

private const val UCI_LEN = 4
private const val SHOWN_CONFLICTS = 4

/**
 * Human-readable description of the suspected illegal move (ports
 * `_build_alarm_guess_san`), falling back to the conflict-square list.
 */
internal fun alarmDetail(
    fen: String,
    alarm: AlarmState,
): String {
    val guessText = alarm.guessUci?.takeIf { it.length >= UCI_LEN }?.let { guessDetail(fen, it) }
    if (guessText != null) return guessText
    val shown = alarm.conflicts.take(SHOWN_CONFLICTS).joinToString(", ")
    return if (alarm.conflicts.size > SHOWN_CONFLICTS) "$shown…" else shown
}

private fun guessDetail(
    fen: String,
    guess: String,
): String {
    val from = guess.substring(0, 2)
    val to = guess.substring(2, UCI_LEN)
    val piece =
        runCatching { Game(fen).pieceCharAt(from) }.getOrNull()
            ?: return "$from->$to"
    val castleAttempt = piece.uppercaseChar() == 'K' && kotlin.math.abs(from[0] - to[0]) == 2
    val rights = fen.split(" ").getOrNull(2).orEmpty()
    val hasRights =
        if (piece.isUpperCase()) rights.any { it == 'K' || it == 'Q' } else rights.any { it == 'k' || it == 'q' }
    val reason = if (castleAttempt && !hasRights) "castling not available" else "illegal move suspected"
    return "${piece.uppercaseChar()} $from->$to ($reason)"
}
