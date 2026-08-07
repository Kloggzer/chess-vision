package com.chesslab.desktop

import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.squareToColRow
import org.opencv.core.CvType
import org.opencv.core.Mat
import java.awt.BorderLayout
import java.awt.Color
import java.awt.Dimension
import java.awt.Font
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.GraphicsEnvironment
import java.awt.RenderingHints
import java.awt.event.KeyAdapter
import java.awt.event.KeyEvent
import java.awt.image.BufferedImage
import java.awt.image.DataBufferByte
import java.io.File
import javax.imageio.ImageIO
import javax.swing.JFrame
import javax.swing.JPanel
import javax.swing.SwingUtilities
import javax.swing.WindowConstants
import kotlin.math.abs
import kotlin.math.min

/**
 * What the tracker sees, while it sees it.
 *
 * The engine already publishes everything this draws — `TrackerStatus` carries the fused
 * per-square evidence, the three veto sets and the CNN conflicts, and `CameraFrameBus` carries
 * the rectified detection warp. The desktop built both and read neither, so a decision printed
 * as `REJECT ... too_many_changed changed=[e7=23.5 g1=23.2 ...]` was the only way to find out
 * WHERE the tracker was looking. This is that same information on the board it came from.
 *
 * The board shown is the DETECTION warp, not the camera frame: it is the picture the engine
 * actually reasons about, at the resolution it reasons about it. A frame that looks fine and a
 * warp that is sheared are the same photograph, and only the second one explains a wrong move.
 *
 * Nothing here is on the frame path. The bus throttles the conversion to one frame in six and
 * runs it off-thread; this only ever paints what it is handed.
 */
class TrackerView private constructor(
    private val frame: JFrame,
    private val canvas: BoardCanvas,
) : AutoCloseable {
    /** Hand it the latest board and status; safe to call from any thread, cheap when unchanged. */
    fun show(
        board: BufferedImage?,
        status: TrackerStatus?,
    ) {
        SwingUtilities.invokeLater {
            canvas.board = board
            canvas.status = status
            canvas.repaint()
        }
    }

    /**
     * Block here while the run is paused, and pause it when the engine gets stuck.
     *
     * Called from the frame loop, before the next frame is pulled. Blocking the loop is the
     * point: a stuck tracker is a state, and reading a state off a picture that keeps moving is
     * how you end up describing the frame after the one that mattered.
     *
     * Pausing on `stuckReason` rather than on every frame, and only when the REASON changes —
     * `no_legal_move` fires on every frame of a settled board, so stopping on each one would be
     * a break-point that never lets go.
     *
     * Returns false once the window is gone, which is how the caller learns to stop.
     */
    fun awaitStep(status: TrackerStatus?): Boolean {
        if (!frame.isDisplayable) return false
        val reason = status?.stuckReason
        if (canvas.breakOnStuck && reason != null && reason != lastStuck) {
            canvas.paused = true
            println("paused: the engine is stuck — $reason  (space = step, c = continue, s = stop breaking)")
        }
        lastStuck = reason
        while (canvas.paused && !canvas.stepOnce) {
            if (!frame.isDisplayable) return false
            Thread.sleep(IDLE_POLL_MS)
        }
        canvas.stepOnce = false
        return true
    }

    override fun close() {
        SwingUtilities.invokeLater { frame.dispose() }
    }

    /** The reason we last paused on, so a persistent one does not stop every frame. */
    private var lastStuck: String? = null

    companion object {
        /**
         * A window, or null when there is no display.
         *
         * Null rather than a thrown exception: a replay on a build server has to run, and the
         * view is a debugging aid, not part of what is being tested. The caller prints why.
         */
        fun openOrNull(title: String): TrackerView? {
            if (GraphicsEnvironment.isHeadless()) return null
            val canvas = BoardCanvas()
            canvas.isFocusable = true
            canvas.addKeyListener(
                object : KeyAdapter() {
                    override fun keyPressed(e: KeyEvent) {
                        when (e.keyCode) {
                            KeyEvent.VK_SPACE -> {
                                canvas.paused = true
                                canvas.stepOnce = true
                            }
                            KeyEvent.VK_C -> canvas.paused = false
                            KeyEvent.VK_P -> canvas.paused = true
                            KeyEvent.VK_S -> canvas.breakOnStuck = !canvas.breakOnStuck
                        }
                        canvas.repaint()
                    }
                },
            )
            val window = JFrame(title)
            window.defaultCloseOperation = WindowConstants.DISPOSE_ON_CLOSE
            window.layout = BorderLayout()
            window.add(canvas, BorderLayout.CENTER)
            window.pack()
            SwingUtilities.invokeLater {
                window.isVisible = true
                canvas.requestFocusInWindow()
            }
            return TrackerView(window, canvas)
        }
    }
}

