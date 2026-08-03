package com.chesslab.tracker.ui.review

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.SideSummary
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.ChesslabScaffold
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
import com.chesslab.tracker.ui.theme.SurfaceRaised
import com.chesslab.tracker.ui.tracking.BoardCanvas
import kotlinx.coroutines.flow.MutableStateFlow
import kotlin.math.roundToInt

/** The screen renders before the service is bound; an unbound live game is simply an empty one. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

private val BOARD_GAP = 6.dp

/**
 * How many findings are shown before "show all".
 *
 * Three, because the screen's job in its first five seconds is "which moves decided this game" and a
 * list of eleven is a second problem to solve. Working memory is about four chunks and the move
 * notation already competes for them.
 */
private const val TOP_FINDINGS = 3

/**
 * The LIVE source. The spectator view is this screen with the game still running — "die spectator
 * view kann basically dieselbe view sein wie die nach dem spiel nur halt live" (2026-08-02).
 */
@Composable
fun LiveReviewRoute(onBack: () -> Unit) {
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (controller?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
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
        // The rating leads. It is the answer to "how did I do", it is the one thing the user asked
        // for by name, and both products this was measured against open with it.
        summary = { AccuracyRow(ui, onReview = model::review) },
    ) { selected, seek ->
        KeyMoments(ui.grade, seek)
        Details(ui, game, selected, onDiscard = model::discard)
    }
}

/**
 * ONE board, ONE move list, ONE evaluation. Live or archived is [GameView.live] and nothing else.
 *
 * The order is a judgement and it is the deliverable as much as the code is: **rating, board with the
 * win bar, what the move on screen did, what the engine would have played, the moves that decided
 * the game, the score sheet, and everything else behind a tap.** Anything a player does not want
 * within five seconds of opening the screen is in [Details].
 *
 * **ONE `LazyColumn` for the whole screen**, board included. It was a fixed `Column` with the move
 * list as a nested lazy list in a weighted box, and on a phone that could not be made to fit: a
 * square board is a screen-width tall, and once the verdict sat under it the list measured one and a
 * half rows and the accuracy card was clipped off the bottom. Every way of dividing the leftover only
 * chose which part to starve. A nested lazy list inside a scrolling parent throws at runtime — so the
 * outer list IS the lazy one and the move rows are items in it.
 */
