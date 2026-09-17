package com.chesslab.tracker.camera

/**
 * The pre-roll window, in seconds of encoded footage kept ahead of the first committed move.
 *
 * Was 20 s ("das video erst festhalten wenn mindestens ein Zug erkannt wurde, und dann ab 20 s vor
 * dem Zug"). Raised 2026-08-16: the desktop replay needs board BEFORE the first move, and twenty
 * transferred recordings carried 4-19.6 s of it. [preRollMaxBytes] is the heap bound.
 */
const val PRE_ROLL_SECONDS: Long = 45L

/**
 * Der Byte-Deckel, ABGELEITET aus dem Bild: ein fester war das Fenster, nicht seine Grenze —
 * 80 MB hielten 21 s von 1440p/15 und 5 s von 4K/30. Ueber [PRE_ROLL_CEILING_BYTES] hinaus
 * tauscht hoehere Aufloesung Fenster gegen Heap, statt die App zu tauschen.
 */
fun preRollMaxBytes(
    width: Int,
    height: Int,
    fps: Int,
): Long = preRollMaxBytesAt(bitRateFor(width, height, fps))

/** Derselbe Deckel, wenn die Rate schon feststeht. */
fun preRollMaxBytesAt(bitRate: Int): Long = minOf(PRE_ROLL_CEILING_BYTES, PRE_ROLL_SECONDS * bitRate / 8L)

/**
 * Was der Deckel bei DIESER Rate wirklich haelt. [PRE_ROLL_SECONDS] ist die Zusage, der Deckel ist
 * die Grenze: 1440p/24 traegt 28 s, 1440p/30 noch 22 — nur 15 fps erreicht die 45.
 */
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

/**
 * One encoded AVC sample. Plain bytes and numbers — no `android.media` type reaches this file, so
 * the ring's rules are testable on the desktop JVM.
 */
class PreRollSample(
    val data: ByteArray,
    val ptsUs: Long,
    /** The muxer flags, carried through verbatim so a flushed sample writes exactly as a live one. */
    val flags: Int,
    val sync: Boolean,
)

/**
 * The in-memory pre-roll: encoded samples held back until the first committed move proves the
 * footage carries a game.
 *
 * KILL SEMANTICS ARE THE POINT, not an edge case. Killed before the first commit, this buffer
 * dies with the process and nothing lands on disk — which is the desired outcome: a run that
 * never saw a move was board setup or calibration, the junk the 2026-08-13/14 measurement put at
 * nine of eleven transferred recordings. Killed after the flush, the muxer segmentation keeps
 * today's guarantee unchanged: at most one minute-segment is lost (`SEGMENT_SECONDS`).
 *
 * The buffer always STARTS at a sync sample. A ring whose oldest sample is a P-frame has nothing
 * to decode against — the exact lesson of the segment rotation, which cuts at key frames for the
 * same reason — so trimming from the front removes whole GOPs: everything up to, and never past,
 * the next sync sample. The one GOP currently being written is never dropped by a cap; at
 * `VIDEO_I_FRAME_SECONDS` = 1 s and 20 Mbit/s a GOP is ~2.5 MB, so a single GOP cannot approach
 * either cap and the flush is never left with nothing decodable.
 */
class PreRollRing(
    private val maxDurationUs: Long,
    private val maxBytes: Long,
) {
    private val samples = ArrayDeque<PreRollSample>()

    var bytes: Long = 0L
        private set

    val durationUs: Long get() = if (samples.isEmpty()) 0L else samples.last().ptsUs - samples.first().ptsUs

    /** The rebase origin the flush will use — the muxer's live path continues from the same zero. */
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

    /**
     * The buffered samples, PTS rebased so the first one plays at zero, and the ring emptied —
     * a second flush returns nothing, so no sample can reach the muxer twice.
     */
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
