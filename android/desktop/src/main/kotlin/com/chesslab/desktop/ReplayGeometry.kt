package com.chesslab.desktop

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.settings.BoardOrientation
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/**
 * The board as the RECORDING describes it, not as four corners alone can.
 *
 * `boardGeometryFor` knows only the quad and stamps `margins4(0.045)` and white POV over
 * everything else: a game recorded from Black's side is then cut 180 degrees around, and a
 * candidate with another marker outset has every square boundary shifted. Both are on disk —
 * `candidate.json` carries the margin, the session's `settings.json` the orientation, and where
 * it does not the assumption is printed rather than made silently.
 */
internal fun replayBoardGeometry(
    quad: FloatArray,
    dir: File?,
    settings: File?,
): BoardGeometry {
    val base = boardGeometryFor(quad)
    val margin = dir?.let { marginFromCandidate(File(it, "candidate.json")) }
    val recorded = recordedWhitePov(settings) ?: dir?.let { recordedWhitePov(File(it, "settings.json")) }
    val pov =
        when (recorded) {
            null -> "white POV ASSUMED — the recording stored no orientation"
            true -> "white POV"
            false -> "BLACK POV"
        }
    println("geometry: margin ${margin ?: base.margin.first()} · $pov")
    return base.copy(margin = margin?.let(::margins4) ?: base.margin, whitePov = recorded ?: true)
}

private fun marginFromCandidate(candidate: File): Double? =
    runCatching {
        Json
            .parseToJsonElement(candidate.readText())
            .jsonObject
            .getValue("geometry")
            .jsonObject
            .getValue("margin")
            .jsonPrimitive.double
    }.getOrNull()

/** `AppSettings.orientation` out of a session's `settings.json`, or null where none was written. */
private fun recordedWhitePov(file: File?): Boolean? {
    val name =
        runCatching {
            Json
                .parseToJsonElement(file?.takeIf(File::isFile)?.readText() ?: return null)
                .jsonObject["app"]
                ?.jsonObject
                ?.get("orientation")
                ?.jsonPrimitive
                ?.contentOrNull
        }.getOrNull() ?: return null
    return BoardOrientation.entries.firstOrNull { it.name == name }?.whitePov
}