@Composable
private fun GameReviewScreen(
    title: String,
    game: GameView,
    onBack: () -> Unit,
    grade: GameGrade?,
    onFocus: (Int) -> Unit,
    summary: @Composable () -> Unit = {},
    extra: @Composable (selected: Int, onSeek: (Int) -> Unit) -> Unit,
) {
    // The live board follows the game; the archived one follows the finger. Both are a PLY NUMBER,
    // so the two modes differ in where that number comes from and in nothing else.
    var seek by remember(game.id) { mutableIntStateOf(game.plies.size) }
    val selected = if (game.live) game.plies.size else seek
    LaunchedEffect(selected) { onFocus(selected) }
    val ply = grade?.of(selected)
    // The advice on the BOARD has to be a move from the position the board is showing. A ply's own
    // `bestUci` is the engine's move in the position BEFORE it, so drawing that here would put an
    // arrow for one position on top of another — it did, and `e4-e5` was rendered over a board where
    // that had already happened. The engine's move from THIS position is the next ply's.
    val fromHere = grade?.of(selected + 1)?.takeIf { it.quality != MoveQuality.BEST }
    val listState = rememberLazyListState()
    LaunchedEffect(game.plies.size, game.live) {
        if (game.live && game.plies.isNotEmpty()) listState.animateScrollToItem(listState.layoutInfo.totalItemsCount)
    }

    ChesslabScaffold(title, onBack) { bars ->
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(bars).padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item(key = "summary") { summary() }
            item(key = "board") {
                // `IntrinsicSize.Min` is load-bearing: the bar fills the row's height, so without an
                // intrinsic it has no height to fill at all inside a lazy item.
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(BOARD_GAP)) {
                    // Two bars, one drawing. The live one is fed by the TRACKER's current position
                    // and is wrong for an archived game — which is why specs/42 removed it here. The
                    // archive one is fed by the ply being read, and moves with the finger.
                    if (game.live) EvalBarSlot() else ReviewEvalBar(grade?.winWhite?.getOrNull(selected))
                    BoardCanvas(
                        fen = game.fenAt(selected),
                        modifier = Modifier.weight(1f),
                        lastMoveUci = game.plies.getOrNull(selected - 1)?.uci,
                        suggestedUci = fromHere?.bestUci,
                    )
                }
            }
            if (!game.live) {
                item(key = "verdict") { PlyVerdict(ply, game.plies.getOrNull(selected - 1)?.san, selected, grade, fromHere) }
                item(key = "nav") { PlyNav(selected, game.plies.size) { seek = it } }
            }
            item(key = "extra") { extra(selected) { seek = it } }
            moveListSection(game, grade, selected, onSelect = if (game.live) null else ({ seek = it }))
        }
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Accuracy", style = MaterialTheme.typography.titleSmall, color = OnSurface)
                    Info("Accuracy", ACCURACY_INFO)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    AccuracyBlock("White", grade.white)
                    AccuracyBlock("Black", grade.black)
                }
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
) {
    Column {
        Text(label, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        Text(
            side.accuracy?.let { "${it.roundToInt()}%" } ?: "—",
            style = MaterialTheme.typography.headlineMedium,
            // Lichess' own accuracy bands, from `roundTraining.ts`: >=85 good, >=70 inaccuracy,
            // >=55 mistake, else blunder. A number nobody can place is a number nobody can use.
            color = side.accuracy?.let { accuracyColor(it) } ?: OnSurfaceMuted,
        )
        Text("over ${side.scored} of ${side.plies} moves", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
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
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        when {
            selected == 0 || san == null ->
                Text("Starting position.", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
            ply == null ->
                Text(
                    "$san · ${if (grade == null) "not reviewed yet" else "working on this move…"}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = OnSurfaceMuted,
                )
            else -> Verdict(ply, san)
        }
        // The arrow is the message and this is its caption.
        fromHere?.bestSan?.let {
            Text("The engine would have played $it here.", style = MaterialTheme.typography.bodyMedium, color = Accent)
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
        "Winning chances ${percent(ply.winBefore)} → ${percent(ply.winAfter)}.",
        style = MaterialTheme.typography.bodyMedium,
        color = OnSurface,
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
    grade: GameGrade?,
    onSeek: (Int) -> Unit,
) {
    if (grade == null) return
    var all by remember { mutableStateOf(false) }
    val findings = grade.findings()
    Card {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("What decided the game", style = MaterialTheme.typography.titleSmall, color = OnSurface)
            Info("How moves are judged", QUALITY_INFO)
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
                "${moveNumber(finding.ply)} ${finding.san} is ${article(finding.quality)} ${label(finding.quality)}",
                style = MaterialTheme.typography.bodyMedium,
                color = badgeColor(finding.quality),
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

private fun article(quality: MoveQuality) = if (quality == MoveQuality.INACCURACY) "an" else "a"

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
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        TextButton(onClick = { onSeek(0) }) { Text("|<", color = Accent) }
        TextButton(onClick = { onSeek((selected - 1).coerceAtLeast(0)) }) { Text("<", color = Accent) }
        Text(
            if (selected == 0) "start" else "ply $selected / $plies",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        TextButton(onClick = { onSeek((selected + 1).coerceAtMost(plies)) }) { Text(">", color = Accent) }
        TextButton(onClick = { onSeek(plies) }) { Text(">|", color = Accent) }
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
    TextButton(onClick = { open = !open }) { Text(if (open) "Hide details" else "Details", color = OnSurfaceMuted) }
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
