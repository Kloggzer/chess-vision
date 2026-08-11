package com.chesslab.tracker.ui.review

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.OpeningSummary
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.ResolvedMateLine
import com.chesslab.tracker.analysis.SideSummary
import com.chesslab.tracker.analysis.lineFrames
import com.chesslab.tracker.analysis.missedMate
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SeverityStripe
import com.chesslab.tracker.ui.TextAction
import com.chesslab.tracker.ui.games.GameDetailsDialog
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.BoardDark
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.PieceWhite
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import com.chesslab.tracker.ui.theme.SurfaceRaised
import com.chesslab.tracker.ui.tracking.BoardCanvas
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.max

/**
 * Order is the order of the tab row, and **Moments is first** (specs/48).
 *
 * A finished game is opened to find out what went wrong. Review — the board you step through — is
 * where a moment sends you when it makes you curious, and it still starts at ply 0, so opening on it
 * asked the reader to walk 83 plies to find the three that mattered.
 */
private enum class ReviewSection {
    MOMENTS,
    REVIEW,
    MOVES,
}

/**
 * How many findings are shown before "show all".
 *
 * Three, because the screen's job in its first five seconds is "which moves decided this game" and a
 * list of eleven is a second problem to solve. Working memory is about four chunks and the move
 * notation already competes for them.
 */
private const val TOP_FINDINGS = 3

/** Eight score-sheet rows are enough to scan before deciding to open the complete game. */
private const val TOP_MOVE_ROWS = 8

/**
 * The review of a stored game.
 *
 * There used to be a second entry point, `LiveReviewRoute` — the "Spectator" tab. It was this
 * composable fed by the running game, i.e. the tracker's own board and the tracker's own move list
 * on a destination of their own, and its only unique content was one Wi-Fi switch. The switch is in
 * the tracker's overflow menu now and this screen reads exactly one kind of game.
 *
 * An archived review opens on **rating, board with the win bar, what the move on screen did, and the
 * navigation**. Key moments and the complete score sheet are peers behind explicit tabs. Selecting
 * either returns to the board at that position, so the arrow and explanation remain the place where
 * a move is understood.
 */
@Composable
fun ArchiveReviewRoute(
    id: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    // NOT `rememberCoroutineScope()`: that tied a multi-minute grading pass to this composition, so
    // leaving the screen cancelled it without a word. See [ReviewHost].
    val model = remember(context) { ReviewHost.of(context) }
    LaunchedEffect(id) { model.load(id) }
    val ui by model.ui.collectAsStateWithLifecycle()
    val game = ui.game
    if (game == null) {
        val message =
            when {
                ui.loading -> "Loading gameâ€¦"
                ui.error != null -> ui.error.orEmpty()
                else -> "Game not found."
            }
        ChesslabScaffold(id, onBack) { bars -> Text(message, Modifier.padding(bars), color = OnSurfaceMuted) }
        return
    }
    GameReviewScreen(ui, game, onBack, model)
}

@Composable
private fun GameReviewScreen(
    ui: ReviewUi,
    game: GameView,
    onBack: () -> Unit,
    model: ReviewViewModel,
) {
    var seek by remember(game.id) { mutableIntStateOf(0) }
    var section by remember(game.id) { mutableStateOf(ReviewSection.REVIEW) }
    var allMoves by remember(game.id) { mutableStateOf(false) }
    val overlays = remember(game.id) { ReviewOverlayState() }
    val grade = ui.grade
    val review = reviewSelection(game, grade, seek)
    val listState = rememberReviewListState(game, section, review.selected, model::focus)

    ChesslabScaffold(
        title = reviewTitle(game),
        onBack = onBack,
        actions = { ReviewActions({ overlays.editingDetails = true }, { overlays.showingAnalysisDetails = true }) },
    ) { bars ->
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(bars),
            contentPadding = PaddingValues(vertical = Space.sm),
            // The score sheet's rows carry their own vertical padding; a gap between them as well
            // makes 42 rows a ladder.
            verticalArrangement = Arrangement.spacedBy(if (section == ReviewSection.MOVES) 0.dp else Space.sm),
        ) {
            item(key = "tabs") {
                ReviewTabs(
                    selected = section,
                    moments = grade?.let { it.findings().size + it.missedChances().size },
                    moves = game.plies.size,
                    onSelect = { section = it },
                )
            }
            // Whether the engine has read this game is a property of the SCREEN, not of one tab.
            // It used to live inside `AccuracyRow` under Moments only, so a user on the board tab
            // tapped a text link in a section they could not see and nothing appeared to happen:
            // "clicking the review button does not give me an indicator whatsoever" (2026-08-04).
            analysisPhase(ui)?.let { phase ->
                item(key = "analysis") { AnalysisState(phase, grade, ui.error, model::review) }
            }
            when (section) {
                ReviewSection.REVIEW -> {
                    item(key = "board") { ReviewBoard(game, review.selected, grade, review.advice) }
                    item(key = "verdict") { ReviewVerdict(review, game, grade) { overlays.mateLine = it } }
                    item(key = "nav") { PlyNav(review.selected, game.plies.size) { seek = it } }
                }
                // The rating leads on the tab the screen opens on: it is the answer to "how did I
                // do" and the one thing the user asked for by name. STARTING the engine is not here
                // any more — that is the whole screen's business and it is above this `when`.
                ReviewSection.MOMENTS -> {
                    if (grade != null || ui.opening != null) {
                        item(key = "summary") {
                            MomentsSummary(grade, ui.opening) { overlays.openingLine = openingLineRequest(game, it) }
                        }
                    }
                    item(key = "moments") {
                        KeyMoments(grade) {
                            seek = it
                            section = ReviewSection.REVIEW
                        }
                    }
                }
                ReviewSection.MOVES ->
                    movesSection(game, grade, review.selected, allMoves, onToggle = { allMoves = !allMoves }) {
                        seek = it
                        section = ReviewSection.REVIEW
                    }
            }
        }
    }
    ReviewOverlays(ui, game, review.selected, model, overlays)
}

