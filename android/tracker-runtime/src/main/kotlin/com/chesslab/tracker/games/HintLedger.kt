package com.chesslab.tracker.games

/** Keys on the POSITION and nothing else. A tip overtaken by a take-back binds to no ply at all. */
class HintLedger : GameBoundary {
    private val lock = Any()
    private val open = mutableMapOf<String, MoveHint>()
    private var side: String? = null
    private var quota = 0
    private var count = 0

    fun startGame(
        side: String?,
        quota: Int,
    ) = synchronized(lock) {
        open.clear()
        this.side = side
        this.quota = quota
        count = 0
    }

    fun delivered(
        fen: String,
        san: String,
        uci: String,
    ) = synchronized(lock) {
        open[fen] = MoveHint(san = san, uci = uci, followed = false)
        count += 1
    }

    /** CONSUMES the entry: a tip is spent by the move that leaves its position, or a repetition would claim it. */
    fun markFor(
        fenBefore: String,
        uci: String,
    ): MoveHint? =
        synchronized(lock) {
            open.remove(fenBefore)?.let { it.copy(followed = it.uci == uci) }
        }

    /** Non-null means the game was WATCHED, not that it was aided. */
    fun log(): HintRecord = synchronized(lock) { HintRecord(side = side, quota = quota, delivered = count) }

    override fun endGame() = startGame(side = null, quota = 0)
}
