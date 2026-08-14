package com.chesslab.tracker.sim

import com.chesslab.tracker.geometry.GeometryScan
import com.chesslab.tracker.geometry.ScannedGeometry
import com.chesslab.tracker.geometry.geometryRefusals
import com.chesslab.tracker.geometry.geometryReport
import java.io.File

// specs/52 phase 01 — the harness measures its own geometry, with the code that ships.
//
// The measurement itself lives in `:tracker-runtime` (`GeometryScan`), beside `rawQuadOf` /
// `refinedQuad`, because a geometry measured by `:core-geometry` is a statement about the phone
// while one measured by anything else is a statement about that something else. This file only
// drives it with this harness's decoder and enforces the refusal.

/**
 * Decode once, measure every tenth frame, and either return the evidence-backed geometry or
 * refuse the video with the reasons.
 *
 * Refusal is an `error`, not a warning: a label on crooked geometry is worse than no label —
 * the crops straddle their grooves while every count downstream looks healthy (2026-07-31, when
 * the whole corpus turned out to be 3-6 px out).
 */
internal fun measuredGeometryOf(video: File): ScannedGeometry {
    val scan = GeometryScan(videoFps(video)) { println("  $it") }
    forEachFrameTimed(video) { _, mat, timestampMs -> scan.offer(mat, timestampMs) }
    val measured =
        requireNotNull(scan.result()) {
            "no sampled frame of ${video.name} aligned to the board's grid — is the board in shot?"
        }
    println(geometryReport(measured))
    val refusals = geometryRefusals(measured)
    require(refusals.isEmpty()) {
        "this footage cannot become a candidate:\n  - " + refusals.joinToString("\n  - ")
    }
    return measured
}
