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

// `:core-engine` may not carry kotlinx-serialization (`ClasspathPurityTest`), so this mirrors `DebugDecision`
// by hand — a reflective encoder would turn an engine rename into a silently renamed column.
// `DiagnosticsRecordsTest` pins the key set against the engine type.

internal const val KIND_RUN_START = "run_start"

internal const val KIND_DECISION = "decision"

internal const val KIND_STATE = "state"

/** NaN travels: three `Int?` knobs encode "no override" as NaN, and refusing it would silently kill the
 *  writer. `encodeDefaults`: `kind` is the only defaulted field and the one a reader dispatches on. */
internal val DIAGNOSTICS_JSON =
    Json {
        encodeDefaults = true
        allowSpecialFloatingPointValues = true
    }

/** Requested and loaded are both here: a failed attach leaves the requested pair set and the loaded null. */
@Serializable
data class ModelIdentity(
    val requestedDir: String?,
    val requestedAsset: String?,
    val loadedDir: String?,
    val loadedAsset: String?,
    val inferSize: String?,
    /** Null when the run declares NONE: the crops were then cut at the profile's box, which [servedPads] names.
     *  PADS, never "crops" — `noPixelsReachTheFile` forbids the word. */
    val declaredPads: String?,
    val servedPads: String?,
    val classes: Int?,
    val requestedEp: String?,
    /** What the runtime SELECTED: a request is not a delivery, and the fall-through is silent. */
    val actualEp: String?,
    val inputShape: String?,
)

/** The config lives in the DataStore, not the source: `motionRecencyS` at 0.0 once rejected every diff
 *  commit and no reading of the code could find it. [config] is `ConfigCodec.encode` verbatim. */
@Serializable
data class RunStart(
    val ts: String,
    val appVersionName: String,
    val appVersionCode: Long,
    val device: String,
    val androidSdk: Int,
    val model: ModelIdentity,
    val config: JsonObject,
    val seq: Long = 0,
    val kind: String = KIND_RUN_START,
)

/** `changedVals` becomes an object (`{"f4": 9.2}`) so one square's evidence is addressable. */
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

data class AppVersion(
    val name: String,
    val code: Long,
)

/** The host answers, not `Build`: a desktop run then says so honestly rather than reporting a phone. */
data class HostIdentity(
    val version: AppVersion,
    val device: String,
    val sdk: Int,
)

fun runStartOf(
    app: AppSettings,
    config: TrackerConfig,
    spec: ModelSpec?,
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
                declaredPads = spec?.takeIf { it.declaresCrop }?.let { "${it.padSide}" },
                servedPads = servedPads,
                classes = spec?.classes?.size,
                requestedEp = cnn.requestedEp ?: app.epRequest.name,
                actualEp = cnn.actualEp,
                inputShape = cnn.inputShape,
            ),
        config = DIAGNOSTICS_JSON.parseToJsonElement(ConfigCodec.encode(config)).jsonObject,
    )

/** Decision rows cannot say where a player's wait went: 67 commits made 131 rows, most moves commit on the
 *  FIRST — the waiting happened in states that wrote nothing. */
@Serializable
data class StateRow(
    val seq: Long,
    val tsS: Double,
    val from: String,
    val to: String,
    val kind: String = KIND_STATE,
)
