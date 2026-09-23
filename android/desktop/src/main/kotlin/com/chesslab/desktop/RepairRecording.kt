package com.chesslab.desktop

import org.bytedeco.javacv.FFmpegFrameGrabber
import java.io.DataInputStream
import java.io.File
import java.io.RandomAccessFile

// Rebuilds the index of an MP4 whose recorder was killed first (four of 2026-08-13, `adb install` over a live
// session). `mdat` is length-prefixed NALs, so the walk recovers every sample; SPS/PPS come from a REFERENCE
// recording of the same app and phone. Timing is assumed, hence a repaired COPY beside the original.
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

    // `mdat` keeps its offset; only the box length (a muxer placeholder) is corrected, the index appended.
    broken.copyTo(out, overwrite = false)
    RandomAccessFile(out, "rw").use { file ->
        // Nach der Form des Headers, den die Datei WIRKLICH traegt: blind 64 Bit zu patchen ueberschrieb bei 8 Byte
        // die `mdat`-Fourcc — lautlos, auf Aufnahmen, die es nur einmal gibt.
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

/** FFmpeg hands the `avcC` box back as the stream's extradata. */
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
        ReferenceStream(avcc, grabber.frameRate, grabber.imageWidth to grabber.imageHeight)
    }

/** The walk is its own proof: a chain that does not land exactly on the file's end means these are not the
 *  samples they claim — a guessing repair looks fine. `20260813-124512`: 1 337 NALs, last byte. */
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

/** Header 8 oder 16 Byte; ihre eigene Groesse ist der Platzhalter, den der Muxer nie gepatcht hat. */
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
