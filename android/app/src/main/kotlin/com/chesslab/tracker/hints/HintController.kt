package com.chesslab.tracker.hints

import com.chesslab.tracker.games.GameBoundary
import com.chesslab.tracker.games.HintLedger
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Wer fragen darf, wie oft noch, und ob der Tipp zu der Stellung gehoert, aus der er kam. Nichts
 *  hier passiert von selbst: das Telefon bietet nichts an, es beantwortet einen Druck. */
class HintController(
    private val ledger: HintLedger? = null,
) : GameBoundary {
    private val lock = Any()
    private val ui = MutableStateFlow(HintUiState())
    val state: StateFlow<HintUiState> = ui.asStateFlow()

    private var plan = HintPlan()
    private var used = 0
    private var inFlight = false

    fun startGame(plan: HintPlan) {
        adopt(plan)
        ledger?.startGame(plan.side?.name, plan.quota)
    }

    /** Der Ledger bleibt stehen — ihn raeumt `GameSessionController`, wenn der Record geschrieben ist. */
    override fun endGame() = adopt(HintPlan(side = null, quota = 0))

    private fun adopt(plan: HintPlan) {
        synchronized(lock) {
            this.plan = plan
            used = 0
            inFlight = false
        }
        publish(null)
    }

    /** Gate und Alarm stehen bewusst NICHT darin: die Absage muss erreichbar bleiben, sonst verschwindet der
     *  Knopf wortlos unter der Hand des Nutzers. */
    fun offered(fen: String): Boolean =
        synchronized(lock) {
            val side = plan.side ?: return false
            remaining() > 0 && sideToMove(fen) == side
        }

    fun dismiss() = publish(outcome = null)

    /** [moment] wird ZWEIMAL gelesen, vor und nach der Mattlinie: nur wenn dieselbe Stellung noch gilt, wird
     *  zugestellt und genau einmal verbraucht. */
    suspend fun request(
        moment: () -> HintMoment,
        resolveLine: suspend (String, String) -> HintLine = { _, _ -> HintLine(emptyList()) },
    ): HintOutcome {
        if (!claim()) return HintOutcome.Ignored
        try {
            return deliver(moment, resolveLine)
        } finally {
            synchronized(lock) { inFlight = false }
        }
    }

    private suspend fun deliver(
        moment: () -> HintMoment,
        resolveLine: suspend (String, String) -> HintLine,
    ): HintOutcome {
        val side = synchronized(lock) { plan.side } ?: return publish(HintOutcome.Refused(HintRefusal.NOT_YOUR_TURN))
        val opened = moment()
        fault(opened, side)?.let { return publish(HintOutcome.Refused(it)) }
        val result = opened.result ?: return publish(HintOutcome.Refused(HintRefusal.EXPIRED))
        val best = result.lines.firstOrNull() ?: return publish(HintOutcome.Refused(HintRefusal.OVER))
        val san = best.san ?: return publish(HintOutcome.Refused(HintRefusal.OVER))
        val mateIn = mateForSide(result, side)
        val line =
            if (mateIn == null) {
                HintLine(emptyList())
            } else {
                resolveLine(opened.fen, best.uci.orEmpty())
            }
        return publish(commit(opened.fen, san, best.uci.orEmpty(), mateIn, line, moment, side))
    }

    private fun commit(
        fen: String,
        san: String,
        uci: String,
        mateIn: Int?,
        line: HintLine,
        moment: () -> HintMoment,
        side: HintSide,
    ): HintOutcome =
        synchronized(lock) {
            val settled = moment()
            if (settled.fen != fen) return HintOutcome.Refused(HintRefusal.EXPIRED)
            fault(settled, side)?.let { return HintOutcome.Refused(it) }
            used += 1
            // Erst HIER, im selben Abschnitt wie die Abbuchung: was nicht zugestellt wurde, ist
            // auch nicht vorgesagt, und der Record haette sonst eine Absage als Tipp gefuehrt.
            ledger?.delivered(fen, san, uci)
            HintOutcome.Tip(fen, san, uci, mateIn, line.san, remaining(), line.failure)
        }

    /** Die Rangordnung von `gateBlock` bleibt, wie sie ist: ein Tipp kehrt sie nicht um, er bekommt
     *  eine Absage, und die laufende Mattlinie bricht ab (`EngineService`, Spur LIVE). */
    private fun fault(
        moment: HintMoment,
        side: HintSide,
    ): HintRefusal? =
        when {
            sideToMove(moment.fen) != side -> HintRefusal.NOT_YOUR_TURN
            remaining() <= 0 -> HintRefusal.SPENT
            moment.blocked != null -> HintRefusal.GATE
            moment.alarmed -> HintRefusal.UNSETTLED
            moment.steadyMs < HINT_SETTLE_MS -> HintRefusal.UNSETTLED
            moment.recordFen != null && moment.recordFen != moment.fen -> HintRefusal.UNSETTLED
            moment.result == null || moment.result.fen != moment.fen -> HintRefusal.EXPIRED
            moment.result.gameOver -> HintRefusal.OVER
            else -> null
        }

    private fun claim(): Boolean =
        synchronized(lock) {
            if (inFlight) return false
            inFlight = true
            true
        }

    private fun remaining(): Int = synchronized(lock) { (plan.quota - used).coerceAtLeast(0) }

    private fun publish(outcome: HintOutcome?): HintOutcome {
        ui.value = synchronized(lock) { HintUiState(plan = plan, remaining = remaining(), outcome = outcome) }
        return outcome ?: HintOutcome.Ignored
    }
}
