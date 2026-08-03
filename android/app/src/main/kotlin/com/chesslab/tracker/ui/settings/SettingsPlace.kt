package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig

/**
 * Where the settings screen is: the player's landing page, the developer door, one group, a search.
 *
 * Kept out of the composable so the rules below are decidable on the JVM. All 46 knobs on one
 * scroll made the screen a wall — every one of them documented, none of them findable, and the
 * three or four anyone actually touches buried among the forty they never will.
 */
sealed interface SettingsPlace {
    /** The landing page. Since specs/51 it holds ONLY what a chess player changes. */
    data object Groups : SettingsPlace

    /**
     * The one door for everything that is the machine's: the six tuning groups, `Device & model`,
     * the debug panels, the export and the reset.
     *
     * Not gated behind a switch or a tap count, and that is a decision rather than an omission —
     * see the KDoc on the developer listing in `SettingsScreen.kt`.
     */
    data object Developer : SettingsPlace

    data class Group(
        val group: KnobGroup,
    ) : SettingsPlace

    /** Everything that was moved off its Python default, across all groups. */
    data object Modified : SettingsPlace

    /**
     * Which physical corner is a8 — the one field of `AppSettings` that is a PLAYER's, because it
     * describes the board in front of them and not the machine reading it. A wrong a8 silently
     * transposes every label, so it stays where somebody can find it.
     */
    data object Board : SettingsPlace

    /**
     * The four subpages that are NOT `TrackerConfig` knobs.
     *
     * Two of them used to be surfaces of their own: "Spoken moves" was a top-level tab, and the
     * analysis knobs were reachable only by long-pressing the eval bar. `Recording` was a card on
     * the Games screen. `Device` was five choice cards inline on this landing page, which is what
     * made a list of eleven groups a wall.
     */
    data object Speech : SettingsPlace

    data object Analysis : SettingsPlace

    data object Recording : SettingsPlace

    data object Device : SettingsPlace
}

/** What the title bar reads while [place] is open. */
fun settingsTitle(place: SettingsPlace): String =
    when (place) {
        is SettingsPlace.Group -> place.group.title
        SettingsPlace.Modified -> "Modified"
        SettingsPlace.Speech -> "Spoken moves"
        SettingsPlace.Analysis -> "Analysis"
        SettingsPlace.Recording -> "Recording"
        SettingsPlace.Device -> "Device & model"
        SettingsPlace.Board -> "Board orientation"
        SettingsPlace.Developer -> "Developer"
        SettingsPlace.Groups -> "Settings"
    }

/**
 * Where the arrow — and the system back button, which must mean the same thing — goes from [place].
 *
 * `null` is "leave Settings". This is a rule and not a stack because the tree is two levels deep and
 * a stack would let the same page have two parents depending on how it was reached. The one thing it
 * has to get right is that a tuning group returns to **Developer** and not to the player's landing
 * page: a back button that drops you two levels is the reason nobody opens the third level twice.
 */
fun parentOf(place: SettingsPlace): SettingsPlace? =
    when (place) {
        SettingsPlace.Groups -> null
        SettingsPlace.Developer,
        SettingsPlace.Board,
        SettingsPlace.Speech,
        SettingsPlace.Analysis,
        SettingsPlace.Recording,
        -> SettingsPlace.Groups
        is SettingsPlace.Group, SettingsPlace.Modified, SettingsPlace.Device -> SettingsPlace.Developer
    }

/**
 * Knobs whose key, GROUP TITLE or help text matches every whitespace-separated term in [query].
 *
 * Not the knob's own title — [KnobUi] has none. The screen renders the key itself as the heading,
 * so `knob.key` already is the title as far as a reader is concerned.
 */
fun searchKnobs(query: String): List<KnobUi> {
    val terms =
        query
            .trim()
            .lowercase()
            .split(WHITESPACE)
            .filter { it.isNotEmpty() }
    if (terms.isEmpty()) return emptyList()
    return KNOB_CATALOG.filter { knob ->
        // The help text is searched too, and that is the point: nobody remembers that the shadow
        // veto is called `censusThr`, but they do remember the word "shadow". The catalog's help
        // lines carry the live-tuning history, which makes them the best index this screen has.
        val hay = "${knob.key} ${knob.group.title} ${knob.help}".lowercase()
        terms.all { it in hay }
    }
}

/** Knobs that no longer sit on their Python default — the only ones this board has been tuned on. */
fun modifiedKnobs(config: TrackerConfig): List<KnobUi> = KNOB_CATALOG.filterNot { it.isDefault(config) }

private val WHITESPACE = Regex("\\s+")
