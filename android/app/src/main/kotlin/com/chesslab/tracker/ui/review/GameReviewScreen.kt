package com.chesslab.tracker.ui.review

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
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
import androidx.compose.runtime.rememberCoroutineScope
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
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.SideSummary
import com.chesslab.tracker.analysis.lineFrames
import com.chesslab.tracker.analysis.missedMate
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.ScreenPadding
import com.chesslab.tracker.ui.analysis.BAR_WIDTH
import com.chesslab.tracker.ui.analysis.EvalBarSlot
import com.chesslab.tracker.ui.analysis.EvalFill
import com.chesslab.tracker.ui.analysis.SLOT_WIDTH
import com.chesslab.tracker.ui.analysis.stockfishEngineFactory
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Surface
import com.chesslab.tracker.ui.theme.SurfaceRaised
import com.chesslab.tracker.ui.tracking.BoardCanvas
import kotlin.math.roundToInt

private val BOARD_GAP = 6.dp

private enum class ReviewSection {
    REVIEW,
    MOMENTS,
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
 * The LIVE source. The spectator view is this screen with the game still running — "die spectator
 * view kann basically dieselbe view sein wie die nach dem spiel nur halt live" (2026-08-02).
 *
 * With no tracker there is no live game, and this says so. It used to fall back to an empty
 * `GameView` — a start position rendered as if it were the state of a board somebody was playing on.
 */
@Composable
fun LiveReviewRoute(onBack: () -> Unit) {
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val session = controller
    if (session == null) {
        ChesslabScaffold("Live game", onBack) { bars ->
            Text(
                "No game running. Start tracking on the Board tab to play one.",
                Modifier.padding(bars).padding(12.dp),
                color = OnSurfaceMuted,
            )
        }
        return
    }
    val live by session.state.collectAsStateWithLifecycle()
    GameReviewScreen(title = "Live game", game = live.game, onBack = onBack, grade = null, onFocus = {}) { _, _ ->
        SpectatorShareCard()
    }
}

/** The ARCHIVE source. Same screen, same board, same list — a stored game instead of a running one. */
@Composable
fun ArchiveReviewRoute(
    id: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val model =
        remember(context) {
            val dir = gamesDir(context)
            ReviewViewModel(GameStore(dir), ReviewStore(dir), stockfishEngineFactory(context.applicationContext), scope)
        }
    LaunchedEffect(id) { model.load(id) }
    val ui by model.ui.collectAsStateWithLifecycle()
    val game = ui.game
    if (game == null) {
        ChesslabScaffold(id, onBack) { bars -> Text("Game not found.", Modifier.padding(bars), color = OnSurfaceMuted) }
        return
    }
    GameReviewScreen(
        title = game.id,
        game = game,
        onBack = onBack,
        grade = ui.grade,
        onFocus = model::focus,
        resolveMateLine = model::resolveMateLine,
        // The rating leads. It is the answer to "how did I do", it is the one thing the user asked
        // for by name, and both products this was measured against open with it.
        summary = { AccuracyRow(ui, game, onReview = model::review) },
    ) { selected, seek ->
        Details(ui, game, selected, onDiscard = model::discard)
    }
}

/**
 * ONE board and one focused job per section. Live or archived is [GameView.live] and nothing else.
 *
 * An archived review opens on **rating, board with the win bar, what the move on screen did, and the
 * navigation**. Key moments and the complete score sheet are peers behind explicit tabs rather than
 * another two screens' worth of content below the board. Selecting either returns to the board at
 * that position, so the arrow and explanation remain the place where a move is understood.
 *
 * Each section still owns one `LazyColumn`; the score sheet contributes rows to it instead of nesting
 * a second lazy list. That preserves the phone layout without forcing every section into one view.
 */
@Composable
private fun GameReviewScreen(
    title: String,
    game: GameView,
    onBack: () -> Unit,
    grade: GameGrade?,
    onFocus: (Int) -> Unit,
    resolveMateLine: suspend (String, List<String>) -> ResolvedMateLine = { _, seed ->
        ResolvedMateLine(seed, emptyList(), complete = false)
    },
    summary: @Composable () -> Unit = {},
    extra: @Composable (selected: Int, onSeek: (Int) -> Unit) -> Unit,
) {
    // The live board follows the game; the archived one follows the finger. Both are a PLY NUMBER,
    // so the two modes differ in where that number comes from and in nothing else.
    var seek by remember(game.id) { mutableIntStateOf(initialReviewPly(game.live, game.plies.size)) }
    var section by remember(game.id) { mutableStateOf(ReviewSection.REVIEW) }
    var allMoves by remember(game.id) { mutableStateOf(false) }
    var mateLine by remember(game.id) { mutableStateOf<MateLineRequest?>(null) }
    val review = reviewSelection(game, grade, if (game.live) game.plies.size else seek)
    // The advice on the BOARD has to be a move from the position the board is showing. A ply's own
    // `bestUci` is the engine's move in the position BEFORE it, so drawing that here would put an
    // arrow for one position on top of another — it did, and `e4-e5` was rendered over a board where
    // that had already happened. The engine's move from THIS position is the next ply's.
    val listState = rememberReviewListState(game, section, review.selected, onFocus)

    ChesslabScaffold(title, onBack) { bars ->
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(bars),
            contentPadding = ScreenPadding,
            verticalArrangement = Arrangement.spacedBy(if (section == ReviewSection.MOVES) 0.dp else 8.dp),
        ) {
            if (!game.live) {
                item(key = "tabs") {
                    ReviewTabs(
                        selected = section,
                        moments = grade?.findings()?.size,
                        moves = game.plies.size,
                        onSelect = { section = it },
                    )
                }
            }

            when {
                game.live -> {
                    item(key = "board") { ReviewBoard(game, review.selected, grade, review.fromHere) }
                    item(key = "extra") { extra(review.selected) { seek = it } }
                    moveListSection(game, grade, review.selected, onSelect = null)
                }
                section == ReviewSection.REVIEW -> {
                    item(key = "summary") { summary() }
                    item(key = "board") { ReviewBoard(game, review.selected, grade, review.fromHere) }
                    item(key = "verdict") { ReviewVerdict(review, game, grade) { mateLine = it } }
                    item(key = "nav") { PlyNav(review.selected, game.plies.size) { seek = it } }
                    item(key = "extra") { extra(review.selected) { seek = it } }
                }
                section == ReviewSection.MOMENTS -> {
                    item(key = "moments") {
                        KeyMoments(game, grade) {
                            seek = it
                            section = ReviewSection.REVIEW
                        }
                    }
                }
                else -> {
                    movesSection(game, grade, review.selected, allMoves, onToggle = { allMoves = !allMoves }) {
                        seek = it
                        section = ReviewSection.REVIEW
                    }
                }
            }
        }
    }
    mateLine?.let { MateLineExplorer(it, resolveMateLine) { mateLine = null } }
}

