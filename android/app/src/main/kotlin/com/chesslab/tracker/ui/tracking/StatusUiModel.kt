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

/**
 * **What the header is saying, as a fact rather than as words.** The Compose layer names it.
 *
 * This file's KDoc already insists that no Compose type appears in it, so the mapping stays a
 * plain-JVM function. The same argument runs one step further: an English sentence in here is a
 * second place the wording lives, and it made every test assert prose it did not care about.
 *
 * Three engine states collapse into [LIVE] deliberately — `waiting`, `moving` and `move` are
 * visible for a fraction of a second each and are not distinguishable to a reader. [StateTone]
 * still separates them, which is where that difference belongs.
 */
enum class TrackerLabel {
    LIVE,
    HAND_OVER_BOARD,

    /** Frames arrive, the board is fitted, and the engine still is not ticking. */
    NO_DETECTION,
    POSITION_LOST,
    CAMERA_OFF,
    NOT_TRACKING,
}

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

/**
 * **What the screen is FOR right now**, and therefore what its one filled button is (specs/48
 * rule 3, specs/49).
 *
 * The tracking screen has two jobs — making the camera work, and watching a game — and it used to
 * show one layout for both, so in either state about half of what was on screen was inert. `WAITING`
 * was the largest type on the screen and could not be acted on, while the line that said what to do
 * was grey underneath it and named the third of three identical outline buttons.
 *
 * [WATCH] deliberately has no button: watching is not an act. While the alarm latch is up the alarm
 * card owns the screen's filled button — it *is* the screen's current job then, which is why it does
 * not need a rung of its own here.
 */
enum class TrackerTask {
    /** No service. The filled button is `TrackingSwitch`'s own Start tracking. */
    START,

    /** The camera was released and the game is being held; taking it back is the whole job. */
    RESUME_CAMERA,

    /** No board geometry. Nothing else on this screen can say anything until there is. */
    CALIBRATE,

    WATCH,
}

data class TrackingUiState(
    val fen: String,
    val state: TrackerLabel,
    val tone: StateTone,
    val fpsText: String,
    /** The second, smaller line under [fpsText]; null when one line says everything. */
    val fpsDetail: String?,
    val infoLine: String?,
    val alarm: AlarmUi?,
    val overlay: OverlayLayers,
    // `[a8, h8, h1, a1]` in source px, or null before the first calibration.
    val corners: FloatArray? = null,
    val task: TrackerTask = TrackerTask.WATCH,
    /**
     * Whether the screen may draw a GAME: a live camera delivering frames onto a calibrated board.
     *
     * False is not an error — it is the other layout, the one whose job is to make the camera work
     * and which therefore shows the camera instead of a board, an eval bar and an empty move list.
     */
    val ready: Boolean = true,
) {
    /** The board scrim and the frozen fps colour are the SAME condition — a latched alarm. */
    val boardTinted: Boolean get() = alarm != null
}

internal const val STATE_WAITING = "waiting"
internal const val STATE_MOVING = "moving"
internal const val STATE_OCCLUDED = "occluded"
internal const val STATE_MOVE = "move"

private const val STOPPED_FPS_TEXT = "camera off"

/** The camera is bound and nothing is arriving — a dead feed, which is NOT a discarded one. */
private const val NO_FRAMES_TEXT = "no frames"

private const val NOT_CALIBRATED_TEXT = "not calibrated"

/** Frames arrive, the board is calibrated, and still nothing ticks — the case worth catching. */
private const val NO_DETECTION_TEXT = "no detection"

/** Below this the two rates are the same number twice, and the second one is noise. */
private const val FPS_SAME = 1.0

private const val STOPPED_INFO = "No frames are arriving — the camera is released. Resume to continue; the game is kept."

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
        state = label(feed, alarm, status),
        tone = tone(feed, alarm, status),
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
        task = task(feed, status),
        // Frames AND geometry. Corners with no frames is the honest third case: the board holds the
        // position it last had, but nothing on screen is live, so it belongs in the other layout —
        // where the (blank) camera view says exactly that.
        ready = task(feed, status) == TrackerTask.WATCH && status.cameraFps > 0.0,
    )
}

/**
 * The ranking, and it is the same one the header uses: no tracker outranks a released camera, which
 * outranks a board that was never fitted. Every rung above [TrackerTask.WATCH] has one thing the
 * user can do about it, and that thing is the screen's filled button.
 */
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

/**
 * The ranking, and it is the same one [task] uses. While alarmed the engine blocks every commit, so
 * reporting "moving" would imply the game is progressing when it provably is not.
 *
 * [TrackerLabel.NO_DETECTION] is the rung that used to exist only inside `fpsDetail`: frames
 * arrive, the board is fitted, and nothing ticks. Without it a screen that has dropped the frame
 * rate would report a confident LIVE over a stopped engine.
 *
 * An unknown engine state maps to [TrackerLabel.LIVE] rather than to the raw string uppercased —
 * the fallback path may not print an engine identifier at a user.
 */
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
        status.corners != null && status.fps <= 0.0 -> TrackerLabel.NO_DETECTION
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
        status.corners != null && status.fps <= 0.0 -> StateTone.Busy
        else -> stateTone(status.state)
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