private class ReviewOverlayState {
    var mateLine by mutableStateOf<MateLineRequest?>(null)
    var openingLine by mutableStateOf<OpeningLineRequest?>(null)
    var editingDetails by mutableStateOf(false)
    var showingAnalysisDetails by mutableStateOf(false)
}

@Composable
private fun ReviewOverlays(
    ui: ReviewUi,
    game: GameView,
    selected: Int,
    model: ReviewViewModel,
    overlays: ReviewOverlayState,
) {
    overlays.mateLine?.let { MateLineExplorer(it, model::resolveMateLine) { overlays.mateLine = null } }
    overlays.openingLine?.let { OpeningLineExplorer(it) { overlays.openingLine = null } }
    ReviewDetailsEditor(game, overlays.editingDetails, model, onDismiss = { overlays.editingDetails = false })
    AnalysisDetailsDialog(
        ui = ui,
        game = game,
        selected = selected,
        visible = overlays.showingAnalysisDetails,
        onDiscard = {
            overlays.showingAnalysisDetails = false
            model.discard()
        },
        onDismiss = { overlays.showingAnalysisDetails = false },
    )
}

@Composable
private fun ReviewActions(
    onEdit: () -> Unit,
    onAnalysisDetails: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    IconButton(onClick = { open = true }) {
        Icon(Icons.Filled.MoreVert, contentDescription = "Review options")
    }
    DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
        DropdownMenuItem(text = { Text("Edit game details") }, onClick = {
            open = false
            onEdit()
        })
        DropdownMenuItem(text = { Text("Analysis details") }, onClick = {
            open = false
            onAnalysisDetails()
        })
    }
}

@Composable
private fun ReviewDetailsEditor(
    game: GameView,
    visible: Boolean,
    model: ReviewViewModel,
    onDismiss: () -> Unit,
) {
    if (!visible) return
    GameDetailsDialog(
        initialWhite = game.white,
        initialBlack = game.black,
        initialEvent = game.event,
        onDismiss = onDismiss,
    ) { white, black, event ->
        model.editGameDetails(white, black, event)
        onDismiss()
    }
}

/** Player names are the identity of a game; the timestamp is only the fallback file identity. */
internal fun reviewTitle(game: GameView): String {
    val named = game.white != "?" || game.black != "?"
    if (named) return "${game.white} – ${game.black}"
    val date =
        game.startedAtEpochMs
            .takeIf { it > 0L }
            ?.let {
                REVIEW_DATE_FORMAT.format(Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()))
            } ?: game.id.replace('_', ' ')
    return "$date · ${resultHeadline(game.result)}"
}

private val REVIEW_DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)

@Composable
private fun rememberReviewListState(
    game: GameView,
    section: ReviewSection,
    selected: Int,
    onFocus: (Int) -> Unit,
): LazyListState {
    val listState = rememberLazyListState()
    LaunchedEffect(selected) { onFocus(selected) }
    LaunchedEffect(section, game.id) { listState.scrollToItem(0) }
    return listState
}

internal data class ReviewSelection(
    val selected: Int,
    val ply: PlyGrade?,
    /**
     * The ply whose ENGINE MOVE this screen is showing — the same one the board's accent arrow
     * draws and the verdict's right column names.
     *
     * It is the selected ply itself: its `bestUci` is what the engine wanted INSTEAD of what was
     * played, which is the question a review answers and the one the left column has just posed.
     * The board drew the NEXT ply's engine move while the card named this one's, so the arrow and
     * the move beside it were a ply apart — *"die Zuordnung der Pfeile stimmt nicht, die werden um
     * ein[s] versetzt dargestellt"*. At the start position there is no played ply, so the advice is
     * the first one's: the engine's opening move.
     */
    val advice: PlyGrade?,
    val mateHint: MateLineRequest?,
    val checkmate: Boolean,
)

@Composable
private fun ReviewVerdict(
    review: ReviewSelection,
    game: GameView,
    grade: GameGrade?,
    onExploreMate: (MateLineRequest) -> Unit,
) {
    PlyVerdict(
        ply = review.ply,
        san = game.plies.getOrNull(review.selected - 1)?.san,
        selected = review.selected,
        grade = grade,
        playedBy = review.ply?.let { playerAndSide(game, it) },
        // The same ply the board's accent arrow draws — see [ReviewSelection.advice].
        engineMove = review.advice?.bestSan,
        mateHint = review.mateHint,
        checkmate = review.checkmate,
    ) { review.mateHint?.let(onExploreMate) }
}

/** The colour is always present; a saved name adds identity without replacing the chess side. */
internal fun playerAndSide(
    game: GameView,
    ply: PlyGrade,
): String {
    val side = movingSide(ply)
    val player = if (ply.whiteMoved) game.white else game.black
    return if (player == "?") side else "$player · $side"
}