@Composable
private fun rememberReviewListState(
    game: GameView,
    section: ReviewSection,
    selected: Int,
    onFocus: (Int) -> Unit,
): LazyListState {
    val listState = rememberLazyListState()
    ReviewScrollEffects(listState, game, section, selected, onFocus)
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
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
                    TextButton(onClick = { step = (step - 1).coerceAtLeast(0) }, enabled = step > 0) {
                        Text("Previous", color = if (step > 0) Accent else OnSurfaceMuted)
                    }
                    TextButton(onClick = { step = (step + 1).coerceAtMost(frames.lastIndex) }, enabled = step < frames.lastIndex) {
                        Text("Next", color = if (step < frames.lastIndex) Accent else OnSurfaceMuted)
                    }
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
        item(key = "moves-toggle") {
            TextButton(onClick = onToggle) {
                Text(if (allMoves) "Show fewer" else "Show all ${game.plies.size} moves", color = Accent)
            }
        }
    }
}

@Composable
private fun ReviewScrollEffects(
    listState: LazyListState,
    game: GameView,
    section: ReviewSection,
    selected: Int,
    onFocus: (Int) -> Unit,
) {
    LaunchedEffect(selected) { onFocus(selected) }
    LaunchedEffect(game.plies.size, game.live) {
        if (game.live && game.plies.isNotEmpty()) listState.animateScrollToItem(listState.layoutInfo.totalItemsCount)
    }
    LaunchedEffect(section) {
        if (!game.live) listState.scrollToItem(0)
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
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(BOARD_GAP)) {
        // Two bars, one drawing. The live one is fed by the tracker's current position; the archive
        // one is fed by the ply being read and moves with the finger.
        if (game.live) EvalBarSlot() else ReviewEvalBar(grade?.winWhite?.getOrNull(selected))
        BoardCanvas(
            fen = game.fenAt(selected),
            modifier = Modifier.weight(1f),
            lastMoveUci = game.plies.getOrNull(selected - 1)?.uci,
            suggestedUci = fromHere?.bestUci,
        )
    }
}

@Composable
private fun ReviewTabs(
    selected: ReviewSection,
    moments: Int?,
    moves: Int,
    onSelect: (ReviewSection) -> Unit,
) {
    Row(Modifier.fillMaxWidth()) {
        ReviewTab("Review", ReviewSection.REVIEW, selected, enabled = true, onSelect, Modifier.weight(1f))
        ReviewTab(
            moments?.let { "Moments · $it" } ?: "Moments",
            ReviewSection.MOMENTS,
            selected,
            enabled = moments != null,
            onSelect,
            Modifier.weight(1f),
        )
        ReviewTab("Moves · $moves", ReviewSection.MOVES, selected, enabled = true, onSelect, Modifier.weight(1f))
    }
}

