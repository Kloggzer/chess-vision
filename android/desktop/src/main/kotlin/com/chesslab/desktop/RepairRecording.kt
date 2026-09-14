package com.chesslab.desktop

import org.bytedeco.javacv.FFmpegFrameGrabber
import java.io.DataInputStream
import java.io.File
import java.io.RandomAccessFile

/**
 * Rebuild an MP4 whose recorder was killed before it wrote the index.
 *
 * `moov` is written when the muxer closes; a process killed mid-capture leaves `ftyp` + `mdat` and
 * nothing that says where the frames are. Four recordings of 2026-08-13 are in that state, 1.99 GB,
 * killed by `adb install` over a live session (`reason=16 PACKAGE UPDATED`). The recorder no longer
 * loses more than a minute (`CameraVideo.SEGMENT_SECONDS`), but these four predate that.
 *
 * The payload is intact and self-describing: inside an MP4, AVC samples are length-prefixed NALs,
 * so walking `mdat` from its first byte recovers every frame boundary — measured on
 * `20260813-124512`, the walk lands exactly on the file's last byte after 1 337 NALs (45 of them
 * IDR). What is NOT in `mdat` is the codec configuration: `MediaMuxer` consumes SPS/PPS into the
 * `avcC` box, which died with the index. They come from a REFERENCE recording made by the same app
 * on the same phone — same resolution, profile and level, so the parameter sets are the right ones.
 *
 * What cannot be recovered is the per-sample timing: the reference's frame rate is assumed and
 * stated. That is a real approximation, and it is why this writes a repaired COPY beside the
 * original rather than over it.
 */
private const val NAL_HEADER = 4
private const val NAL_TYPE_MASK = 0x1F
private const val NAL_IDR = 5
private const val AVCC_MIN = 7
private const val MDAT_HEADER_64 = 16L
private const val ARGUMENTS = 3
private const val BYTES_PER_MB = 1e6

data class RepairReport(
    val samples: Int,
    val keyFrames: Int,
    val bytes: Long,
    val fps: Double,
    val out: File,
)

/** `repair-recording <broken.mp4> <reference.mp4> <out.mp4>` */
fun repairRecording(args: List<String>) {
    require(args.size >= ARGUMENTS) { "usage: repair-recording <broken.mp4> <reference.mp4> <out.mp4>" }
    val broken = File(args[0])
    val reference = File(args[1])
    val out = File(args[2])
    require(broken.isFile && reference.isFile) { "broken and reference must exist" }
    require(!out.exists()) { "refusing to overwrite ${out.absolutePath}" }

    val report = repair(broken, reference, out)
    println(
        "repaired ${broken.name}: ${report.samples} samples (${report.keyFrames} key), " +
            "${"%.1f".format(report.bytes / BYTES_PER_MB)} MB at an ASSUMED ${"%.2f".format(report.fps)} fps -> ${report.out.absolutePath}",
    )
}

internal fun repair(
    broken: File,
    reference: File,
    out: File,
): RepairReport {
    val (avcc, fps, size) = referenceStream(reference)
    val mdat = mdatBox(broken)
    val payloadStart = mdat.payloadStart
    val samples = walkSamples(broken, payloadStart)
    check(samples.isNotEmpty()) { "${broken.name}: no samples in mdat" }

    // The bytes stay where they are: `mdat` keeps its offset, so every sample offset the index
    // states is the one the payload already has. Only the box's own length is corrected — the
    // muxer left a placeholder there — and the index is appended behind it.
    broken.copyTo(out, overwrite = false)
    RandomAccessFile(out, "rw").use { file ->
        // Nach der Form des Headers, den die Datei WIRKLICH traegt: blind den 64-Bit-Patch zu
        // schreiben ueberschrieb bei 8 Byte die `mdat`-Fourcc gleich mit, und kein Demuxer findet
        // die Nutzlast danach wieder — lautlos, auf Aufnahmen, die es nur einmal gibt.
        val boxLength = out.length() - (payloadStart - mdat.header)
        if (mdat.header == MDAT_HEADER_64) {
            file.seek(payloadStart - Long.SIZE_BYTES)
            file.writeLong(boxLength)
        } else {
            file.seek(payloadStart - mdat.header)
            file.writeInt(boxLength.toInt())
        }
        file.seek(out.length())
        file.write(buildMoov(samples, payloadStart, avcc, size.first, size.second, fps))
    }
    return RepairReport(samples.size, samples.count { it.key }, out.length(), fps, out)
}

