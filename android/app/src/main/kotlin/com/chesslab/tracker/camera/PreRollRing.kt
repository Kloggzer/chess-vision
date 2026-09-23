package com.chesslab.tracker.camera

/** Seconds of encoded footage kept ahead of the first committed move: the desktop replay needs board
 *  BEFORE it, and at 20 s transferred recordings carried only 4-19.6 s. [preRollMaxBytes] bounds the heap. */
const val PRE_ROLL_SECONDS: Long = 45L

/** ABGELEITET aus dem Bild: ein fester Deckel war das Fenster — 80 MB hielten 21 s 1440p/15, aber 5 s 4K/30.
 *  Ueber [PRE_ROLL_CEILING_BYTES] tauscht hoehere Aufloesung Fenster gegen Heap, nicht die App. */
fun preRollMaxBytes(
    width: Int,
    height: Int,
    fps: Int,
): Long = preRollMaxBytesAt(bitRateFor(width, height, fps))

fun preRollMaxBytesAt(bitRate: Int): Long = minOf(PRE_ROLL_CEILING_BYTES, PRE_ROLL_SECONDS * bitRate / 8L)

/** Der Deckel ist die Grenze, [PRE_ROLL_SECONDS] die Zusage: 1440p/24 traegt 28 s, nur 15 fps erreicht 45. */
fun preRollWindowSeconds(
    requestedBitRate: Int,
    acceptedBitRate: Int,
): Long =
    if (requestedBitRate <= 0 || acceptedBitRate <= 0) {
        PRE_ROLL_SECONDS
    } else {
        minOf(PRE_ROLL_SECONDS, preRollMaxBytesAt(requestedBitRate) * 8L / acceptedBitRate)
    }

/** Das volle Fenster der VORGABE (1440p/15); an keinem Geraet gemessen, kein `largeHeap`. */
val PRE_ROLL_CEILING_BYTES: Long =
    PRE_ROLL_SECONDS * bitRateFor(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, DEFAULT_PRE_ROLL_FPS) / 8L

private const val DEFAULT_PRE_ROLL_FPS = 15

/** No `android.media` type reaches this file, so the ring's rules are testable on the desktop JVM. */
class PreRollSample(
    val data: ByteArray,
    val ptsUs: Long,
    val flags: Int,
    val sync: Boolean,
)

/** Killed before the first commit, this buffer dies with the process — the point: a run without a move
 *  is setup junk. It always STARTS at a sync sample (a leading P-frame decodes against nothing), so
 *  trimming removes whole GOPs, and the GOP being written is never dropped. */
class PreRollRing(
    private val maxDurationUs: Long,
    private val maxBytes: Long,
) {
    private val samples = ArrayDeque<PreRollSample>()

    var bytes: Long = 0L
        private set

    val durationUs: Long get() = if (samples.isEmpty()) 0L else samples.last().ptsUs - samples.first().ptsUs

    val firstPtsUs: Long? get() = samples.firstOrNull()?.ptsUs

    fun add(sample: PreRollSample) {
        samples.addLast(sample)
        bytes += sample.data.size
        // Leading non-sync samples can never decode, caps or no caps.
        while (samples.isNotEmpty() && !samples.first().sync) evictFirst()
        while (durationUs > maxDurationUs || bytes > maxBytes) {
            val gop = oldestGopLength() ?: break
            repeat(gop) { evictFirst() }
        }
    }

    /** PTS rebased to zero, ring emptied: a second flush returns nothing, no sample reaches the muxer twice. */
    fun flush(): List<PreRollSample> {
        val base = firstPtsUs ?: return emptyList()
        val out = samples.map { PreRollSample(it.data, it.ptsUs - base, it.flags, it.sync) }
        samples.clear()
        bytes = 0L
        return out
    }

    private fun evictFirst() {
        bytes -= samples.removeFirst().data.size
    }

    /** Samples in the oldest GOP, or null while the ring holds only one — that one is never dropped. */
    private fun oldestGopLength(): Int? {
        var index = 0
        for (sample in samples) {
            if (index > 0 && sample.sync) return index
            index++
        }
        return null
    }
}
