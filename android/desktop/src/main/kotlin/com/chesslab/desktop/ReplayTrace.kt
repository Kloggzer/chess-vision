package com.chesslab.desktop

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.perf.RecordingWorkProbe
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import java.io.File

/** Streaming diagnostic: no camera images retained and no sampled UI status used as evidence. */
internal class ReplayTrace(
    file: File,
    private val probe: RecordingWorkProbe,
    options: ReplayOptions,
) : AutoCloseable {
    private val writer = file.apply { parentFile?.mkdirs() }.bufferedWriter()
    private val previous = mutableMapOf<String, Long>()

    init {
        writer.appendLine(
            buildJsonObject {
                put("kind", "metadata")
                put("options", options.toString())
                put("limitFrames", options.limitFrames)
                put("requestedFps", options.fps)
                put("model", options.model)
                put("clock", "video timestamp in ms; operation durations are host wall time")
            }.toString(),
        )
    }

    fun decision(
        value: DebugDecision,
        index: Long,
    ) {
        writer.appendLine(
            buildJsonObject {
                put("kind", "decision")
                put("index", index)
                put("timeMs", value.tsS * 1000.0)
                put("ply", value.ply)
                put("uci", value.uci)
                put("san", value.san)
                put("accepted", value.accepted)
                put("decider", value.decider)
                put("reason", value.reason)
                put("refProvisional", value.refProvisional)
            }.toString(),
        )
    }

    fun frame(
        index: Long,
        timeMs: Double,
        status: TrackerStatus,
    ) {
        val debug = status.debug
        writer.appendLine(
            buildJsonObject {
                put("kind", "frame")
                put("index", index)
                put("timeMs", timeMs)
                put("state", status.state)
                put("gate", debug?.frameGate)
                put("engineSeq", debug?.engineSeq)
                put("motion", status.motion)
                put("gridCoverage", debug?.gridCoverage)
                put("stableFrames", debug?.stableFrames)
                put("requiredStableFrames", debug?.requiredStableFrames)
                put("bufferedFrames", debug?.bufferedFrames)
                put("holdRemainingMs", debug?.holdRemainingMs)
                put("candidate", status.bestUci)
                put("pending", status.pendingUci)
                put("verify", status.verifyState)
                put("pendingFrames", status.pendingFrames)
                put("cnnSeq", debug?.cnnSeq)
                put("cnnAgeMs", debug?.cnnAgeMs)
                put("cnnInferMs", debug?.cnnInferMs)
                put("cnnCoverageMax", debug?.cnnReads?.maxOfOrNull { it.pOccluded })
                put("cnnHandSquares", status.cnnOccluded.size)
                put("stuck", status.stuckReason)
                put("note", status.note)
                put("fen", status.fen)
                putJsonObject("workMs") {
                    for (operation in probe.snapshot().operations) {
                        val key = operation.operation.id
                        val old = previous.put(key, operation.selfNanos) ?: 0L
                        put(key, (operation.selfNanos - old) / 1e6)
                    }
                }
            }.toString(),
        )
    }

    override fun close() = writer.close()
}
