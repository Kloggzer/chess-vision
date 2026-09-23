package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig

/** Out of the composable, so the rules are decidable on the JVM. */
sealed interface SettingsPlace {
    /** ONLY what a chess player changes (specs/51). */
    data object Groups : SettingsPlace

    /** Not gated behind a switch or tap count — a decision (`SettingsScreen.kt`). */
    data object Developer : SettingsPlace

    data class Group(
        val group: KnobGroup,
    ) : SettingsPlace

    data object Modified : SettingsPlace

    /** A PLAYER's field: a wrong a8 silently transposes every label, so it stays findable. */
    data object Board : SettingsPlace

    data object Speech : SettingsPlace

    data object Analysis : SettingsPlace

    data object Recording : SettingsPlace

    data object Transfer : SettingsPlace

    data object Device : SettingsPlace
}

fun settingsTitle(place: SettingsPlace): String =
    when (place) {
        is SettingsPlace.Group -> place.group.title
        SettingsPlace.Modified -> "Modified"
        SettingsPlace.Speech -> "Spoken moves"
        SettingsPlace.Analysis -> "Analysis"
        SettingsPlace.Recording -> "Recording"
        SettingsPlace.Transfer -> "Transfer"
        SettingsPlace.Device -> "Device & model"
        SettingsPlace.Board -> "Board orientation"
        SettingsPlace.Developer -> "Developer"
        SettingsPlace.Groups -> "Settings"
    }

/** A rule, not a stack: a stack would give one page two parents. A tuning group returns to **Developer**,
 *  never two levels up. `null` leaves Settings. */
fun parentOf(place: SettingsPlace): SettingsPlace? =
    when (place) {
        SettingsPlace.Groups -> null
        SettingsPlace.Developer,
        SettingsPlace.Board,
        SettingsPlace.Speech,
        SettingsPlace.Analysis,
        SettingsPlace.Recording,
        SettingsPlace.Transfer,
        -> SettingsPlace.Groups
        is SettingsPlace.Group, SettingsPlace.Modified, SettingsPlace.Device -> SettingsPlace.Developer
    }

/** The key is the heading, so it serves as the title. */
fun searchKnobs(query: String): List<KnobUi> {
    val terms =
        query
            .trim()
            .lowercase()
            .split(WHITESPACE)
            .filter { it.isNotEmpty() }
    if (terms.isEmpty()) return emptyList()
    return KNOB_CATALOG.filter { knob ->
        // The help text is searched too: nobody remembers `censusThr`, but they remember "shadow".
        val hay = "${knob.key} ${knob.group.title} ${knob.help}".lowercase()
        terms.all { it in hay }
    }
}

fun modifiedKnobs(config: TrackerConfig): List<KnobUi> = KNOB_CATALOG.filterNot { it.isDefault(config) }

private val WHITESPACE = Regex("\\s+")