/**
 * The board, with the engine's evidence drawn where the evidence is about.
 *
 * The colour of a square is what the engine DID with it, not merely how much it changed: a
 * square that moved a lot and was vetoed as a shadow is the interesting case, and a heatmap
 * alone cannot show it. So the vetoes outrank the heat, and the legend says which is which.
 */
private class BoardCanvas : JPanel() {
    @Volatile var board: BufferedImage? = null

    @Volatile var status: TrackerStatus? = null

    /** Set from the key listener, read from the frame loop — hence volatile, not a lock. */
    @Volatile var paused = false

    @Volatile var stepOnce = false

    @Volatile var breakOnStuck = true

    init {
        preferredSize = Dimension(PANEL_SIDE, PANEL_SIDE + TEXT_BAND)
        background = SURFACE
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        val side = min(width, height - TEXT_BAND)
        val img = board
        if (img == null) {
            g2.color = Color.GRAY
            g2.drawString("waiting for the first rectified frame…", MARGIN, height / 2)
            return
        }
        g2.drawImage(img, 0, 0, side, side, null)
        status?.let { drawEvidence(g2, it, side) }
        drawStatusLine(g2, status, side)
    }

    /** One tint per square, chosen by what the engine decided rather than by how loud it was. */
    private fun drawEvidence(
        g2: Graphics2D,
        st: TrackerStatus,
        side: Int,
    ) {
        val cell = side / BOARD_SIDE.toDouble()
        for ((square, z) in st.z) {
            val (col, row) = runCatching { squareToColRow(square, true) }.getOrNull() ?: continue
            val x = (col * cell).toInt()
            val y = (row * cell).toInt()
            val w = ((col + 1) * cell).toInt() - x
            val h = ((row + 1) * cell).toInt() - y
            val verdict = verdictOf(square, st)
            if (verdict != null) {
                g2.color = verdict.second
                g2.fillRect(x, y, w, h)
            } else if (abs(z) > Z_FLOOR) {
                // The fused evidence itself, for squares the engine did not act on: enough to
                // see where it is looking, faint enough not to be mistaken for a decision.
                g2.color = Color(HEAT.red, HEAT.green, HEAT.blue, heatAlpha(z))
                g2.fillRect(x, y, w, h)
            }
            g2.color = GRID
            g2.drawRect(x, y, w, h)
            if (verdict != null) {
                g2.color = Color.WHITE
                g2.font = LABEL_FONT
                g2.drawString(square, x + LABEL_INSET, y + LABEL_FONT.size + LABEL_INSET)
            }
        }
    }

    /**
     * Which set a square is in, in the order the engine resolves them.
     *
     * A vetoed square is also a changed square — that is the whole point of a veto — so asking
     * "changed?" first would paint over the only information that explains a non-move.
     */
    private fun verdictOf(
        square: String,
        st: TrackerStatus,
    ): Pair<String, Color>? =
        when (square) {
            in st.cnnConflicts -> "cnn" to CNN_TINT
            in st.occlusionVetoed -> "occluded" to OCCLUDED_TINT
            in st.shadowVetoed -> "shadow" to SHADOW_TINT
            in st.changed -> "changed" to CHANGED_TINT
            else -> null
        }

    /** State, the move it is weighing, and — when it refused — the reason it gives. */
    private fun drawStatusLine(
        g2: Graphics2D,
        st: TrackerStatus?,
        side: Int,
    ) {
        g2.color = SURFACE
        g2.fillRect(0, side, width, TEXT_BAND)
        g2.font = STATUS_FONT
        if (st == null) {
            g2.color = Color.GRAY
            g2.drawString("no status yet", MARGIN, side + STATUS_FONT.size + MARGIN)
            return
        }
        val move = st.bestUci ?: "-"
        val lines =
            listOf(
                (if (st.stuckReason != null) STUCK_TEXT else RUNNING_TEXT) to
                    "${st.state}  best=$move  margin=${"%.2f".format(st.bestLl - st.secondLl)}" +
                    (st.stuckReason?.let { "  stuck=$it" } ?: ""),
                MUTED_TEXT to st.fen.substringBefore(' '),
                MUTED_TEXT to
                    "changed ${st.changed.size} · shadow ${st.shadowVetoed.size} · " +
                    "occluded ${st.occlusionVetoed.size} · cnn ${st.cnnConflicts.size}",
                (if (paused) STUCK_TEXT else MUTED_TEXT) to
                    (if (paused) "PAUSED" else "running") +
                    "  ·  space step · c continue · p pause · s break-on-stuck " +
                    (if (breakOnStuck) "on" else "off"),
            )
        lines.forEachIndexed { i, (colour, text) ->
            g2.color = colour
            g2.drawString(text, MARGIN, side + (i + 1) * STATUS_FONT.size + MARGIN)
        }
    }

