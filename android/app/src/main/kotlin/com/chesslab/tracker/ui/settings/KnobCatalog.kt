package com.chesslab.tracker.ui.settings

import com.chesslab.tracker.settings.KNOBS
import com.chesslab.tracker.ui.settings.KnobGroup.CAMERA
import com.chesslab.tracker.ui.settings.KnobGroup.CNN
import com.chesslab.tracker.ui.settings.KnobGroup.EVIDENCE
import com.chesslab.tracker.ui.settings.KnobGroup.MOTION
import com.chesslab.tracker.ui.settings.KnobGroup.SCORING
import com.chesslab.tracker.ui.settings.KnobGroup.VETOES

// The knobs a person at a real board turns, grouped, with their range and one line of why. The
// help text is condensed from the comments in `src/chesslab/config.py` — those comments carry the
// live-tuning history (why censusThr is 40 and not 160, why occlusionColorThr is 3.0 and not the
// historic 1.5), which is exactly what someone tuning on a strange board under a strange lamp
// needs. Numbers live HERE and nowhere else; no composable carries a literal.
//
// **This was "every `TrackerConfig` field" until 2026-08-02, and that rule was the whole reason
// the screen had 46 sliders.** Nobody ever asked which of them a human should be offered; the test
// asked only that each field had a row, so each field got one. A knob is now either here or in
// [NOT_A_SETTING] with the reason it is not a decision, and `KnobCatalogTest` asserts the two
// tables partition the seam exactly. `row()` still fails loudly at construction if the key is not
// in the persistence table.

private val BY_KEY = KNOBS.associateBy { it.key }

/**
 * Persisted and settable in code, deliberately absent from the screen — with the reason.
 *
 * None of these is a preference. Each is either a measurement the app makes for itself, a seam the
 * clip harness needs, or a value whose usable range is empty. Offering them as sliders invited a
 * user to spend an evening on a knob that at best does nothing and at worst quietly stops the
 * tracker. They stay in `TrackerConfig` because `TRACK_DEFAULTS` parity and the parity fixtures
 * depend on the field set, not because anyone should move them.
 */
