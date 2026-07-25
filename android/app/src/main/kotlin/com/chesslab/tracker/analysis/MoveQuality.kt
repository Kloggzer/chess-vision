package com.chesslab.tracker.analysis

/** Quality label for a played move, derived from centipawn loss — see `classify`. */
enum class MoveQuality { BOOK, BEST, GOOD, INACCURACY, MISTAKE, BLUNDER }
