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

/** The DETECTION warp, not the camera frame, with the engine's published evidence painted on it: a sheared
 *  warp explains a wrong move where the photograph looks fine. Nothing here is on the frame path. */
class TrackerView private constructor(
    private val frame: JFrame,
    private val canvas: BoardCanvas,
) : AutoCloseable {
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

    /** Blocking the loop is the point: a stuck state must not be read off a picture that keeps moving. Pauses
     *  only when the REASON changes — `no_legal_move` fires on every frame of a settled board. */
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

    private var lastStuck: String? = null

    companion object {
        /** Null rather than a throw: a replay on a build server has to run. */
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

/** The colour is what the engine DID with a square: a square that moved a lot and was vetoed as a shadow is the
 *  interesting case, so the vetoes outrank the heat. */
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
        status?.let { drawBelief(g2, it, side) }
        drawStatusLine(g2, status, side)
    }

    /** The BELIEVED piece from the engine's FEN, bright-on-dark or dark-on-bright so any square shows it. */
    private fun drawBelief(
        g2: Graphics2D,
        st: TrackerStatus,
        side: Int,
    ) {
        val cell = side / BOARD_SIDE.toDouble()
        g2.font = PIECE_FONT
        for ((square, piece) in piecesOf(st.fen)) {
            val (col, row) = runCatching { squareToColRow(square, true) }.getOrNull() ?: continue
            val x = (col * cell).toInt()
            val y = (row * cell).toInt()
            val w = ((col + 1) * cell).toInt() - x
            val h = ((row + 1) * cell).toInt() - y
            val white = piece.isUpperCase()
            val text = (if (white) "w" else "b") + piece.uppercaseChar()
            val tw = g2.fontMetrics.stringWidth(text)
            val tx = x + (w - tw) / 2
            val ty = y + h - PIECE_INSET
            g2.color = if (white) PIECE_PLATE_DARK else PIECE_PLATE_LIGHT
            g2.fillRoundRect(tx - PIECE_PAD, ty - PIECE_FONT.size, tw + 2 * PIECE_PAD, PIECE_FONT.size + PIECE_PAD, PIECE_PAD, PIECE_PAD)
            g2.color = if (white) Color.WHITE else Color.BLACK
            g2.drawString(text, tx, ty)
        }
    }

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
                // For squares the engine did not act on: faint enough not to read as a decision.
                g2.color = Color(HEAT.red, HEAT.green, HEAT.blue, heatAlpha(z))
                g2.fillRect(x, y, w, h)
            }
            g2.color = GRID
            g2.drawRect(x, y, w, h)
            if (verdict != null || abs(z) > Z_FULL) {
                // The number, not just the tint: only "18.5 where the moved one reads 7.6" points anywhere.
                g2.color = Color.WHITE
                g2.font = LABEL_FONT
                g2.drawString(
                    "$square ${"%.0f".format(abs(z))}",
                    x + LABEL_INSET,
                    y + LABEL_FONT.size + LABEL_INSET,
                )
            }
        }
    }

    /** A vetoed square is also a changed one, so asking "changed?" first would hide the veto. */
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

/** `TYPE_3BYTE_BGR`: its raster is OpenCV's layout, so one bulk copy and no channel swap. */
fun matToImage(mat: Mat): BufferedImage? {
    if (mat.empty() || mat.type() != CvType.CV_8UC3) return null
    val img = BufferedImage(mat.cols(), mat.rows(), BufferedImage.TYPE_3BYTE_BGR)
    val target = (img.raster.dataBuffer as DataBufferByte).data
    mat.get(0, 0, target)
    return img
}

private fun piecesOf(fen: String): Map<String, Char> {
    val out = mutableMapOf<String, Char>()
    val ranks = fen.substringBefore(' ').split('/')
    if (ranks.size != BOARD_SIDE) return emptyMap()
    for ((r, rank) in ranks.withIndex()) {
        var col = 0
        for (c in rank) {
            when {
                c.isDigit() -> col += c.digitToInt()
                col < BOARD_SIDE -> {
                    out["${'a' + col}${BOARD_SIDE - r}"] = c
                    col += 1
                }
            }
        }
    }
    return out
}

/** Through the SAME canvas the window paints, off-screen, so the view and the file cannot drift. */
fun renderBoardShot(
    board: BufferedImage,
    status: TrackerStatus?,
): BufferedImage {
    val canvas = BoardCanvas()
    canvas.board = board
    canvas.status = status
    canvas.setSize(canvas.preferredSize)
    val shot = BufferedImage(canvas.width, canvas.height, BufferedImage.TYPE_INT_RGB)
    val g2 = shot.createGraphics()
    canvas.paint(g2)
    g2.dispose()
    return shot
}

fun dumpBoard(
    frame: Int,
    board: BufferedImage?,
    status: TrackerStatus?,
) {
    val img = board ?: return
    val dir = File(DUMP_DIR).apply { mkdirs() }
    ImageIO.write(renderBoardShot(img, status), "png", File(dir, "board-%06d.png".format(frame)))
    // The unpainted board too: `scripts/bump_replay.py` compares two runs pixel by pixel.
    ImageIO.write(img, "png", File(dir, "raw-%06d.png".format(frame)))
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

private const val IDLE_POLL_MS = 30L

private const val Z_FLOOR = 1.0

/** `zThr` is 3.0, so a square at the decision threshold reads full. */
private const val Z_FULL = 3.0

// Red: acted on. Blue: a hand over it. Grey: swallowed by the shadow veto. Magenta: the CNN contradicts the board.
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

private val PIECE_FONT = Font(Font.SANS_SERIF, Font.BOLD, 13)
private const val PIECE_INSET = 5
private const val PIECE_PAD = 3
private const val PLATE_ALPHA = 160
private val PIECE_PLATE_DARK = Color(0, 0, 0, PLATE_ALPHA)
private val PIECE_PLATE_LIGHT = Color(255, 255, 255, PLATE_ALPHA)
