package com.chesslab.geometry

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.CLAHE
import org.opencv.imgproc.Imgproc

// Die Reihenfolge faellt aus den Datenabhaengigkeiten, und gemeinsame Praefixe rechnen EINMAL. Fachliche
// Reihenfolge (Dunkelframe-Gate vor CLAHE, Linse vor Homographie) gehoert in den Aufrufer.

private const val FNV_OFFSET = -3750763034362895579L

private const val FNV_PRIME = 1099511628211L

/** Kein Inhalts-Hash — der Scope IST der Frame, es zaehlt nur die Herkunft. */
fun mixKey(vararg parts: Long): Long {
    var h = FNV_OFFSET
    for (p in parts) h = (h xor p) * FNV_PRIME
    return h
}

data class MatShape(
    val rows: Int,
    val cols: Int,
    val type: Int,
)

/** Ein Allokator je Frame machte die Wiederverwendung rueckgaengig: 77 MB/s Grossobjekt-Muell bei 30 fps. */
class MatPool : AutoCloseable {
    private val free = HashMap<MatShape, ArrayDeque<Mat>>()

    /** Nach dem Warmlaufen muss die Zahl stehen. */
    var allocated: Int = 0
        private set

    fun borrow(shape: MatShape): Mat =
        free[shape]?.removeLastOrNull()
            ?: Mat(shape.rows, shape.cols, shape.type).also { allocated++ }

    fun give(mat: Mat) {
        free.getOrPut(MatShape(mat.rows(), mat.cols(), mat.type())) { ArrayDeque() }.addLast(mat)
    }

    override fun close() {
        free.values.forEach { queue -> queue.forEach(Mat::release) }
        free.clear()
    }
}

/** REIN: derselbe [key] im selben [FrameScope] heisst dieselben Pixel. Der Schluessel traegt den Frame NICHT
 *  — das haelt den Replay frei von versteckten Eingaben. */
abstract class ImageNode(
    val op: WorkOperation,
    val key: Long,
    /** EINMAL je Knoten aufgeloest — sonst zaehlt jeder Zugriff doppelt. */
    val dep: ImageNode? = null,
) : AutoCloseable {
    abstract fun shape(
        scope: FrameScope,
        input: Mat?,
    ): MatShape

    abstract fun compute(
        scope: FrameScope,
        input: Mat?,
        out: Mat,
    )

    override fun close() = Unit
}

/** Wer ein Ergebnis laenger haelt, KOPIERT es: der `PlaneRing` haelt Ebenen per Referenz, ein wieder
 *  ausgegebener Puffer verfaelschte seinen Mittelwert. */
class FrameScope(
    val source: Mat,
    val geom: BoardGeometry,
    val corners: List<DoubleArray>,
    val seq: Long,
    private val pool: MatPool,
    val homographies: HomographyCache? = null,
) : AutoCloseable {
    private val memo = HashMap<Long, Mat>()

    /** Gezaehlt, nicht gemessen: die Warp-Knoten erben ihre Spanne, eine zweite zaehlte die Zeit doppelt. */
    fun get(node: ImageNode): Mat {
        memo[node.key]?.let {
            WorkProfiler.cache(node.op, true, seq)
            return it
        }
        WorkProfiler.cache(node.op, false, seq)
        val input = node.dep?.let { get(it) }
        val out = pool.borrow(node.shape(this, input))
        node.compute(this, input, out)
        memo[node.key] = out
        return out
    }

    val computed: Int get() = memo.size

    override fun close() {
        memo.values.forEach(pool::give)
        memo.clear()
    }
}

class BoardWarpNode(
    private val size: Int,
    op: WorkOperation = WorkOperation.DETECTION_WARP,
) : ImageNode(op, mixKey(1, size.toLong(), op.ordinal.toLong())) {
    override fun shape(
        scope: FrameScope,
        input: Mat?,
    ) = MatShape(size, size, scope.source.type())

    override fun compute(
        scope: FrameScope,
        input: Mat?,
        out: Mat,
    ) {
        warpFromCorners(scope.source, scope.geom, scope.corners, size, out, scope.homographies, op)
    }
}

class ToGrayNode(
    source: ImageNode,
) : ImageNode(WorkOperation.LUMA_GRAY, mixKey(3, source.key), source) {
    override fun shape(
        scope: FrameScope,
        input: Mat?,
    ) = MatShape(input!!.rows(), input.cols(), CvType.CV_8UC1)

    override fun compute(
        scope: FrameScope,
        input: Mat?,
        out: Mat,
    ) = WorkProfiler.span(op, scope.seq) {
        Imgproc.cvtColor(input, out, Imgproc.COLOR_BGR2GRAY)
    }
}

/** Der Handle haengt am Knoten: `createCLAHE` je Frame ist bei 15 fps messbar. */
class ClaheNode(
    source: ImageNode,
    private val clip: Double,
    private val tile: Int = DEFAULT_CLAHE_TILE,
) : ImageNode(WorkOperation.DETECTION_GRAY, mixKey(4, source.key, clip.toRawBits(), tile.toLong()), source) {
    private var handle: CLAHE? = null

    override fun shape(
        scope: FrameScope,
        input: Mat?,
    ) = MatShape(input!!.rows(), input.cols(), input.type())

    override fun compute(
        scope: FrameScope,
        input: Mat?,
        out: Mat,
    ) = WorkProfiler.span(op, scope.seq) {
        val clahe = handle ?: Imgproc.createCLAHE(clip, Size(tile.toDouble(), tile.toDouble())).also { handle = it }
        clahe.apply(input, out)
    }

    override fun close() {
        handle = null
    }
}

class BlurNode(
    source: ImageNode,
    private val ksize: Int = DEFAULT_BLUR_KSIZE,
) : ImageNode(WorkOperation.DETECTION_BLUR, mixKey(5, source.key, ksize.toLong()), source) {
    override fun shape(
        scope: FrameScope,
        input: Mat?,
    ) = MatShape(input!!.rows(), input.cols(), input.type())

    override fun compute(
        scope: FrameScope,
        input: Mat?,
        out: Mat,
    ) = WorkProfiler.span(op, scope.seq) {
        Imgproc.GaussianBlur(input, out, Size(ksize.toDouble(), ksize.toDouble()), 0.0)
    }
}

const val DEFAULT_CLAHE_TILE: Int = 8

const val DEFAULT_BLUR_KSIZE: Int = 5
