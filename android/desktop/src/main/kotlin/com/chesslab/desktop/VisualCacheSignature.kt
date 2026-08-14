package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry

/**
 * Only inputs that can change cached observations or LiveAlign outputs.
 * Engine thresholds consume these observations but cannot change them.
 *
 * ONE config, the run's: the second `alignConfig` parameter read the settings repository, so a
 * cache built under a `config=` recording's alignment knobs signed itself as a defaults run.
 */
internal fun visualCacheSignature(
    config: TrackerConfig,
    geometry: BoardGeometry,
    quad: FloatArray,
    source: FrameSource,
    stride: Int,
    lens: Boolean,
): String =
    listOf(
        "observer=${config.cnnVerify},${config.observerIntervalS}",
        "align=${config.liveAlign},${config.alignEvery},${config.alignScale}",
        "geometry=$geometry",
        "quad=${quad.joinToString(",")}",
        "delivered=${source.delivered}",
        "fps=${source.fps}",
        "stride=$stride",
        "lens=$lens",
    ).joinToString("|")
