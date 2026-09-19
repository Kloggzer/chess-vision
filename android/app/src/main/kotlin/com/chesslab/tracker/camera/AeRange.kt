package com.chesslab.tracker.camera

// Die UNTERgrenze ist die Zusage: `[7,15]` erlaubt 15, haelt sie aber nicht zu — so lieferte das
// 24117RK2CG bei `R1440` 7,5 fps (2026-09-19). Unter denen, die den Boden halten, gewinnt die
// engste, damit die Rate nicht unnoetig steigt.
internal fun chooseAeRange(
    available: List<Pair<Int, Int>>,
    targetFps: Int,
): Pair<Int, Int>? =
    available
        .filter { (lower, _) -> lower >= targetFps }
        .minWithOrNull(compareBy({ it.second }, { it.first }))