internal fun reviewSelection(
    game: GameView,
    grade: GameGrade?,
    selected: Int,
): ReviewSelection {
    val ply = grade?.of(selected)
    val next = grade?.of(selected + 1)
    val checkmate = isCheckmatePosition(game.fenAt(selected))
    return ReviewSelection(
        selected = selected,
        ply = ply,
        advice = if (selected == 0) next else ply,
        // A finding opens the position before its move, so the mate belongs to `next` there.
        // Stepping normally still shows the same hint on the move after it was played.
        mateHint =
            if (checkmate) {
                null
            } else {
                next?.takeIf { it.missedMate }?.let { mateLineRequest(game, it) }
                    ?: ply?.let { mateLineRequest(game, it) }
            },
        checkmate = checkmate,
    )
}

internal data class MateLineRequest(
    val ply: Int,
    val side: String,
    val startFen: String,
    val uciLine: List<String>,
    val sanLine: List<String>,
    val missed: Boolean,
    val mateIn: Int?,
    val bestSan: String?,
)

internal fun mateLineRequest(
    game: GameView,
    current: PlyGrade,
): MateLineRequest? {
    val grade =
        current?.takeIf { ply ->
            ply.missedMate || (ply.forcedMateLine && ply.mateBefore && ply.mateAfter)
        } ?: return null
    return MateLineRequest(
        ply = grade.ply,
        side = movingSide(grade),
        startFen = game.fenAt(grade.ply - 1),
        uciLine = grade.bestUciLine,
        sanLine = grade.bestLine,
        missed = grade.missedMate,
        mateIn = grade.mateInBefore,
        bestSan = grade.bestSan,
    )
}

@Composable
private fun MateLineExplorer(
    request: MateLineRequest,
    resolveMateLine: suspend (String, List<String>) -> ResolvedMateLine,
    onDismiss: () -> Unit,
) {
    var resolved by remember(request) {
        mutableStateOf(ResolvedMateLine(request.uciLine, request.sanLine, complete = false))
    }
    var resolving by remember(request) { mutableStateOf(true) }
    val frames = remember(request, resolved) { lineFrames(request.startFen, resolved.uciLine) }
    if (frames.isEmpty()) return
    var step by remember(request) { mutableIntStateOf(0) }
    LaunchedEffect(request) {
        resolved = resolveMateLine(request.startFen, request.uciLine)
        step = step.coerceAtMost(lineFrames(request.startFen, resolved.uciLine).lastIndex)
        resolving = false
    }
    val frame = frames[step.coerceIn(frames.indices)]
    val isMatingMove = resolved.complete && step == frames.lastIndex && step > 0
    val caption =
        if (step == 0) {
            "Starting position"
        } else {
            "$step/${frames.lastIndex} · ${resolved.sanLine.getOrNull(step - 1).orEmpty()}"
        }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close", color = Accent) } },
        title = { Text(if (request.missed) "Missed mate" else "Forced mate", color = OnSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                BoardCanvas(fen = frame.fen, lastMoveUci = frame.lastMoveUci)
                Text(
                    mateExplanation(request),
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceMuted,
                )
                MateMoveCaption(caption, isMatingMove)
                Text(
                    resolved.sanLine
                        .mapIndexed { index, san -> if (index == step - 1) "[$san]" else san }
                        .joinToString(" "),
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceMuted,
                )
                MateResolutionStatus(resolving, resolved.complete)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    TextAction("Previous", { step = (step - 1).coerceAtLeast(0) }, enabled = !resolving && step > 0)
                    TextAction(
                        "Next",
                        { step = (step + 1).coerceAtMost(frames.lastIndex) },
                        enabled = !resolving && step < frames.lastIndex,
                    )
                }
            }
        },
        containerColor = SurfaceRaised,
    )
}

@Composable
private fun MateMoveCaption(
    caption: String,
    isMatingMove: Boolean,
) {
    Text(caption, style = MaterialTheme.typography.bodyMedium, color = OnSurface)
    if (isMatingMove) {
        Text("Checkmate", style = MaterialTheme.typography.labelSmall, color = Accent)
    }
}

