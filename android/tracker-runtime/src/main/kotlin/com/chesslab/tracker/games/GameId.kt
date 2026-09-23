package com.chesslab.tracker.games

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Seconds, not a collision suffix: at minute resolution two games shared an id and `save` overwrote the first. */
fun gameId(epochMs: Long): String = SimpleDateFormat("yyyy-MM-dd_HHmmss", Locale.US).format(Date(epochMs))
