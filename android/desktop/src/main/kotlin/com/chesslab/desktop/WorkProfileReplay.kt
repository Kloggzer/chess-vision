package com.chesslab.desktop

import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.tracker.perf.RecordingWorkProbe
import java.io.File

internal fun replay(
    source: FrameSource,
    name: String,
    options: ReplayOptions,
    camera: String? = null,
    video: File? = null,
    training: ReplayTrainingSink? = null,
) {
    if (!options.workProfile && options.trace == null) {
        replayRun(source, name, options, camera, video, training)
        return
    }
    val probe = RecordingWorkProbe()
    val trace = options.trace?.let { ReplayTrace(File(it), probe, options) }
    WorkProfiler.install(probe).use {
        try {
            replayRun(source, name, options, camera, video, training, trace)
        } finally {
            println("\n=== source work profile ===")
            println(probe.snapshot().report())
            trace?.close()
        }
    }
}
