package com.chesslab.desktop

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.OccupancyObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.tracker.pipeline.CropFrameStore
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.File

/** Compact first-pass visual results for a deterministic full-frame replay. */
internal class VisualObservationCache private constructor(
    private val file: File,
    private val reader: CachedRows?,
    private val output: DataOutputStream?,
) : AutoCloseable {
    private var observations = 0
    private var alignments = 0
    private var lastSeq = 0L
    private var lastAlignmentFrame = 0L

    val lookup: ((Long) -> CropFrameStore.CachedVisual)? =
        reader?.let { rows ->
            { seq -> rows.observations[seq] ?: error("visual cache ${file.absolutePath} has no observation for seq $seq") }
        }

    /** Inspection seam for the bounded parallel visual prepass; absent while this cache is built. */
    val observationSequences: Set<Long>? = reader?.observations?.keys

    /** Expected rows let the experimental prepass prove byte-for-byte probability parity. */
    val expectedObservation: ((Long) -> CropFrameStore.CachedVisual?)? =
        reader?.let { rows -> { seq -> rows.observations[seq] } }

    val sink: ((CnnSnapshot) -> Unit)? = output?.let { { snap -> write(snap) } }

    /** Null for legacy caches: they replay observations but still calculate LiveAlign normally. */
    val alignmentLookup: ((Long) -> FloatArray?)? =
        reader?.takeIf(CachedRows::hasAlignmentStream)?.let { rows ->
            { frame -> rows.alignments[frame]?.copyOf() }
        }

    val alignmentSink: ((Long, FloatArray) -> Unit)? = output?.let { { frame, corners -> writeAlignment(frame, corners) } }

    override fun close() {
        output?.let {
            it.close()
            val partial = partialOf(file)
            check(partial.renameTo(file)) { "could not finalize ${file.absolutePath}" }
            println("visual-cache: wrote $observations observations + $alignments alignments -> ${file.absolutePath}")
        }
        reader?.let {
            val suffix = if (it.hasAlignmentStream) " + ${it.alignments.size} alignments" else " (legacy: alignments recalculated)"
            println("visual-cache: replayed ${it.observations.size} observations$suffix from ${file.absolutePath}")
        }
    }

    private fun write(snap: CnnSnapshot) {
        check(snap.seq > lastSeq) { "visual observations must be strictly ordered (${snap.seq} after $lastSeq)" }
        val obs = snap.obs as? OccupancyObservation ?: error("unsupported cached observation ${snap.obs::class}")
        val out = requireNotNull(output)
        out.writeByte(RECORD_OBSERVATION)
        out.writeLong(snap.seq)
        out.writeLong(snap.tsMs)
        out.writeLong(snap.gridOccluded)
        out.writeBoolean(obs.raw != null)
        val raw = obs.rawObservation()
        for (square in ALL_SQUARES) {
            writeSquare(out, obs, square)
            out.writeDouble(obs.invalidMass(square))
            if (obs.raw != null) writeSquare(out, raw, square)
        }
        lastSeq = snap.seq
        observations += 1
    }

    private fun writeAlignment(
        frame: Long,
        corners: FloatArray,
    ) {
        check(frame > lastAlignmentFrame) { "visual alignments must be strictly ordered ($frame after $lastAlignmentFrame)" }
        check(corners.size == CORNER_VALUES) { "alignment has ${corners.size} corner values, expected $CORNER_VALUES" }
        val out = requireNotNull(output)
        out.writeByte(RECORD_ALIGNMENT)
        out.writeLong(frame)
        corners.forEach(out::writeFloat)
        lastAlignmentFrame = frame
        alignments += 1
    }

    companion object {
        fun open(
            file: File,
            video: File,
            model: String,
            signature: String = "",
        ): VisualObservationCache =
            if (file.isFile) {
                VisualObservationCache(file, read(file, video, model, signature), null)
            } else {
                file.parentFile?.mkdirs()
                val partial = partialOf(file)
                check(!partial.exists() || partial.delete()) { "could not replace ${partial.absolutePath}" }
                val output = DataOutputStream(BufferedOutputStream(partial.outputStream()))
                writeHeader(output, video, model, signature)
                VisualObservationCache(file, null, output)
            }

        private fun read(
            file: File,
            video: File,
            model: String,
            signature: String,
        ): CachedRows =
            DataInputStream(BufferedInputStream(file.inputStream())).use { input ->
                check(input.readInt() == MAGIC) { "unsupported visual cache ${file.absolutePath}" }
                val version = input.readInt()
                check(version == LEGACY_VERSION || version == PRIORLESS_VERSION || version == VERSION) {
                    "unsupported visual cache ${file.absolutePath}"
                }
                check(input.readUTF() == video.canonicalPath) { "visual cache belongs to another video" }
                check(input.readLong() == video.length() && input.readLong() == video.lastModified()) {
                    "video changed since ${file.absolutePath} was built"
                }
                check(input.readUTF() == model) { "visual cache was built for another model" }
                if (version == LEGACY_VERSION) {
                    CachedRows(readLegacy(input), emptyMap(), hasAlignmentStream = false)
                } else {
                    check(input.readUTF() == signature) { "visual cache was built for another replay configuration" }
                    readRecords(input, hasPriorViews = version == VERSION)
                }
            }

        private fun readLegacy(input: DataInputStream): Map<Long, CropFrameStore.CachedVisual> =
            buildMap {
                while (true) {
                    val seq = tryReadLong(input) ?: break
                    check(put(seq, readObservation(input, hasPriorViews = false)) == null) { "duplicate visual seq $seq" }
                }
            }

        private fun readRecords(
            input: DataInputStream,
            hasPriorViews: Boolean,
        ): CachedRows {
            val observations = LinkedHashMap<Long, CropFrameStore.CachedVisual>()
            val alignments = LinkedHashMap<Long, FloatArray>()
            while (true) {
                when (tryReadByte(input) ?: break) {
                    RECORD_OBSERVATION -> {
                        val seq = input.readLong()
                        check(observations.put(seq, readObservation(input, hasPriorViews)) == null) {
                            "duplicate visual seq $seq"
                        }
                    }
                    RECORD_ALIGNMENT -> {
                        val frame = input.readLong()
                        val corners = FloatArray(CORNER_VALUES) { input.readFloat() }
                        check(alignments.put(frame, corners) == null) { "duplicate alignment frame $frame" }
                    }
                    else -> error("unknown visual-cache record type")
                }
            }
            return CachedRows(observations, alignments, hasAlignmentStream = true)
        }

        private fun readObservation(
            input: DataInputStream,
            hasPriorViews: Boolean,
        ): CropFrameStore.CachedVisual {
            input.readLong()
            val grid = input.readLong()
            val hasRaw = hasPriorViews && input.readBoolean()
            val pOcc = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val pEmpty = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val pOccluded = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val labels = LinkedHashMap<String, String>(ALL_SQUARES.size)
            val conf = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val runner = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val invalid = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val rawOcc = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val rawEmpty = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val rawOccluded = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val rawLabels = LinkedHashMap<String, String>(ALL_SQUARES.size)
            val rawConf = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            val rawRunner = LinkedHashMap<String, Double>(ALL_SQUARES.size)
            for (square in ALL_SQUARES) {
                readSquare(input, square, pOcc, pEmpty, pOccluded, labels, conf, runner)
                if (hasPriorViews) invalid[square] = input.readDouble()
                if (hasRaw) readSquare(input, square, rawOcc, rawEmpty, rawOccluded, rawLabels, rawConf, rawRunner)
            }
            val identity = labels.size == ALL_SQUARES.size
            val rawIdentity = rawLabels.size == ALL_SQUARES.size
            val raw =
                if (hasRaw) {
                    OccupancyObservation(
                        rawOcc,
                        rawEmpty,
                        rawOccluded,
                        rawLabels.takeIf { rawIdentity },
                        rawConf.takeIf { rawIdentity },
                        rawRunner.takeIf { rawIdentity },
                        invalid,
                    )
                } else {
                    null
                }
            val obs =
                OccupancyObservation(
                    pOcc,
                    pEmpty,
                    pOccluded,
                    labels.takeIf { identity },
                    conf.takeIf { identity },
                    runner.takeIf { identity },
                    invalid,
                    raw,
                )
            return CropFrameStore.CachedVisual(obs, grid)
        }

        private fun writeSquare(
            out: DataOutputStream,
            obs: OccupancyObservation,
            square: String,
        ) {
            out.writeDouble(obs.pOcc.getValue(square))
            out.writeDouble(obs.pEmpty.getValue(square))
            out.writeDouble(obs.pOccluded.getValue(square))
            out.writeUTF(obs.label?.get(square).orEmpty())
            out.writeDouble(obs.conf?.get(square) ?: 0.0)
            out.writeDouble(obs.runnerUpConf?.get(square) ?: 1.0)
        }

        @Suppress("LongParameterList")
        private fun readSquare(
            input: DataInputStream,
            square: String,
            pOcc: MutableMap<String, Double>,
            pEmpty: MutableMap<String, Double>,
            pOccluded: MutableMap<String, Double>,
            labels: MutableMap<String, String>,
            conf: MutableMap<String, Double>,
            runner: MutableMap<String, Double>,
        ) {
            pOcc[square] = input.readDouble()
            pEmpty[square] = input.readDouble()
            pOccluded[square] = input.readDouble()
            input.readUTF().takeIf(String::isNotEmpty)?.let { labels[square] = it }
            conf[square] = input.readDouble()
            runner[square] = input.readDouble()
        }

        private fun writeHeader(
            output: DataOutputStream,
            video: File,
            model: String,
            signature: String,
        ) {
            output.writeInt(MAGIC)
            output.writeInt(VERSION)
            output.writeUTF(video.canonicalPath)
            output.writeLong(video.length())
            output.writeLong(video.lastModified())
            output.writeUTF(model)
            output.writeUTF(signature)
        }

        private fun tryReadLong(input: DataInputStream): Long? =
            try {
                input.readLong()
            } catch (_: EOFException) {
                null
            }

        private fun tryReadByte(input: DataInputStream): Int? =
            try {
                input.readUnsignedByte()
            } catch (_: EOFException) {
                null
            }

        private fun partialOf(file: File) = File(file.parentFile, "${file.name}.partial")

        private const val MAGIC = 0x43564F31
        private const val LEGACY_VERSION = 2
        private const val PRIORLESS_VERSION = 3
        private const val VERSION = 4
        private const val RECORD_OBSERVATION = 1
        private const val RECORD_ALIGNMENT = 2
        private const val CORNER_VALUES = 8
    }
}

private class CachedRows(
    val observations: Map<Long, CropFrameStore.CachedVisual>,
    val alignments: Map<Long, FloatArray>,
    val hasAlignmentStream: Boolean,
)
