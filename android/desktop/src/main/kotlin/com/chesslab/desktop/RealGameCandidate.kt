package com.chesslab.desktop

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.io.writeAtomic
import com.chesslab.tracker.settings.KNOBS
import com.chesslab.tracker.settings.KnobKind
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.File
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

// `candidate.json` — the tracker's PROPOSAL, in the Python labeler's shape. `confirmed` is FALSE by
// construction: a tracker whose output became a fixture would assert forever that it keeps its mistakes.

internal data class CommittedPly(
    val ply: Int,
    val san: String,
    val uci: String,
    val frame: Int,
    val t: Double,
    val decider: String,
    /** Polled, not engine-recorded. */
    val alarm: String?,
    val fenAfter: String,
    /** Null = the recording's median. */
    val corners: FloatArray? = null,
    /** Committed inside the motion hold: the frames until the re-captured reference are not settled. */
    val refProvisional: Boolean = false,
)

/** A recovery bridge writes one row PER MOVE, so collecting rows collects plies. */
internal class DecisionCollector(
    private val fps: Double,
    private val alarmKind: () -> String?,
    private val cornersNow: () -> FloatArray? = { null },
    /** -1 falls back to the clock (`t × fps`), which drifts on VFR footage. */
    private val indexNow: () -> Int = { -1 },
) {
    val plies = mutableListOf<CommittedPly>()

    /** EVERY row, rejections included — the decisive-frame writer triggers on this one. */
    var rows = 0
        private set

    fun offer(row: DebugDecision) {
        rows += 1
        // The one non-commit decider (`DecisionLog.DECIDER_REJECTED`, a contract string).
        if (row.decider == "rejected" || row.san == null || row.uci == null) return
        plies +=
            CommittedPly(
                ply = plies.size + 1,
                san = row.san!!,
                uci = row.uci!!,
                frame = indexNow().takeIf { it >= 0 } ?: ((row.tsS * fps).roundToInt() - 1),
                t = row.tsS,
                decider = row.decider,
                alarm = alarmKind(),
                fenAfter = row.fenAfter,
                corners = cornersNow()?.copyOf(),
                refProvisional = row.refProvisional,
            )
    }
}

/** Driven by the KNOBS catalog: the hand-kept list drifted and lost five fields. An unset OPTIONAL_INT is
 *  written as `null`, not dropped. `llK` and `reconnectGraceS` are absent: the Kotlin engine has no such config. */
internal fun effectiveConfigJson(
    config: TrackerConfig,
    cnnOn: Boolean,
): JsonObject =
    buildJsonObject {
        KNOBS.forEach { knob ->
            val value = knob.get(config)
            when (knob.kind) {
                KnobKind.DOUBLE -> put(knob.key, value)
                KnobKind.INT -> put(knob.key, value.toInt())
                KnobKind.BOOL -> put(knob.key, value != 0.0)
                KnobKind.OPTIONAL_INT -> if (value.isNaN()) put(knob.key, JsonNull) else put(knob.key, value.toInt())
            }
        }
        put("detSize", config.detSize)
        put("settleFrames", config.settleFrames(cnnOn))
        put("avgFrames", config.avgFrames(cnnOn))
        put("confirmFrames", config.confirmFrames(cnnOn))
    }

internal fun movesJson(plies: List<CommittedPly>) =
    buildJsonArray {
        for (p in plies) {
            add(
                buildJsonObject {
                    put("ply", p.ply)
                    put("san", p.san)
                    put("frame", p.frame)
                    put("t", p.t)
                    put("decider", p.decider)
                    if (p.alarm == null) put("alarm", JsonNull) else put("alarm", p.alarm)
                    put("fen_after", p.fenAfter)
                    // The export cuts every interval through ITS ply's quad; `geometry.corners` is the fallback.
                    p.corners?.let { put("corners", cornersJson(it)) }
                    if (p.refProvisional) put("ref_provisional", true)
                },
            )
        }
    }

internal fun cornersJson(flat: FloatArray) =
    buildJsonArray {
        for (i in 0 until 4) {
            add(
                buildJsonArray {
                    add(JsonPrimitive(flat[2 * i]))
                    add(JsonPrimitive(flat[2 * i + 1]))
                },
            )
        }
    }

private fun distributionJson(d: com.chesslab.tracker.geometry.Distribution): JsonObject =
    buildJsonObject {
        put("median", d.median?.round3())
        put("p90", d.p90?.round3())
        put("max", d.max?.round3())
    }

