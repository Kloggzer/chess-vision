package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import java.util.Locale

/**
 * `TrackerStatus` -> what the screen shows, as a PURE function.
 *
 * The mapping lives outside the composables so the three things that are easy to get silently
 * wrong — which state the user is told about, whether the board is tinted, and which of the two
 * text channels wins the one line there is room for — are unit-testable without Compose.
 *
 * No Compose type appears in this file on purpose: [StateTone] is resolved to a colour by the
 * rendering layer, so the mapping runs on a plain JVM.
 */
enum class StateTone { Idle, Busy, Active, Alarm }

/** The three evidence sets, kept apart. Merging them hides invariant 2 (shadow keeps z, occlusion zeroes it). */
data class OverlayLayers(
    val changed: Set<String> = emptySet(),
    val shadowVetoed: Set<String> = emptySet(),
    val occlusionVetoed: Set<String> = emptySet(),
)

data class AlarmUi(
    val kind: String,
    val conflicts: List<String>,
    val guessSan: String?,
)

/**
 * The engine is blocked on this answer; there is no "later".
 *
 * It lives with the other pure UI models rather than next to its dialog because it is a fold over
 * the event stream, and that fold is the part that has to be right.
 */
data class PromotionPrompt(
    val from: String,
    val to: String,
)

/**
 * The whole promotion state machine.
 *
 * Opens on `PromotionPending` and closes when a commit for the SAME from->to arrives — the engine
 * can also resolve a promotion without the user (a recovery sequence), and a dialog left open over
 * a resolved position would block the screen on a question nobody is asking any more.
 */
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

data class TrackingUiState(
    val fen: String,
    val stateText: String,
    val tone: StateTone,
    val fpsText: String,
    val infoLine: String?,
    val alarm: AlarmUi?,
    val overlay: OverlayLayers,
    // `[a8, h8, h1, a1]` in source px, or null before the first calibration.
    val corners: FloatArray? = null,
) {
    /** The board scrim and the frozen fps colour are the SAME condition — a latched alarm. */
    val boardTinted: Boolean get() = alarm != null
}

internal const val STATE_WAITING = "waiting"
internal const val STATE_MOVING = "moving"
internal const val STATE_OCCLUDED = "occluded"
internal const val STATE_MOVE = "move"

private const val ALARM_STATE_TEXT = "ILLEGAL MOVE?"

private const val STOPPED_STATE_TEXT = "STOPPED"

private const val STOPPED_FPS_TEXT = "camera off"

private const val STOPPED_INFO = "No frames are arriving — the camera is released. Resume to continue; the game is kept."

/**
 * [cameraOn] outranks every engine state in the header.
 *
 * With the camera released the status simply stops arriving, so the last sample stands forever: the
 * screen would keep showing "WAITING · 14.8 fps" over a dead feed. Whatever the engine last thought
 * is not what the user needs to know here.
 */
fun trackingUiState(
    status: TrackerStatus,
    cameraOn: Boolean = true,
): TrackingUiState {
    val alarm =
        status.alarm?.let { AlarmUi(kind = it.kind, conflicts = it.conflicts, guessSan = it.guessSan) }
    return TrackingUiState(
        fen = status.fen,
        // While alarmed the engine blocks every commit, so showing "moving" would imply the game is
        // progressing when it provably is not: the state line is pinned to the alarm instead.
        stateText =
            when {
                !cameraOn -> STOPPED_STATE_TEXT
                alarm != null -> ALARM_STATE_TEXT
                else -> stateLabel(status.state)
            },
        tone =
            when {
                !cameraOn -> StateTone.Idle
                alarm != null -> StateTone.Alarm
                else -> stateTone(status.state)
            },
        fpsText = if (cameraOn) formatFps(status.fps) else STOPPED_FPS_TEXT,
        infoLine = if (cameraOn) infoLine(status) else STOPPED_INFO,
        alarm = alarm,
        overlay =
            OverlayLayers(
                changed = status.changed,
                shadowVetoed = status.shadowVetoed,
                occlusionVetoed = status.occlusionVetoed,
            ),
        corners = status.corners,
    )
}

private fun stateLabel(state: String): String =
    when (state) {
        STATE_WAITING -> "WAITING"
        STATE_MOVING -> "MOVING"
        STATE_OCCLUDED -> "HAND OVER BOARD"
        STATE_MOVE -> "MOVE"
        else -> state.uppercase(Locale.ROOT)
    }

private fun stateTone(state: String): StateTone =
    when (state) {
        STATE_MOVING, STATE_OCCLUDED -> StateTone.Busy
        STATE_MOVE -> StateTone.Active
        else -> StateTone.Idle
    }

/**
 * One line, two candidates. The stuck reason wins because it is the engine refusing to proceed;
 * the note is commentary on a loop that is still running.
 */
private fun infoLine(status: TrackerStatus): String? {
    val stuck = status.stuckReason
    return if (stuck != null) "stuck: $stuck" else status.note
}

private fun formatFps(fps: Double): String = String.format(Locale.ROOT, "%.1f fps", fps)
