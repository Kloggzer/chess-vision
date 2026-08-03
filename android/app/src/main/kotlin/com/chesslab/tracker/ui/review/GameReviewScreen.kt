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
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.ResolvedMateLine
import com.chesslab.tracker.analysis.SideSummary
import com.chesslab.tracker.analysis.lineFrames
import com.chesslab.tracker.analysis.missedMate
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.DisclosureRow
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SeverityStripe
import com.chesslab.tracker.ui.TextAction
import com.chesslab.tracker.ui.analysis.BAR_WIDTH
import com.chesslab.tracker.ui.analysis.EvalFill
import com.chesslab.tracker.ui.analysis.SLOT_WIDTH
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.FiguresDisplay
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import com.chesslab.tracker.ui.theme.SurfaceRaised
import com.chesslab.tracker.ui.tracking.BoardCanvas

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
        ChesslabScaffold(id, onBack) { bars -> Text("Game not found.", Modifier.padding(bars), color = OnSurfaceMuted) }
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
    var section by remember(game.id) { mutableStateOf(ReviewSection.MOMENTS) }
    var allMoves by remember(game.id) { mutableStateOf(false) }
    var mateLine by remember(game.id) { mutableStateOf<MateLineRequest?>(null) }
    val grade = ui.grade
    val review = reviewSelection(game, grade, seek)
    val listState = rememberReviewListState(game, section, review.selected, model::focus)

    ChesslabScaffold(game.id, onBack) { bars ->
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
                item(key = "analysis") { AnalysisState(phase, grade, model::review) }
            }
            when (section) {
                ReviewSection.REVIEW -> {
                    item(key = "board") { ReviewBoard(game, review.selected, grade, review.fromHere) }
                    item(key = "verdict") { ReviewVerdict(review, game, grade) { mateLine = it } }
                    item(key = "nav") { PlyNav(review.selected, game.plies.size) { seek = it } }
                    item(key = "details") { Details(ui, game, review.selected, onDiscard = model::discard) }
                }
                // The rating leads on the tab the screen opens on: it is the answer to "how did I
                // do" and the one thing the user asked for by name. STARTING the engine is not here
                // any more — that is the whole screen's business and it is above this `when`.
                ReviewSection.MOMENTS -> {
                    grade?.let { item(key = "summary") { AccuracyRow(it, game) } }
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
    mateLine?.let { MateLineExplorer(it, model::resolveMateLine) { mateLine = null } }
}

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

private data class ReviewSelection(
    val selected: Int,
    val ply: PlyGrade?,
    val fromHere: PlyGrade?,
    val mateHint: MateLineRequest?,
)

@Composable
private fun ReviewVerdict(
    review: ReviewSelection,
    game: GameView,
    grade: GameGrade?,
    onExploreMate: (MateLineRequest) -> Unit,
) {
    PlyVerdict(
        review.ply,
        game.plies.getOrNull(review.selected - 1)?.san,
        review.selected,
        grade,
        review.fromHere,
        review.mateHint,
    ) { review.mateHint?.let(onExploreMate) }
}

private fun reviewSelection(
    game: GameView,
    grade: GameGrade?,
    selected: Int,
): ReviewSelection {
    val ply = grade?.of(selected)
    val next = grade?.of(selected + 1)
    return ReviewSelection(
        selected = selected,
        ply = ply,
        fromHere = next?.takeIf { it.quality != MoveQuality.BEST },
        mateHint = mateLineRequest(game, selected, ply),
    )
}

private data class MateLineRequest(
    val ply: Int,
    val side: String,
    val startFen: String,
    val uciLine: List<String>,
    val sanLine: List<String>,
    val missed: Boolean,
    val mateIn: Int?,
)

private fun mateLineRequest(
    game: GameView,
    selected: Int,
    current: PlyGrade?,
): MateLineRequest? {
    val grade =
        current?.takeIf { ply ->
            ply.missedMate || (ply.forcedMateLine && ply.mateBefore && ply.mateAfter)
        } ?: return null
    return MateLineRequest(
        ply = grade.ply,
        side = movingSide(grade.ply),
        startFen = game.fenAt(selected - 1),
        uciLine = grade.bestUciLine,
        sanLine = grade.bestLine,
        missed = grade.missedMate,
        mateIn = grade.mateInBefore,
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
                    "Any reply loses.",
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
                    TextAction("Previous", { step = (step - 1).coerceAtLeast(0) }, enabled = step > 0)
                    TextAction("Next", { step = (step + 1).coerceAtMost(frames.lastIndex) }, enabled = step < frames.lastIndex)
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

@Composable
private fun ReviewBoard(
    game: GameView,
    selected: Int,
    grade: GameGrade?,
    fromHere: PlyGrade?,
) {
    // `IntrinsicSize.Min` is load-bearing: the bar fills the row's height, so without an intrinsic
    // it has no height to fill at all inside a lazy item.
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        ReviewEvalBar(grade?.winWhite?.getOrNull(selected))
        // The advice on the BOARD has to be a move from the position the board is showing. A ply's
        // own `bestUci` is the engine's move in the position BEFORE it, so drawing that here would
        // put an arrow for one position on top of another — it did, and `e4-e5` was rendered over a
        // board where that had already happened. The engine's move from THIS position is the next
        // ply's, and the verdict card names exactly this move.
        BoardCanvas(
            fen = game.fenAt(selected),
            modifier = Modifier.weight(1f),
            lastMoveUci = game.plies.getOrNull(selected - 1)?.uci,
            suggestedUci = fromHere?.bestUci,
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
    "How good the position is, as a share out of 100 for White. 50 % is level.\n\nIt is not your " +
        "chance of winning THIS game against THIS opponent — it is what the position is worth " +
        "between evenly matched players. A 90 % position is still lost if you then blunder."

private const val QUALITY_INFO =
    "Each move is judged by how much of the position's value it gave away.\n\n" +
        "Best move — the engine's own first choice.\n" +
        "Good — gave away almost nothing.\n" +
        "Inaccuracy — gave away a little.\n" +
        "Mistake — gave away a lot.\n" +
        "Blunder — gave away most of what you had.\n\n" +
        "The engine searches each position for a few seconds. A move it only refutes after a very " +
        "deep search is not one a human could have been expected to find, so the search is kept " +
        "close to what a strong club player would see."

/**
 * Win expectancy for the position ON SCREEN, as a bar beside the board.
 *
 * The number is White's share, so the label reads the same way round as the fill: white grows from
 * the bottom. A percentage rather than a pawn count, because that is the unit the rest of this
 * screen speaks — and, since specs/47, the unit the LIVE bar beside the tracker's board speaks too.
 */
@Composable
private fun ReviewEvalBar(winWhite: Double?) {
    Column(
        Modifier.fillMaxHeight().width(SLOT_WIDTH),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Space.hair),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = winWhite?.let { percent(it) } ?: "–",
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceMuted,
                maxLines = 1,
                softWrap = false,
            )
            Info("The bar", WIN_BAR_INFO)
        }
        // Greyed until the engine has been to this position, so an unanalysed ply cannot be read as
        // a level one — 50 % is a claim, and "not looked at yet" is not.
        EvalFill(winWhite, paused = winWhite == null, modifier = Modifier.width(BAR_WIDTH).weight(1f))
    }
}

/**
 * What the engine is doing, on EVERY tab — or null once there is nothing left to say.
 *
 * Null is the common case: a finished review has no state worth a card. The other four are the
 * states in which the screen owes the reader either an action or a number.
 */
internal enum class AnalysisPhase {
    MISSING_ENGINE,
    RUNNING,
    NOT_STARTED,

    /** Scored, but not to the end — a run was stopped, or the screen was left before specs/50. */
    PARTIAL,
}

internal fun analysisPhase(ui: ReviewUi): AnalysisPhase? {
    val grade = ui.grade
    return when {
        ui.engineMissing -> AnalysisPhase.MISSING_ENGINE
        ui.running -> AnalysisPhase.RUNNING
        grade == null -> AnalysisPhase.NOT_STARTED
        !grade.complete -> AnalysisPhase.PARTIAL
        else -> null
    }
}

/**
 * The one card that starts, reports and resumes the engine pass.
 *
 * Reviewing is what an unread game's screen is FOR, so by specs/48 rule 3 it is the filled button —
 * it was a bare `TextAction` with no visible hit area, inside the one tab that also hid the progress.
 * There is no Stop here on purpose: the run outlives this screen, so its Stop belongs where it can
 * be reached from anywhere, which is the app bar's analysis banner.
 */
@Composable
private fun AnalysisState(
    phase: AnalysisPhase,
    grade: GameGrade?,
    onReview: () -> Unit,
) {
    Card {
        when (phase) {
            AnalysisPhase.MISSING_ENGINE ->
                Text("No engine on this device.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            AnalysisPhase.NOT_STARTED -> {
                Text("Not reviewed yet.", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
                FilledAction("Review this game", onReview)
            }
            // Not a spinner over an empty screen: what is graded already stays readable underneath,
            // and this only says how much more is coming. A full pass is minutes, which is the band
            // where NN/g's rule asks for a percent-done rather than an animation.
            AnalysisPhase.RUNNING -> {
                LinearProgressIndicator(
                    { (grade?.scored ?: 0).toFloat() / (grade?.positions ?: 1) },
                    Modifier.fillMaxWidth(),
                    color = Accent,
                )
                Text(
                    progressLine(grade?.scored, grade?.positions),
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceMuted,
                )
            }
            // A partial review must never look like a finished one. It is the state a stopped run
            // leaves, and before specs/50 it was also what leaving the screen left, silently.
            AnalysisPhase.PARTIAL -> {
                Text(
                    "Partial review · ${grade?.scored} of ${grade?.positions} positions graded.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = OnSurface,
                )
                OutlineAction("Continue review", onReview)
            }
        }
    }
}

internal fun progressLine(
    scored: Int?,
    positions: Int?,
): String =
    if (scored == null || positions == null) {
        "Starting the engine…"
    } else {
        "Reading the game around the move you are on · $scored / $positions"
    }

/**
 * The rating, and the first thing on the tab the screen opens on.
 *
 * It states its own denominator because a rating owes one: this game's accuracy is over the moves the
 * app actually watched, in a position that was not already decided.
 */
@Composable
private fun AccuracyRow(
    grade: GameGrade,
    game: GameView,
) {
    Card {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(resultHeadline(game.result), style = MaterialTheme.typography.titleMedium, color = OnSurface)
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
    }
}

@Composable
private fun AccuracyBlock(
    label: String,
    side: SideSummary,
    modifier: Modifier = Modifier,
) {
    Row(
        // A rule, not a fill: this tile sits ON a card, and a fill of the card's own colour is
        // invisible while a lighter one is elevation by fill.
        modifier
            .border(Stroke.hairline, Outline, RoundedCornerShape(Radius.sm))
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = OnSurface)
            Figure("${side.scored}/${side.plies} graded", OnSurfaceMuted)
        }
        Text(
            side.accuracy?.let { percent(it) } ?: "—",
            style = FiguresDisplay,
            // Lichess' own accuracy bands, from `roundTraining.ts`: >=85 good, >=70 inaccuracy,
            // >=55 mistake, else blunder. A number nobody can place is a number nobody can use.
            color = side.accuracy?.let { accuracyColor(it) } ?: OnSurfaceMuted,
        )
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
 * The height the caption is ALWAYS drawn at, and the reason it is a constant.
 *
 * The navigation row sits directly under this card and is pressed repeatedly. A card that grows from
 * one line ("Starting position") to four (move, cost, the engine's reply, a mate link) moves the
 * arrows under the reader's thumb between one ply and the next — *"mega nervig"*, and *"das ui
 * springt hin und her"* when a later rewrite dropped the fixed box `a5cdfd1` had put here.
 */
private val VERDICT_HEIGHT = 72.dp

/**
 * The one ply the user is looking at — TWO columns, and each column is one position.
 *
 * *"die zweispaltigkeit war besser"* (2026-08-04). It was two columns at `a5cdfd1` and became one
 * full-width stack, which is what made the caption's height a function of its content.
 *
 * The split is not cosmetic. **Left is the position BEFORE this ply**: the move that was played,
 * what it is called, what it cost, and — where there is one — the forced mate that ran from there.
 * **Right is the position ON SCREEN**: [fromHere], the engine's move from the board the reader is
 * looking at, and the same move its arrow draws. The removed `ReviewContextChip` put a move for one
 * of those positions beside a board drawn from the other (specs/44); keeping the two questions in
 * two columns is what stops that from coming back.
 */
@Composable
private fun PlyVerdict(
    ply: PlyGrade?,
    san: String?,
    selected: Int,
    grade: GameGrade?,
    fromHere: PlyGrade?,
    mateHint: MateLineRequest?,
    onExploreMate: () -> Unit,
) {
    Card {
        Row(
            Modifier.fillMaxWidth().height(VERDICT_HEIGHT),
            horizontalArrangement = Arrangement.spacedBy(Space.sm),
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
                    else -> Verdict(ply, san)
                }
                mateHint?.let { MateLink(it, onExploreMate) }
            }
            EngineColumn(fromHere?.bestSan, Modifier.weight(1f))
        }
    }
}

/** The engine's move from the position on screen, and nothing from any other position. */
@Composable
private fun EngineColumn(
    bestSan: String?,
    modifier: Modifier = Modifier,
) {
    // Only when the game did NOT continue with the engine's own move: where it did, the next row of
    // the score sheet already is the advice and a line repeating it says nothing.
    if (bestSan == null) {
        Box(modifier)
        return
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(Space.hair)) {
        Text("The engine plays", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        Text(bestSan, style = MaterialTheme.typography.titleMedium, color = Accent, maxLines = 1)
    }
}

@Composable
private fun MateLink(
    hint: MateLineRequest,
    onExploreMate: () -> Unit,
) {
    val distance = hint.mateIn?.let { " in $it" }.orEmpty()
    Text(
        text = if (hint.missed) "Missed mate$distance — see the line" else "${hint.side} · forced mate — see the line",
        style = MaterialTheme.typography.bodySmall,
        color = if (hint.missed) Danger else Accent,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onExploreMate).padding(vertical = Space.xs),
    )
}

@Composable
private fun Verdict(
    ply: PlyGrade,
    san: String,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(Space.sm), verticalAlignment = Alignment.Bottom) {
        Text(san, style = MaterialTheme.typography.titleMedium, color = OnSurface, fontWeight = FontWeight.Bold)
        Text(label(ply.quality), style = MaterialTheme.typography.titleMedium, color = badgeColor(ply.quality))
    }
    // A figure, because stepping ply by ply is exactly when two numbers must not dance in place.
    Figure("${percent(ply.winBefore)} → ${percent(ply.winAfter)}", OnSurfaceMuted)
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
        MateStoryCard(grade)
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("What decided the game", style = MaterialTheme.typography.titleSmall, color = OnSurface)
                Info("How moves are judged", QUALITY_INFO)
            }
            followedMateStory(grade)?.let { story ->
                Text(story, style = MaterialTheme.typography.bodyMedium, color = Accent)
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
 * One finding: what was played, what it is called, one sentence, the numbers, and the engine's line.
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
    var open by remember(finding.ply) { mutableStateOf(false) }
    val severity = if (finding.missedMate) Danger else badgeColor(finding.quality)
    SeverityStripe(severity, Modifier.clickable { onSeek(finding.ply - 1) }.padding(vertical = Space.xs)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(findingTitle(finding), style = MaterialTheme.typography.bodyMedium, color = severity)
            // The numbers that justify the verdict, in the one style figures are set in.
            Figure("${percent(finding.winBefore)} → ${percent(finding.winAfter)}", OnSurfaceMuted)
        }
        Text(sentence(finding), style = MaterialTheme.typography.bodySmall, color = OnSurface)
        finding.bestSan?.let { Text("Better: $it.", style = MaterialTheme.typography.bodySmall, color = Accent) }
        if (finding.bestLine.size > 1) {
            Text(
                if (open) finding.bestLine.joinToString(" ") else "Show the line",
                style = MaterialTheme.typography.labelSmall,
                color = Accent,
                modifier = Modifier.clickable { open = !open },
            )
        }
    }
}

