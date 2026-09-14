package com.chesslab.tracker.games

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// TODO: minute resolution — two games saved inside one minute share an id, and `GameStore.save`
// overwrites the first game's .json/.pgn and drops its index row without a word.

/** `2026-07-24_1822` — sorts chronologically as a string and is a legal file stem. */
fun gameId(epochMs: Long): String = SimpleDateFormat("yyyy-MM-dd_HHmm", Locale.US).format(Date(epochMs))
