package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.KnobKind.BOOL
import com.chesslab.tracker.settings.KnobKind.DOUBLE
import com.chesslab.tracker.settings.KnobKind.INT
import com.chesslab.tracker.settings.KnobKind.OPTIONAL_INT

// The knob catalog: one row per settable `TrackerConfig` field. It is the single table that
// serialization (ConfigCodec), the live-tunable classification and 07a's settings UI all read,
// so a knob added to the seam is added in exactly one place here.
//
// Every value travels as a Double. Ints and Booleans lose nothing at these magnitudes, and a
// uniform numeric channel is what lets the codec, the change diff and the UI stay field-agnostic
// instead of growing a 46-branch `when`.

/** How a knob's Double is rendered and re-read. */
enum class KnobKind { DOUBLE, INT, BOOL, OPTIONAL_INT }

/**
 * The twelve knobs `app.py::_live_tuning_kwargs` accepts, verbatim and in its order. Everything
 * else needs a tracker restart, and the repository says so rather than pretending otherwise.
 */
val LIVE_TUNABLE_KEYS: Set<String> =
    linkedSetOf(
        "motionThr",
        "zThr",
        "censusThr",
        "censusZWeight",
        "occlCensusThr",
        "occlusionColorThr",
        "minGridLineCoverage",
        "motionMargin",
        "overhang",
        "motionHoldS",
        "diffClaheClip",
        "commitLlFloor",
    )

class Knob(
    val key: String,
    val kind: KnobKind,
    val get: (TrackerConfig) -> Double,
    val set: (TrackerConfig, Double) -> TrackerConfig,
) {
    val live: Boolean get() = key in LIVE_TUNABLE_KEYS
}

/** `null` travels as NaN: a numeric map has no null slot, and NaN cannot collide with a real value. */
private fun optInt(v: Double): Int? = if (v.isNaN()) null else v.toInt()

private fun opt(v: Int?): Double = v?.toDouble() ?: Double.NaN

private fun bool(v: Boolean): Double = if (v) 1.0 else 0.0