internal fun findingTitle(finding: PlyGrade): String =
    if (finding.missedMate) {
        "${movingSide(finding.ply)} · ${moveNumber(finding.ply)} ${finding.san} · missed mate" +
            finding.mateInBefore?.let { " in $it" }.orEmpty()
    } else {
        "${movingSide(finding.ply)} · ${moveNumber(finding.ply)} ${finding.san} · ${label(finding.quality)}"
    }

/**
 * The plain sentence, and every branch of it is a RESTATEMENT of the two numbers already on the card.
 *
 * chess.com writes things like "you could have taken this piece" — that needs tactical detection
 * nobody here has built, and inventing it would be fabrication. What can be said honestly is what the
 * win expectancy did, in words.
 */
private fun sentence(finding: PlyGrade): String {
    val winning = finding.winBefore >= WINNING
    val lost = finding.winAfter <= LOSING
    return when {
        finding.missedMate -> "A forced mate was available here, and this move let it go."
        winning && lost -> "You were winning here, and this gave the game away."
        winning -> "You were winning here, and this gave most of it back."
        lost -> "This turned a playable position into a lost one."
        finding.quality == MoveQuality.BLUNDER -> "This handed over most of your winning chances."
        finding.quality == MoveQuality.MISTAKE -> "This cost a large part of your winning chances."
        else -> "A better move was available."
    }
}

