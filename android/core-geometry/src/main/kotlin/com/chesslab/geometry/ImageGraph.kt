package com.chesslab.geometry

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.CLAHE
import org.opencv.imgproc.Imgproc

// Bild rein, Bild raus — als Knoten statt als handverdrahtete Stage-Folge.
//
// Die Reihenfolge faellt aus den Datenabhaengigkeiten, nicht aus dem Aufrufort, und zwei Zweige
// mit demselben Praefix rechnen ihn EINMAL. Was fachlich vor etwas anderem stehen muss (das
// Dunkelframe-Gate vor CLAHE, die Linse vor der Brett-Homographie), gehoert weiterhin in den
// aufrufenden Code: das leitet kein Graph ab.

private const val FNV_OFFSET = -3750763034362895579L

private const val FNV_PRIME = 1099511628211L

/** Schluesselmischung. Kein Inhalts-Hash — der Scope IST der Frame, es zaehlt nur die Herkunft. */
fun mixKey(vararg parts: Long): Long {
    var h = FNV_OFFSET
    for (p in parts) h = (h xor p) * FNV_PRIME
    return h
}

/** Was zwei Puffer austauschbar macht. */
data class MatShape(
    val rows: Int,
    val cols: Int,
    val type: Int,
)

/**
 * Puffer, ueber Frames hinweg wiederverwendet.
 *
 * Die Stages, die das hier ersetzt, hielten je ein eigenes `Mat` ("`dst` lets the caller reuse an
 * output Mat across frames"). Ein Allokator je Frame machte das rueckgaengig — `PlaneRing` misst
 * den Frame-Pfad mit 77 MB/s Grossobjekt-Muell bei 30 fps.
 */
class MatPool : AutoCloseable {
    private val free = HashMap<MatShape, ArrayDeque<Mat>>()

    /** Wie viele Puffer der Pool anlegen musste. Nach dem Warmlaufen muss die Zahl stehen. */
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

/**
 * Eine Bildoperation. REIN: derselbe [key] im selben [FrameScope] heisst dieselben Pixel.
 *
 * Der Schluessel traegt den Frame NICHT — der Scope ist der Frame und stirbt mit ihm. Genau das
 * haelt den Clip-Replay frei von versteckten Eingaben, und es macht Knoten wiederverwendbar:
 * sie werden einmal gebaut, nicht je Frame.
 */
abstract class ImageNode(
    val op: WorkOperation,
    val key: Long,
    /** Der Vorgaenger, EINMAL je Knoten aufgeloest — sonst zaehlt jeder Zugriff doppelt. */
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

/**
 * Ein Frame, seine Zwischenergebnisse und deren Lebensdauer.
 *
 * [corners] steht wie [seq] nicht im Schluessel: innerhalb eines Frames sind sie fest, und der
 * Scope endet mit dem Frame. Wer ein Ergebnis laenger haelt, KOPIERT es — der `PlaneRing` haelt
 * Ebenen per Referenz, ein wieder ausgegebener Puffer verfaelschte seinen laufenden Mittelwert.
 */
class FrameScope(
    val source: Mat,
    val geom: BoardGeometry,
    val corners: List<DoubleArray>,
    val seq: Long,
    private val pool: MatPool,
    val homographies: HomographyCache? = null,
) : AutoCloseable {
    private val memo = HashMap<Long, Mat>()

    /**
     * Der Wert des Knotens, gerechnet oder aus dem Memo.
     *
     * Gezaehlt wird hier, gemessen nicht: die Zeitspanne gehoert dem Knoten, weil die Warp-Knoten
     * ihre Spanne von der aufgerufenen Funktion erben und eine zweite Spanne desselben Namens die
     * Zeit doppelt zaehlte.
     */
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

    /** Wie viele Knoten dieser Frame wirklich gerechnet hat. */
    val computed: Int get() = memo.size

    override fun close() {
        memo.values.forEach(pool::give)
        memo.clear()
    }
}

/** Die randlose Rektifizierung auf [size] — `warpFromCorners`, das seine Spanne selbst setzt. */
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

// TODO: kein einziger Aufrufer im ganzen Repo, Tests eingeschlossen — der Crop-Warp laeuft
// woanders. Entweder anschliessen oder loeschen.

/** Der bordierte Vollauflösungs-Warp — `warpBoardForCrops`, ebenfalls selbst gespannt. */
class CropWarpNode : ImageNode(WorkOperation.CROP_WARP, mixKey(2)) {
    override fun shape(
        scope: FrameScope,
        input: Mat?,
    ): MatShape {
        val side = scope.geom.boardSize + 2 * cropBorderPx(scope.geom)
        return MatShape(side, side, scope.source.type())
    }

    override fun compute(
        scope: FrameScope,
        input: Mat?,
        out: Mat,
    ) {
        warpBoardForCrops(scope.source, scope.geom, scope.corners, out, scope.homographies)
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

/**
 * Lokaler Kontrast. Der Handle haengt am Knoten und nicht am Frame: `createCLAHE` je Frame ist
 * ein messbarer Posten bei 15 fps, und ein Knoten lebt so lange wie seine Konfiguration.
 */
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

/** `config.PHOTOMETRY.clahe_tile` — dasselbe Raster, das `GrayPipeline` faehrt. */
const val DEFAULT_CLAHE_TILE: Int = 8

/** `cv2.GaussianBlur(g, (5, 5), 0)`. */
const val DEFAULT_BLUR_KSIZE: Int = 5
