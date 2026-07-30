package com.chesslab.tracker.geometry

import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.ModelSpec

// ONE direction of flow: `ModelSpec` -> `BoardGeometry`. The model declares the size its graph
// takes, the geometry crops to it, and nothing reads it back the other way.
//
// specs/23 phase 01. Before this the app held two input sizes that could not meet: the run's
// `infer_size` (`ModelSpec.outWidth`, specs/22) and `BoardGeometry.outW`, hard-defaulted to 128 with
// nothing wiring the two together. A 96 px model therefore attached, agreed with its own graph, and
// then died on the first observation — `preprocessInto` does not resize, it REQUIRES
// `crop.width == outW` (`core-cnn/Preprocess.kt`).

/**
 * The calibrated board geometry, cropping at the size [spec] declares.
 *
 * Only the crop's OUTPUT size follows the model. `boardSize`, `margin`, `padSide` and `padUp` are
 * the board's own geometry and stay exactly as calibrated: the box cut out of the warp is
 * `boardSize / 8 * (1 + 2 * padSide)` px either way — 240 on this app's defaults — and what the
 * model changes is the size that box is scaled TO.
 *
 * [spec] is null while no model has been read: an absent or unparseable asset, and every moment
 * before the first classifier attaches. Then the geometry keeps [BoardGeometry]'s own defaults,
 * because calibration runs long before a classifier does and nothing in it may come to depend on a
 * model being present.
 */
fun BoardGeometry.withCropSizeOf(spec: ModelSpec?): BoardGeometry =
    if (spec == null) this else copy(outW = spec.outWidth, outH = spec.outHeight)
