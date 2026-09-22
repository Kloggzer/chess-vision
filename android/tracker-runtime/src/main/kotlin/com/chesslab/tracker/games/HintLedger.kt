package com.chesslab.tracker.games

/** What was told to the player, so the record can say so afterwards. It keys on the POSITION and
 *  on nothing else — a tip is a statement about the position it was computed from, the same
 *  discipline `HintController` applies before delivering one. A tip overtaken by a take-back
 *  binds to no ply at all. */
class HintLedger : GameBoundary {
    private val lock = Any()
    private val open = mutableMapOf<String, MoveHint>()
    private var side: String? = null
    private var quota = 0
    private var count = 0

    /** A new game under this plan. Everything the previous one held is gone, marks included. */
    fun startGame(
        side: String?,
        quota: Int,
    ) = synchronized(lock) {
        open.clear()
        this.side = side
        this.quota = quota
        count = 0
    }

    /** One tip, actually delivered, for [fen]. Only `HintController.commit` reaches this. */
    fun delivered(
        fen: String,
        san: String,
        uci: String,
    ) = synchronized(lock) {
        open[fen] = MoveHint(san = san, uci = uci, followed = false)
        count += 1
    }

    /** The mark for a ply played out of [fenBefore] with [uci], null when nothing was told there.
     *  It CONSUMES the entry — a tip is spent by the move that leaves its position, named or not,
     *  or a later repetition of that position would claim a tip already answered. */
    fun markFor(
        fenBefore: String,
        uci: String,
    ): MoveHint? =
        synchronized(lock) {
            open.remove(fenBefore)?.let { it.copy(followed = it.uci == uci) }
        }

    /** What the finished game stores. Non-null means the game was WATCHED, not that it was aided. */
    fun log(): HintRecord = synchronized(lock) { HintRecord(side = side, quota = quota, delivered = count) }

    /** The record boundary: `GameSessionController` clears it once the game is saved or dropped. */
    override fun endGame() = startGame(side = null, quota = 0)
}
