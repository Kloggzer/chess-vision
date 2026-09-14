package com.chesslab.tracker.geometry

import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.ModelSpec
import java.util.Locale

// ONE direction of flow: `ModelSpec` -> `BoardGeometry`. The model declares the crop, the geometry
// cuts it, and nothing reads it back the other way.
//
// specs/23 phase 01 wired the SIZE. Before it the app held two input sizes that could not meet: the
// run's `infer_size` (`ModelSpec.outWidth`, specs/22) and `BoardGeometry.outW`, hard-defaulted to
// 128 with nothing wiring the two together. A 96 px model therefore attached, agreed with its own
// graph, and then died on the first observation — `preprocessInto` does not resize, it REQUIRES
// `crop.width == outW` (`core-cnn/Preprocess.kt`).
//
// specs/45 wired the BOX. The pads decide what is IN the picture and were the board's business here
// until 2026-08-06, which is how a model trained on 1.10-cell crops came to be served 1.20-cell
// ones: the whole real corpus was cut at `pad_side` 0.05 and this app's default is 0.10. That
// failure has no symptom — it shifts all 64 squares of every frame by the same few percent, in
// training and at inference, and nothing throws.

/**
 * The calibrated board geometry, cropping exactly as [spec] declares.
 *
 * The model supplies `outW`/`outH` and, when it declares it, `padSide`. `boardSize` and
 * `margin` stay the board's own: they say where the board IS in the image, which no model can know.
 *
 * A [spec] that declares no crop keeps the profile's pad — LEGACY, and loud rather than silent
 * ([cropLine], the diagnostics `run_start` row and the debug screen's CNN panel all report it. A
 * silent fallback here is the original bug).
 *
 * [spec] is null while no model has been read: an absent or unparseable asset, and every moment
 * before the first classifier attaches. Then the geometry keeps [BoardGeometry]'s own defaults,
 * because calibration runs long before a classifier does and nothing in it may come to depend on a
 * model being present.
 */
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

/**
 * What the crops are being cut at, and whether the model asked for it — one line, for the run
 * header and the debug panel.
 *
 * [geom] is the geometry the pixels actually come from, so the legacy case still reports a real
 * value: "this is the pad you are being served, and no model chose it".
 */
fun cropLine(
    spec: ModelSpec?,
    geom: BoardGeometry,
): String {
    // ROOT, not the device locale: a decimal comma in a diagnostics row is a value nobody can
    // parse back, and this line is read by machines as often as by people.
    val pads = String.format(Locale.ROOT, "side=%.3f", geom.padSide)
    return if (spec?.declaresCrop == true) pads else "$pads (LEGACY: the model declares no crop)"
}