val NOT_A_SETTING: Map<String, String> =
    linkedMapOf(
        "boardSize" to
            "Measured by the calibration profile from the detected quad, and copied into the config so the " +
            "engine can derive its square boxes. A value that disagrees with the profile makes the frame " +
            "loop refuse every plane, silently.",
        "detectScale" to
            "Half-res detection warp. Coupled to the board size by an integrality rule the profile enforces " +
            "in steps of 16 (`boardSize / 2 / 8` must stay whole); a free slider can land between squares.",
        "alignScale" to
            "ArUco on a downscaled frame. Measured, not chosen: ~3x faster at ±1 px, which is inside the " +
            "tracker's own dead-zone.",
        "reanchorLlFloor" to
            "Inert at -4.0 and harmful above -3.0 — the viability filter already bounds a move's score above " +
            "this floor, so the comparison it guards cannot be true. See the field's own comment.",
        "cnnMarginSquares" to
            "Cannot be raised: a capture and its non-capture sibling differ by exactly one square, so 2 would " +
            "refuse every capture. Cannot be lowered below 1 either.",
        "settleFramesOverride" to
            "The clip harness's seam for pinning the CNN-conditional frame counts (blender-castle sets 3). " +
            "On a phone the answer is always 'auto'.",
        "avgFramesOverride" to
            "As settleFramesOverride — and this one also sets the plane ring's depth, so a hand-picked value " +
            "changes how many frames the engine may hold at once.",
        "confirmFramesOverride" to
            "As settleFramesOverride. Its shipped value is also an open judgement call recorded in " +
            "specs/39-what-the-tracker-remembers, which is a human's to make and not a slider's.",
    )

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
        row(
            "motionMargin",
            MOTION,
            0.0,
            0.5,
            0.01,
            "How far past the board edge a hand is watched for. Raise it if reaching in is missed, lower it if" +
                " people walking past the table count as motion.",
        ),
        row(
            "motionHoldS",
            MOTION,
            0.0,
            3.0,
            0.05,
            "How long the board must be still before the move is read. Half the delay between letting go of a" +
                " piece and hearing it announced; raise it if moves commit while your hand is still over the board.",
        ),
        flag("requireMotionForMove", MOTION, "Only commit a move if a hand entered since the last reference (drift guard)."),
        row(
            "motionRecencyS",
            MOTION,
            0.0,
            120.0,
            1.0,
            "How long a hand entry stays 'recent' for the motion gate. 0 = OFF (no time limit) — it " +
                "used to mean 'reject everything', because by the time a candidate exists the hand " +
                "is already gone and the age is never zero.",
        ),
        row(
            "darkLumaThr",
            MOTION,
            0.0,
            60.0,
            1.0,
            "Pre-CLAHE mean luma below which the frame is too dark to detect on; CLAHE would turn sensor " +
                "noise into phantom changed squares.",
        ),
        row(
            "zThr",
            EVIDENCE,
            0.5,
            10.0,
            0.1,
            "How much a square must change to count as touched. Raise it if the tracker invents moves as the" +
                " light shifts; lower it if real moves between same-coloured squares go unnoticed.",
        ),
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
        row(
            "overhang",
            EVIDENCE,
            0.0,
            1.0,
            0.05,
            "How far a piece leans out of its own square toward the back rank. Raise it for a low camera where" +
                " tall pieces cover the square behind them.",
        ),
        row("diffClaheClip", EVIDENCE, 0.0, 8.0, 0.1, "CLAHE contrast boost on the diff image (0=off; ~2-3 lifts dark moves)."),
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
        row(
            "minGridLineCoverage",
            VETOES,
            0.0,
            1.0,
            0.05,
            "How much of the board grid must stay visible for the frame to be used at all. Raise it to pause" +
                " harder while an arm is across the board; 0 turns the check off.",
        ),
        row(
            "cornerJumpPx",
            VETOES,
            0.0,
            40.0,
            0.5,
            "How far a board corner may shift before the tracker throws away what it was comparing against and" +
                " re-reads the board. Lower it if a knocked table leaves phantom moves behind.",
        ),
        row(
            "ambiguityMarginLl",
            SCORING,
            0.0,
            10.0,
            0.1,
            "How far ahead the best explanation must be before it is committed. Raise it if the wrong one of two" +
                " similar moves gets announced; the cost is more moves that need the tie-break below.",
        ),
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
        flag(
            "usePrior",
            SCORING,
            "When two moves fit equally well, prefer the more chess-like one (a capture, a check, a move" +
                " forward). The announcement then says it was decided by the prior.",
        ),
        row(
            "nudgeTimeoutS",
            SCORING,
            0.0,
            60.0,
            1.0,
            "How long a nudged piece may sit unexplained before the tracker accepts it as the new normal and" +
                "carries on. Lower it if a j’adoube leaves the tracker stuck.",
        ),
        row(
            "driftWindowS",
            SCORING,
            0.0,
            180.0,
            1.0,
            "The same for an EMPTY square that keeps looking changed, and deliberately far slower: a changing" +
                "empty square may also be a move nobody saw.",
        ),
        row(
            "cnnConfThr",
            CNN,
            0.0,
            1.0,
            0.01,
            "How sure the model must be about one square before its reading is used at all. Raise it if the CNN" +
                "raises alarms on a board it is misreading; lower it if it never has an opinion.",
        ),
        row(
            "cnnCooldownS",
            CNN,
            0.0,
            30.0,
            0.5,
            "How often the model may re-read the whole board while the tracker is stuck. It is the floor on how" +
                "fast a lost position can be recovered.",
        ),
        row(
            "cnnCheckIntervalS",
            CNN,
            0.0,
            120.0,
            1.0,
            "How often the model re-reads a quiet board. It is the only thing that notices the board drifting" +
                "out from under a slow game.",
        ),
        count(
            "verifyWindow",
            CNN,
            1.0,
            30.0,
            "How many model readings one move may wait for before it is decided on what is in. The seconds" +
                "deadline below usually runs out first.",
        ),
        row(
            "verifyTimeoutS",
            CNN,
            0.3,
            5.0,
            0.1,
            "...and the same deadline in SECONDS. verifyWindow counts OBSERVATIONS and what " +
                "one costs is set by the CNN, so 8 of them is 1.2 s on a fast device and " +
                "2.4 s on a slow one. A pending verify blinds detection AND recovery, so " +
                "this is the bound that matters.",
        ),
        row(
            "cnnMinAgreement",
            CNN,
            0.5,
            1.0,
            0.01,
            "How much of the board the model must agree with before it is allowed to overrule or confirm a move." +
                " Lower it and one misread square stops blocking; lower it too far and it invents positions.",
        ),
        count(
            "recoveryMaxPlies",
            CNN,
            1.0,
            10.0,
            "How many missed moves the tracker may catch up in one go when it has lost the position. Fast" +
                "sequences genuinely happen, so bridging several is a requirement, not a tolerance.",
        ),
        count(
            "minConfidentBoard",
            CNN,
            0.0,
            64.0,
            "How many squares must be legible before the model may say the board still matches the game. A" +
                "glance that saw nothing must never read as ‘nothing changed’.",
        ),
        count(
            "minConfidentRecovery",
            CNN,
            0.0,
            64.0,
            "The same floor for recovery, deliberately far lower: finding the way back has to keep working with" +
                "an arm still across half the board.",
        ),
        count(
            "desyncObsN",
            CNN,
            1.0,
            10.0,
            "How many times running the model must disagree with the game before the alarm is raised. Lower it" +
                "to be told sooner, at the cost of alarms on a board that is only briefly obscured.",
        ),
        count(
            "desyncStandoffObsN",
            CNN,
            0.0,
            50.0,
            "How many disagreeing observations a standoff may hold before the alarm is raised even when the" +
                "contradiction is not shaped like one move — a castling, for example. 0 switches the bound off." +
                "The default is an unmeasured order-of-magnitude guess (specs/39).",
        ),
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
        flag(
            "cnnVerify",
            CNN,
            "Have the model check every move before it is announced. Off is faster and cooler, and leaves the" +
                "tracker with pixels alone.",
        ),
        count(
            "alignEvery",
            CAMERA,
            1.0,
            30.0,
            "How often the corner markers are re-found. More often follows a nudged phone sooner; it is the most" +
                "expensive thing done per frame.",
        ),
        flag(
            "liveAlign",
            CAMERA,
            "Keep following the markers during a game. Off freezes the board outline where calibration left it," +
                " which is right only if nothing can move.",
        ),
    )

fun knobsIn(group: KnobGroup): List<KnobUi> = KNOB_CATALOG.filter { it.group == group }
