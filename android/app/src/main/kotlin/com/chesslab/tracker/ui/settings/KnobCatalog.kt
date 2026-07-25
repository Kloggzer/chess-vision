package com.chesslab.tracker.ui.settings

import com.chesslab.tracker.settings.KNOBS
import com.chesslab.tracker.ui.settings.KnobGroup.CAMERA
import com.chesslab.tracker.ui.settings.KnobGroup.CNN
import com.chesslab.tracker.ui.settings.KnobGroup.EVIDENCE
import com.chesslab.tracker.ui.settings.KnobGroup.GEOMETRY
import com.chesslab.tracker.ui.settings.KnobGroup.MOTION
import com.chesslab.tracker.ui.settings.KnobGroup.SCORING
import com.chesslab.tracker.ui.settings.KnobGroup.VETOES

// Every `TrackerConfig` field, grouped, with its range and one line of why. The help text is
// condensed from the comments at `src/chesslab/config.py:590-646` — those comments carry the
// live-tuning history (why censusThr is 40 and not 160, why occlusionColorThr is 3.0 and not the
// historic 1.5), which is exactly what someone tuning on a strange board under a strange lamp
// needs. Numbers live HERE and nowhere else; no composable carries a literal.
//
// A knob added to `TrackerConfig` without a row here fails `KnobCatalogTest` — and `row()` fails
// loudly at construction if the key is not in the persistence table.

private val BY_KEY = KNOBS.associateBy { it.key }

private fun row(
    key: String,
    group: KnobGroup,
    min: Double,
    max: Double,
    step: Double,
    help: String,
) = KnobUi(BY_KEY.getValue(key), group, min, max, step, help)

private fun flag(
    key: String,
    group: KnobGroup,
    help: String,
) = KnobUi(BY_KEY.getValue(key), group, 0.0, 1.0, 1.0, help)

private fun count(
    key: String,
    group: KnobGroup,
    min: Double,
    max: Double,
    help: String,
) = KnobUi(BY_KEY.getValue(key), group, min, max, 1.0, help)

