package com.chesslab.arena.agent

import com.chesslab.arena.ArenaTracker
import com.chesslab.arena.FrameView

/** Commits nothing, so it scores 0 found / 0 invented. This file deliberately suggests nothing. */
class YourTracker : ArenaTracker {
    override fun onFrame(frame: FrameView): List<String> = emptyList()
}
