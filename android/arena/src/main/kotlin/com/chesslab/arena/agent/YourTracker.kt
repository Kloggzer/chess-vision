package com.chesslab.arena.agent

import com.chesslab.arena.ArenaTracker
import com.chesslab.arena.FrameView

/**
 * Where the new tracker goes. It commits nothing, so it scores 0 found / 0 invented.
 *
 * The arena hands you frames in order and asks, per frame, which moves are now certain. What you
 * do between those two things is the whole exercise — this file deliberately suggests nothing.
 */
class YourTracker : ArenaTracker {
    override fun onFrame(frame: FrameView): List<String> = emptyList()
}
