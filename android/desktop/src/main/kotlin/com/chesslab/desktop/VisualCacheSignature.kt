package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry

/**
 * Only inputs that can change cached observations or LiveAlign outputs.
 * Engine thresholds consume these observations but cannot change them.
 */
internal fun visualCacheSignature(
    config: TrackerConfig,
    alignConfig: TrackerConfig,
    geometry: BoardGeometry,
    quad: FloatArray,
    source: FrameSource,
    stride: Int,
    lens: Boolean,
): String =
    listOf(
        "observer=${config.cnnVerify},${config.observerIntervalS}",
        "align=${alignConfig.liveAlign},${alignConfig.alignEvery},${alignConfig.alignScale}",
        "geometry=$geometry",
        "quad=${quad.joinToString(",")}",
        "delivered=${source.delivered}",
        "fps=${source.fps}",
        "stride=$stride",
        "lens=$lens",
    ).joinToString("|")