val KNOBS: List<Knob> =
    listOf(
        Knob("motionThr", DOUBLE, { it.motionThr }, { c, v -> c.copy(motionThr = v) }),
        Knob("motionPxThr", DOUBLE, { it.motionPxThr }, { c, v -> c.copy(motionPxThr = v) }),
        Knob("zThr", DOUBLE, { it.zThr }, { c, v -> c.copy(zThr = v) }),
        Knob("ambiguityMarginLl", DOUBLE, { it.ambiguityMarginLl }, { c, v -> c.copy(ambiguityMarginLl = v) }),
        Knob("reanchorLlFloor", DOUBLE, { it.reanchorLlFloor }, { c, v -> c.copy(reanchorLlFloor = v) }),
        Knob("nudgeTimeoutS", DOUBLE, { it.nudgeTimeoutS }, { c, v -> c.copy(nudgeTimeoutS = v) }),
        Knob("driftWindowS", DOUBLE, { it.driftWindowS }, { c, v -> c.copy(driftWindowS = v) }),
        Knob("maxChanged", INT, { it.maxChanged.toDouble() }, { c, v -> c.copy(maxChanged = v.toInt()) }),
        Knob("censusThr", DOUBLE, { it.censusThr }, { c, v -> c.copy(censusThr = v) }),
        Knob("censusZWeight", DOUBLE, { it.censusZWeight }, { c, v -> c.copy(censusZWeight = v) }),
        Knob("occlCensusThr", DOUBLE, { it.occlCensusThr }, { c, v -> c.copy(occlCensusThr = v) }),
        Knob("cnnConfThr", DOUBLE, { it.cnnConfThr }, { c, v -> c.copy(cnnConfThr = v) }),
        Knob("cnnCooldownS", DOUBLE, { it.cnnCooldownS }, { c, v -> c.copy(cnnCooldownS = v) }),
        Knob("cnnCheckIntervalS", DOUBLE, { it.cnnCheckIntervalS }, { c, v -> c.copy(cnnCheckIntervalS = v) }),
        Knob("verifyWindow", INT, { it.verifyWindow.toDouble() }, { c, v -> c.copy(verifyWindow = v.toInt()) }),
        Knob("verifyTimeoutS", DOUBLE, { it.verifyTimeoutS }, { c, v -> c.copy(verifyTimeoutS = v) }),
        Knob("cnnMinAgreement", DOUBLE, { it.cnnMinAgreement }, { c, v -> c.copy(cnnMinAgreement = v) }),
        Knob("cnnMarginSquares", INT, { it.cnnMarginSquares.toDouble() }, { c, v -> c.copy(cnnMarginSquares = v.toInt()) }),
        Knob("cnnPlyCostSquares", INT, { it.cnnPlyCostSquares.toDouble() }, { c, v -> c.copy(cnnPlyCostSquares = v.toInt()) }),
        Knob("recoveryMaxPlies", INT, { it.recoveryMaxPlies.toDouble() }, { c, v -> c.copy(recoveryMaxPlies = v.toInt()) }),
        Knob("minConfidentBoard", INT, { it.minConfidentBoard.toDouble() }, { c, v -> c.copy(minConfidentBoard = v.toInt()) }),
        Knob("minConfidentRecovery", INT, { it.minConfidentRecovery.toDouble() }, { c, v -> c.copy(minConfidentRecovery = v.toInt()) }),
        Knob("motionMargin", DOUBLE, { it.motionMargin }, { c, v -> c.copy(motionMargin = v) }),
        Knob("overhang", DOUBLE, { it.overhang }, { c, v -> c.copy(overhang = v) }),
        Knob("alignEvery", INT, { it.alignEvery.toDouble() }, { c, v -> c.copy(alignEvery = v.toInt()) }),
        Knob("alignScale", DOUBLE, { it.alignScale }, { c, v -> c.copy(alignScale = v) }),
        Knob("cornerJumpPx", DOUBLE, { it.cornerJumpPx }, { c, v -> c.copy(cornerJumpPx = v) }),
        Knob("motionHoldS", DOUBLE, { it.motionHoldS }, { c, v -> c.copy(motionHoldS = v) }),
        Knob("occlusionColorThr", DOUBLE, { it.occlusionColorThr }, { c, v -> c.copy(occlusionColorThr = v) }),
        Knob("minGridLineCoverage", DOUBLE, { it.minGridLineCoverage }, { c, v -> c.copy(minGridLineCoverage = v) }),
        Knob("diffClaheClip", DOUBLE, { it.diffClaheClip }, { c, v -> c.copy(diffClaheClip = v) }),
        Knob("requireMotionForMove", BOOL, { bool(it.requireMotionForMove) }, { c, v -> c.copy(requireMotionForMove = v != 0.0) }),
        Knob("cleanCommitsOnly", BOOL, { bool(it.cleanCommitsOnly) }, { c, v -> c.copy(cleanCommitsOnly = v != 0.0) }),
        Knob("motionRecencyS", DOUBLE, { it.motionRecencyS }, { c, v -> c.copy(motionRecencyS = v) }),
        Knob("commitLlFloor", DOUBLE, { it.commitLlFloor }, { c, v -> c.copy(commitLlFloor = v) }),
        Knob("detectScale", DOUBLE, { it.detectScale }, { c, v -> c.copy(detectScale = v) }),
        Knob("desyncObsN", INT, { it.desyncObsN.toDouble() }, { c, v -> c.copy(desyncObsN = v.toInt()) }),
        Knob("desyncStandoffObsN", INT, { it.desyncStandoffObsN.toDouble() }, { c, v -> c.copy(desyncStandoffObsN = v.toInt()) }),
        Knob("autoResyncObsN", INT, { it.autoResyncObsN.toDouble() }, { c, v -> c.copy(autoResyncObsN = v.toInt()) }),
        Knob("verifyObsVotes", INT, { it.verifyObsVotes.toDouble() }, { c, v -> c.copy(verifyObsVotes = v.toInt()) }),
        Knob("observerIntervalS", DOUBLE, { it.observerIntervalS }, { c, v -> c.copy(observerIntervalS = v) }),
        Knob("darkLumaThr", DOUBLE, { it.darkLumaThr }, { c, v -> c.copy(darkLumaThr = v) }),
        Knob("cnnVerify", BOOL, { bool(it.cnnVerify) }, { c, v -> c.copy(cnnVerify = v != 0.0) }),
        Knob("liveAlign", BOOL, { bool(it.liveAlign) }, { c, v -> c.copy(liveAlign = v != 0.0) }),
        Knob("usePrior", BOOL, { bool(it.usePrior) }, { c, v -> c.copy(usePrior = v != 0.0) }),
        Knob("boardSize", INT, { it.boardSize.toDouble() }, { c, v -> c.copy(boardSize = v.toInt()) }),
        Knob("settleFramesOverride", OPTIONAL_INT, { opt(it.settleFramesOverride) }, { c, v -> c.copy(settleFramesOverride = optInt(v)) }),
        Knob("avgFramesOverride", OPTIONAL_INT, { opt(it.avgFramesOverride) }, { c, v -> c.copy(avgFramesOverride = optInt(v)) }),
        Knob(
            "confirmFramesOverride",
            OPTIONAL_INT,
            { opt(it.confirmFramesOverride) },
            { c, v -> c.copy(confirmFramesOverride = optInt(v)) },
        ),
    )
