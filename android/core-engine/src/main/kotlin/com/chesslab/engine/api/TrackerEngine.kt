package com.chesslab.engine.api

/** Standard chess starting position (FEN). */
const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/**
 * The public entry point of `:core-engine`. Phase 00a declares the seam only — every body
 * is a TODO owned by a later phase, and the signatures are frozen: a change requires a
 * discrepancy note in `specs/17-android-rewrite/STATUS.md` first.
 *
 * It is a pure state machine driven by exactly ONE thread: no `synchronized`, no `Atomic*`,
 * no `Mutex`, no `@Volatile` may ever appear in this module (see `ClasspathPurityTest`).
 */
class TrackerEngine(
    config: TrackerConfig,
    startFen: String = STARTPOS,
) {
    init {
        // Phase 03d wires the real state. Referenced here so the frozen signature keeps
        // both constructor parameters until then.
        check(config.boardSize > 0) { "boardSize must be positive" }
        check(startFen.isNotBlank()) { "startFen must not be blank" }
    }

    /** The whole per-frame loop + `_try_detect`. Owner: phase 03d. */
    fun onFrame(input: FrameInput): List<TrackerEvent> = TODO("phase 03d: onFrame(seq=${input.seq})")

    /** Observer results (verify / cnn tick). Owner: phase 04a. */
    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> = TODO("phase 04a: onCnnSnapshot(seq=${snap.seq})")

    /** Immutable UI snapshot. Owner: phase 03d. */
    fun status(): TrackerStatus = TODO("phase 03d")

    /** Owner: phase 03d. */
    fun undo(): List<TrackerEvent> = TODO("phase 03d")

    /** Owner: phase 03d. */
    fun resetToStart(): List<TrackerEvent> = TODO("phase 03d")

    /** Owner: phase 03d. */
    fun setFen(fen: String): List<TrackerEvent> = TODO("phase 03d: setFen($fen)")

    /** Owner: phase 03d. */
    fun captureBaseline(): List<TrackerEvent> = TODO("phase 03d")

    /** Owner: phase 03d. */
    fun choosePromotion(piece: Char): List<TrackerEvent> = TODO("phase 03d: choosePromotion($piece)")

    /** Owner: phase 03d. */
    fun acceptCnnPosition(): List<TrackerEvent> = TODO("phase 03d")

    /** Live tuning; mirrors app.py `_live_tuning_kwargs` side effects. Owner: phase 03d. */
    fun updateConfig(config: TrackerConfig): Unit = TODO("phase 03d: updateConfig(detSize=${config.detSize})")
}
