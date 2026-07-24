package com.chesslab.engine

/**
 * Lightweight per-frame stage timing of the engine frame path (pure Kotlin, no Android
 * dependency). The host installs a [sink] (e.g. a throttled logcat writer, tag
 * `chesslabEnginePerf`); the engine then reports one line per [TrackerEngine.onFrame]
 * with per-stage milliseconds. With no sink installed the overhead is one null check
 * per stage. Single-threaded by contract (the engine frame path is serialized by the
 * caller); the report buffers are not synchronized.
 */
object EnginePerf {
    /** Line consumer installed by the host; null (default) disables all measurement. */
    @Volatile
    @JvmStatic
    var sink: ((String) -> Unit)? = null

    private const val INITIAL_CAPACITY = 16
    private const val NS_PER_MS = 1e6
    private const val TENTHS = 10
    private val names = ArrayList<String>(INITIAL_CAPACITY)
    private val nanos = ArrayList<Long>(INITIAL_CAPACITY)

    /** Time [block] under [name]; stage lines appear in call order in the frame report. */
    inline fun <T> stage(
        name: String,
        block: () -> T,
    ): T {
        if (sink == null) return block()
        val start = System.nanoTime()
        val result = block()
        record(name, System.nanoTime() - start)
        return result
    }

    /** Append one measured stage to the current frame report (used via [stage]). */
    fun record(
        name: String,
        elapsedNanos: Long,
    ) {
        names.add(name)
        nanos.add(elapsedNanos)
    }

    /** Emit and clear the current frame report; no-op (clears nothing) without a sink. */
    fun flushFrame(totalNanos: Long) {
        val out = sink
        if (out == null) {
            names.clear()
            nanos.clear()
            return
        }
        val sb = StringBuilder("engine=")
        appendMs(sb, totalNanos)
        for (i in names.indices) {
            sb.append(' ').append(names[i]).append('=')
            appendMs(sb, nanos[i])
        }
        names.clear()
        nanos.clear()
        out(sb.toString())
    }

    private fun appendMs(
        sb: StringBuilder,
        ns: Long,
    ) {
        val tenths = ns / (NS_PER_MS.toLong() / TENTHS)
        sb.append(tenths / TENTHS).append('.').append(tenths % TENTHS)
    }
}