@Composable
private fun ReviewTab(
    label: String,
    section: ReviewSection,
    selected: ReviewSection,
    enabled: Boolean,
    onSelect: (ReviewSection) -> Unit,
    modifier: Modifier = Modifier,
) {
    val active = selected == section
    Column(
        modifier.selectable(
            selected = active,
            enabled = enabled,
            role = Role.Tab,
            onClick = { onSelect(section) },
        ),
    ) {
        Box(Modifier.fillMaxWidth().padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = if (active) Accent else OnSurfaceMuted.copy(alpha = if (enabled) 1f else 0.45f),
            )
        }
        Box(Modifier.fillMaxWidth().height(2.dp).background(if (active) Accent else Color.Transparent))
    }
}

@Composable
private fun MoveSectionHeading() {
    Column(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp)) {
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
 *
 * There are three on the whole screen, and that is deliberate: a first screenful sprouting eight of
 * them is the screen saying it is still talking too much.
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
        modifier = Modifier.clickable { open = true }.padding(horizontal = 4.dp),
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
 * screen speaks and the whole complaint was that the old one had to be taught.
 */
@Composable
private fun ReviewEvalBar(winWhite: Double?) {
    Column(
        Modifier.fillMaxHeight().width(SLOT_WIDTH),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
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
 * The rating, and the only thing above the board.
 *
 * It states its own denominator because a rating owes one: this game's accuracy is over the moves the
 * app actually watched, in a position that was not already decided, and that is 13 of White's 42.
 */
@Composable
private fun AccuracyRow(
    ui: ReviewUi,
    game: GameView,
    onReview: () -> Unit,
) {
    val grade = ui.grade
    Card {
        when {
            ui.engineMissing ->
                Text("No engine on this device.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            grade == null && ui.running ->
                Text("Starting the engine…", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
            grade == null ->
                TextButton(onClick = onReview) { Text("Review this game", color = Accent) }
            else -> {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(resultHeadline(game.result), style = MaterialTheme.typography.titleMedium, color = OnSurface)
                    Info("Accuracy", ACCURACY_INFO)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AccuracyBlock("White", grade.white, Modifier.weight(1f))
                    AccuracyBlock("Black", grade.black, Modifier.weight(1f))
                }
                val graded = grade.white.scored + grade.black.scored
                val moves = grade.white.plies + grade.black.plies
                Text(
                    accuracyDenominator(graded, moves),
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceMuted,
                    maxLines = 1,
                )
                if (ui.running) Progress(grade)
            }
        }
    }
}

@Composable
private fun Progress(grade: GameGrade) {
    // Not a spinner over an empty screen: what is graded already stays readable underneath, and this
    // only says how much more is coming. A full pass is minutes, which is the band where NN/g's rule
    // asks for a percent-done rather than an animation.
    LinearProgressIndicator({ grade.scored.toFloat() / grade.positions }, Modifier.fillMaxWidth(), color = Accent)
    Text(
        "Reading the game around the move you are on · ${grade.scored} / ${grade.positions}",
        style = MaterialTheme.typography.labelSmall,
        color = OnSurfaceMuted,
    )
}

@Composable
private fun AccuracyBlock(
    label: String,
    side: SideSummary,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier.background(Surface, RoundedCornerShape(8.dp)).padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = OnSurface)
            Text("${side.scored}/${side.plies} graded", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        }
        Text(
            side.accuracy?.let { "${it.roundToInt()}%" } ?: "—",
            style = MaterialTheme.typography.titleLarge,
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
 * The one ply the user is looking at, in words rather than in units — four short lines at most.
 *
 * This is the answer to "it requires too much knowledge": a win-expectancy pair is a sentence anybody
 * can read. It is kept this short deliberately; a beginner holds about four chunks of working memory
 * and the notation is already competing for them.
 *
 * [fromHere] is the engine's move in the position ON SCREEN — the same move the ARROW draws, and
 * emphatically not [PlyGrade.bestSan], which belongs to the position one ply back.
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
    Row(
        Modifier.fillMaxWidth().height(68.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(SurfaceRaised, RoundedCornerShape(8.dp))
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
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
        }
        ReviewContextChip(mateHint, ply?.bestSan ?: fromHere?.bestSan, onExploreMate, Modifier.weight(1f))
    }
}

@Composable
private fun ReviewContextChip(
    mateHint: MateLineRequest?,
    engineMove: String?,
    onExploreMate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier.fillMaxHeight(), contentAlignment = Alignment.Center) {
        when {
            mateHint != null -> {
                val distance = mateHint.mateIn?.let { " in $it" }.orEmpty()
                AssistChip(
                    onClick = onExploreMate,
                    label = {
                        Column(verticalArrangement = Arrangement.Center) {
                            Text(
                                engineMove ?: "Engine move",
                                style = MaterialTheme.typography.labelLarge,
                                color = Accent,
                                maxLines = 1,
                            )
                            Text(
                                if (mateHint.missed) {
                                    "Missed mate$distance →"
                                } else {
                                    "${mateHint.side} · forced mate →"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = if (mateHint.missed) Danger else Accent,
                                maxLines = 1,
                            )
                        }
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Filled.Settings,
                            contentDescription = "Engine suggestion",
                            tint = Accent,
                            modifier = Modifier.size(16.dp),
                        )
                    },
                    modifier = Modifier.fillMaxSize(),
                )
            }
            engineMove != null ->
                Row(
                    Modifier
                        .fillMaxSize()
                        .background(SurfaceRaised, RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        Icons.Filled.Settings,
                        contentDescription = "Engine suggestion",
                        tint = Accent,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(": $engineMove", style = MaterialTheme.typography.labelLarge, color = Accent, maxLines = 1)
                }
        }
    }
}

@Composable
private fun Verdict(
    ply: PlyGrade,
    san: String,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
        Text(san, style = MaterialTheme.typography.titleMedium, color = OnSurface, fontWeight = FontWeight.Bold)
        Text(label(ply.quality), style = MaterialTheme.typography.titleMedium, color = badgeColor(ply.quality))
    }
    Text(
        "Win ${percent(ply.winBefore)} → ${percent(ply.winAfter)}",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
    )
}

/**
 * The moves that decided the game — the actionable half of the screen, and never behind a tap.
 *
 * A rebuilt ply is not in here at all: `GameGrade.findings` filters them, because "learn from this
 * mistake" about a move the tracker invented is the worst version of the one bug this project cannot
 * afford.
 */
@Composable
private fun KeyMoments(
    game: GameView,
    grade: GameGrade?,
    onSeek: (Int) -> Unit,
) {
    if (grade == null) return
    var all by remember { mutableStateOf(false) }
    val findings = grade.findings()
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        MateStoryCard(game, grade)
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
            if (findings.size > TOP_FINDINGS) {
                TextButton(onClick = { all = !all }) {
                    Text(if (all) "Show fewer" else "Show all ${findings.size}", color = Accent)
                }
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
    Column(
        Modifier.fillMaxWidth().clickable { onSeek(finding.ply - 1) }.padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                findingTitle(finding),
                style = MaterialTheme.typography.bodyMedium,
                color = if (finding.missedMate) Danger else badgeColor(finding.quality),
            )
            Text(
                "${percent(finding.winBefore)} → ${percent(finding.winAfter)}",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceMuted,
            )
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

private fun percent(value: Double): String = "${value.roundToInt()}%"

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
        TextButton(onClick = { onSeek(0) }, enabled = selected > 0) {
            Text("|<", color = if (selected > 0) Accent else OnSurfaceMuted)
        }
        TextButton(onClick = { onSeek((selected - 1).coerceAtLeast(0)) }, enabled = selected > 0) {
            Text("<", color = if (selected > 0) Accent else OnSurfaceMuted)
        }
        Text(
            if (selected == 0) "start" else "ply $selected / $plies",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        TextButton(onClick = { onSeek((selected + 1).coerceAtMost(plies)) }, enabled = selected < plies) {
            Text(">", color = if (selected < plies) Accent else OnSurfaceMuted)
        }
        TextButton(onClick = { onSeek(plies) }, enabled = selected < plies) {
            Text(">|", color = if (selected < plies) Accent else OnSurfaceMuted)
        }
    }
}

/**
 * Everything that is not the review: how the numbers were produced, where a move came from, and the
 * PGN.
 *
 * All of it was on the primary view and none of it earns a place there — "they can put it somewhere
 * in a secondary menu" (2026-08-03). The tracker's decider in particular was printed beside every
 * SAN, where it competed with the move itself for a reader who has no use for the word
 * `cnn_occupancy`.
 */
@Composable
private fun Details(
    ui: ReviewUi,
    game: GameView,
    selected: Int,
    onDiscard: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    TextButton(onClick = { open = !open }) {
        Text(if (open) "Hide analysis details" else "Analysis details", color = OnSurfaceMuted)
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
        if (ui.grade?.complete == true) {
            TextButton(onClick = onDiscard) { Text("Analyse again", color = OnSurfaceMuted) }
        }
    }
}

@Composable
private fun PgnRow(
    pgn: String,
    id: String,
) {
    val context = LocalContext.current
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        TextButton(onClick = { share(context, pgn, id) }) { Text("Share PGN", color = Accent) }
        TextButton(onClick = { copy(context, pgn) }) { Text("Copy", color = Accent) }
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