@Composable
private fun MateResolutionStatus(
    resolving: Boolean,
    complete: Boolean,
) {
    if (resolving) {
        Text("Completing the sequence…", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        LinearProgressIndicator(Modifier.fillMaxWidth(), color = Accent)
    } else if (!complete) {
        Text(
            "The engine could not complete the mate at the current analysis budget.",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
        )
    }
}

private fun LazyListScope.movesSection(
    game: GameView,
    grade: GameGrade?,
    selected: Int,
    allMoves: Boolean,
    onToggle: () -> Unit,
    onSelect: (Int) -> Unit,
) {
    item(key = "moves-heading") { MoveSectionHeading() }
    moveListSection(
        game = game,
        grade = grade,
        selected = selected,
        onSelect = onSelect,
        maxRows = if (allMoves) null else TOP_MOVE_ROWS,
    )
    if (game.plies.size > TOP_MOVE_ROWS * 2) {
        // An OUTLINE button, not a text link. Text is the rank for navigation inside a card; this is
        // the only way out of a truncated list, and *"ich finde es schwierig die clickzone zu
        // ermitteln"* is what a link with no visible edge costs at the end of a long table.
        item(key = "moves-toggle") {
            OutlineAction(
                if (allMoves) "Show fewer" else "Show all ${game.plies.size} moves",
                onToggle,
                Modifier.padding(top = Space.sm),
            )
        }
    }
}

/**
 * The board, the two arrows, and the bar above them.
 *
 * **Both arrows belong to the SAME ply**: what was played (in the last-move colour) and what the
 * engine wanted instead (accent). That pairing is the whole review — *"weiß Zug war …, dann die
 * Veränderung anzeigen, und bester Zug wäre … mit Pfeil zeigen, selbiges auch für Schwarz"* — and it
 * is what the verdict card below spells out in words, for either side's ply without distinction.
 *
 * The arrow was the NEXT ply's engine move until this change, i.e. the move to play FROM here, so
 * the board's arrow and the card's "Engine move" named two different moves. The board still shows
 * the position AFTER the played move, which is why the two are drawn together: read alone, an
 * alternative to a move that has already happened is the ambiguity the pairing removes.
 *
 * An engine move identical to the played one draws nothing extra — one arrow under another is a
 * thicker arrow, not a second statement, and the card already says "best".
 */
@Composable
private fun ReviewBoard(
    game: GameView,
    selected: Int,
    grade: GameGrade?,
    advice: PlyGrade?,
) {
    val played = game.plies.getOrNull(selected - 1)?.uci
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
        ReviewWinBar(grade?.winWhite?.getOrNull(selected))
        BoardCanvas(
            fen = game.fenAt(selected),
            lastMoveUci = played,
            suggestedUci = advice?.bestUci?.takeIf { it != played },
            lastMoveArrow = true,
        )
    }
}

/**
 * The tab's accessible name is the LABEL, always.
 *
 * The count used to be inside the same `Text` (`Moments · 24`), so the name changed while the
 * analysis streamed — watched going `· 2` → `· 11` → `· 20` → `· 24` over three minutes — and
 * `tap-text "Moments"` failed. That is the `CLAUDE.md` rule met in the wild.
 */
@Composable
private fun ReviewTabs(
    selected: ReviewSection,
    moments: Int?,
    moves: Int,
    onSelect: (ReviewSection) -> Unit,
) {
    Row(Modifier.fillMaxWidth()) {
        // Always enabled, unlike before: it is the tab the screen opens on, and an ungraded game
        // reaches its own "Review this game" button through it.
        ReviewTab("Moments", moments, ReviewSection.MOMENTS, selected, onSelect, Modifier.weight(1f))
        ReviewTab("Review", null, ReviewSection.REVIEW, selected, onSelect, Modifier.weight(1f))
        ReviewTab("Moves", moves, ReviewSection.MOVES, selected, onSelect, Modifier.weight(1f))
    }
}

/**
 * The width kept clear for a count on BOTH sides of every label.
 *
 * Three digits of [com.chesslab.tracker.ui.theme.Figures] plus the gap. It is reserved on the empty
 * side too, and that is the point: with the pair centred, a label shifted left by half its own
 * count, so `Moments` and `Moves` sat off the centre of their tab and `Review` did not — the three
 * labels did not line up with each other or with the underline. What is centred is the LABEL.
 */
private val TAB_COUNT_SLOT = 32.dp
private val REVIEW_BAR_HEIGHT = 10.dp
private val REVIEW_BAR_RADIUS = 3.dp
private val REVIEW_VERDICT_HEIGHT = 64.dp
private const val REVIEW_BAR_MIN_WEIGHT = 0.001f

@Composable
private fun ReviewTab(
    label: String,
    count: Int?,
    section: ReviewSection,
    selected: ReviewSection,
    onSelect: (ReviewSection) -> Unit,
    modifier: Modifier = Modifier,
) {
    val active = selected == section
    val tint = if (active) Accent else OnSurfaceMuted
    Column(modifier.selectable(selected = active, role = Role.Tab, onClick = { onSelect(section) })) {
        Row(
            Modifier.fillMaxWidth().padding(vertical = Space.md),
            horizontalArrangement = Arrangement.Center,
        ) {
            Spacer(Modifier.width(TAB_COUNT_SLOT))
            // `alignByBaseline`, because the count is a different FACE at the same size: box-aligned
            // it floated above the word beside it, which is what "off center" was.
            Text(label, style = MaterialTheme.typography.labelMedium, color = tint, modifier = Modifier.alignByBaseline())
            Figure(
                count?.toString().orEmpty(),
                tint,
                Modifier.width(TAB_COUNT_SLOT).padding(start = Space.xs).alignByBaseline(),
            )
        }
        Box(Modifier.fillMaxWidth().height(Stroke.thick).background(if (active) Accent else Color.Transparent))
    }
}

@Composable
private fun MoveSectionHeading() {
    Column(Modifier.fillMaxWidth().padding(horizontal = Space.xs, vertical = Space.xs)) {
        Text("All moves", style = MaterialTheme.typography.titleSmall, color = OnSurface)
        Text(
            "Winning chances lost by that move · tap for details",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
        )
    }
}

/**
 * The screen's ONE "what does this mean" affordance: a small ⓘ beside a heading, opening a dialog.
 *
 * Same glyph, same gesture, same kind of content everywhere — a mixture of tooltips, sheets and
 * dialogs is worse than none. It explains a CONCEPT to somebody who wants to go deeper; it is not a
 * licence to leave jargon on screen and translate it here. If a label needs this to be understood at
 * all, the label is wrong.
 */
