package com.chesslab.tracker.runtime

import java.io.File

/** The names are the contract: `slice` reads `sessions/<id>/`, `GameStore` reads `games/index.json`. Renaming one
 *  here renames it on disk. */
class AppPaths(
    val filesDir: File,
) {
    val games: File get() = File(filesDir, "games")

    val sessions: File get() = File(filesDir, "sessions")
}
