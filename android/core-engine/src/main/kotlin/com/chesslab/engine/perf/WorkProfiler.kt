package com.chesslab.engine.perf

import java.util.Locale

/** An input inherited from the enclosing profiled call, normally the current frame sequence. */
const val INHERIT_INPUT: Long = Long.MIN_VALUE

/** A call for which no stable semantic input identity is available. */
const val UNKNOWN_INPUT: Long = Long.MIN_VALUE + 1

/**
 * Stable names for expensive source-level boundaries.
 *
 * These are deliberately operations rather than Kotlin method names: an implementation may move
 * without invalidating historical reports, while "serialize the current FEN" remains the same
 * unit of work.
 */
enum class WorkOperation(
    val id: String,
) {
    COORDINATOR_FRAME("coordinator.frame"),
    FRAME("frame"),
    FRAME_CONVERT("frame.convert"),
    ENGINE_TICK("engine.tick"),
    ENGINE_FRAME("engine.frame"),
    ENGINE_CNN_SNAPSHOT("engine.cnn_snapshot"),
    ENGINE_ACTION("engine.action"),
    FEN_SERIALIZE("engine.fen"),
    LEGAL_MOVES("engine.legal_moves"),
    LUMA_GRAY("geometry.gray.luma"),
    DETECTION_GRAY("geometry.gray.detection"),
    GRID_COVERAGE("geometry.grid_coverage"),
    GRID_OCCLUSION("geometry.grid_occlusion"),
    HOMOGRAPHY_BUILD("geometry.homography"),
    DETECTION_WARP("geometry.warp.detection"),
    CROP_WARP("geometry.warp.crop"),
    GRID_WARP("geometry.warp.grid"),
    ROI_MOTION("geometry.roi_motion"),
    RAW_FRAME_COPY("copy.raw_frame"),
    RAW_PREVIEW_COPY("copy.raw_preview"),
    CALIBRATION_FRAME_COPY("copy.calibration_frame"),
    BOARD_PREVIEW_COPY("copy.board_preview"),
    CROP_FRAME_COPY("copy.crop_frame"),
    CNN_CROP("cnn.crop"),
    CNN_PREPROCESS("cnn.preprocess"),
    CNN_INFERENCE("cnn.inference"),
    CNN_OBSERVATION("cnn.observation"),
    TIMELINE_WRITE("record.timeline_write"),
    VIDEO_PROGRESS("record.video_progress"),
}

/**
 * Cross-cutting source-work sink. It contains no clock: timing remains in host-side profilers, so
 * the deterministic engine never gains a wall clock merely because profiling exists.
 */
interface WorkProbe {
    /** Enter one operation and return an opaque token passed to [exit]. */
    fun enter(
        operation: WorkOperation,
        input: Long = INHERIT_INPUT,
    ): Long

    fun exit(token: Long)

    /** Attribute copied or materialised bytes to an operation without counting a second call. */
    fun bytes(
        operation: WorkOperation,
        count: Long,
        input: Long = INHERIT_INPUT,
    )

    fun cache(
        operation: WorkOperation,
        hit: Boolean,
        input: Long = INHERIT_INPUT,
    )
}

/** Production default: no storage, allocation, clock read or lock. */
object NoopWorkProbe : WorkProbe {
    override fun enter(
        operation: WorkOperation,
        input: Long,
    ): Long = 0L

    override fun exit(token: Long) = Unit

    override fun bytes(
        operation: WorkOperation,
        count: Long,
        input: Long,
    ) = Unit

    override fun cache(
        operation: WorkOperation,
        hit: Boolean,
        input: Long,
    ) = Unit
}

/**
 * Process-wide profiling switch.
 *
 * Profiling is cross-cutting by definition, but remains explicitly scoped: [install] returns a
 * handle that restores the previous probe. Normal execution takes the identity branch in [span]
 * and runs only [body]; because it is inline, it creates no lambda object at a hot call site.
 */
object WorkProfiler {
    @PublishedApi
    internal var active: WorkProbe = NoopWorkProbe

    fun install(probe: WorkProbe): AutoCloseable {
        val previous = active
        active = probe
        return AutoCloseable {
            if (active === probe) active = previous
        }
    }

    inline fun <T> span(
        operation: WorkOperation,
        input: Long = INHERIT_INPUT,
        body: () -> T,
    ): T {
        val probe = active
        if (probe === NoopWorkProbe) return body()
        val token = probe.enter(operation, input)
        try {
            return body()
        } finally {
            probe.exit(token)
        }
    }