private data class ReferenceStream(
    val avcc: ByteArray,
    val fps: Double,
    val size: Pair<Int, Int>,
)

/**
 * SPS/PPS, frame rate and picture size from a recording that closed properly.
 *
 * FFmpeg hands the `avcC` box back as the stream's extradata, so the conversion to the Annex-B
 * form a raw stream needs is a matter of reading its length-prefixed parameter sets.
 */
private fun referenceStream(reference: File): ReferenceStream =
    FFmpegFrameGrabber(reference).use { grabber ->
        grabber.start()
        val extradata =
            grabber.formatContext
                .streams(0)
                .codecpar()
                .extradata()
        val length =
            grabber.formatContext
                .streams(0)
                .codecpar()
                .extradata_size()
        require(length >= AVCC_MIN) { "${reference.name} carries no avcC to copy the parameter sets from" }
        val avcc = ByteArray(length).also { extradata.get(it, 0, length) }
        // Verbatim: `avcC` is what an MP4 sample entry carries, and it is the reference's own —
        // same app, same phone, same resolution and profile, so it describes these frames too.
        ReferenceStream(avcc, grabber.frameRate, grabber.imageWidth to grabber.imageHeight)
    }

/**
 * Every sample in `mdat`, by walking its length prefixes.
 *
 * The walk is its own proof: a length that runs past the end of the file, or a chain that does not
 * land exactly on it, means these are not the samples they claim to be — and a repair that guesses
 * is worse than a broken file, because it looks fine. Measured on `20260813-124512`: 1 337 NALs,
 * 45 of them IDR, ending on the last byte.
 */
internal fun walkSamples(
    broken: File,
    payloadStart: Long,
): List<Sample> {
    val samples = mutableListOf<Sample>()
    RandomAccessFile(broken, "r").use { input ->
        val header = ByteArray(NAL_HEADER)
        var at = payloadStart
        val end = broken.length()
        while (at + NAL_HEADER < end) {
            input.seek(at)
            input.readFully(header)
            val length =
                ((header[0].toInt() and 0xFF) shl 24) or ((header[1].toInt() and 0xFF) shl 16) or
                    ((header[2].toInt() and 0xFF) shl 8) or (header[3].toInt() and 0xFF)
            if (length <= 0 || at + NAL_HEADER + length > end) break
            val first = ByteArray(1).also { input.readFully(it) }
            samples += Sample(NAL_HEADER + length, (first[0].toInt() and NAL_TYPE_MASK) == NAL_IDR)
            at += NAL_HEADER + length
        }
        check(at == end) { "${broken.name}: the sample chain ends at $at of $end — this is not a length-prefixed stream" }
    }
    return samples
}

/** Wo die `mdat`-Nutzlast beginnt, und wie breit ihr Header ist (8 oder 16 Byte).
 *  Ihre eigene Groesse ist der Platzhalter, den der Muxer nie gepatcht hat. */
internal data class MdatBox(
    val payloadStart: Long,
    val header: Long,
)

internal fun mdatPayloadStart(file: File): Long = mdatBox(file).payloadStart

internal fun mdatBox(file: File): MdatBox {
    DataInputStream(file.inputStream().buffered()).use { input ->
        var at = 0L
        while (true) {
            val size = input.readInt().toLong() and 0xFFFFFFFFL
            val type = ByteArray(NAL_HEADER).also { input.readFully(it) }.decodeToString()
            var header = 8L
            var length = size
            if (size == 1L) {
                length = input.readLong()
                header = MDAT_HEADER_64
            }
            if (type == "mdat") return MdatBox(at + header, header)
            val skip = length - header
            check(skip > 0) { "${file.name}: box $type has no length — nothing to walk" }
            input.skipNBytes(skip)
            at += length
        }
    }
}
