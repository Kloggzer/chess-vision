package com.chesslab.desktop

import java.io.ByteArrayOutputStream
import java.io.DataOutputStream

/**
 * The index an interrupted recording never got: a `moov` built from the samples themselves.
 *
 * Writing it by hand rather than remuxing through FFmpeg is a decision the measurements forced.
 * A raw H.264 stream carries no timing, so every route through the demuxer produced an MP4 that
 * reported `1001k fps` and a zero duration — twice, with the frame rate set two different ways. The
 * frames were always right; only the clock was invented, and the clock is what the replay's virtual
 * time is derived from. Here the timing is stated: one constant sample delta, from the reference
 * recording's frame rate.
 *
 * The payload is not touched. `mdat` keeps its position, so a sample's offset is the one it already
 * has — this appends an index to bytes that were correct all along.
 */
private const val MOVIE_TIMESCALE = 1000
private const val UNITY_MATRIX_A = 0x00010000
private const val VISUAL_DEPTH = 0x0018
private const val RESOLUTION_72_DPI = 0x00480000

// The VisualSampleEntry's fixed fields, by the ISO base media format's own layout: six reserved
// bytes, then twelve `pre_defined`, and a 32-byte compressor name nobody reads.
private const val ENTRY_RESERVED = 6
private const val ENTRY_PRE_DEFINED = 12
private const val COMPRESSOR_NAME = 32
private const val PRE_DEFINED_MINUS_ONE = -1
private const val MATRIX_W = 0x40000000

/** Every box carries its own 32-bit length and its four-character type. */
private const val BOX_HEADER = 8

data class Sample(
    val size: Int,
    val key: Boolean,
)

/**
 * @param firstSampleOffset absolute position of sample 0 in the file this index will belong to
 */
@Suppress("LongParameterList")
fun buildMoov(
    samples: List<Sample>,
    firstSampleOffset: Long,
    avcc: ByteArray,
    width: Int,
    height: Int,
    fps: Double,
): ByteArray {
    // A timescale of fps*1000 with a delta of 1000 keeps the rate exactly as measured instead of
    // rounding it into a 90 kHz grid, which on 28.63 fps would drift a frame every few seconds.
    val timescale = Math.round(fps * 1000.0).toInt()
    val delta = 1000
    val durationTicks = samples.size.toLong() * delta
    val durationMs = Math.round(samples.size / fps * MOVIE_TIMESCALE)

    val stbl =
        box(
            "stbl",
            box("stsd", int(0) + int(1) + avc1(avcc, width, height)),
            box("stts", int(0) + int(1) + int(samples.size) + int(delta)),
            stss(samples),
            box("stsc", int(0) + int(1) + int(1) + int(samples.size) + int(1)),
            box("stsz", int(0) + int(0) + int(samples.size) + bytes { samples.forEach { s -> it.writeInt(s.size) } }),
            box("co64", int(0) + int(1) + long(firstSampleOffset)),
        )
    val minf = box("minf", box("vmhd", int(1) + int(0) + int(0)), box("dinf", box("dref", int(0) + int(1) + box("url ", int(1)))), stbl)
    val mdia =
        box(
            "mdia",
            box("mdhd", int(0) + int(0) + int(0) + int(timescale) + int(durationTicks.toInt()) + short(0x55C4) + short(0)),
            box("hdlr", int(0) + int(0) + ascii("vide") + int(0) + int(0) + int(0) + "chesslab repair".toByteArray() + byteArrayOf(0)),
            minf,
        )
    val trak =
        box(
            "trak",
            box(
                "tkhd",
                int(7) + int(0) + int(0) + int(1) + int(0) + int(durationMs.toInt()) + int(0) + int(0) +
                    short(0) + short(0) + short(0) + short(0) + matrix() + int(width shl 16) + int(height shl 16),
            ),
            mdia,
        )
    val mvhd =
        box(
            "mvhd",
            int(
                0,
            ) + int(0) + int(0) + int(MOVIE_TIMESCALE) + int(durationMs.toInt()) + int(UNITY_MATRIX_A) + short(0x0100) + short(0) + int(0) +
                int(0) +
                matrix() +
                ByteArray(24) +
                int(2),
        )
    return box("moov", mvhd, trak)
}

private fun stss(samples: List<Sample>): ByteArray {
    val keys = samples.indices.filter { samples[it].key }
    return box("stss", int(0) + int(keys.size) + bytes { out -> keys.forEach { out.writeInt(it + 1) } })
}

/** The visual sample entry every MP4 reader expects in front of `avcC`. */
private fun avc1(
    avcc: ByteArray,
    width: Int,
    height: Int,
): ByteArray =
    box(
        "avc1",
        ByteArray(ENTRY_RESERVED) + short(1) + short(0) + short(0) + ByteArray(ENTRY_PRE_DEFINED) +
            short(width) + short(height) + int(RESOLUTION_72_DPI) + int(RESOLUTION_72_DPI) + int(0) +
            short(1) + ByteArray(COMPRESSOR_NAME) + short(VISUAL_DEPTH) + short(PRE_DEFINED_MINUS_ONE) +
            box("avcC", avcc),
    )

private fun matrix(): ByteArray =
    int(UNITY_MATRIX_A) + int(0) + int(0) + int(0) + int(UNITY_MATRIX_A) + int(0) + int(0) + int(0) + int(MATRIX_W)

private fun box(
    type: String,
    vararg payload: ByteArray,
): ByteArray {
    val body = payload.reduceOrNull { a, b -> a + b } ?: ByteArray(0)
    return int(body.size + BOX_HEADER) + ascii(type) + body
}

private fun bytes(write: (DataOutputStream) -> Unit): ByteArray {
    val out = ByteArrayOutputStream()
    DataOutputStream(out).use(write)
    return out.toByteArray()
}

private fun int(value: Int): ByteArray = bytes { it.writeInt(value) }

private fun long(value: Long): ByteArray = bytes { it.writeLong(value) }

private fun short(value: Int): ByteArray = bytes { it.writeShort(value) }

private fun ascii(value: String): ByteArray = value.toByteArray(Charsets.US_ASCII)
