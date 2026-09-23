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
import androidx.compose.ui.res.stringResource
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
import com.chesslab.tracker.games.GameResult
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

/** **Moments is first**: Review starts at ply 0, and opening on it meant walking 83 plies for the three that mattered. */
private enum class ReviewSection {
    MOMENTS,
    REVIEW,
    MOVES,
}

/** Three: the first five seconds answer "which moves decided this game" (`docs/game-review.md`). */
private const val TOP_FINDINGS = 3

private const val TOP_MOVE_ROWS = 8

@Composable
fun ArchiveReviewRoute(
    id: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    // NOT `rememberCoroutineScope()`: leaving the screen cancelled a multi-minute pass without a word ([ReviewHost]).
    val model = remember(context) { ReviewHost.of(context) }
    LaunchedEffect(id) { model.load(id) }
    val ui by model.ui.collectAsStateWithLifecycle()
    val game = ui.game
    if (game == null) {
        val message =
            when {
                ui.loading -> "Loading game…"
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
        title = reviewTitle(game, stringResource(resultHeadline(GameResult.of(game.result)))),
        onBack = onBack,
        actions = { ReviewActions({ overlays.editingDetails = true }, { overlays.showingAnalysisDetails = true }) },
    ) { bars ->
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(bars),
            contentPadding = PaddingValues(vertical = Space.sm),
            // The rows carry their own padding; a gap too makes 42 rows a ladder.
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
            // A property of the SCREEN, not one tab: under Moments only, a tap on another tab showed nothing at all.
            analysisPhase(ui)?.let { phase ->
                item(key = "analysis") { AnalysisState(phase, grade, ui.error, model::review) }
            }
            ui.libraryNote?.let { note ->
                item(key = "library") { Text(note, style = MaterialTheme.typography.labelSmall, color = Danger) }
            }
            when (section) {
                ReviewSection.REVIEW -> {
                    item(key = "board") { ReviewBoard(game, review.selected, grade, review.advice) }
                    item(key = "verdict") { ReviewVerdict(review, game, grade) { overlays.mateLine = it } }
                    item(key = "nav") { PlyNav(review.selected, game.plies.size) { seek = it } }
                }
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
        initialResult = GameResult.of(game.result),
        onDismiss = onDismiss,
    ) { white, black, event, result ->
        model.editGameDetails(white, black, event, result)
        onDismiss()
    }
}

/** Names are the identity; the timestamp only the fallback. [resultName] is passed in to stay JVM-testable. */
internal fun reviewTitle(
    game: GameView,
    resultName: String,
): String {
    val named = game.white != "?" || game.black != "?"
    if (named) return "${game.white} – ${game.black}"
    val date =
        game.startedAtEpochMs
            .takeIf { it > 0L }
            ?.let {
                REVIEW_DATE_FORMAT.format(Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()))
            } ?: game.id.replace('_', ' ')
    return "$date · $resultName"
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
    /** The SELECTED ply itself: the board once drew the next one's, and arrow and card were a ply apart. */
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
        engineMove = review.advice?.bestSan,
        mateHint = review.mateHint,
        checkmate = review.checkmate,
    ) { review.mateHint?.let(onExploreMate) }
}

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
                MateResolutionStatus(resolving, resolved)
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
    resolved: ResolvedMateLine,
) {
    if (resolving) {
        Text("Completing the sequence…", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        LinearProgressIndicator(Modifier.fillMaxWidth(), color = Accent)
        return
    }
    mateResolutionNote(resolved)?.let {
        Text(it, style = MaterialTheme.typography.labelSmall, color = if (resolved.failure != null) Danger else OnSurfaceMuted)
    }
}

internal fun mateResolutionNote(resolved: ResolvedMateLine): String? =
    when {
        resolved.complete -> null
        resolved.failure != null -> "Engine unavailable: ${resolved.failure}"
        else -> "The engine could not complete the mate at the current analysis budget."
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
        // An OUTLINE button, not a text link: the only way out of a truncated list needs a visible edge.
        item(key = "moves-toggle") {
            OutlineAction(
                if (allMoves) "Show fewer" else "Show all ${game.plies.size} moves",
                onToggle,
                Modifier.padding(top = Space.sm),
            )
        }
    }
}

/** **Both arrows belong to the SAME ply**: what was played and what the engine wanted instead. */
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

/** The accessible name is the LABEL, always: with the count inside, `tap-text "Moments"` failed while streaming. */
@Composable
private fun ReviewTabs(
    selected: ReviewSection,
    moments: Int?,
    moves: Int,
    onSelect: (ReviewSection) -> Unit,
) {
    Row(Modifier.fillMaxWidth()) {
        // Always enabled: an ungraded game reaches its "Review this game" button through it.
        ReviewTab("Moments", moments, ReviewSection.MOMENTS, selected, onSelect, Modifier.weight(1f))
        ReviewTab("Review", null, ReviewSection.REVIEW, selected, onSelect, Modifier.weight(1f))
        ReviewTab("Moves", moves, ReviewSection.MOVES, selected, onSelect, Modifier.weight(1f))
    }
}

/** Reserved on BOTH sides: what is centred is the LABEL, not the pair. */
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
            // `alignByBaseline`: the count is another FACE at the same size, and box-aligned it floated above the word.
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

/** The screen's ONE ⓘ: it explains a CONCEPT — a label that needs it to be understood is wrong. */
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

/** Both names and values stay visible, so a number is never mistaken for the side that moved last. */
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

/** Null when the screen owes nothing: finished has no state, in-flight belongs to the app bar. */
internal enum class AnalysisPhase {
    MISSING_ENGINE,
    ERROR,
    NOT_STARTED,

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

/** Reviewing is what an unread game's screen is FOR, so it is the filled button (specs/48 rule 3). */
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
            // A partial review must never look like a finished one.
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

/** States its denominator: watched moves, in positions not already decided. */
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
                // Lichess' bands (`roundTraining.ts`): >=85 good, >=70 inaccuracy, >=55 mistake, else blunder.
                color = side.accuracy?.let { accuracyColor(it) } ?: OnSurfaceMuted,
            )
        }
        Figure("${side.scored}/${side.plies} graded", OnSurfaceMuted)
    }
}

@Composable
private fun accuracyColor(accuracy: Double) =
    when {
        accuracy >= 85 -> Accent
        accuracy >= 70 -> OnSurface
        accuracy >= 55 -> Busy
        else -> Danger
    }

/** TWO columns, one position each: BEFORE the ply, and what the engine wanted instead (`docs/game-review.md`). */
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
    // A figure: stepping ply by ply, two numbers must not dance in place.
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

/** Two questions, two sections: decisive moves, and mates nobody took. A rebuilt ply is in neither. */
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

/** Seeks to the ply BEFORE it: landing on the mistake itself only shows the damage. */
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
            // The side is part of the figure: "48 → 13" without "Black" was ambiguous.
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

internal fun reviewPositionLabel(
    selected: Int,
    plies: Int,
): String =
    when {
        selected == 0 -> "Start"
        selected % 2 == 1 -> "${moveNumberLabel(selected)} White · $selected/$plies"
        else -> "${moveNumberLabel(selected)} Black · $selected/$plies"
    }

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

/** `EXTRA_TEXT`, not a `FileProvider` URI: that needs a manifest entry, and a PGN is a few kB. */
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
