package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.engine.api.fenFullmove
import com.chesslab.engine.api.fenWhiteToMove

/** A PURE function without any Compose type, so what is easy to get silently wrong — which state, whether
 *  the board is tinted, which text wins the one line — is unit-testable. */
enum class StateTone { Idle, Busy, Active, Alarm }

enum class Turn { WHITE, BLACK }

/** A fact, not words: an English sentence here was a second place the wording lived. `waiting`, `moving`
 *  and `move` collapse into [LIVE] — too brief to tell apart; [StateTone] still separates them. */

enum class TrackerLabel {
    LIVE,
    HAND_OVER_BOARD,

    NO_DETECTION,
    POSITION_LOST,
    CAMERA_OFF,
    NOT_TRACKING,
}

/** Merging them hides invariant 2: shadow keeps z, occlusion zeroes it. */
data class OverlayLayers(
    val changed: Set<String> = emptySet(),
    val shadowVetoed: Set<String> = emptySet(),
    val occlusionVetoed: Set<String> = emptySet(),
    val cnnConflicts: Set<String> = emptySet(),
    /** Before the thresholds decide. */
    val z: Map<String, Double> = emptyMap(),
)

data class AlarmUi(
    val kind: String,
    val conflicts: List<String>,
    val guessSan: String?,
)

/** The engine is blocked on this answer. */
data class PromotionPrompt(
    val from: String,
    val to: String,
)

/** Closes on a commit for the SAME from->to: the engine can resolve a promotion itself (recovery), and an
 *  open dialog would then block the screen on a question nobody asks. */
fun promotionAfter(
    current: PromotionPrompt?,
    event: TrackerEvent,
): PromotionPrompt? =
    when (event) {
        is TrackerEvent.PromotionPending -> PromotionPrompt(event.from, event.to)
        is TrackerEvent.MoveCommitted -> if (closesPromotion(current, listOf(event.uci))) null else current
        is TrackerEvent.SequenceCommitted -> if (closesPromotion(current, event.ucis)) null else current
        else -> current
    }

private fun closesPromotion(
    current: PromotionPrompt?,
    ucis: List<String>,
): Boolean {
    val prompt = current ?: return false
    return ucis.any { it.startsWith("${prompt.from}${prompt.to}") }
}

/** What the screen is FOR right now, and so its one filled button. [WATCH] has none: watching is not an
 *  act. While alarmed, the alarm card owns the filled button. */
enum class TrackerTask {
    START,

    RESUME_CAMERA,

    CALIBRATE,

    WATCH,
}

data class TrackingUiState(
    val fen: String,
    val state: TrackerLabel,
    val tone: StateTone,
    /** Null when the FEN cannot be read. */
    val turn: Turn?,
    val moveNumber: Int?,
    val infoLine: String?,
    val alarm: AlarmUi?,
    val overlay: OverlayLayers,
    val corners: FloatArray? = null,
    val task: TrackerTask = TrackerTask.WATCH,
    /** False is the other layout — the one whose job is to make the camera work — not an error. */
    val ready: Boolean = true,
) {
    val boardTinted: Boolean get() = alarm != null
}

internal const val STATE_WAITING = "waiting"
internal const val STATE_MOVING = "moving"
internal const val STATE_OCCLUDED = "occluded"
internal const val STATE_MOVE = "move"

private const val STOPPED_INFO = "No frames are arriving — the camera is released. Resume to continue; the game is kept."

private const val OFF_INFO = "No camera is running. Start tracking to detect moves — Games and Review need none."

/** Ranked: no tracker outranks a released camera, which outranks the engine. A released camera stops the
 *  status, so the last sample would otherwise report a running game over a dead feed. */
private enum class Feed { OFF, PAUSED, LIVE }

fun trackingUiState(
    status: TrackerStatus,
    cameraOn: Boolean = true,
    tracking: Boolean = true,
): TrackingUiState {
    val alarm =
        status.alarm?.let { AlarmUi(kind = it.kind, conflicts = it.conflicts, guessSan = it.guessSan) }
    val feed =
        when {
            !tracking -> Feed.OFF
            !cameraOn -> Feed.PAUSED
            else -> Feed.LIVE
        }
    return TrackingUiState(
        fen = status.fen,
        state = label(feed, alarm, status),
        tone = tone(feed, alarm, status),
        turn = turnOf(status.fen),
        moveNumber = fenFullmove(status.fen),
        infoLine =
            when (feed) {
                Feed.LIVE -> infoLine(status)
                Feed.PAUSED -> STOPPED_INFO
                Feed.OFF -> OFF_INFO
            },
        alarm = alarm,
        overlay =
            OverlayLayers(
                changed = status.changed,
                shadowVetoed = status.shadowVetoed,
                occlusionVetoed = status.occlusionVetoed,
                cnnConflicts = status.cnnConflicts,
                z = status.z,
            ),
        corners = status.corners,
        task = task(feed, status),
        // Corners without frames: the board holds its last position but nothing is live — the other layout.
        ready = task(feed, status) == TrackerTask.WATCH && status.cameraFps > 0.0,
    )
}

/** The same ranking as the header; every rung above [TrackerTask.WATCH] has one act, the filled button. */
private fun task(
    feed: Feed,
    status: TrackerStatus,
): TrackerTask =
    when {
        feed == Feed.OFF -> TrackerTask.START
        feed == Feed.PAUSED -> TrackerTask.RESUME_CAMERA
        status.corners == null -> TrackerTask.CALIBRATE
        else -> TrackerTask.WATCH
    }

/** While alarmed every commit is blocked, so "moving" would lie. [TrackerLabel.NO_DETECTION]: frames arrive
 *  and the engine does not tick — an uncalibrated board once read "Live". An unknown state maps to LIVE: no
 *  engine identifier is printed at a user. */
private fun label(
    feed: Feed,
    alarm: AlarmUi?,
    status: TrackerStatus,
): TrackerLabel =
    when {
        feed == Feed.OFF -> TrackerLabel.NOT_TRACKING
        feed == Feed.PAUSED -> TrackerLabel.CAMERA_OFF
        alarm != null -> TrackerLabel.POSITION_LOST
        status.state == STATE_OCCLUDED -> TrackerLabel.HAND_OVER_BOARD
        status.fps <= 0.0 -> TrackerLabel.NO_DETECTION
        else -> TrackerLabel.LIVE
    }

private fun tone(
    feed: Feed,
    alarm: AlarmUi?,
    status: TrackerStatus,
): StateTone =
    when {
        feed != Feed.LIVE -> StateTone.Idle
        alarm != null -> StateTone.Alarm
        status.fps <= 0.0 -> StateTone.Busy
        else -> stateTone(status.state)
    }

private fun stateTone(state: String): StateTone =
    when (state) {
        STATE_MOVING, STATE_OCCLUDED -> StateTone.Busy
        STATE_MOVE -> StateTone.Active
        else -> StateTone.Idle
    }

/** Already ranked by `StatusPublisher.resolveNote`; a second ranking here once hid the alarm. */
private fun infoLine(status: TrackerStatus): String? = status.note

/** Split, not parsed: a short FEN yields nulls, and the screen shows neither half rather than a wrong one. */
private fun turnOf(fen: String): Turn? =
    when (fenWhiteToMove(fen)) {
        true -> Turn.WHITE
        false -> Turn.BLACK
        null -> null
    }
