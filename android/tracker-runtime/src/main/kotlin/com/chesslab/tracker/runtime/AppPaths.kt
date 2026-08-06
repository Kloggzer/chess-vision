package com.chesslab.tracker.runtime

import java.io.File

/**
 * Where the app keeps what it produces, expressed as plain files.
 *
 * The directories were reachable only through `Context.filesDir`, which pinned every wiring
 * function that needed a path to Android — for the sake of one property. A host that has a
 * directory can now say so: the phone passes `filesDir`, a desktop passes a repo path, and the
 * code in between neither knows nor cares.
 *
 * The names are the contract: `slice` on the PC reads `sessions/<id>/`, and `GameStore` reads
 * `games/index.json`. Renaming one here renames it on disk.
 */
class AppPaths(
    val filesDir: File,
) {
    val games: File get() = File(filesDir, "games")

    val sessions: File get() = File(filesDir, "sessions")
}
