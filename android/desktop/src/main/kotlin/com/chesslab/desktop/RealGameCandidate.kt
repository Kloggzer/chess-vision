package com.chesslab.desktop

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerConfig
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

// `candidate.json` plus review JPEGs — the tracker's PROPOSAL, never ground truth.
//
// The shape is the Python labeler's (`label_real_game.py`, alive at tag `python-tracker-final`,
// reference file `data/recordings/game-2026-08-02/candidate.json`): same top-level keys, same
// `moves[]` row keys, so everything that read the old candidates reads these. `confirmed` is
// FALSE by construction — a tracker whose own output could become a fixture would freeze its
// mistakes and then assert forever that it keeps making them.

/** One committed ply as the label records it: the engine's opinion plus this harness's clock. */
internal data class CommittedPly(
    val ply: Int,
    val san: String,
    val uci: String,
    /** 0-based decode index of the frame the commit landed on, derived from the virtual clock. */
    val frame: Int,
    val t: Double,
    val decider: String,
    /** The alarm's `kind` when one was standing at the commit — polled, not engine-recorded. */
    val alarm: String?,
    val fenAfter: String,
    /** The quad the decider stood on at this commit, source pixels `[a8, h8, h1, a1]`; null = the recording's median. */
    val corners: FloatArray? = null,
)

/**
 * Collects the committed plies off the decision sink.
 *
 * The sink is streaming (every row reaches it; the engine's 64-row ring is irrelevant here) and a
 * recovery bridge writes one row PER MOVE, so collecting rows collects plies — no batch expansion
 * needed. `frame` is derived from the row's own engine timestamp: the desktop clock is virtual
 * (`t = (index + 1) / fps`), so the inversion is exact, not a race with the drive loop.
 */
internal class DecisionCollector(
    private val fps: Double,
    private val alarmKind: () -> String?,
    private val cornersNow: () -> FloatArray? = { null },
) {
    val plies = mutableListOf<CommittedPly>()

    /** EVERY row, rejections included — the decisive-frame writer triggers on this one. */
    var rows = 0
        private set

    fun offer(row: DebugDecision) {
        rows += 1
        // The one non-commit decider in the vocabulary (`DecisionLog.DECIDER_REJECTED`, a contract
        // string that candidate files carry verbatim). Everything else on the sink is a commit.
        if (row.decider == "rejected" || row.san == null || row.uci == null) return
        plies +=
            CommittedPly(
                ply = plies.size + 1,
                san = row.san!!,
                uci = row.uci!!,
                frame = (row.tsS * fps).roundToInt() - 1,
                t = row.tsS,
                decider = row.decider,
                alarm = alarmKind(),
                fenAfter = row.fenAfter,
                corners = cornersNow()?.copyOf(),
            )
    }
}

/**
 * The config the engine ACTUALLY ran, key-compatible with the fixture spelling `trackerConfigOf`
 * reads (camelCase, resolved `settleFrames`/`avgFrames`/`confirmFrames`, derived `detSize`).
 *
 * Driven by the KNOBS catalog since 2026-08-14, because the hand-kept list drifted the way any
 * second copy of a table does: five fields were missing, and one of them — `handTolerantCells` —
 * was exactly the experiment knob `2026-08-13-19-34-23` needed on record and did not have. Each
 * knob is emitted under its own key with its native JSON type; an OPTIONAL_INT carrying NaN (the
 * codec's "no override") is written as `null` rather than dropped, so "unset" is stated, not
 * inferred. The four resolved/derived keys stay verbatim — consumers key on them.
 *
 * Two keys the Python files carry are deliberately absent because the Kotlin engine does not have
 * them: `llK` (a constant internal to `Scoring.kt`, not config) and `reconnectGraceS` (camera
 * reconnect is host-side here). Recording them anyway would be inventing provenance.
 */
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

/** The `moves[]` rows, key-for-key the Python writer's (ply, san, frame, t, decider, alarm, fen_after). */
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
                    // A board that moves mid-game moves the label's geometry with it: the export cuts
                    // every interval through ITS ply's quad, `geometry.corners` is only the fallback.
                    p.corners?.let { put("corners", cornersJson(it)) }
                },
            )
        }
    }

/** Flat `[x0, y0, …]` as the file's `[[x, y], …]` — the same spelling `geometry.corners` uses. */
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

/** A [Distribution] in the file's spelling: three keys, three decimals, null when unmeasurable. */
private fun distributionJson(d: com.chesslab.tracker.geometry.Distribution): JsonObject =
    buildJsonObject {
        put("median", d.median?.round3())
        put("p90", d.p90?.round3())
        put("max", d.max?.round3())
    }

private fun Double.round3(): Double = kotlin.math.round(this * THOUSAND) / THOUSAND

private fun Double.round4(): Double = kotlin.math.round(this * TEN_THOUSAND) / TEN_THOUSAND

/** What one replay run produced, next to the plies: the counts the candidate records verbatim. */
internal data class LabelOutcome(
    val plies: List<CommittedPly>,
    val note: String?,
    val observations: Int,
    val frames: Int,
    val framesWritten: Int,
    /** The stack's drop line — what this run did NOT process, by reason (`TrackerStack.dropLine`). */
    val drops: String,
)

/**
 * The whole `candidate.json`, key-for-key the shape the Python writer produced (its reference
 * file is `data/recordings/game-2026-08-02/candidate.json`; `reviewed_plies`/`confirmed_at` are
 * review-added keys and correctly absent on a fresh write).
 */
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

/**
 * The video's path relative to `data/`, POSIX separators, refusing anything outside it.
 *
 * Same rule as the Python writer: a candidate stores its video relative so nothing downstream
 * ever holds an absolute path (or a Windows one) to the file. On Windows the naive relative path
 * carries `\` and possibly a drive letter — converted deliberately, never by accident.
 */
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

/** UTC, seconds precision, `…Z` — the Python writer's spelling. */
internal fun createdAtNow(): String = Instant.now().truncatedTo(ChronoUnit.SECONDS).toString()

/**
 * Writes `candidate.json` atomically. **This function cannot write a confirmed one** — the
 * `confirmed` key is hardcoded false here so no future edit upstream can leak a `true` through.
 */
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
    val tmp = File(dir, "candidate.json.tmp")
    tmp.writeText(prettyJson.encodeToString(JsonObject.serializer(), stamped) + "\n")
    check(!path.exists() || path.delete()) { "cannot replace ${path.path}" }
    check(tmp.renameTo(path)) { "cannot move ${tmp.path} into place" }
    return path
}

private val prettyJson =
    kotlinx.serialization.json.Json {
        prettyPrint = true
        prettyPrintIndent = "  "
    }