    private fun heatAlpha(z: Double): Int = ((abs(z) / Z_FULL).coerceIn(0.0, 1.0) * HEAT_ALPHA_MAX).toInt()
}

/**
 * A BGR `Mat` as a Swing image.
 *
 * `TYPE_3BYTE_BGR` on purpose: its raster is BGR in exactly the layout OpenCV already has, so
 * this is one bulk copy and no per-pixel channel swap.
 */
fun matToImage(mat: Mat): BufferedImage? {
    if (mat.empty() || mat.type() != CvType.CV_8UC3) return null
    val img = BufferedImage(mat.cols(), mat.rows(), BufferedImage.TYPE_3BYTE_BGR)
    val target = (img.raster.dataBuffer as DataBufferByte).data
    mat.get(0, 0, target)
    return img
}

/**
 * The rectified board, as a file, with what the engine believed about it beside it.
 *
 * The window shows this already — but a window is only useful to whoever is sitting in front of
 * it. When the question is "why did this video commit nothing", the answer is in the picture the
 * engine reasons about, and that picture has to survive the run to be looked at.
 */
fun dumpBoard(
    frame: Int,
    board: BufferedImage?,
    status: TrackerStatus?,
) {
    val img = board ?: return
    val dir = File(DUMP_DIR).apply { mkdirs() }
    ImageIO.write(img, "png", File(dir, "board-%06d.png".format(frame)))
    File(dir, "board-%06d.txt".format(frame)).writeText(
        buildString {
            appendLine("frame=$frame")
            val st = status ?: return@buildString
            appendLine("state=${st.state} stuck=${st.stuckReason} best=${st.bestUci}")
            appendLine("fen=${st.fen}")
            appendLine("changed=${st.changed.sorted()}")
            appendLine("shadowVetoed=${st.shadowVetoed.sorted()}")
            appendLine("occlusionVetoed=${st.occlusionVetoed.sorted()}")
            appendLine(
                "z=" +
                    st.z.entries
                        .sortedByDescending { it.value }
                        .take(DUMP_TOP_Z)
                        .joinToString { "${it.key}=${"%.2f".format(it.value)}" },
            )
        },
    )
}

/** Where a `dump` run writes the board it reasoned about. Under tmp/, which is not the corpus. */
private const val DUMP_DIR = "../../tmp/board-dump"

private const val DUMP_TOP_Z = 8

private const val BOARD_SIDE = 8
private const val PANEL_SIDE = 720
private const val TEXT_BAND = 96
private const val MARGIN = 10
private const val LABEL_INSET = 3
private const val GRID_ALPHA = 90
private const val FILL_ALPHA = 110
private const val HEAT_ALPHA_MAX = 150

/** How often a paused loop looks up. Idle cost, and no key press should feel laggy. */
private const val IDLE_POLL_MS = 30L

/** Below this the fused evidence is indistinguishable from sensor noise; drawing it is clutter. */
private const val Z_FLOOR = 1.0

/** Where the heat saturates. `zThr` is 3.0, so a square at the decision threshold reads full. */
private const val Z_FULL = 3.0

// The palette says what a square MEANS, which is why the tints are named after verdicts and not
// after colours. Red for a square the engine acted on, blue for one a hand is over, grey for one
// the shadow veto swallowed, magenta for a square where the CNN contradicts the believed board.
private val SURFACE = Color(18, 18, 20)
private val GRID = Color(0, 0, 0, GRID_ALPHA)
private val HEAT = Color(255, 220, 80)
private val CHANGED_TINT = Color(255, 90, 60, FILL_ALPHA)
private val SHADOW_TINT = Color(120, 120, 130, FILL_ALPHA)
private val OCCLUDED_TINT = Color(70, 130, 255, FILL_ALPHA)
private val CNN_TINT = Color(200, 60, 200, FILL_ALPHA)
private val STUCK_TEXT = Color(255, 140, 120)
private val RUNNING_TEXT = Color(190, 230, 190)
private val MUTED_TEXT = Color(150, 150, 160)

private val LABEL_FONT = Font(Font.SANS_SERIF, Font.BOLD, 11)
private val STATUS_FONT = Font(Font.MONOSPACED, Font.PLAIN, 13)