    /** Lazily derives an input fingerprint only when a recording probe is installed. */
    inline fun <T> span(
        operation: WorkOperation,
        input: () -> Long,
        body: () -> T,
    ): T {
        val probe = active
        if (probe === NoopWorkProbe) return body()
        val token = probe.enter(operation, input())
        try {
            return body()
        } finally {
            probe.exit(token)
        }
    }

    fun bytes(
        operation: WorkOperation,
        count: Long,
        input: Long = INHERIT_INPUT,
    ) {
        val probe = active
        if (probe !== NoopWorkProbe) probe.bytes(operation, count, input)
    }

    fun cache(
        operation: WorkOperation,
        hit: Boolean,
        input: Long = INHERIT_INPUT,
    ) {
        val probe = active
        if (probe !== NoopWorkProbe) probe.cache(operation, hit, input)
    }
}

data class OperationWork(
    val operation: WorkOperation,
    val calls: Long,
    val knownInputCalls: Long,
    val distinctInputs: Long,
    val copiedBytes: Long,
    val cacheHits: Long,
    val cacheMisses: Long,
    val inclusiveNanos: Long = 0L,
    val selfNanos: Long = 0L,
    val maxNanos: Long = 0L,
) {
    val repeatedInputCalls: Long get() = (knownInputCalls - distinctInputs).coerceAtLeast(0)
}

data class CallEdge(
    val caller: WorkOperation,
    val callee: WorkOperation,
    val calls: Long,
)

data class WorkSnapshot(
    val operations: List<OperationWork>,
    val edges: List<CallEdge>,
    val openSpans: Int,
) {
    fun operation(operation: WorkOperation): OperationWork? = operations.firstOrNull { it.operation == operation }

    /** Stable rows and counts; elapsed-time columns naturally vary with the machine and load. */
    fun report(): String {
        val rows =
            operations.sortedWith(
                compareByDescending<OperationWork> { it.selfNanos }
                    .thenByDescending { it.repeatedInputCalls }
                    .thenByDescending { it.calls }
                    .thenBy { it.operation.id },
            )
        val header = "operation                         calls   inputs  repeats   copied MiB   hit/miss   incl ms   self ms    max ms"
        val body =
            rows.joinToString("\n") { row ->
                val mib = row.copiedBytes / BYTES_PER_MIB
                String.format(
                    Locale.ROOT,
                    "%-32s %7d %8d %8d %12.2f   %d/%d %9.1f %9.1f %9.3f",
                    row.operation.id,
                    row.calls,
                    row.distinctInputs,
                    row.repeatedInputCalls,
                    mib,
                    row.cacheHits,
                    row.cacheMisses,
                    row.inclusiveNanos / NANOS_PER_MILLISECOND,
                    row.selfNanos / NANOS_PER_MILLISECOND,
                    row.maxNanos / NANOS_PER_MILLISECOND,
                )
            }
        val graph =
            edges
                .sortedWith(compareBy<CallEdge>({ it.caller.id }, { it.callee.id }))
                .joinToString("\n") { "${it.caller.id} -> ${it.callee.id}: ${it.calls}" }
        val unclosed = if (openSpans == 0) "" else "\nWARNING: $openSpans profiling spans remain open"
        return "$header\n$body\n\ncall graph\n$graph$unclosed"
    }

    private companion object {
        const val BYTES_PER_MIB = 1024.0 * 1024.0
        const val NANOS_PER_MILLISECOND = 1_000_000.0
    }
}

data class WorkBudget(
    val operation: WorkOperation,
    val maxCalls: Long? = null,
    val maxRepeatedInputCalls: Long? = null,
    val maxCopiedBytes: Long? = null,
)

data class WorkViolation(
    val operation: WorkOperation,
    val message: String,
)

/** A stable performance oracle for property/fuzz tests; it deliberately compares no wall time. */
fun WorkSnapshot.check(budgets: Iterable<WorkBudget>): List<WorkViolation> =
    budgets.flatMap { budget ->
        val row = operation(budget.operation) ?: OperationWork(budget.operation, 0, 0, 0, 0, 0, 0)
        buildList {
            budget.maxCalls?.let { if (row.calls > it) add(WorkViolation(row.operation, "${row.calls} calls > $it")) }
            budget.maxRepeatedInputCalls?.let {
                if (row.repeatedInputCalls > it) {
                    add(WorkViolation(row.operation, "${row.repeatedInputCalls} repeated-input calls > $it"))
                }
            }
            budget.maxCopiedBytes?.let {
                if (row.copiedBytes > it) add(WorkViolation(row.operation, "${row.copiedBytes} copied bytes > $it"))
            }
        }
    }