private fun Double.round3(): Double = kotlin.math.round(this * THOUSAND) / THOUSAND

private fun Double.round4(): Double = kotlin.math.round(this * TEN_THOUSAND) / TEN_THOUSAND

internal data class LabelOutcome(
    val plies: List<CommittedPly>,
    val note: String?,
    val observations: Int,
    val frames: Int,
    val framesWritten: Int,
    val drops: String,
)

/** Key-for-key the Python writer's shape; `reviewed_plies`/`confirmed_at` are review-added and absent here. */
internal fun candidateJson(
    name: String,
    videoRelative: String,
    scan: com.chesslab.tracker.geometry.ScannedGeometry,
    source: JsonObject,
    effectiveConfig: JsonObject,
    startFen: String,
    outcome: LabelOutcome,
): JsonObject =
    buildJsonObject {
        put("name", name)
        put("video", videoRelative)
        put("confirmed", false)
        put("created_at", createdAtNow())
        put("source", source)
        put("effective_config", effectiveConfig)
        put("geometry", geometryJson(scan))
        put(
            "clock",
            buildJsonObject {
                put("fps", scan.fps)
                put("error_ms", distributionJson(scan.clockErrorMs))
            },
        )
        put("start_fen", startFen)
        put("moves", movesJson(outcome.plies))
        if (outcome.note == null) put("note", JsonNull) else put("note", outcome.note)
        put("observations", outcome.observations)
        put("frames", outcome.frames)
        put("frames_written", outcome.framesWritten)
        put("drops", outcome.drops)
    }

private fun geometryJson(scan: com.chesslab.tracker.geometry.ScannedGeometry): JsonObject =
    buildJsonObject {
        put(
            "corners",
            buildJsonArray {
                for (corner in scan.corners) {
                    add(
                        buildJsonArray {
                            add(kotlinx.serialization.json.JsonPrimitive(corner[0]))
                            add(kotlinx.serialization.json.JsonPrimitive(corner[1]))
                        },
                    )
                }
            },
        )
        put("margin", scan.margin)
        put("board_size", scan.boardSize)
        put(
            "frame_size",
            buildJsonArray {
                add(kotlinx.serialization.json.JsonPrimitive(scan.frameWidth))
                add(kotlinx.serialization.json.JsonPrimitive(scan.frameHeight))
            },
        )
        put("align_pass_rate", scan.alignPassRate.round4())
        put("aligned", scan.aligned)
        put("sampled", scan.sampled)
        put("frames", scan.frames)
        put("sample_every", scan.sampleEvery)
        put(
            "markers_seen",
            buildJsonObject { for ((k, v) in scan.markersSeen) put(k.toString(), v) },
        )
        put("worst_offset_px", distributionJson(scan.worstOffsetPx))
        put("quad_spread_px", distributionJson(scan.quadSpreadPx))
        put("clock_error_ms", distributionJson(scan.clockErrorMs))
    }

private const val THOUSAND = 1000.0

private const val TEN_THOUSAND = 10000.0

/** A candidate stores its video relative to `data/`: nothing downstream may hold an absolute or Windows path. */
internal fun relativeVideo(
    video: File,
    dataRoot: File,
): String {
    val root = dataRoot.canonicalFile.toPath()
    val path = video.canonicalFile.toPath()
    require(path.startsWith(root)) {
        "${video.path} is not under $root — a candidate stores its video relative to data/; " +
            "move or hard-link it there (e.g. data/testclip-raw/) and re-run"
    }
    return root.relativize(path).joinToString("/")
}

internal fun createdAtNow(): String = Instant.now().truncatedTo(ChronoUnit.SECONDS).toString()

/** **Cannot write a confirmed one**: `confirmed` is hardcoded false. */
internal fun writeCandidate(
    dir: File,
    candidate: JsonObject,
): File {
    val stamped =
        buildJsonObject {
            for ((k, v) in candidate) put(k, if (k == "confirmed") kotlinx.serialization.json.JsonPrimitive(false) else v)
        }
    dir.mkdirs()
    val path = File(dir, "candidate.json")
    writeAtomic(path, prettyJson.encodeToString(JsonObject.serializer(), stamped) + "\n")
    return path
}

private val prettyJson =
    kotlinx.serialization.json.Json {
        prettyPrint = true
        prettyPrintIndent = "  "
    }
