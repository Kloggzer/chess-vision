package com.chesslab.tracker.geometry

import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.ModelSpec
import java.util.Locale

// ONE direction of flow: `ModelSpec` -> `BoardGeometry`. Wrong size died on the first observation
// (`preprocessInto` REQUIRES `crop.width == outW`); a wrong pad has no symptom at all — 1.10-cell crops were
// served as 1.20-cell ones, every square shifted the same few percent, and nothing threw.

/** `boardSize` and `margin` stay the board's own. A [spec] without a crop keeps the profile's pad — LEGACY, and
 *  loud ([cropLine]). Null [spec] keeps the defaults: calibration may never depend on a model being present. */
fun BoardGeometry.withCropOf(spec: ModelSpec?): BoardGeometry =
    if (spec == null) {
        this
    } else {
        copy(
            outW = spec.outWidth,
            outH = spec.outHeight,
            padSide = spec.padSide ?: padSide,
        )
    }

/** [geom] is the geometry the pixels come from, so the legacy case still reports a real value. */
fun cropLine(
    spec: ModelSpec?,
    geom: BoardGeometry,
): String {
    // ROOT: a decimal comma in a diagnostics row is a value nobody can parse back.
    val pads = String.format(Locale.ROOT, "side=%.3f", geom.padSide)
    return if (spec?.declaresCrop == true) pads else "$pads (LEGACY: the model declares no crop)"
}
