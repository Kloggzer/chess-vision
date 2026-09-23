package com.chesslab.tracker.analysis

import java.io.Closeable
import java.util.concurrent.CancellationException
import java.util.concurrent.atomic.AtomicBoolean

/** LIVE is the eval bar and the hint's mate line, both under `gateBlock`; REVIEW is exempt by
 *  design (`docs/game-review.md`, `offene-entscheidungen.md` 46). */
enum class EngineLane { LIVE, REVIEW }

data class EngineProfile(
    val threads: Int,
    val hashMb: Int,
)

sealed interface EngineSearch {
    data class Found(
        val lines: List<PvLine>,
    ) : EngineSearch

    data object Blocked : EngineSearch

    data object Unavailable : EngineSearch
}

/** The one owner of Stockfish: at most one process per lane, shared by every lease on it, closed
 *  with the last lease. The gate lives HERE, so no LIVE consumer can search past it. */
class EngineService(
    private val engineFactory: () -> UciEngine?,
) {
    @Volatile
    private var gate: GateBlock? = null

    private val lanes = EngineLane.entries.associateWith { Lane(it) }

    /** Never takes a lane lock: the host calls it per frame, and a running search ends itself. */
    fun updateGate(block: GateBlock?) {
        gate = block
    }

    fun lease(
        lane: EngineLane,
        profile: EngineProfile,
    ): EngineLease = lanes.getValue(lane).lease(profile)

    private inner class Lane(
        private val lane: EngineLane,
    ) {
        private val lock = Any()
        private var engine: UciEngine? = null
        private var running: EngineProfile? = null
        private var holders = 0

        fun lease(profile: EngineProfile): EngineLease {
            synchronized(lock) { holders += 1 }
            return EngineLease(profile, ::search, ::release)
        }

        private fun blocked(): Boolean = lane == EngineLane.LIVE && gate != null

        private fun release() =
            synchronized(lock) {
                holders -= 1
                if (holders == 0) closeLocked()
            }

        private fun search(
            profile: EngineProfile,
            analyse: (UciEngine, () -> Boolean) -> List<PvLine>,
        ): EngineSearch {
            if (blocked()) return EngineSearch.Blocked
            synchronized(lock) {
                if (blocked()) return EngineSearch.Blocked
                val active = ensureLocked(profile) ?: return EngineSearch.Unavailable
                return try {
                    EngineSearch.Found(analyse(active, ::blocked))
                } catch (failure: Throwable) {
                    // A search that did not reach `bestmove` leaves the process mid-`go`; no one may reuse it.
                    closeLocked()
                    if (failure is CancellationException && blocked()) EngineSearch.Blocked else throw failure
                }
            }
        }

        private fun ensureLocked(profile: EngineProfile): UciEngine? {
            if (running != profile) closeLocked()
            engine?.let { return it }
            val fresh = engineFactory() ?: return null
            runCatching { fresh.start(profile.threads, profile.hashMb) }
                .onFailure { failure ->
                    runCatching { fresh.close() }
                    throw failure
                }
            engine = fresh
            running = profile
            return fresh
        }

        private fun closeLocked() {
            val open = engine ?: return
            engine = null
            running = null
            runCatching { open.close() }
        }
    }
}

/** One consumer's hold on a lane. Every search blocks the caller's thread, like [UciEngine] itself. */
class EngineLease internal constructor(
    private val profile: EngineProfile,
    private val searchOn: (EngineProfile, (UciEngine, () -> Boolean) -> List<PvLine>) -> EngineSearch,
    private val release: () -> Unit,
) : Closeable {
    private val closed = AtomicBoolean(false)

    fun search(
        fen: String,
        movetimeMs: Long,
        multiPv: Int,
        nodes: Long? = null,
        cancelled: () -> Boolean = { false },
    ): EngineSearch {
        check(!closed.get()) { "engine lease already closed" }
        return searchOn(profile) { engine, blocked ->
            engine.analyse(fen, movetimeMs, multiPv, nodes) { cancelled() || blocked() }
        }
    }

    override fun close() {
        if (closed.compareAndSet(false, true)) release()
    }
}
