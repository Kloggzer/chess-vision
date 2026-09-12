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

/**
 * This config with only the twelve LIVE knobs taken from [live] — what a RUNNING stack obeys.
 *
 * The repository is not every host's run config: a replay leaves it at `ConfigCodec.defaults`, so
 * a restart-only knob read off it is a DEFAULT served over the value the stack was built with
 * (2026-08-14: `set:cnnVerify=false` still emitted 882 observations).
 */
fun TrackerConfig.withLiveKnobsOf(live: TrackerConfig): TrackerConfig =
    KNOBS.filter { it.live }.fold(this) { config, knob -> knob.set(config, knob.get(live)) }

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
        Knob("nudgeTimeoutS", DOUBLE, { it.nudgeTimeoutS }, { c, v -> c.copy(nudgeTimeoutS = v) }),
        Knob("driftWindowS", DOUBLE, { it.driftWindowS }, { c, v -> c.copy(driftWindowS = v) }),
        Knob("maxChanged", INT, { it.maxChanged.toDouble() }, { c, v -> c.copy(maxChanged = v.toInt()) }),
        Knob("censusThr", DOUBLE, { it.censusThr }, { c, v -> c.copy(censusThr = v) }),
        Knob("censusZWeight", DOUBLE, { it.censusZWeight }, { c, v -> c.copy(censusZWeight = v) }),
        Knob("occlCensusThr", DOUBLE, { it.occlCensusThr }, { c, v -> c.copy(occlCensusThr = v) }),
        Knob("cnnConfThr", DOUBLE, { it.cnnConfThr }, { c, v -> c.copy(cnnConfThr = v) }),
        Knob("cnnCooldownS", DOUBLE, { it.cnnCooldownS }, { c, v -> c.copy(cnnCooldownS = v) }),
        Knob("cnnCheckIntervalS", DOUBLE, { it.cnnCheckIntervalS }, { c, v -> c.copy(cnnCheckIntervalS = v) }),
        Knob("cnnEvalOnSettle", BOOL, { bool(it.cnnEvalOnSettle) }, { c, v -> c.copy(cnnEvalOnSettle = v != 0.0) }),
        Knob("pOccludedThr", DOUBLE, { it.pOccludedThr }, { c, v -> c.copy(pOccludedThr = v) }),
        Knob("refusedStreakForEval", INT, { it.refusedStreakForEval.toDouble() }, { c, v -> c.copy(refusedStreakForEval = v.toInt()) }),
        Knob("alarmDeferObs", INT, { it.alarmDeferObs.toDouble() }, { c, v -> c.copy(alarmDeferObs = v.toInt()) }),
        Knob("alarmMinS", DOUBLE, { it.alarmMinS }, { c, v -> c.copy(alarmMinS = v) }),
        Knob("verifyWindow", INT, { it.verifyWindow.toDouble() }, { c, v -> c.copy(verifyWindow = v.toInt()) }),
        Knob("verifyTimeoutS", DOUBLE, { it.verifyTimeoutS }, { c, v -> c.copy(verifyTimeoutS = v) }),
        Knob("cnnMinAgreement", DOUBLE, { it.cnnMinAgreement }, { c, v -> c.copy(cnnMinAgreement = v) }),
        Knob("cnnMarginSquares", INT, { it.cnnMarginSquares.toDouble() }, { c, v -> c.copy(cnnMarginSquares = v.toInt()) }),
        Knob("cnnPlyCostSquares", INT, { it.cnnPlyCostSquares.toDouble() }, { c, v -> c.copy(cnnPlyCostSquares = v.toInt()) }),
        Knob("recoveryMaxPlies", INT, { it.recoveryMaxPlies.toDouble() }, { c, v -> c.copy(recoveryMaxPlies = v.toInt()) }),
        Knob("minConfidentBoard", INT, { it.minConfidentBoard.toDouble() }, { c, v -> c.copy(minConfidentBoard = v.toInt()) }),
        Knob("minConfidentRecovery", INT, { it.minConfidentRecovery.toDouble() }, { c, v -> c.copy(minConfidentRecovery = v.toInt()) }),
        Knob("cnnColorAxis", BOOL, { if (it.cnnColorAxis) 1.0 else 0.0 }, { c, v -> c.copy(cnnColorAxis = v != 0.0) }),
        Knob("motionMargin", DOUBLE, { it.motionMargin }, { c, v -> c.copy(motionMargin = v) }),
        Knob("overhang", DOUBLE, { it.overhang }, { c, v -> c.copy(overhang = v) }),
        Knob("alignEvery", INT, { it.alignEvery.toDouble() }, { c, v -> c.copy(alignEvery = v.toInt()) }),
        Knob("alignScale", DOUBLE, { it.alignScale }, { c, v -> c.copy(alignScale = v) }),
        Knob("cornerJumpPx", DOUBLE, { it.cornerJumpPx }, { c, v -> c.copy(cornerJumpPx = v) }),
        Knob("motionHoldS", DOUBLE, { it.motionHoldS }, { c, v -> c.copy(motionHoldS = v) }),
        // NOT in LIVE_TUNABLE_KEYS: that list is `app.py::_live_tuning_kwargs` verbatim and this
        // knob has no Python counterpart. It takes a tracker restart, and the catalog says so.
        Knob("occluderHoldS", DOUBLE, { it.occluderHoldS }, { c, v -> c.copy(occluderHoldS = v) }),
        Knob("verifyObserveNow", BOOL, { bool(it.verifyObserveNow) }, { c, v -> c.copy(verifyObserveNow = v != 0.0) }),
        Knob("earlyCommitObs", INT, { it.earlyCommitObs.toDouble() }, { c, v -> c.copy(earlyCommitObs = v.toInt()) }),
        Knob("commitHoldS", DOUBLE, { it.commitHoldS ?: Double.NaN }, { c, v -> c.copy(commitHoldS = if (v.isNaN()) null else v) }),
        Knob("occlusionColorThr", DOUBLE, { it.occlusionColorThr }, { c, v -> c.copy(occlusionColorThr = v) }),
        Knob("minGridLineCoverage", DOUBLE, { it.minGridLineCoverage }, { c, v -> c.copy(minGridLineCoverage = v) }),
        Knob("diffClaheClip", DOUBLE, { it.diffClaheClip }, { c, v -> c.copy(diffClaheClip = v) }),
        Knob("requireMotionForMove", BOOL, { bool(it.requireMotionForMove) }, { c, v -> c.copy(requireMotionForMove = v != 0.0) }),
        Knob("cleanCommitsOnly", BOOL, { bool(it.cleanCommitsOnly) }, { c, v -> c.copy(cleanCommitsOnly = v != 0.0) }),
        Knob("gridHandGate", BOOL, { bool(it.gridHandGate) }, { c, v -> c.copy(gridHandGate = v != 0.0) }),
        Knob("modelHandGate", BOOL, { bool(it.modelHandGate) }, { c, v -> c.copy(modelHandGate = v != 0.0) }),
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
        Knob("windowEndBothEnds", BOOL, { bool(it.windowEndBothEnds) }, { c, v -> c.copy(windowEndBothEnds = v != 0.0) }),
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