val KNOB_CATALOG: List<KnobUi> =
    listOf(
        row(
            "motionThr",
            MOTION,
            0.0,
            5.0,
            0.05,
            "Motion gate: PERCENT of strongly-changed pixels. Low on purpose — a slow hand only moves a thin " +
                "edge band between frames; wobble stays ~0 thanks to blur + motionPxThr.",
        ),
        row(
            "motionPxThr",
            MOTION,
            0.0,
            80.0,
            1.0,
            "Per-pixel delta above which a pixel counts as changed — desk wobble shifts everything by ~1 px " +
                "(tiny deltas); a hand produces a compact region of strong deltas.",
        ),
        row("motionMargin", MOTION, 0.0, 0.5, 0.01, "Motion ROI beyond the board edge (fraction of board edge)."),
        row("motionHoldS", MOTION, 0.0, 3.0, 0.05, "Seconds the board must be motion-free before detection resumes (wall time)."),
        flag("requireMotionForMove", MOTION, "Only commit a move if a hand entered since the last reference (drift guard)."),
        row("motionRecencyS", MOTION, 0.0, 120.0, 1.0, "How long a hand entry stays 'recent' for the motion gate."),
        row(
            "darkLumaThr",
            MOTION,
            0.0,
            60.0,
            1.0,
            "Pre-CLAHE mean luma below which the frame is too dark to detect on; CLAHE would turn sensor " +
                "noise into phantom changed squares.",
        ),
        row("zThr", EVIDENCE, 0.5, 10.0, 0.1, "z-Score above which a square is considered 'changed'."),
        row(
            "censusThr",
            EVIDENCE,
            0.0,
            255.0,
            1.0,
            "Structural change (census, 0..255); higher ⇒ more squares veto as shadow. 160 vetoed real " +
                "dark-on-dark ARRIVALS as shadows (black rook onto dark f8 → O-O blocked, Rg8 committed). " +
                "40 is the clip-validated floor; real cast shadows stay below it.",
        ),
        row(
            "censusZWeight",
            EVIDENCE,
            0.0,
            3.0,
            0.1,
            "Structural evidence fusion: z_eff = max(z_gray, w·z_census). Census is illumination-invariant " +
                "structure — lifts dark-on-dark moves the gray absdiff misses without raising zThr. 0 = off.",
        ),
        row("overhang", EVIDENCE, 0.0, 1.0, 0.05, "Extend diff/occlusion cells toward the back rank (fraction of cell)."),
        row("diffClaheClip", EVIDENCE, 0.0, 8.0, 0.1, "CLAHE contrast boost on the diff image (0=off; ~2-3 lifts dark moves)."),
        row("detectScale", EVIDENCE, 0.25, 1.0, 0.05, "Detection warp scale (0.5 = half-res board; 1.0 = off)."),
        count(
            "settleFramesOverride",
            EVIDENCE,
            1.0,
            10.0,
            "Frames the board must be still before a baseline is taken. Auto = Python's CNN-conditional 3 / 4.",
        ),
        count(
            "avgFramesOverride",
            EVIDENCE,
            1.0,
            10.0,
            "Frames averaged into the current/reference image. Auto = Python's CNN-conditional 2 / 3.",
        ),
        count(
            "confirmFramesOverride",
            EVIDENCE,
            1.0,
            10.0,
            "Identical detections a candidate needs before it commits. Auto = Python's CNN-conditional 1 / 2.",
        ),
        count("maxChanged", VETOES, 1.0, 20.0, "Occlusion gate: more changed squares than this and the frame is a hand, not a move."),
        row(
            "occlCensusThr",
            VETOES,
            0.0,
            255.0,
            1.0,
            "Baseline occlusion needs structure above this (census 0..255 ≈ Hamming 0.75): strong absdiff " +
                "WITHOUT structure/chroma anomaly is a cast shadow, not a hand. 0 = legacy.",
        ),
        row(
            "occlusionColorThr",
            VETOES,
            0.0,
            10.0,
            0.1,
            "Color-outlier veto: Mahalanobis sigma vs board gamut (lower=more sensitive, 0=off). The historic " +
                "1.5 was 'tuned' while the gamut was never built (veto dead); now that it is live, 1.5 " +
                "over-fires — 3.0 is the validated-conservative start.",
        ),
        row("minGridLineCoverage", VETOES, 0.0, 1.0, 0.05, "Grid-line occlusion gate: min visible-line fraction (0=off)."),
        row("cornerJumpPx", VETOES, 0.0, 40.0, 0.5, "Warp corner jump ⇒ base truth geometrically invalid → reacquire."),
        row("ambiguityMarginLl", SCORING, 0.0, 10.0, 0.1, "best − second in log-likelihood units (~e² factor)."),
        row(
            "commitLlFloor",
            SCORING,
            0.0,
            20.0,
            0.1,
            "Min ABSOLUTE loglik a voting candidate needs to commit (0=off). A sole-viable candidate has " +
                "infinite margin, so only an absolute floor stops weak phantoms (live: f6h5 @ 0.44 swallowed " +
                "a castle; real moves score ~12-24). Endpoint candidates are exempt.",
        ),
        row("reanchorLlFloor", SCORING, -20.0, 0.0, 0.5, "Re-anchor only if even the best move LL lies below this."),
        row("llK", SCORING, 0.1, 5.0, 0.1, "Log-likelihood temperature (constructor-only in Python)."),
        flag("usePrior", SCORING, "Use the move prior as a tie-break."),
        row("nudgeTimeoutS", SCORING, 0.0, 60.0, 1.0, "Nudge patch (occupied squares) after this many seconds stuck."),
        row("driftWindowS", SCORING, 0.0, 180.0, 1.0, "Drift patch (empty squares) — more conservative."),
        row("cnnConfThr", CNN, 0.0, 1.0, 0.01, "CNN square confidence 'reliable'."),
        row("cnnCooldownS", CNN, 0.0, 30.0, 0.5, "Minimum interval between recovery observations."),
        row("cnnCheckIntervalS", CNN, 0.0, 120.0, 1.0, "Periodic CNN check."),
        count("verifyWindow", CNN, 1.0, 30.0, "Max CNN frames per pre-commit verify."),
        row("cnnMinAgreement", CNN, 0.5, 1.0, 0.01, "Recovery/verify agreement threshold."),
        count("cnnMarginSquares", CNN, 0.0, 8.0, "Recovery margin in SQUARES (capture = 1 square difference)."),
        count("recoveryMaxPlies", CNN, 1.0, 10.0, "CNN deep recovery: max half-moves the conflict-guided search may bridge."),
        count("minConfidentBoard", CNN, 0.0, 64.0, "Whole-board match needs plenty of clear view."),
        count("minConfidentRecovery", CNN, 0.0, 64.0, "Recovery remains operational with partial occlusion."),
        count("desyncObsN", CNN, 1.0, 10.0, "Consecutive stable-mismatch CNN ticks before the illegal-move alarm."),
        count("verifyObsVotes", CNN, 1.0, 5.0, "Consecutive same-outcome CNN observations per verify decision (never act on one glance)."),
        row(
            "observerIntervalS",
            CNN,
            0.0,
            5.0,
            0.05,
            "Min seconds between CNN observation starts; 0 = free-running (desktop). Raise on " +
                "battery/thermal-constrained devices (Android port).",
        ),
        flag("cnnVerify", CNN, "Run the pre-commit CNN verify at all."),
        count("alignEvery", CAMERA, 1.0, 30.0, "ArUco marker detection every N-th frame (most expensive per-frame op; camera fixed)."),
        row(
            "alignScale",
            CAMERA,
            0.25,
            1.0,
            0.05,
            "ArUco on a downscaled frame (0.5 = half-res, ~3× faster; ±1 px inside the tracker dead-zone).",
        ),
        flag("liveAlign", CAMERA, "Re-detect the markers while tracking."),
        row("reconnectGraceS", CAMERA, 0.0, 30.0, 0.5, "Auto-reattach the camera after this many seconds of no frames (0=off)."),
        row("boardSize", GEOMETRY, 640.0, 2560.0, 32.0, "Full-resolution warp size; detSize = boardSize × detectScale."),
    )

fun knobsIn(group: KnobGroup): List<KnobUi> = KNOB_CATALOG.filter { it.group == group }
