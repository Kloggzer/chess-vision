package com.chesslab.tracker.diagnostics

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigCodec
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import java.time.Instant

// The NDJSON wire shapes and the mapping onto them.
//
// `:core-engine` has no kotlinx-serialization on its classpath and must not grow one
// (`ClasspathPurityTest`), so `DebugDecision` cannot be `@Serializable` where it lives. The mirror
// below is the price of that rule. It is written out by hand rather than reflected over, because a
// reflective encoder turns an engine rename into a silently renamed column instead of a compile
// error — and `DiagnosticsRecordsTest` pins the key set against the engine type so a field added
// there and forgotten here fails the build.

internal const val KIND_RUN_START = "run_start"

internal const val KIND_DECISION = "decision"

internal const val KIND_STATE = "state"

/**
 * NaN travels: three config knobs are `Int?` and encode their "no override" as NaN
 * (`ConfigKnobs.optInt`), and refusing it here would throw on the writer coroutine and take the
 * whole log down silently. `json.loads` accepts `NaN` — a stricter reader has to be told.
 *
 * `encodeDefaults` because `kind` is the only field with a default and it is the field a reader
 * dispatches on.
 */
internal val DIAGNOSTICS_JSON =
    Json {
        encodeDefaults = true
        allowSpecialFloatingPointValues = true
    }

/**
 * Which model produced the reads of this run — the blind spot the phase exists to close.
 *
 * Requested and loaded are BOTH here, and they are not the same question. `CLAUDE.md`'s speed
 * figures described a model that no longer ships, and the device said nothing either way; a failed
 * attach leaves the requested pair set and the loaded pair null, which is itself the answer.
 */
@Serializable
data class ModelIdentity(
    val requestedDir: String?,
    val requestedAsset: String?,
    /** What actually staged and opened. Null until an attach has succeeded. */
    val loadedDir: String?,
    val loadedAsset: String?,
    /** `infer_size` the loaded run declares, e.g. `"80x80"` — a per-model key, not a constant. */
    val inferSize: String?,
    /**
     * `pad_side`/`pad_up` the run declares, e.g. `"0.05/0.0"` — null when it declares NONE.
     *
     * A null here is the whole point of the field: the crops are then cut at whatever the
     * calibration profile says, a box no model ever asked for. [servedPads] says which box that
     * was, so the two together answer "what was this model shown, and did it choose it?".
     *
     * PADS, never crops — `noPixelsReachTheFile` forbids the word for good reason, and two floats
     * describing a box are the opposite of the payload it guards against.
     */
    val declaredPads: String?,
    /** The pads the crops were REALLY cut at, profile fallback included. */
    val servedPads: String?,
    val classes: Int?,
    val requestedEp: String?,
    /** What the runtime SELECTED. A request is not a delivery; the fall-through is silent. */
    val actualEp: String?,
    /** The graph's own input dims, e.g. `"64x3x80x80"`. */
    val inputShape: String?,
)

/**
 * The first line of every diagnostics file: the config in force and the model behind it.
 *
 * It exists because of one evening. `motionRecencyS` sat at `0.0` in the phone's DataStore, every
 * diff-path commit was rejected against a stale `age > 0` check, and reading the source could never
 * have found it — the value does not live in the source.
 *
 * [config] is `ConfigCodec.encode` verbatim, nested rather than re-modelled, so the file and the
 * DataStore cannot drift apart: both are generated from the one `KNOBS` table.
 */
@Serializable
data class RunStart(
    val ts: String,
    val appVersionName: String,
    val appVersionCode: Long,
    val device: String,
    val androidSdk: Int,
    val model: ModelIdentity,
    val config: JsonObject,
    /** Filled by [DiagnosticsLog]; whatever a caller puts here is overwritten. */
    val seq: Long = 0,
    val kind: String = KIND_RUN_START,
)

/**
 * One decision row, field for field with [DebugDecision] plus [kind] and [seq].
 *
 * `changedVals` is the one shape that changes: the engine carries `List<Pair<String, Double>>`,
 * which kotlinx encodes as a list of two-element lists. As an object (`{"f4": 9.2}`) the evidence
 * for one square is addressable, which is the only reason anybody opens this file.
 */
