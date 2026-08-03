package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig

/**
 * Where the settings screen is: the group list, one group, or a search.
 *
 * Kept out of the composable so the rules below are decidable on the JVM. All 46 knobs on one
 * scroll made the screen a wall — every one of them documented, none of them findable, and the
 * three or four anyone actually touches buried among the forty they never will.
 */
sealed interface SettingsPlace {
    /** The landing page: what was changed, then the groups. */
    data object Groups : SettingsPlace

    data class Group(
        val group: KnobGroup,
    ) : SettingsPlace

    /** Everything that was moved off its Python default, across all groups. */
    data object Modified : SettingsPlace

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
        SettingsPlace.Groups -> "Settings"
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
