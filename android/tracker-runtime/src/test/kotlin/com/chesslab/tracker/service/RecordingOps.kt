package com.chesslab.tracker.service

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.EngineOps
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus

internal class RecordingOps : EngineOps {
    val calls = mutableListOf<String>()
    var configs = 0
    var events: List<TrackerEvent> = emptyList()

    override fun onFrame(input: FrameInput): List<TrackerEvent> {
        calls += "frame:${input.seq}"
        return events
    }

    override fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> {
        calls += "snap:${snap.seq}"
        return emptyList()
    }

    override fun apply(action: EngineAction): List<TrackerEvent> {
        calls += if (action is EngineAction.SetFen) "SetFen:${action.fen}" else action::class.simpleName.orEmpty()
        if (action is EngineAction.UpdateConfig) configs += 1
        return emptyList()
    }

    override fun status(): TrackerStatus = statusOf()

    override fun fen(): String = statusOf().fen
}