@Serializable
data class DecisionRow(
    val seq: Long,
    val tsS: Double,
    val ply: Int,
    val uci: String?,
    val san: String?,
    val fenBefore: String?,
    val fenAfter: String,
    val decider: String,
    val reason: String,
    val priorUsed: Boolean,
    val bestScore: Double,
    val secondScore: Double,
    val margin: Double,
    val changed: List<String>,
    val changedVals: Map<String, Double>,
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val gridCoverage: Double,
    val zThr: Double,
    val motion: Double,
    val cnnRun: Boolean,
    val cnnAgreement: Double,
    /** See `DebugDecision`: without these, `cnnAgreement = 0.0` is three faults with one number. */
    val cnnReadsTaken: Long,
    val cnnReadsStale: Long,
    val cnnSnaps: Long,
    val cnnSnapsToVerify: Long,
    val cnnSnapsNoEvaluator: Long,
    val cnnSnapsNotDue: Long,
    val cnnBestMove: String?,
    val stuckReason: String?,
    val verifyOutcome: String?,
    val accepted: Boolean,
    val kind: String = KIND_DECISION,
    val refProvisional: Boolean = false,
)

internal fun DebugDecision.toRow(seq: Long): DecisionRow =
    DecisionRow(
        seq = seq,
        tsS = tsS,
        ply = ply,
        uci = uci,
        san = san,
        fenBefore = fenBefore,
        fenAfter = fenAfter,
        decider = decider,
        reason = reason,
        priorUsed = priorUsed,
        bestScore = bestScore,
        secondScore = secondScore,
        margin = margin,
        changed = changed,
        changedVals = changedVals.toMap(),
        shadowVetoed = shadowVetoed,
        occludedVetoed = occludedVetoed,
        gridCoverage = gridCoverage,
        zThr = zThr,
        motion = motion,
        cnnRun = cnnRun,
        cnnAgreement = cnnAgreement,
        cnnReadsTaken = cnnReadsTaken,
        cnnReadsStale = cnnReadsStale,
        cnnSnaps = cnnSnaps,
        cnnSnapsToVerify = cnnSnapsToVerify,
        cnnSnapsNoEvaluator = cnnSnapsNoEvaluator,
        cnnSnapsNotDue = cnnSnapsNotDue,
        cnnBestMove = cnnBestMove,
        stuckReason = stuckReason,
        verifyOutcome = verifyOutcome,
        accepted = accepted,
        refProvisional = refProvisional,
    )

/** The app build, so a file can be attributed to a binary. */
data class AppVersion(
    val name: String,
    val code: Long,
)

/**
 * Who wrote this file, as the host alone can answer it.
 *
 * `Build.MANUFACTURER`/`Build.MODEL`/`SDK_INT` were read here, which made the run header — the one
 * record that says what was actually running — the reason this whole file needed Android. The host
 * supplies the answers instead; a desktop run says so honestly rather than reporting a phone.
 */
data class HostIdentity(
    val version: AppVersion,
    val device: String,
    val sdk: Int,
)

/**
 * Everything the run header can know at the moment the CNN attach resolves.
 *
 * It is built from four sources on purpose: the settings say what was ASKED for, [ModelSpec] says
 * what the loaded run declares, [CnnRuntimeInfo] says what the runtime actually did, and
 * [TrackerConfig] is the thing that was invisible.
 */
fun runStartOf(
    app: AppSettings,
    config: TrackerConfig,
    spec: ModelSpec?,
    /** `geometry.cropLine(spec, geometry)` — the pads the crops are cut at, from the live geometry. */
    servedPads: String?,
    cnn: CnnRuntimeInfo,
    host: HostIdentity,
    now: () -> String = { Instant.now().toString() },
): RunStart =
    RunStart(
        ts = now(),
        appVersionName = host.version.name,
        appVersionCode = host.version.code,
        device = host.device,
        androidSdk = host.sdk,
        model =
            ModelIdentity(
                requestedDir = app.modelDir,
                requestedAsset = app.modelAsset,
                loadedDir = cnn.modelDir,
                loadedAsset = cnn.model,
                inferSize = spec?.let { "${it.outWidth}x${it.outHeight}" },
                declaredPads = spec?.takeIf { it.declaresCrop }?.let { "${it.padSide}/${it.padUp}" },
                servedPads = servedPads,
                classes = spec?.classes?.size,
                requestedEp = cnn.requestedEp ?: app.epRequest.name,
                actualEp = cnn.actualEp,
                inputShape = cnn.inputShape,
            ),
        config = DIAGNOSTICS_JSON.parseToJsonElement(ConfigCodec.encode(config)).jsonObject,
    )

/**
 * One frame-loop STATE transition — `waiting -> moving`, `moving -> occluded`, and back.
 *
 * Two numbers and two words, against the decision row's forty, because it is written far more
 * often and says one thing. It is here because the decision rows cannot answer the question a
 * player actually asks: measured on rec-20260808-003957, 67 commits produce 131 decision rows, so
 * the typical move is committed on the FIRST row it appears in — and all the time the player spent
 * waiting was spent in states that wrote nothing at all.
 */
@Serializable
data class StateRow(
    val seq: Long,
    val tsS: Double,
    val from: String,
    val to: String,
    val kind: String = KIND_STATE,
)
