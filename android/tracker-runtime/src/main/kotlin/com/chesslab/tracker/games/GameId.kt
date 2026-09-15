package com.chesslab.tracker.games

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * `2026-07-24_182233` — sorts chronologically as a string and is a legal file stem.
 *
 * Seconds, not a collision suffix: the id stays a pure function of the start clock, where a suffix
 * would need a read-modify-write against `GameStore` on every save and still race. At minute
 * resolution two games started in one minute shared an id and `save` overwrote the first silently.
 */
fun gameId(epochMs: Long): String = SimpleDateFormat("yyyy-MM-dd_HHmmss", Locale.US).format(Date(epochMs))
