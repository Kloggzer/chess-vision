package com.chesslab.tracker.cnn

import com.chesslab.cnn.calibratedConfThr
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.CropClahe

/** Aus der `config.json` des Modells: ein CLAHE-Modell ohne CLAHE zu bedienen ist eine stille Train/Serve-Luecke. */
fun claheSpecFor(spec: ModelSpec?): ModelSpec? = spec?.takeIf { it.claheClip > 0.0 }

fun cropClaheFor(spec: ModelSpec?): CropClahe? =
    claheSpecFor(spec)?.let { CropClahe(it.claheClip, it.claheTile, it.claheMinMean, it.claheMaxMean) }

/** Die Schwelle folgt aus der Guete des MODELLS, keine Engine-Konstante (`docs/occlusion-gate.md`). */
fun TrackerConfig.withCoverageGateOf(
    spec: ModelSpec?,
    overridden: Set<String> = emptySet(),
    warn: (String) -> Unit,
): TrackerConfig {
    if (spec?.coverageOutput == true && spec.coverageGate == null) {
        warn(
            "model declares coverage_output but no measured coverage_gate — " +
                "pOccludedThr falls back to the legacy default 0.5 (docs/occlusion-gate.md)",
        )
    }
    // Sonst misst ein A/B auf diesem Knopf zweimal dasselbe und nennt die Schwelle folgenlos.
    if ("pOccludedThr" in overridden && spec?.coverageGate != null) {
        warn("set:pOccludedThr wird vom coverage_gate des Modells (${spec.coverageGate}) verworfen")
    }
    // Nur MIT der Spalte: ohne `coverage_output` ist `pOccluded` immer 0,0.
    if (spec?.coverageOutput != true) return this
    // Die Konfidenz-Huerde bedeutet je Modell etwas anderes, weil jedes anders ueberkonfident ist.
    val gated = spec.coverageGate?.let { copy(pOccludedThr = it) } ?: this
    return gated.copy(cnnConfThr = calibratedConfThr(cnnConfThr, spec.temperature, spec.classes.size))
}