@Composable
private fun Info(
    title: String,
    body: String,
) {
    var open by remember { mutableStateOf(false) }
    Text(
        "ⓘ",
        style = MaterialTheme.typography.bodyMedium,
        color = OnSurfaceMuted,
        modifier = Modifier.clickable { open = true }.padding(horizontal = Space.xs),
    )
    if (open) {
        AlertDialog(
            onDismissRequest = { open = false },
            confirmButton = { TextButton(onClick = { open = false }) { Text("Got it", color = Accent) } },
            title = { Text(title, color = OnSurface) },
            text = { Text(body, color = OnSurfaceMuted) },
            containerColor = SurfaceRaised,
        )
    }
}

private const val ACCURACY_INFO =
    "How close your moves were to the engine's. 100 % means you never gave anything away; the score " +
        "falls fastest for the moves that cost the most, so one bad move matters more than several " +
        "small ones.\n\nIt is counted over the moves that could still change the game — once a game " +
        "is completely won or lost, no move can demonstrate anything, so those are left out. The " +
        "count under the number is how many moves it is based on."

private const val WIN_BAR_INFO =
    "How good the position is, split between White and Black. 50 % each is level.\n\nIt is not your " +
        "chance of winning THIS game against THIS opponent — it is what the position is worth " +
        "between evenly matched players. A 90 % position is still lost if you then blunder."

private const val QUALITY_INFO =
    "Each move is judged by how much of the position's value it gave away.\n\n" +
        "Best move — the engine's own first choice.\n" +
        "Good — gave away almost nothing.\n" +
        "Inaccuracy — gave away a little.\n" +
        "Mistake — gave away a lot.\n" +
        "Blunder — gave away most of what you had.\n\n" +
        "During a forced mate, the losing side instead shows whether its move held out or made the " +
        "mate arrive sooner. Those moves do not inflate the accuracy score.\n\n" +
        "The engine searches each position for a few seconds. A move it only refutes after a very " +
        "deep search is not one a human could have been expected to find, so the search is kept " +
        "close to what a strong club player would see."

/**
 * Win expectancy for the position ON SCREEN. Both names and values stay visible, so a number can
 * never be mistaken for the side that happens to have moved last.
 */
@Composable
private fun ReviewWinBar(winWhite: Double?) {
    val white = winWhite?.coerceIn(0.0, 100.0)
    val black = white?.let { 100.0 - it }
    Column(
        Modifier.fillMaxWidth().semantics {
            contentDescription =
                if (white == null) "Position not analysed" else "White ${percent(white)}, Black ${percent(black!!)}"
        },
        verticalArrangement = Arrangement.spacedBy(Space.hair),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Figure("White ${white?.let(::percent) ?: "–"}", OnSurface)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Figure("Black ${black?.let(::percent) ?: "–"}", OnSurface)
                Info("The bar", WIN_BAR_INFO)
            }
        }
        Row(
            Modifier
                .fillMaxWidth()
                .height(REVIEW_BAR_HEIGHT)
                .clip(RoundedCornerShape(REVIEW_BAR_RADIUS))
                .border(Stroke.hairline, Outline, RoundedCornerShape(REVIEW_BAR_RADIUS))
                .background(BoardDark),
        ) {
            if (white == null) {
                Box(Modifier.fillMaxWidth().height(REVIEW_BAR_HEIGHT).background(OnSurfaceMuted))
            } else {
                Box(Modifier.weight(max(REVIEW_BAR_MIN_WEIGHT, white.toFloat())).height(REVIEW_BAR_HEIGHT).background(PieceWhite))
                Box(Modifier.weight(max(REVIEW_BAR_MIN_WEIGHT, black!!.toFloat())).height(REVIEW_BAR_HEIGHT).background(BoardDark))
            }
        }
    }
}

/**
 * What the engine is doing, on EVERY tab — or null when the screen owes the reader nothing.
 *
 * Null twice over. A FINISHED review has no state worth a card. A run IN FLIGHT has one, but it is
 * not this screen's to draw: the run outlives the screen now, so it is reported by the app bar's
 * analysis banner, which is pinned, appears on every screen and carries the only Stop there is.
 * Drawing it here as well put two progress bars and two counts one above the other.
 */
internal enum class AnalysisPhase {
    MISSING_ENGINE,
    ERROR,
    NOT_STARTED,

    /** Scored, but not to the end — a run was stopped, or the screen was left before specs/50. */
    PARTIAL,
}

internal fun analysisPhase(ui: ReviewUi): AnalysisPhase? {
    val grade = ui.grade
    return when {
        ui.engineMissing -> AnalysisPhase.MISSING_ENGINE
        ui.error != null -> AnalysisPhase.ERROR
        ui.running -> null
        grade == null -> AnalysisPhase.NOT_STARTED
        !grade.complete -> AnalysisPhase.PARTIAL
        else -> null
    }
}

/**
 * The one card that starts or resumes the engine pass.
 *
 * Reviewing is what an unread game's screen is FOR, so by specs/48 rule 3 it is the filled button —
 * it was a bare `TextAction` with no visible hit area, inside the one tab that also hid the progress.
 */
