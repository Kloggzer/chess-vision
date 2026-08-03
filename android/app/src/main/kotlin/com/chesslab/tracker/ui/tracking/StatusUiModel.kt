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
    val cnnConflicts: Set<String> = emptySet(),
    /** Per-square z score — what the diff algorithm sees BEFORE the thresholds decide. */
    val z: Map<String, Double> = emptyMap(),
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
    /** The second, smaller line under [fpsText]; null when one line says everything. */
    val fpsDetail: String?,
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

/**
 * The one-word state while the latch is up. "ILLEGAL MOVE?" read as a question about the player's
 * move; what it actually reports is that the app has stopped believing its own board, which is why
 * every commit is blocked until the card below is answered.
 */
private const val ALARM_STATE_TEXT = "POSITION LOST"

private const val STOPPED_STATE_TEXT = "STOPPED"

private const val STOPPED_FPS_TEXT = "camera off"

/** The camera is bound and nothing is arriving — a dead feed, which is NOT a discarded one. */
private const val NO_FRAMES_TEXT = "no frames"

private const val NOT_CALIBRATED_TEXT = "not calibrated"

/** Frames arrive, the board is calibrated, and still nothing ticks — the case worth catching. */
private const val NO_DETECTION_TEXT = "no detection"

/** Below this the two rates are the same number twice, and the second one is noise. */
private const val FPS_SAME = 1.0

private const val STOPPED_INFO = "No frames are arriving — the camera is released. Resume to continue; the game is kept."

/** No service at all — a legitimate state, and the one the app now opens in. */
private const val OFF_STATE_TEXT = "NOT TRACKING"

private const val OFF_INFO = "No camera is running. Start tracking to detect moves — Games and Review need none."

/**
 * What the header is describing. Ranked, and the ranking is the whole point: no tracker outranks a
 * released camera, which outranks whatever the engine last thought.
 *
 * With no service there is no status at all and the last position stands; with the camera merely
 * released the status stops arriving, so the last sample stands forever and the screen would keep
 * showing "WAITING · 14.8 fps" over a dead feed. The two are not the same state — one has no game,
 * the other has one and is holding it.
 */
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
        stateText = stateText(feed, alarm, status.state),
        tone = tone(feed, alarm, status.state),
        fpsText = if (feed == Feed.LIVE) fpsText(status) else STOPPED_FPS_TEXT,
        fpsDetail = if (feed == Feed.LIVE) fpsDetail(status) else null,
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
    )
}

/**
 * While alarmed the engine blocks every commit, so showing "moving" would imply the game is
 * progressing when it provably is not: the state line is pinned to the alarm instead.
 */
private fun stateText(
    feed: Feed,
    alarm: AlarmUi?,
    state: String,
): String =
    when {
        feed == Feed.OFF -> OFF_STATE_TEXT
        feed == Feed.PAUSED -> STOPPED_STATE_TEXT
        alarm != null -> ALARM_STATE_TEXT
        else -> stateLabel(state)
    }

private fun tone(
    feed: Feed,
    alarm: AlarmUi?,
    state: String,
): StateTone =
    when {
        feed != Feed.LIVE -> StateTone.Idle
        alarm != null -> StateTone.Alarm
        else -> stateTone(state)
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
 * The one line, already resolved.
 *
 * `StatusPublisher.resolveNote` is the single ranked resolver — alarm, then stuck, then the camera,
 * the CNN, the size mismatch and the pipeline. This used to rank `stuckReason` above `status.note`
 * a second time, which discarded the top rung: a latched alarm always sets `stuck: no_legal_move`,
 * so the board went red while the prose beside it explained something else. Two resolvers for one
 * slot is one too many.
 */
private fun infoLine(status: TrackerStatus): String? = status.note

/**
 * The headline rate, and it is NOT always the engine's.
 *
 * `status.fps` counts frames that reached the engine, so an uncalibrated board shows "0.0 fps"
 * beside a camera running at 30 — which reads as a defect and sends the user after the wrong thing.
 * Whenever detection is not running, the camera rate is the number that is actually true, and
 * [fpsDetail] carries the reason it is the one being shown.
 */
private fun fpsText(status: TrackerStatus): String =
    when {
        status.cameraFps <= 0.0 -> NO_FRAMES_TEXT
        status.fps <= 0.0 -> "camera ${formatRate(status.cameraFps)} fps"
        else -> formatFps(status.fps)
    }

private fun fpsDetail(status: TrackerStatus): String? =
    when {
        status.cameraFps <= 0.0 -> null
        // Corners are the calibration: `StatusPublisher` fills in the ones the frame was warped
        // with, and null means the pipeline has never had a board to warp to.
        status.fps <= 0.0 -> if (status.corners == null) NOT_CALIBRATED_TEXT else NO_DETECTION_TEXT
        status.cameraFps - status.fps < FPS_SAME -> null
        // Detection is running but behind the sensor: the gap is the whole message.
        else -> "camera ${formatRate(status.cameraFps)}"
    }

private fun formatFps(fps: Double): String = String.format(Locale.ROOT, "%.1f fps", fps)

/** Whole frames: the second rate is context, and a decimal point costs width the header lacks. */
private fun formatRate(fps: Double): String = String.format(Locale.ROOT, "%.0f", fps)