/** "You were winning" and "this is lost" as this screen means them — our words, our thresholds. */
private const val WINNING = 75.0
private const val LOSING = 20.0

/** Ply 17 is White's move 9; ply 18 is Black's, written `9...`. */
private fun moveNumber(ply: Int): String = "${(ply + 1) / 2}." + if (ply % 2 == 0) ".." else ""

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
        TextAction("|<", { onSeek(0) }, enabled = selected > 0)
        TextAction("<", { onSeek((selected - 1).coerceAtLeast(0)) }, enabled = selected > 0)
        // A position in a game is a figure: it has to hold still while the two arrows either side
        // of it are pressed.
        Figure(if (selected == 0) "start" else "ply $selected / $plies", OnSurfaceMuted)
        TextAction(">", { onSeek((selected + 1).coerceAtMost(plies)) }, enabled = selected < plies)
        TextAction(">|", { onSeek(plies) }, enabled = selected < plies)
    }
}

/**
 * Everything that is not the review: how the numbers were produced, where a move came from, and the
 * PGN.
 *
 * All of it was on the primary view and none of it earns a place there — "they can put it somewhere
 * in a secondary menu" (2026-08-03). It then became a bare muted `TextButton` on an empty
 * background, indistinguishable from the headings above it, which is content nobody would find. It
 * is the app's one disclosure row now, the same one Settings uses eleven times.
 */
@Composable
private fun Details(
    ui: ReviewUi,
    game: GameView,
    selected: Int,
    onDiscard: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    DisclosureRow("Analysis details", "How this was graded, the PGN, and where each move came from") {
        open = !open
    }
    if (!open) return
    Card {
        game.plies.getOrNull(selected - 1)?.let { ply ->
            Text(
                "Move $selected (${ply.san}) was recorded by the tracker as: ${ply.decider ?: "unknown"}.",
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceMuted,
            )
        }
        ui.grade?.let {
            Text(
                "Each move is scored by how much winning chance it gave away — lichess' formula, and their bands " +
                    "for inaccuracy, mistake and blunder. Combining them into one number is ours: a harmonic mean, " +
                    "so one bad move is not averaged away. Moves played after the game was already decided score " +
                    "nothing and are left out. The engine spends ${it.budget.nodes} positions of search per move — the " +
                    "same budget lichess spends, and about what a strong club player sees — capped at ${it.budget.capMs} ms.",
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceMuted,
            )
        }
        PgnRow(ui.pgn, game.id)
        if (ui.grade?.complete == true) TextAction("Analyse again", onDiscard)
    }
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