@Composable
private fun AnalysisState(
    phase: AnalysisPhase,
    grade: GameGrade?,
    error: String?,
    onReview: () -> Unit,
) {
    Card {
        when (phase) {
            AnalysisPhase.MISSING_ENGINE ->
                Text("No engine on this device.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            AnalysisPhase.ERROR -> {
                Text(error ?: "Analysis failed.", style = MaterialTheme.typography.bodySmall, color = Danger)
                OutlineAction("Try again", onReview)
            }
            AnalysisPhase.NOT_STARTED -> {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(Space.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Not reviewed yet", style = MaterialTheme.typography.bodyMedium, color = OnSurface, modifier = Modifier.weight(1f))
                    FilledAction("Start review", onReview)
                }
            }
            // A partial review must never look like a finished one. It is the state a stopped run
            // leaves, and before specs/50 it was also what leaving the screen left, silently.
            AnalysisPhase.PARTIAL -> {
                val done = grade?.scored ?: 0
                val total = grade?.positions ?: 0
                val remaining = (total - done).coerceAtLeast(0)
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(Space.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
                        Text("Review $done/$total", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
                        Text("$remaining positions left", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
                        if (total > 0) {
                            LinearProgressIndicator(
                                { done.toFloat() / total },
                                Modifier.fillMaxWidth().height(Stroke.thick),
                                color = Accent,
                            )
                        }
                    }
                    FilledAction("Continue", onReview)
                }
            }
        }
    }
}

/**
 * The rating, and the first thing on the tab the screen opens on.
 *
 * It states its own denominator because a rating owes one: this game's accuracy is over the moves the
 * app actually watched, in a position that was not already decided.
 */
@Composable
private fun MomentsSummary(
    grade: GameGrade?,
    opening: OpeningSummary?,
    onExploreOpening: (OpeningSummary) -> Unit,
) {
    Card {
        if (grade != null) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Accuracy", style = MaterialTheme.typography.titleMedium, color = OnSurface)
                Info("Accuracy", ACCURACY_INFO)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                AccuracyBlock("White", grade.white, Modifier.weight(1f))
                AccuracyBlock("Black", grade.black, Modifier.weight(1f))
            }
            Text(
                accuracyDenominator(grade.white.scored + grade.black.scored, grade.white.plies + grade.black.plies),
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceMuted,
                maxLines = 1,
            )
            Text(mateStory(grade), style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        }
        if (opening != null) {
            Column(Modifier.padding(top = if (grade == null) 0.dp else Space.xs)) {
                Text("Opening", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
                Text(opening.name, style = MaterialTheme.typography.bodyMedium, color = OnSurface, maxLines = 2)
                Text(
                    "${opening.eco} · ${openingTheoryLabel(opening)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceMuted,
                )
                if (opening.continuationUci.isNotEmpty()) {
                    TheoryContinuationAction(opening) { onExploreOpening(opening) }
                }
            }
        }
    }
}

internal fun openingTheoryLabel(opening: OpeningSummary): String {
    val number = (opening.theoryPlies + 1) / 2
    val move = if (opening.theoryPlies % 2 == 0) "$number..." else "$number."
    return if (opening.gameEndedInTheory) "In theory through $move" else "Theory through $move"
}

@Composable
private fun AccuracyBlock(
    label: String,
    side: SideSummary,
    modifier: Modifier = Modifier,
) {
    Column(modifier.padding(vertical = Space.xs)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = OnSurface)
            Spacer(Modifier.weight(1f))
            Text(
                side.accuracy?.let { percent(it) } ?: "—",
                style = MaterialTheme.typography.titleLarge,
                // Lichess' own accuracy bands, from `roundTraining.ts`: >=85 good, >=70 inaccuracy,
                // >=55 mistake, else blunder. A number nobody can place is a number nobody can use.
                color = side.accuracy?.let { accuracyColor(it) } ?: OnSurfaceMuted,
            )
        }
        Figure("${side.scored}/${side.plies} graded", OnSurfaceMuted)
    }
}

/** Lichess' accuracy colour bands, from `ui/analyse/src/view/roundTraining.ts`. */
@Composable
private fun accuracyColor(accuracy: Double) =
    when {
        accuracy >= 85 -> Accent
        accuracy >= 70 -> OnSurface
        accuracy >= 55 -> Busy
        else -> Danger
    }

/**
 * The one ply the user is looking at — TWO columns, and each column is one position.
 *
 * *"die zweispaltigkeit war besser"* (2026-08-04). It was two columns at `a5cdfd1` and became one
 * full-width stack, which is what made the caption's height a function of its content.
 *
 * The split is not cosmetic. **Left is the position BEFORE this ply**: the move that was played,
 * what it is called, what it cost, and — where there is one — the forced mate that ran from there.
 * **Right answers the question the verdict creates**: what the engine would have played instead.
 * The board remains after the played move so its last-move highlight and the verdict agree.
 */
@Composable
private fun PlyVerdict(
    ply: PlyGrade?,
    san: String?,
    selected: Int,
    grade: GameGrade?,
    playedBy: String?,
    engineMove: String?,
    mateHint: MateLineRequest?,
    checkmate: Boolean,
    onExploreMate: () -> Unit,
) {
    Card {
        Row(
            Modifier.fillMaxWidth().height(REVIEW_VERDICT_HEIGHT),
            horizontalArrangement = Arrangement.spacedBy(Space.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.hair)) {
                when {
                    selected == 0 || san == null ->
                        Text("Starting position", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
                    ply == null ->
                        Text(
                            "$san · ${if (grade == null) "not reviewed" else "analysing…"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = OnSurfaceMuted,
                        )
                    else -> Verdict(ply, san, playedBy.orEmpty())
                }
            }
            if (checkmate) {
                CheckmateColumn(Modifier.weight(1f))
            } else if (mateHint != null) {
                MateAction(mateHint, onExploreMate, Modifier.weight(1f))
            } else {
                EngineColumn(engineMove, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun CheckmateColumn(modifier: Modifier = Modifier) {
    Column(
        modifier
            .fillMaxWidth()
            .height(REVIEW_VERDICT_HEIGHT)
            .border(Stroke.hairline, Outline, RoundedCornerShape(Radius.sm))
            .padding(horizontal = Space.sm, vertical = Space.xs),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Position", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        Text("Checkmate", style = MaterialTheme.typography.titleMedium, color = Accent)
    }
}

/** The engine's answer to the played move shown in the left column. */
@Composable
private fun EngineColumn(
    bestSan: String?,
    modifier: Modifier = Modifier,
) {
    if (bestSan == null) {
        Box(modifier)
        return
    }
    Column(
        modifier.padding(horizontal = Space.sm, vertical = Space.xs),
        verticalArrangement = Arrangement.spacedBy(Space.hair),
    ) {
        Text("Engine move", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        Text("♟  $bestSan", style = MaterialTheme.typography.titleMedium, color = Accent, maxLines = 1)
    }
}

@Composable
private fun MateAction(
    hint: MateLineRequest,
    onExploreMate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(Radius.sm)
    Row(
        modifier
            .fillMaxWidth()
            .height(REVIEW_VERDICT_HEIGHT)
            .clip(shape)
            .background(Accent.copy(alpha = 0.12f))
            .border(Stroke.hairline, Accent, shape)
            .clickable(role = Role.Button, onClick = onExploreMate)
            .padding(horizontal = Space.sm, vertical = Space.xs),
        horizontalArrangement = Arrangement.spacedBy(Space.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
            Text(
                if (hint.missed) "Missed mate" else "Mate",
                style = MaterialTheme.typography.labelMedium,
                color = if (hint.missed) Danger else Accent,
                maxLines = 1,
            )
            Text(
                hint.mateIn?.let { "in $it  ›" } ?: "Explore  ›",
                style = MaterialTheme.typography.titleMedium,
                color = if (hint.missed) Danger else Accent,
                maxLines = 1,
            )
        }
        hint.bestSan?.let { bestSan ->
            Row(
                Modifier.weight(1f),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("♟", style = MaterialTheme.typography.headlineSmall, color = Accent)
                Text(bestSan, style = MaterialTheme.typography.titleMedium, color = Accent, maxLines = 1)
            }
        }
    }
}

@Composable
private fun Verdict(
    ply: PlyGrade,
    san: String,
    playedBy: String,
) {
    Text("$playedBy played", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
    Row(horizontalArrangement = Arrangement.spacedBy(Space.sm), verticalAlignment = Alignment.Bottom) {
        Text(san, style = MaterialTheme.typography.titleMedium, color = OnSurface, fontWeight = FontWeight.Bold)
        Text(verdictLabel(ply), style = MaterialTheme.typography.titleMedium, color = verdictColor(ply))
    }
    // A figure, because stepping ply by ply is exactly when two numbers must not dance in place.
    Figure(verdictDetail(ply), OnSurfaceMuted)
}

@Composable
private fun verdictColor(ply: PlyGrade): Color =
    when {
        ply.shortenedForcedMate -> Busy
        ply.defendsForcedMate && ply.playedBest -> Accent
        ply.defendsForcedMate -> OnSurfaceMuted
        else -> badgeColor(ply.quality)
    }

/**
 * The moves that decided the game, and — separately — the mates nobody took.
 *
 * `GameGrade.findings()` used to sort `compareByDescending { missedMate }` FIRST, so every missed
 * mate outranked every real swing by construction and the heading's top row was routinely a move
 * that went 98 % → 98 %. A missed mate from a won position is a curiosity; a 35-point swing is the
 * turning point the heading promises. They are two questions and they are two sections.
 *
 * A rebuilt ply is in neither: `findings` filters them, because "learn from this mistake" about a
 * move the tracker invented is the worst version of the one bug this project cannot afford.
 */
@Composable
private fun KeyMoments(
    grade: GameGrade?,
    onSeek: (Int) -> Unit,
) {
    if (grade == null) return
    var all by remember { mutableStateOf(false) }
    val findings = grade.findings()
    val missed = grade.missedChances()
    Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("What decided the game", style = MaterialTheme.typography.titleSmall, color = OnSurface)
                Info("How moves are judged", QUALITY_INFO)
            }
            followedMateStory(grade)?.let { story ->
                Text("Finish · ${story.replace(" · ", " ")}", style = MaterialTheme.typography.labelMedium, color = Accent)
            }
            if (findings.isEmpty()) {
                Text(
                    if (grade.complete) "Nothing worse than a good move." else "Nothing yet — still reading.",
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceMuted,
                )
            }
            findings.take(if (all) findings.size else TOP_FINDINGS).forEach { FindingCard(it, onSeek) }
            // The same control as the score sheet's, for the same reason it is outlined there.
            if (findings.size > TOP_FINDINGS) {
                OutlineAction(if (all) "Show fewer" else "Show all ${findings.size}", { all = !all })
            }
        }
        if (missed.isNotEmpty()) {
            Card {
                Text("Missed chances", style = MaterialTheme.typography.titleSmall, color = OnSurface)
                missed.forEach { FindingCard(it, onSeek) }
            }
        }
    }
}

/**
 * One finding: what was played, what it is called, the numbers, and the engine's first choice.
 *
 * Tapping it seeks to the ply BEFORE the move — the position where the better move was still
 * available, and the one the board's arrow belongs to. Landing on the mistake itself only shows the
 * damage.
 */
@Composable
private fun FindingCard(
    finding: PlyGrade,
    onSeek: (Int) -> Unit,
) {
    val severity = if (finding.missedMate) Danger else badgeColor(finding.quality)
    val verdict = if (finding.missedMate) "Missed mate" else label(finding.quality)
    SeverityStripe(severity, Modifier.padding(vertical = Space.xs)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(Space.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "${moveNumber(finding)} ${finding.san}",
                style = MaterialTheme.typography.titleMedium,
                color = OnSurface,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            Text(verdict, style = MaterialTheme.typography.labelMedium, color = severity)
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(Space.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // The side is part of the figure: 48 → 13 without “Black” made the numbers ambiguous.
            Figure("${movingSide(finding)} ${percent(finding.winBefore)} → ${percent(finding.winAfter)}", OnSurfaceMuted)
            Spacer(Modifier.weight(1f))
            finding.bestSan?.let {
                Text("Engine  ♟  $it", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.md)) {
            TextAction("Open position", { onSeek(finding.ply - 1) })
        }
    }
}

/** Ply 17 is White's move 9; ply 18 is Black's, written `9...`. */
private fun moveNumber(ply: PlyGrade): String = "${ply.moveNumber}." + if (ply.whiteMoved) "" else ".."

internal fun label(quality: MoveQuality): String =
    when (quality) {
        MoveQuality.BEST -> "Best move"
        MoveQuality.GOOD -> "Good"
        MoveQuality.INACCURACY -> "Inaccuracy"
        MoveQuality.MISTAKE -> "Mistake"
        MoveQuality.BLUNDER -> "Blunder"
    }

@Composable
internal fun badgeColor(quality: MoveQuality) =
    when (quality) {
        MoveQuality.BLUNDER, MoveQuality.MISTAKE -> Danger
        MoveQuality.INACCURACY -> Busy
        MoveQuality.BEST -> Accent
        else -> OnSurfaceMuted
    }

@Composable
private fun PlyNav(
    selected: Int,
    plies: Int,
    onSeek: (Int) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextAction("Start", { onSeek(0) }, enabled = selected > 0)
        ReviewNavButton(Icons.AutoMirrored.Filled.ArrowBack, "Previous move", selected > 0) {
            onSeek((selected - 1).coerceAtLeast(0))
        }
        Figure(reviewPositionLabel(selected, plies), OnSurfaceMuted)
        ReviewNavButton(Icons.AutoMirrored.Filled.ArrowForward, "Next move", selected < plies) {
            onSeek((selected + 1).coerceAtMost(plies))
        }
        TextAction("End", { onSeek(plies) }, enabled = selected < plies)
    }
}

@Composable
private fun ReviewNavButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    IconButton(onClick = onClick, enabled = enabled) {
        Icon(icon, contentDescription = description)
    }
}

/** Chess move notation without exposing the implementation's “ply” vocabulary. */
internal fun reviewPositionLabel(
    selected: Int,
    plies: Int,
): String =
    when {
        selected == 0 -> "Start"
        selected % 2 == 1 -> "${(selected + 1) / 2}. White · $selected/$plies"
        else -> "${selected / 2}… Black · $selected/$plies"
    }

/**
 * Everything that is not the review: how the numbers were produced, where a move came from, and the
 * PGN.
 *
 * It lives behind the review overflow: reachable from every tab without taking height away from the
 * board and navigation.
 */
@Composable
private fun AnalysisDetailsDialog(
    ui: ReviewUi,
    game: GameView,
    selected: Int,
    visible: Boolean,
    onDiscard: () -> Unit,
    onDismiss: () -> Unit,
) {
    if (!visible) return
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close", color = Accent) } },
        title = { Text("Analysis details", color = OnSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                game.plies.getOrNull(selected - 1)?.let { ply ->
                    Text(
                        "Move $selected (${ply.san}) was recorded by the tracker as: ${ply.decider ?: "unknown"}.",
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurfaceMuted,
                    )
                }
                ui.grade?.let {
                    Text(
                        "Moves are scored by the winning chance they gave away. The game score uses a harmonic mean, " +
                            "so one bad move is not averaged away. Moves after the result was already forced are left " +
                            "out. The engine searches ${it.budget.nodes} positions per move, capped at ${it.budget.capMs} ms.",
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurfaceMuted,
                    )
                }
                PgnRow(ui.pgn, game.id)
                if (ui.grade?.complete == true) TextAction("Analyse again", onDiscard)
            }
        },
        containerColor = SurfaceRaised,
    )
}

@Composable
private fun PgnRow(
    pgn: String,
    id: String,
) {
    val context = LocalContext.current
    Row(horizontalArrangement = Arrangement.spacedBy(Space.xs)) {
        TextAction("Share PGN", { share(context, pgn, id) })
        TextAction("Copy", { copy(context, pgn) })
    }
}

/**
 * `EXTRA_TEXT`, not a `FileProvider` URI: a provider needs a manifest entry, and a PGN is a few kB
 * of text.
 */
private fun share(
    context: Context,
    pgn: String,
    id: String,
) {
    val send =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "$id.pgn")
            putExtra(Intent.EXTRA_TEXT, pgn)
        }
    context.startActivity(Intent.createChooser(send, "Share PGN"))
}

private fun copy(
    context: Context,
    pgn: String,
) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("PGN", pgn))
}
